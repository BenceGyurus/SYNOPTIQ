import asyncio
import hmac
import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from prometheus_client.exposition import CONTENT_TYPE_PLAIN_0_0_4
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.dependencies import get_db
from app.services.prometheus_exporter import read_snapshot, render_snapshot

router = APIRouter()
logger = logging.getLogger(__name__)


async def authorize_metrics(request: Request):
    token = settings.PROMETHEUS_TOKEN.get_secret_value()
    if not token:
        raise HTTPException(status_code=404, detail="Not found")
    scheme, _, supplied = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(supplied.encode(), token.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized",
            headers={"WWW-Authenticate": 'Bearer realm="solaris-metrics"'})


@router.get("/metrics", include_in_schema=False, dependencies=[Depends(authorize_metrics)])
async def metrics(db: Annotated[AsyncSession, Depends(get_db)]):
    try:
        rows = await asyncio.wait_for(read_snapshot(db), timeout=5)
        payload = render_snapshot(rows, datetime.now(timezone.utc),
            settings.PROMETHEUS_MAX_AGE_SECONDS, settings.INVERTER_TIMEZONE)
    except (SQLAlchemyError, TimeoutError):
        logger.warning("Prometheus scrape could not read inverter data")
        return Response("Metrics temporarily unavailable\n", status_code=503,
            headers={"Cache-Control": "no-store"})
    return Response(payload, headers={"Content-Type": CONTENT_TYPE_PLAIN_0_0_4, "Cache-Control": "no-store"})
