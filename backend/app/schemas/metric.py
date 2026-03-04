from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class MetricBase(BaseModel):
    flg: Optional[int] = None
    tmp: Optional[float] = None
    fac: Optional[float] = None
    pac: Optional[float] = None
    sac: Optional[float] = None
    qac: Optional[float] = None
    eto: Optional[float] = None
    etd: Optional[float] = None
    hto: Optional[float] = None
    pf: Optional[float] = None
    wan: Optional[int] = None
    err: Optional[int] = None
    vac1: Optional[float] = None
    vac2: Optional[float] = None
    vac3: Optional[float] = None
    iac1: Optional[float] = None
    iac2: Optional[float] = None
    iac3: Optional[float] = None
    vpv1: Optional[float] = None
    vpv2: Optional[float] = None
    ipv1: Optional[float] = None
    ipv2: Optional[float] = None

class MetricCreate(MetricBase):
    timestamp: datetime

class MetricInDBBase(MetricBase):
    id: int
    inverter_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class Metric(MetricInDBBase):
    pass
