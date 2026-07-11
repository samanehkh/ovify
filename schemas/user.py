from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict

class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class UserOnboardUpdate(BaseModel):
    sleep_time: str
    injection_comfort: str
    reminder_offset_minutes: int

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    dob: Optional[date] = None
    sleep_time: Optional[str] = None
    injection_comfort: Optional[str] = None
    reminder_offset_minutes: int = 30
    onboarded: bool
    active_status: str
    cycle_outcome: Optional[str] = None
    partner_phone: Optional[str] = None
    partner_consent: bool
    day1_reported_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserAuthResponse(UserResponse):
    token: Optional[str] = None

class PartnerConsentUpdate(BaseModel):
    partner_phone: str
    partner_consent: bool

class ReportDay1Request(BaseModel):
    reported_at: Optional[str] = None

class ReportDay1Response(BaseModel):
    status: str
    reported_date: Optional[str] = None
    baseline_scan_status: str

class DashboardMedication(BaseModel):
    medication_id: int
    name: str
    dosage: str
    route: str
    scheduled_time: str
    status: str
    logged_at: Optional[datetime] = None

class DashboardResponse(BaseModel):
    cycle_day: Optional[int] = None
    cycle_status: str  # "Pre-Cycle" or "Stimulation"
    today_schedule: list[DashboardMedication]
    day1_reported_at: Optional[datetime] = None
    next_appointment_datetime: Optional[datetime] = None

