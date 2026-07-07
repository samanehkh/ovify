from datetime import date
from typing import Optional
from pydantic import BaseModel

class CycleBase(BaseModel):
    start_date: date
    end_date: Optional[date] = None

class CycleCreate(CycleBase):
    user_id: int

class CycleUpdate(CycleBase):
    pass

class CycleResponse(CycleBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class CycleSummary(BaseModel):
    average_cycle_length: Optional[int]
    predicted_next_period_start: Optional[date]
    predicted_fertile_window_start: Optional[date]
    predicted_fertile_window_end: Optional[date]
