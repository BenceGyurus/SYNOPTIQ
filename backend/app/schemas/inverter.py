from typing import Optional
from pydantic import BaseModel, Field, field_validator
import ipaddress
import re

class InverterBase(BaseModel):
    name: str
    serial_number: str = Field(min_length=4, max_length=64)
    ip_address: str
    port: int = Field(default=8484, ge=1, le=65535)

    @field_validator("serial_number")
    @classmethod
    def valid_serial(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", value):
            raise ValueError("Invalid serial number")
        return value

    @field_validator("ip_address")
    @classmethod
    def valid_local_ip(cls, value: str) -> str:
        address = ipaddress.ip_address(value)
        allowed = [ipaddress.ip_network(cidr) for cidr in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")]
        if address.version != 4 or not any(address in network for network in allowed):
            raise ValueError("Use a private IPv4 address")
        return value

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
