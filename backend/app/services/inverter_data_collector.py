import asyncio
import httpx # Using httpx for async requests
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from app import crud, schemas
from app.db.session import SessionLocal
from app.core.config import settings
from app.models.sql import Inverter

logger = logging.getLogger(__name__)

async def fetch_inverter_data(inverter: Inverter) -> Optional[Dict[str, Any]]:
    """Fetches data from a single inverter."""
    url = f"http://{inverter.ip_address}:{inverter.port}/getdevdata.cgi?device=2&sn={inverter.serial_number}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=settings.INVERTER_POLL_TIMEOUT)
            response.raise_for_status()
            data = response.json()
            return data
    except Exception as e:
        logger.error(f"Error fetching from {inverter.serial_number}: {e}")
        return None

def parse_inverter_data(data: Dict[str, Any]) -> schemas.MetricCreate:
    """Parses raw inverter data into a MetricCreate schema based on confirmed JSON structure."""
    
    # Time format: "20260304181245" -> YYYYMMDDHHMMSS
    timestamp_str = data.get("tim")
    try:
        parsed_timestamp = datetime.strptime(timestamp_str, "%Y%m%d%H%M%S") if timestamp_str else datetime.now()
    except Exception:
        parsed_timestamp = datetime.now()

    def get_val(key, index=None, divisor=1):
        try:
            val = data.get(key)
            if index is not None and isinstance(val, list):
                if index < len(val):
                    val = val[index]
                else:
                    return 0.0
            if val is None: return 0.0
            return float(val) / divisor
        except: return 0.0

    metric_data = {
        "timestamp": parsed_timestamp,
        "flg": int(data.get("flg", 0)),
        "tmp": get_val("tmp", divisor=10),    # 394 -> 39.4 C
        "fac": get_val("fac", divisor=100),   # 4998 -> 49.98 Hz
        "pac": get_val("pac", divisor=1),     # 2131 -> 2131 W
        "sac": get_val("sac", divisor=1),
        "qac": get_val("qac", divisor=1),
        "eto": get_val("eto", divisor=10),    # 151695 -> 15169.5 kWh
        "etd": get_val("etd", divisor=10),    # 59 -> 5.9 kWh
        "hto": get_val("hto", divisor=1),
        "pf":  get_val("pf", divisor=1000),
        "wan": int(data.get("wan", 0)),
        "err": int(data.get("err", 0)),
        "vac1": get_val("vac", 0, divisor=10), # 2471 -> 247.1 V
        "vac2": get_val("vac", 1, divisor=10),
        "vac3": get_val("vac", 2, divisor=10),
        "iac1": get_val("iac", 0, divisor=10), # 29 -> 2.9 A
        "iac2": get_val("iac", 1, divisor=10),
        "iac3": get_val("iac", 2, divisor=10),
        "vpv1": get_val("vpv", 0, divisor=10), # 2114 -> 211.4 V
        "vpv2": get_val("vpv", 1, divisor=10), # 0 -> 0.0 V
        "ipv1": get_val("ipv", 0, divisor=100), # 1020 -> 10.2 A
        "ipv2": get_val("ipv", 1, divisor=100), # 0 -> 0.0 A
    }
    return schemas.MetricCreate(**metric_data)

async def collect_data_for_inverter(inverter_id: int):
    ONLINE_INTERVAL = settings.POLLING_INTERVAL_SECONDS
    OFFLINE_INTERVAL = 300 # 5 minutes
    
    while True:
        async with SessionLocal() as db:
            try:
                inverter = await crud.get_inverter(db, inverter_id)
                if not inverter: break
                
                raw_data = await fetch_inverter_data(inverter)
                if raw_data:
                    metric_create = parse_inverter_data(raw_data)
                    await crud.create_metric(db, metric=metric_create, inverter_id=inverter.id)
                    await asyncio.sleep(ONLINE_INTERVAL)
                else:
                    await asyncio.sleep(OFFLINE_INTERVAL)
            except Exception:
                await asyncio.sleep(OFFLINE_INTERVAL)

async def collect_inverter_data():
    running_tasks = {}
    while True:
        async with SessionLocal() as db:
            try:
                inverters = await crud.get_inverters(db)
                for inverter in inverters:
                    if inverter.id not in running_tasks or running_tasks[inverter.id].done():
                        running_tasks[inverter.id] = asyncio.create_task(collect_data_for_inverter(inverter.id))
            except Exception:
                pass
        await asyncio.sleep(60)
