from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReportBase(BaseModel):
    report_type: str
    start_date: datetime
    end_date: datetime
    content: Optional[str] = None
    user_id: Optional[int] = None

class ReportCreate(ReportBase):
    pass

class Report(ReportBase):
    id: int
    generated_at: datetime

    class Config:
        from_attributes = True
