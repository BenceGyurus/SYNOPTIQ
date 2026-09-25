from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import hmac
import asyncio
import logging

from app.api.v1.api import api_router
from app.core.config import settings
from app.services.inverter_data_collector import collect_inverter_data
from app import crud
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import sql  # noqa - registers models
from sqlalchemy import text as sql_text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.middleware("http")
async def require_internal_gateway(request: Request, call_next):
    if request.url.path.startswith(settings.API_V1_STR):
        supplied = request.headers.get("x-internal-secret", "")
        if not settings.INTERNAL_API_SECRET or not hmac.compare_digest(supplied, settings.INTERNAL_API_SECRET):
            return JSONResponse({"detail": "Forbidden"}, status_code=403)
        role = request.headers.get("x-user-role")
        if request.url.path.startswith(f"{settings.API_V1_STR}/admin") and role != "admin":
            return JSONResponse({"detail": "Admin required"}, status_code=403)
        if request.url.path.startswith(f"{settings.API_V1_STR}/inverters") and request.method != "GET" and role not in ("admin", "operator"):
            return JSONResponse({"detail": "Device manager required"}, status_code=403)
    return await call_next(request)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    """
    On startup, create database tables, register OIDC providers and start background tasks.
    """
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        if conn.dialect.name == "postgresql":
            await conn.execute(sql_text("SELECT pg_advisory_xact_lock(730121)"))
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "postgresql":
            await conn.execute(sql_text("ALTER TABLE metrics ADD COLUMN IF NOT EXISTS vpv3 DOUBLE PRECISION"))
            await conn.execute(sql_text("ALTER TABLE metrics ADD COLUMN IF NOT EXISTS ipv3 DOUBLE PRECISION"))
        await conn.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_metrics_inverter_timestamp ON metrics (inverter_id, timestamp DESC)"))
        await conn.execute(sql_text("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY)"))
        migrated = await conn.execute(sql_text("SELECT 1 FROM schema_migrations WHERE name = 'correct_solplanet_units_v1'"))
        if not migrated.scalar():
            # Earlier releases stored the 0.1 kWh counters as 0.001 kWh and PF /1000.
            await conn.execute(sql_text("UPDATE metrics SET eto = eto * 100, etd = etd * 100, pf = pf * 10"))
            await conn.execute(sql_text("INSERT INTO schema_migrations (name) VALUES ('correct_solplanet_units_v1')"))
        signed = await conn.execute(sql_text("SELECT 1 FROM schema_migrations WHERE name = 'signed_reactive_power_v1'"))
        if not signed.scalar():
            await conn.execute(sql_text("UPDATE metrics SET qac = qac - 4294967296 WHERE qac >= 2147483648"))
            await conn.execute(sql_text("INSERT INTO schema_migrations (name) VALUES ('signed_reactive_power_v1')"))
    
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
    return {"status": "ok"}
