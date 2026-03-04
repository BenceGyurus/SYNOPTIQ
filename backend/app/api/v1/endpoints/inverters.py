from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException

from app import crud
from app.dependencies import get_db
from app.models.sql import User
from app.auth.dependencies import get_current_user
from app.schemas import inverter as inverter_schema
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/inverters",
    tags=["inverters"],
    redirect_slashes=False,
)

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