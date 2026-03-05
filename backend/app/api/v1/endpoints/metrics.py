from typing import List, Annotated, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.dependencies import get_db
from app.schemas import metric as metric_schema
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/metrics",
    tags=["metrics"],
    redirect_slashes=False,
)

@router.get("", response_model=List[metric_schema.Metric])
async def read_metrics(
    db: Annotated[AsyncSession, Depends(get_db)],
    inverter_id: Optional[int] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
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
    Get advanced production stats using UTC-aware datetimes.
    """
    now = datetime.now(timezone.utc)
    import logging
    logger = logging.getLogger(__name__)

    # Basic Stats
    latest = await crud.get_latest_metric(db, inverter_id=inverter_id)
    
    # We compare dates in UTC
    daily = latest.etd if latest and latest.timestamp.date() == now.date() else 0.0

    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly = await crud.get_energy_production(db, inverter_id, month_start, now)

    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    yearly = await crud.get_energy_production(db, inverter_id, year_start, now)

    # Comparative
    yesterday = await crud.get_yesterday_stats(db, inverter_id)

    # Environmental (Approximate constants based on daily production)
    # daily is already calculated above as latest.etd
    co2_saved = daily * 0.4
    trees_equivalent = co2_saved / 20.0
    savings_huf = daily * 36.0

    # Efficiency calculation (DC to AC)
    # Corrected latest might have V and A already divided by 10/100 in the future, 
    # but currently DB has raw or partially processed.
    # Based on current collector: vpv1 is V*10, ipv1 is A*10.
    # dc_power = (V*10/10 * A*10/10) = V * A.
    dc_power = (latest.vpv1 * latest.ipv1 + latest.vpv2 * latest.ipv2) if latest else 0
    efficiency = (latest.pac / dc_power) * 100 if latest and dc_power > 10 else 0

    res = {
        "daily": daily,
        "monthly": monthly,
        "yearly": yearly,
        "yesterday": yesterday,
        "co2_saved": co2_saved,
        "trees_equivalent": trees_equivalent,
        "savings_huf": savings_huf,
        "efficiency": efficiency
    }
    logger.info(f"Stats for inverter {inverter_id}: {res}")
    return res
