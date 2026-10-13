from typing import List, Annotated, Optional
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from app.core.config import settings
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text

from app import crud
from app.dependencies import get_db
from app.schemas import metric as metric_schema
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.energy_insights import summarize_days

router = APIRouter(
    prefix="/metrics",
    tags=["metrics"],
    redirect_slashes=False,
)


@router.get("/insights")
async def read_insights(
    inverter_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    zone = ZoneInfo(settings.INVERTER_TIMEZONE)
    now = datetime.now(zone)
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start = min(midnight.replace(month=1, day=1), midnight - timedelta(days=29))
    result = await db.execute(text("""
        SELECT (timestamp AT TIME ZONE :zone)::date AS date,
               max(etd) AS energy, max(pac) AS peak, count(*) AS samples,
               min(timestamp) FILTER (WHERE pac > 10) AS first_generation,
               max(timestamp) FILTER (WHERE pac > 10) AS last_generation,
               max(tmp) AS temperature_max
        FROM metrics
        WHERE inverter_id = :inverter_id AND timestamp >= :start AND timestamp <= :now
        GROUP BY 1 ORDER BY 1
    """), {"zone": settings.INVERTER_TIMEZONE, "inverter_id": inverter_id,
            "start": start, "now": now})
    summary = summarize_days([dict(row) for row in result.mappings()], now)
    peak = await db.execute(text("""
        SELECT timestamp FROM metrics
        WHERE inverter_id = :inverter_id AND timestamp >= :midnight
          AND timestamp <= :now AND pac IS NOT NULL
        ORDER BY pac DESC, timestamp ASC LIMIT 1
    """), {"inverter_id": inverter_id, "midnight": midnight, "now": now})
    summary["peak_at"] = peak.scalar()
    # Compare equally timed counters only when both days have a recent sample.
    latest = await crud.get_latest_metric(db, inverter_id=inverter_id)
    comparison = None
    if latest and latest.etd is not None and latest.timestamp.astimezone(zone).date() == now.date():
        cutoff = latest.timestamp.astimezone(zone) - timedelta(days=1)
        previous = await db.execute(text("""
            SELECT timestamp, etd FROM metrics
            WHERE inverter_id = :inverter_id AND timestamp >= :yesterday
              AND timestamp <= :cutoff AND etd IS NOT NULL
            ORDER BY timestamp DESC LIMIT 1
        """), {"inverter_id": inverter_id, "yesterday": midnight - timedelta(days=1),
                "cutoff": cutoff})
        previous = previous.mappings().first()
        if previous and (cutoff - previous["timestamp"]).total_seconds() <= 1200:
            comparison = {"today": latest.etd, "yesterday": previous["etd"],
                          "at": latest.timestamp}
    summary["comparison"] = comparison
    return summary

@router.get("/timeseries")
async def read_timeseries(
    inverter_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    bucket_minutes: int = Query(5, ge=1, le=60),
    metric: str = Query("power"),
):
    end_time = end_time or datetime.now(ZoneInfo(settings.INVERTER_TIMEZONE))
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)
    start_time = start_time or end_time.astimezone(ZoneInfo(settings.INVERTER_TIMEZONE)).replace(
        hour=0, minute=0, second=0, microsecond=0)
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time <= start_time or (end_time - start_time).days > 90:
        raise HTTPException(status_code=422, detail="Invalid time range")
    column = {"power": "pac", "voltage": "vac1", "frequency": "fac", "temperature": "tmp"}.get(metric)
    if not column:
        raise HTTPException(status_code=422, detail="Invalid metric")
    rows = await db.execute(text(f"""
        SELECT date_bin(make_interval(mins => :bucket), timestamp,
                        TIMESTAMPTZ '1970-01-01') AS timestamp,
               avg({column}) AS value
        FROM metrics
        WHERE inverter_id = :inverter_id AND timestamp >= :start_time
              AND timestamp <= :end_time
        GROUP BY 1 ORDER BY 1
    """), {"bucket": bucket_minutes, "inverter_id": inverter_id,
            "start_time": start_time, "end_time": end_time})
    return [{"timestamp": row.timestamp, "pac": float(row.value or 0),
             "value": float(row.value or 0)} for row in rows]

@router.get("", response_model=List[metric_schema.Metric])
async def read_metrics(
    db: Annotated[AsyncSession, Depends(get_db)],
    inverter_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = Query(100, ge=1, le=2000),
):
    """
    Retrieve metrics.
    """
    # If start_time/end_time are naive, assume they are UTC
    if start_time and start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time and end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    metrics = await crud.get_metrics(
        db,
        inverter_id=inverter_id,
        start_time=start_time,
        end_time=end_time,
        skip=skip,
        limit=limit
    )
    return metrics

@router.get("/latest", response_model=metric_schema.Metric)
async def read_latest_metric(
    inverter_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Retrieve the latest metric for a specific inverter.
    """
    metric = await crud.get_latest_metric(db, inverter_id=inverter_id)
    if not metric:
        raise HTTPException(status_code=404, detail="No metric data found for this inverter")
    return metric

@router.get("/stats")
async def get_stats(
    inverter_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get advanced production stats.
    """
    now = datetime.now(ZoneInfo(settings.INVERTER_TIMEZONE))
    import logging
    logger = logging.getLogger(__name__)

    # Basic Stats
    latest = await crud.get_latest_metric(db, inverter_id=inverter_id)
    
    # Use max(etd) for today instead of relying on exact date match on latest
    # This is more robust against timezone mismatches
    daily = await crud.get_daily_production(db, inverter_id, now)
    
    # If daily is 0 but we have a very recent metric, trust latest.etd
    if daily == 0 and latest and (now - latest.timestamp).total_seconds() < 3600:
        daily = latest.etd

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly = await crud.get_energy_production(db, inverter_id, month_start, now)

    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    yearly = await crud.get_energy_production(db, inverter_id, year_start, now)

    # Comparative
    yesterday = await crud.get_yesterday_stats(db, inverter_id)

    # Efficiency calculation (DC to AC)
    dc_power = sum((getattr(latest, f"vpv{index}") or 0) * (getattr(latest, f"ipv{index}") or 0)
                   for index in (1, 2, 3)) if latest else 0
    efficiency = (latest.pac / dc_power) * 100 if latest and dc_power > 10 else 0

    res = {
        "daily": daily,
        "monthly": monthly,
        "yearly": yearly,
        "yesterday": yesterday,
        "total": latest.eto if latest else 0.0,
        "efficiency": efficiency
    }
    logger.info(f"Stats for inverter {inverter_id}: {res}")
    return res
