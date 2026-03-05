from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging

from app.api.v1.api import api_router
from app.core.config import settings
from app.services.inverter_data_collector import collect_inverter_data
from app.auth.oidc import oauth
from app import crud
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import sql  # noqa - registers models

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# ... (CORS middleware stays the same)

@app.on_event("startup")
async def startup_event():
    """
    On startup, create database tables, register OIDC providers and start background tasks.
    """
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Registering OIDC providers...")
    async with SessionLocal() as db:
        try:
            oidc_settings = await crud.get_active_oidc_settings(db)
            for setting in oidc_settings:
                logger.info(f"Registering OIDC provider: {setting.provider_name}")
                oauth.register(
                    name=setting.provider_name,
                    server_metadata_url=setting.discovery_url,
                    client_id=setting.client_id,
                    client_secret=setting.client_secret,
                    client_kwargs={'scope': 'openid email profile'}
                )
        except Exception as e:
            logger.error(f"Failed to register OIDC providers: {e}")

    logger.info("Starting background tasks...")
    
    # Auto-register inverter from ENV if provided
    async with SessionLocal() as db:
        if settings.INVERTER_SERIAL and settings.INVERTER_IP:
            from app.schemas.inverter import InverterCreate
            existing = await crud.get_inverter_by_sn(db, settings.INVERTER_SERIAL)
            if not existing:
                logger.info(f"Registering inverter from ENV: {settings.INVERTER_SERIAL}")
                await crud.create_inverter(db, InverterCreate(
                    name=settings.INVERTER_NAME,
                    serial_number=settings.INVERTER_SERIAL,
                    ip_address=settings.INVERTER_IP,
                    port=settings.INVERTER_PORT
                ))
            else:
                # Update IP/Port if they changed in ENV
                existing.ip_address = settings.INVERTER_IP
                existing.port = settings.INVERTER_PORT
                db.add(existing)
                await db.commit()

    asyncio.create_task(collect_inverter_data())

@app.get("/")
def read_root():
    return {"message": "Welcome to Solaris Monitor API"}

