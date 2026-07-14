from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.session import get_db
from db import models
from schemas.user import UserCreate, UserResponse, UserOnboardUpdate, OTPRequest, OTPVerify, PartnerConsentUpdate, UserAuthResponse, ReportDay1Response, DashboardResponse
from services.auth import verify_patient_token, generate_token
from core.phone import normalize_phone

router = APIRouter()

class WebPushKeys(BaseModel):
    p256dh: str
    auth: str

class WebPushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: WebPushKeys

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
        "day1_reported_at": user.day1_reported_at,
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

@router.post("/{user_id}/report-day1", response_model=ReportDay1Response)
def report_day1(
    user_id: int,
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from datetime import datetime, timezone
    user.day1_reported_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    return {
        "status": "Day 1 Reported",
        "reported_date": user.day1_reported_at.date().isoformat() if user.day1_reported_at else None,
        "baseline_scan_status": "Pending Booking"
    }

@router.get("/{user_id}/dashboard", response_model=DashboardResponse)
def get_user_dashboard(
    user_id: int,
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    from datetime import date
    today = date.today()
    
    # Check if there are any prescriptions
    prescriptions = db.query(models.Prescription).filter(models.Prescription.user_id == user_id).all()
    
    cycle_status = "Pre-Cycle"
    cycle_day = None
    if prescriptions:
        cycle_status = "Stimulation"
        if user.cycle_start_date:
            cycle_day = (today - user.cycle_start_date).days + 1
            if cycle_day <= 0:
                cycle_day = 1
        else:
            cycle_day = 1

    # Build today's schedule
    today_schedule = []
    for p in prescriptions:
        # Check if today is within prescription range
        if p.start_date <= today <= p.end_date:
            # Check if there is a DoseLog for today
            log = db.query(models.DoseLog).filter(
                models.DoseLog.prescription_id == p.id,
                models.DoseLog.scheduled_date == today
            ).first()
            
            today_schedule.append({
                "medication_id": p.id,
                "name": p.name,
                "dosage": p.dosage,
                "route": p.route,
                "scheduled_time": p.scheduled_time,
                "status": log.status if log else "Due",
                "logged_at": log.logged_at if log else None
            })
            
    return {
        "cycle_day": cycle_day,
        "cycle_status": cycle_status,
        "today_schedule": today_schedule,
        "day1_reported_at": user.day1_reported_at,
        "next_appointment_datetime": user.next_appointment_datetime
    }


@router.post("/{user_id}/web-push-subscription")
def create_web_push_subscription(
    user_id: int,
    req: WebPushSubscriptionRequest,
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    if user_id != token_payload.get("user_id"):
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access another patient's data")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if subscription endpoint already exists
    sub = db.query(models.PushSubscription).filter(models.PushSubscription.endpoint == req.endpoint).first()
    if not sub:
        sub = models.PushSubscription(
            user_id=user_id,
            endpoint=req.endpoint,
            p256dh=req.keys.p256dh,
            auth=req.keys.auth
        )
        db.add(sub)
    else:
        # Update user association or keys if needed
        sub.user_id = user_id
        sub.p256dh = req.keys.p256dh
        sub.auth = req.keys.auth
    
    db.commit()
    return {"message": "Web Push subscription saved successfully."}

