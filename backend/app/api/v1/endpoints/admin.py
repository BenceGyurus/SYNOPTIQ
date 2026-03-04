from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status

from app import crud
from app.dependencies import get_db
from app.models.sql import User, OIDCSetting, Inverter
from app.auth.dependencies import get_current_admin_user
from app.schemas import admin as admin_schema
from app.schemas import inverter as inverter_schema
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin_user)],
)

# --- Admin: User Management ---

@router.get("/users", response_model=List[admin_schema.UserAdmin])
async def read_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    users = await crud.get_users(db, skip=skip, limit=limit)
    return users

@router.put("/users/{user_id}", response_model=admin_schema.UserAdmin)
async def update_user(
    user_id: int,
    user_in: admin_schema.UserUpdateAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user = await crud.update_user(db=db, user=user, user_in=user_in)
    return user

@router.delete("/users/{user_id}", response_model=admin_schema.UserAdmin)
async def delete_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await crud.delete_user(db=db, user_id=user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- Admin: OIDC Settings Management ---

@router.get("/oidc-settings", response_model=List[admin_schema.OIDCSettingAdmin])
async def read_oidc_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    settings = await crud.get_oidc_settings(db, skip=skip, limit=limit)
    return settings

@router.post("/oidc-settings", response_model=admin_schema.OIDCSettingAdmin)
async def create_oidc_setting(
    setting_in: admin_schema.OIDCSettingCreateAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Note: After creation, the app needs a restart for the new provider to be registered.
    return await crud.create_oidc_setting(db=db, setting_in=setting_in)

@router.put("/oidc-settings/{setting_id}", response_model=admin_schema.OIDCSettingAdmin)
async def update_oidc_setting(
    setting_id: int,
    setting_in: admin_schema.OIDCSettingUpdateAdmin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    setting = await crud.get_oidc_setting(db, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="OIDC setting not found")
    # Note: After update, the app needs a restart for changes to take effect.
    return await crud.update_oidc_setting(db=db, setting=setting, setting_in=setting_in)

@router.delete("/oidc-settings/{setting_id}", response_model=admin_schema.OIDCSettingAdmin)
async def delete_oidc_setting(
    setting_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    setting = await crud.delete_oidc_setting(db, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="OIDC setting not found")
    # Note: After deletion, the app needs a restart.
    return setting

# --- Admin: Inverter Management ---

@router.get("/inverters", response_model=List[inverter_schema.Inverter])
async def read_inverters(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 100,
):
    return await crud.get_inverters(db, skip=skip, limit=limit)

@router.post("/inverters", response_model=inverter_schema.Inverter)
async def create_inverter(
    inverter_in: inverter_schema.InverterCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await crud.create_inverter(db=db, inverter=inverter_in)

@router.put("/inverters/{inverter_id}", response_model=inverter_schema.Inverter)
async def update_inverter(
    inverter_id: int,
    inverter_in: inverter_schema.InverterUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    inverter = await crud.update_inverter(db, inverter_id, inverter_in)
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    return inverter

@router.delete("/inverters/{inverter_id}", response_model=inverter_schema.Inverter)
async def delete_inverter(
    inverter_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    inverter = await crud.delete_inverter(db, inverter_id)
    if not inverter:
        raise HTTPException(status_code=404, detail="Inverter not found")
    return inverter
