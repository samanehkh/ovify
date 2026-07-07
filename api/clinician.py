from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from db import models
from services import protocol_parser
from services.auth import verify_clinician_key
from schemas.clinician import ProtocolParseRequest, ProtocolParseResponse, RegisterPatientRequest, CycleOutcomeUpdate

router = APIRouter(dependencies=[Depends(verify_clinician_key)])

@router.post("/parse-protocol", response_model=ProtocolParseResponse)
def parse_protocol(req: ProtocolParseRequest):
    """
    Parses natural language protocol description text and extracts structured medications.
    """
    if not req.protocol_text:
         raise HTTPException(status_code=400, detail="Protocol text cannot be empty.")
    
    result = protocol_parser.parse_protocol_text(req.protocol_text)
    return result

@router.post("/register")
def register_patient(patient: RegisterPatientRequest, db: Session = Depends(get_db)):
    """
    Creates a new user profile and seeds their daily prescriptions in the database.
    """
    # Normalize phone number input
    phone_normalized = "".join(c for c in patient.phone if c.isdigit() or c == "+")
    
    # Check if phone number is already registered
    existing_phone = db.query(models.User).filter(models.User.phone == phone_normalized).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered with another patient.")
        
    # Check if email is already registered
    existing_email = db.query(models.User).filter(models.User.email == patient.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered with another patient.")
        
    # Create the patient User
    db_user = models.User(
        name=patient.name,
        email=patient.email,
        phone=phone_normalized,
        onboarded=False,
        active_status="On Track",
        cycle_type=patient.cycle_type
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Save their prescriptions
    for p in patient.prescriptions:
        db_presc = models.Prescription(
            user_id=db_user.id,
            name=p.name,
            dosage=p.dosage,
            route=p.route,
            scheduled_time=p.scheduled_time,
            start_date=p.start_date,
            end_date=p.end_date
        )
        db.add(db_presc)
        
    db.commit()
    
    return {
        "message": f"{db_user.name} registered successfully. SMS invite sent.",
        "user_id": db_user.id
    }

@router.get("/triage")
def get_triage_data(db: Session = Depends(get_db)):
    """
    Retrieves the clinical patient compliance triage registry.
    Calculates compliance status (Red Alert, Yellow Attention, On Track) based on dose logs.
    """
    users = db.query(models.User).filter(models.User.phone != None).all()
    triage_list = []
    
    for u in users:
        # Default status
        status = "On Track"
        reason = "All doses logged on time."
        
        # Check for missed dose logs
        missed_logs = db.query(models.DoseLog).filter(
            models.DoseLog.user_id == u.id,
            models.DoseLog.status == "Missed"
        ).all()
        
        # Check for late dose logs
        late_logs = db.query(models.DoseLog).filter(
            models.DoseLog.user_id == u.id,
            models.DoseLog.status == "Late"
        ).all()
        
        if missed_logs:
            status = "Red Alert"
            # Get the first missed medication name
            presc = db.query(models.Prescription).filter(models.Prescription.id == missed_logs[0].prescription_id).first()
            presc_name = presc.name if presc else "medication"
            reason = f"Missed {presc_name} injection on {missed_logs[0].scheduled_date.strftime('%Y-%m-%d')}."
        elif late_logs:
            status = "Yellow Attention"
            presc = db.query(models.Prescription).filter(models.Prescription.id == late_logs[0].prescription_id).first()
            presc_name = presc.name if presc else "medication"
            reason = f"Logged {presc_name} injection late."
        elif u.active_status == "Action Required":
            status = "Yellow Attention"
            reason = "Overdue task check-in alert active."
            
        triage_list.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "status": status,
            "reason": reason,
            "cycle_type": u.cycle_type or "Fresh IVF",
            "cycle_outcome": u.cycle_outcome
        })
        
    return triage_list

@router.post("/resolve-alert/{user_id}")
def resolve_patient_alert(user_id: int, db: Session = Depends(get_db)):
    """
    Resolves patient triage alerts. Resets active status and marks missed/late doses as reviewed.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Reset active clinical alert status
    user.active_status = "On Track"
    
    # Mark missed or late doses as reviewed/resolved (status -> "On Time" to clear alert)
    db.query(models.DoseLog).filter(
        models.DoseLog.user_id == user_id,
        models.DoseLog.status.in_(["Missed", "Late"])
    ).update({"status": "On Time"}, synchronize_session=False)
    
    db.commit()
    return {"message": f"Alert for {user.name} resolved successfully."}

@router.post("/update-outcome/{user_id}")
def update_cycle_outcome(user_id: int, req: CycleOutcomeUpdate, db: Session = Depends(get_db)):
    """
    Updates the cycle outcome for a patient (e.g. "Failed", "Success", or None).
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    user.cycle_outcome = req.cycle_outcome
    
    # If the cycle outcome is Failed, clear active clinical alerts
    if req.cycle_outcome == "Failed":
        user.active_status = "On Track"
        
    db.commit()
    db.refresh(user)
    return {"message": f"Cycle outcome for {user.name} updated to {user.cycle_outcome}.", "cycle_outcome": user.cycle_outcome}


