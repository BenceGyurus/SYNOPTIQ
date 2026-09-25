from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.dependencies import get_db
from app.models.sql import User
from app.services.discovery import discover_inverters
from pydantic import BaseModel
from app.schemas import inverter as inverter_schema
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/inverters",
    tags=["inverters"],
    redirect_slashes=False,
)

class ScanRequest(BaseModel):
    subnet: str
    port: int = 8484

@router.post("/discover")
async def discover(request: ScanRequest):
    return await discover_inverters(request.subnet, request.port)

@router.get("", response_model=List[inverter_schema.Inverter])
async def read_inverters(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve inverters. Accessible by any authenticated user.
    """
    import logging
    logger = logging.getLogger(__name__)
    res = await crud.get_inverters(db, skip=skip, limit=limit)
    logger.info(f"Retrieved {len(res)} inverters")
    return res

@router.get("/{inverter_id}", response_model=inverter_schema.Inverter)
async def read_inverter(
    inverter_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Retrieve a single inverter by ID. Accessible by any authenticated user.
    """
    inverter = await crud.get_inverter(db, inverter_id)
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    return inverter

@router.post("", response_model=inverter_schema.Inverter)
async def create_inverter(inverter: inverter_schema.InverterCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    if await crud.get_inverter_by_sn(db, inverter.serial_number):
        raise HTTPException(status_code=409, detail="Serial number already exists")
    return await crud.create_inverter(db, inverter)

@router.put("/{inverter_id}", response_model=inverter_schema.Inverter)
async def update_inverter(inverter_id: int, inverter: inverter_schema.InverterUpdate, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await crud.update_inverter(db, inverter_id, inverter)
    if not result:
        raise HTTPException(status_code=404, detail="Inverter not found")
    return result

@router.delete("/{inverter_id}")
async def delete_inverter(inverter_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    if not await crud.delete_inverter(db, inverter_id):
        raise HTTPException(status_code=404, detail="Inverter not found")
    return {"ok": True}
