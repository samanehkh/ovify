from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.time import UAE_TZ
from core.phone import normalize_phone
from db.session import get_db
from db import models
from services import protocol_parser
from services.auth import check_clinic_access_key, generate_token, verify_clinician_token
from schemas.clinician import ProtocolParseRequest, ProtocolParseResponse, RegisterPatientRequest, CycleOutcomeUpdate

# Triage alerts only consider unresolved logs within this rolling window —
# roughly one stimulation-monitoring interval. Older history stays queryable
# but no longer drives the console alarm state.
TRIAGE_RECENCY_WINDOW = timedelta(days=7)

# Public sub-router: login only. All other clinician routes require a Bearer token.
router = APIRouter()
protected = APIRouter(dependencies=[Depends(verify_clinician_token)])

class ClinicianLoginRequest(BaseModel):
    access_key: str
    clinician_name: str = ""

@router.post("/login")
def clinician_login(req: ClinicianLoginRequest):
    """
    Exchanges the clinic access key (entered by the nurse, never shipped in
    client code) for a short-lived clinician bearer token. The nurse's name is
    REQUIRED and embedded in the token so every clinical action is attributable
    (UAE Health Data Law auditability).
    """
    if not req.access_key or not check_clinic_access_key(req.access_key):
        raise HTTPException(status_code=401, detail="Invalid clinic access key.")

    clinician_name = req.clinician_name.strip()
    if not clinician_name:
        raise HTTPException(status_code=400, detail="Clinician name is required for the audit trail.")

    token = generate_token(0, "clinician", name=clinician_name)
    return {"token": token, "clinician_name": clinician_name}

def _actor_name(token_payload: dict) -> str:
    return token_payload.get("name") or "Unknown Clinician"

def _audit(db: Session, actor: str, action: str, target_user_id, detail: str):
    db.add(models.AuditLog(actor=actor, role="clinician", action=action,
                           target_user_id=target_user_id, detail=detail))

@protected.post("/parse-protocol", response_model=ProtocolParseResponse)
def parse_protocol(req: ProtocolParseRequest):
    """
    Parses natural language protocol description text and extracts structured medications.
    """
    if not req.protocol_text:
         raise HTTPException(status_code=400, detail="Protocol text cannot be empty.")
    
    result = protocol_parser.parse_protocol_text(req.protocol_text)
    return result

@protected.post("/register")
def register_patient(
    patient: RegisterPatientRequest,
    token_payload: dict = Depends(verify_clinician_token),
    db: Session = Depends(get_db)
):
    """
    Creates a new user profile and seeds their daily prescriptions in the database.
    """
    # Normalize phone number input
    phone_normalized = normalize_phone(patient.phone)
    
    # Check if phone number is already registered
    existing_phone = db.query(models.User).filter(models.User.phone == phone_normalized).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered with another patient.")
        
    # Check if email is already registered
    existing_email = db.query(models.User).filter(models.User.email == patient.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered with another patient.")

    # Server-side formulary re-validation: the parser flags unknowns in the UI,
    # but registration must never trust the client — reject any medication not
    # in the approved formulary.
    formulary_keys = [k.lower() for k in protocol_parser.FORMULARY.keys()]
    unapproved = [
        p.name for p in patient.prescriptions
        if not any(key in p.name.lower() for key in formulary_keys)
    ]
    if unapproved:
        raise HTTPException(
            status_code=400,
            detail=f"Medications not in the approved formulary: {', '.join(unapproved)}. "
                   "Please correct the protocol before registering."
        )

    # Create the patient User
    db_user = models.User(
        name=patient.name,
        email=patient.email,
        phone=phone_normalized,
        dob=patient.dob,
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

    _audit(db, _actor_name(token_payload), "register_patient", db_user.id,
           f"Registered {db_user.name} with {len(patient.prescriptions)} prescriptions.")
    db.commit()

    return {
        "message": f"{db_user.name} registered successfully. SMS invite sent.",
        "user_id": db_user.id
    }

@protected.get("/triage")
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

        # Only UNRESOLVED alerts within the recency window rank — resolved logs
        # keep their truthful status in the history but no longer raise the
        # console alarm, and an old Missed from weeks ago must not keep a
        # now-compliant patient Red forever.
        recency_cutoff = datetime.now(UAE_TZ).date() - TRIAGE_RECENCY_WINDOW
        missed_logs = db.query(models.DoseLog).filter(
            models.DoseLog.user_id == u.id,
            models.DoseLog.status == "Missed",
            models.DoseLog.resolved == False,
            models.DoseLog.scheduled_date >= recency_cutoff
        ).all()

        late_logs = db.query(models.DoseLog).filter(
            models.DoseLog.user_id == u.id,
            models.DoseLog.status == "Late",
            models.DoseLog.resolved == False,
            models.DoseLog.scheduled_date >= recency_cutoff
        ).all()

        # Pending nurse-callback requests (Recovery Mode patients reaching out)
        pending_callback = db.query(models.CallbackRequest).filter(
            models.CallbackRequest.user_id == u.id,
            models.CallbackRequest.status == "Pending"
        ).order_by(models.CallbackRequest.requested_at.asc()).first()

        if missed_logs:
            status = "Red Alert"
            # Get the first missed medication name
            presc = db.query(models.Prescription).filter(models.Prescription.id == missed_logs[0].prescription_id).first()
            presc_name = presc.name if presc else "medication"
            reason = f"Missed {presc_name} injection on {missed_logs[0].scheduled_date.strftime('%Y-%m-%d')}."
        elif pending_callback:
            status = "Yellow Attention"
            reason = f"📞 Nurse callback requested {pending_callback.requested_at.strftime('%Y-%m-%d %H:%M')}."
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
            "cycle_outcome": u.cycle_outcome,
            "callback_requested": pending_callback is not None
        })

    return triage_list

@protected.post("/resolve-alert/{user_id}")
def resolve_patient_alert(
    user_id: int,
    token_payload: dict = Depends(verify_clinician_token),
    db: Session = Depends(get_db)
):
    """
    Resolves patient triage alerts. Resets active status and marks missed/late
    doses as RESOLVED — the original status is NEVER rewritten, so the adherence
    history stays truthful and auditable. Also completes any pending nurse
    callback requests for this patient.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    nurse = _actor_name(token_payload)
    now = datetime.now(UAE_TZ)

    # Reset active clinical alert status
    user.active_status = "On Track"

    # Mark missed/late doses as resolved — status is preserved for the audit trail
    db.query(models.DoseLog).filter(
        models.DoseLog.user_id == user_id,
        models.DoseLog.status.in_(["Missed", "Late"]),
        models.DoseLog.resolved == False
    ).update(
        {"resolved": True, "resolved_by": nurse, "resolved_at": now},
        synchronize_session=False
    )

    # Complete any pending callback requests for this patient
    db.query(models.CallbackRequest).filter(
        models.CallbackRequest.user_id == user_id,
        models.CallbackRequest.status == "Pending"
    ).update(
        {"status": "Completed", "completed_by": nurse, "completed_at": now},
        synchronize_session=False
    )

    _audit(db, nurse, "resolve_alert", user_id,
           f"Resolved triage alert for {user.name}; dose statuses preserved.")
    db.commit()
    return {"message": f"Alert for {user.name} resolved successfully."}

@protected.post("/update-outcome/{user_id}")
def update_cycle_outcome(
    user_id: int,
    req: CycleOutcomeUpdate,
    token_payload: dict = Depends(verify_clinician_token),
    db: Session = Depends(get_db)
):
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

    _audit(db, _actor_name(token_payload), "update_cycle_outcome", user_id,
           f"Set cycle outcome for {user.name} to {req.cycle_outcome}.")
    db.commit()
    db.refresh(user)
    return {"message": f"Cycle outcome for {user.name} updated to {user.cycle_outcome}.", "cycle_outcome": user.cycle_outcome}

# Mount the token-protected clinician routes
router.include_router(protected)
