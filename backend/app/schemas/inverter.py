from typing import Optional
from pydantic import BaseModel

class InverterBase(BaseModel):
    name: str
    serial_number: str
    ip_address: str
    port: int = 8484

class InverterCreate(InverterBase):
    pass

class InverterUpdate(InverterBase):
    name: Optional[str] = None
    serial_number: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None

class InverterInDBBase(InverterBase):
    id: int

    class Config:
        from_attributes = True

class Inverter(InverterInDBBase):
    pass
