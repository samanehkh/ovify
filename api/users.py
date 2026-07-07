from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from db import models
from schemas.user import UserCreate, UserResponse, UserOnboardUpdate, OTPRequest, OTPVerify, PartnerConsentUpdate

router = APIRouter()

@router.post("/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if phone already exists
    if user.phone:
        existing_phone = db.query(models.User).filter(models.User.phone == user.phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")

    db_user = models.User(name=user.name, email=user.email, phone=user.phone)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/request-otp")
def request_otp(otp_req: OTPRequest, db: Session = Depends(get_db)):
    # Normalize input phone number (strip spaces, dashes, etc.)
    normalized_phone = "".join(c for c in otp_req.phone if c.isdigit() or c == "+")
    user = db.query(models.User).filter(models.User.phone == normalized_phone).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Phone number '{otp_req.phone}' not registered with any patient chart.")
    return {"message": "OTP sent successfully", "otp_sent": True}

@router.post("/verify-otp", response_model=UserResponse)
def verify_otp(otp_ver: OTPVerify, db: Session = Depends(get_db)):
    # Normalize input phone number
    normalized_phone = "".join(c for c in otp_ver.phone if c.isdigit() or c == "+")
    user = db.query(models.User).filter(models.User.phone == normalized_phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone number not registered.")
    
    # Mock OTP check: only allow '123456'
    if otp_ver.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
    
    return user

@router.post("/{user_id}/onboard", response_model=UserResponse)
def onboard_user(user_id: int, onboard_data: UserOnboardUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.sleep_time = onboard_data.sleep_time
    user.injection_comfort = onboard_data.injection_comfort
    user.onboarded = True
    user.active_status = "On Track"
    db.commit()
    db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@router.post("/{user_id}/partner-consent", response_model=UserResponse)
def update_partner_consent(user_id: int, req: PartnerConsentUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Normalize partner phone number
    normalized_partner = "".join(c for c in req.partner_phone if c.isdigit() or c == "+")
    user.partner_phone = normalized_partner
    user.partner_consent = req.partner_consent
    db.commit()
    db.refresh(user)
    return user
