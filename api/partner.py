from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import models
from db.session import get_db

router = APIRouter()

class PartnerLoginRequest(BaseModel):
    phone: str
    otp: str
    supporter_type: str = "Partner"

@router.post("/login")
def partner_login(req: PartnerLoginRequest, db: Session = Depends(get_db)):
    normalized_phone = "".join(c for c in req.phone if c.isdigit() or c == "+")
    
    # Check if there is any patient user linked to this partner phone
    patient = db.query(models.User).filter(models.User.partner_phone == normalized_phone).first()
    if not patient:
        raise HTTPException(status_code=404, detail="No patient user has registered this number as their support partner.")
        
    if req.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
        
    return {
        "partner_phone": normalized_phone,
        "patient_name": patient.name,
        "patient_id": patient.id,
        "partner_consent": patient.partner_consent,
        "supporter_type": req.supporter_type
    }

@router.get("/dashboard")
def get_partner_dashboard(partner_phone: str, db: Session = Depends(get_db)):
    normalized_phone = "".join(c for c in partner_phone if c.isdigit() or c == "+")
    
    patient = db.query(models.User).filter(models.User.partner_phone == normalized_phone).first()
    if not patient:
        raise HTTPException(status_code=404, detail="No patient user has registered this number as their support partner.")
        
    # Health Data Law Consent Gate Check
    if not patient.partner_consent:
        raise HTTPException(status_code=403, detail="Sharing consent is currently revoked or unauthorized by the patient.")
        
    # Get today's mood
    today = date.today()
    symptom_log = db.query(models.SymptomLog).filter(
        models.SymptomLog.user_id == patient.id,
        models.SymptomLog.log_date == today
    ).first()
    
    mood = symptom_log.value if symptom_log else None
    
    # Calculate progress day
    current_day = 5
    total_days = 12
    presc = db.query(models.Prescription).filter(
        models.Prescription.user_id == patient.id
    ).first()
    if presc:
        try:
            diff_current = today - presc.start_date
            current_day = max(1, diff_current.days + 1)
            diff_total = presc.end_date - presc.start_date
            total_days = max(1, diff_total.days + 1)
        except Exception:
            pass
            
    # Generate supportive coaching prompts based on mood
    prompts = {
        "Amazing": f"{patient.name} is feeling amazing today! Celebrate this milestone together. A surprise chocolate treat or cooking her favorite dinner tonight would be a lovely touch.",
        "Good": f"{patient.name} is feeling good today. Keep the positive energy going! Ask her how her day went and offer a comforting hug.",
        "Normal": f"{patient.name} is feeling okay today. A gentle back rub or watching a comforting movie together tonight would help her unwind.",
        "Low": f"{patient.name} is feeling a bit low today. Try taking over household chores, run her a warm bath, and offer a listening ear.",
        "Anxious": f"{patient.name} checked in as feeling Anxious today. A soft foot rub or making her favorite chamomile tea tonight would be a wonderful way to reassure her."
    }
    
    default_prompt = f"{patient.name} hasn't logged her mood today. Check in on how she is doing with a gentle hug or ask if she needs help with her injections."
    support_prompt = prompts.get(mood, default_prompt) if mood else default_prompt
    
    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "cycle_outcome": patient.cycle_outcome,
        "cycle_type": patient.cycle_type or "Fresh IVF",
        "stim_day": current_day,
        "total_days": total_days,
        "mood": mood,
        "support_prompt": support_prompt,
        "partner_consent": patient.partner_consent
    }
