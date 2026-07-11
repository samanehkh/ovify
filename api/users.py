from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from db import models
from schemas.user import UserCreate, UserResponse, UserOnboardUpdate, OTPRequest, OTPVerify, PartnerConsentUpdate, UserAuthResponse
from services.auth import verify_patient_token, generate_token
from core.phone import normalize_phone

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
    # Normalize input phone number
    normalized_phone = normalize_phone(otp_req.phone)
    user = db.query(models.User).filter(models.User.phone == normalized_phone).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"Phone number '{otp_req.phone}' not registered with any patient chart.")
    return {"message": "OTP sent successfully", "otp_sent": True}

@router.post("/verify-otp", response_model=UserAuthResponse)
def verify_otp(otp_ver: OTPVerify, db: Session = Depends(get_db)):
    # Normalize input phone number
    normalized_phone = normalize_phone(otp_ver.phone)
    user = db.query(models.User).filter(models.User.phone == normalized_phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone number not registered.")
    
    # Mock OTP check: only allow '123456'
    if otp_ver.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
    
    # Generate secure bearer token
    token = generate_token(user.id, "patient")
    
    # Return proper dict schema instead of mutating SQLAlchemy model
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "sleep_time": user.sleep_time,
        "injection_comfort": user.injection_comfort,
        "onboarded": user.onboarded,
        "active_status": user.active_status,
        "cycle_outcome": user.cycle_outcome,
        "partner_phone": user.partner_phone,
        "partner_consent": user.partner_consent,
        "created_at": user.created_at,
        "token": token
    }

@router.post("/{user_id}/onboard", response_model=UserResponse)
def onboard_user(
    user_id: int, 
    onboard_data: UserOnboardUpdate, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")
    
    user.sleep_time = onboard_data.sleep_time
    user.injection_comfort = onboard_data.injection_comfort
    user.reminder_offset_minutes = onboard_data.reminder_offset_minutes
    user.onboarded = True
    user.active_status = "On Track"
    db.commit()
    db.refresh(user)
    return user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")
        
    return db_user

@router.post("/{user_id}/partner-consent", response_model=UserResponse)
def update_partner_consent(
    user_id: int, 
    req: PartnerConsentUpdate, 
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")
    
    # Normalize partner phone number
    normalized_partner = normalize_phone(req.partner_phone)
    user.partner_phone = normalized_partner
    user.partner_consent = req.partner_consent
    db.commit()
    db.refresh(user)
    return user

@router.post("/{user_id}/callback-request")
def request_nurse_callback(
    user_id: int,
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    """
    Persists a patient's nurse-callback request (Recovery Mode). Idempotent:
    an existing Pending request is returned rather than duplicated. Surfaced
    in the clinician triage console until a nurse completes it.
    """
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(models.CallbackRequest).filter(
        models.CallbackRequest.user_id == user_id,
        models.CallbackRequest.status == "Pending"
    ).first()
    if existing:
        return {"message": "A callback request is already pending. Your clinic will call you back.",
                "callback_id": existing.id, "status": existing.status}

    callback = models.CallbackRequest(user_id=user_id, status="Pending")
    db.add(callback)
    db.add(models.AuditLog(actor=f"patient:{user_id}", role="patient",
                           action="request_callback", target_user_id=user_id,
                           detail=f"{user.name} requested a nurse callback."))
    db.commit()
    db.refresh(callback)
    return {"message": "Callback requested. A clinic coordinator will call you within 24 hours.",
            "callback_id": callback.id, "status": callback.status}
