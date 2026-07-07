from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class UserOnboardUpdate(BaseModel):
    sleep_time: str
    injection_comfort: str

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
    sleep_time: Optional[str] = None
    injection_comfort: Optional[str] = None
    onboarded: bool
    active_status: str
    cycle_outcome: Optional[str] = None
    partner_phone: Optional[str] = None
    partner_consent: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserAuthResponse(UserResponse):
    token: Optional[str] = None

class PartnerConsentUpdate(BaseModel):
    partner_phone: str
    partner_consent: bool
