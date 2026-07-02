from datetime import date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class SymptomLogBase(BaseModel):
    log_date: date
    symptom_type: str
    value: str

class SymptomLogCreate(SymptomLogBase):
    user_id: UUID

class SymptomLogResponse(SymptomLogBase):
    id: int
    user_id: UUID

    class Config:
        from_attributes = True
