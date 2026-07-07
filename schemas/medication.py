from datetime import date, datetime, time
from typing import Optional
from pydantic import BaseModel

class PrescriptionBase(BaseModel):
    name: str
    dosage: str
    route: str
    scheduled_time: str  # Format: "HH:MM:SS"
    start_date: date
    end_date: date

class PrescriptionCreate(PrescriptionBase):
    user_id: int

class PrescriptionResponse(PrescriptionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class DoseLogResponse(BaseModel):
    id: int
    user_id: int
    prescription_id: int
    logged_at: datetime
    scheduled_date: date
    status: str
    self_reported: bool = False

    class Config:
        from_attributes = True

class MedicationStatusResponse(BaseModel):
    id: int  # Prescription ID
    name: str
    dosage: str
    route: str
    scheduled_time: str
    start_date: date
    end_date: date
    status: str  # "Due" or "Taken"
    log_status: Optional[str] = None  # "On Time", "Late", or None
    logged_at: Optional[datetime] = None
    self_reported: Optional[bool] = False

    class Config:
        from_attributes = True
