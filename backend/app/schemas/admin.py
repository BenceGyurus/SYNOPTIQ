from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.sql import UserRole

# --- User Schemas for Admin ---

class UserAdmin(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True

class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

# --- OIDC Setting Schemas for Admin ---

class OIDCSettingAdmin(BaseModel):
    id: int
    provider_name: str
    client_id: str
    discovery_url: str
    is_active: bool

    class Config:
        from_attributes = True

class OIDCSettingCreateAdmin(BaseModel):
    provider_name: str
    client_id: str
    client_secret: str
    discovery_url: str
    is_active: bool = True

class OIDCSettingUpdateAdmin(BaseModel):
    provider_name: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    discovery_url: Optional[str] = None
    is_active: Optional[bool] = None
