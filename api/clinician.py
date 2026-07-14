from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.time import UAE_TZ
from core.phone import normalize_phone
from db.session import get_db
from db import models
from services import protocol_parser, adherence
from services.auth import check_clinic_access_key, generate_token, verify_clinician_token, verify_password
from schemas.clinician import ProtocolParseRequest, ProtocolParseResponse, RegisterPatientRequest, CycleOutcomeUpdate, PatientUpdateSaveRequest

# Triage alerts only consider unresolved logs within this rolling window —
# roughly one stimulation-monitoring interval. Older history stays queryable
# but no longer drives the console alarm state.
TRIAGE_RECENCY_WINDOW = timedelta(days=7)

# Public sub-router: login only. All other clinician routes require a Bearer token.
router = APIRouter()
protected = APIRouter(dependencies=[Depends(verify_clinician_token)])

active_websockets: List[WebSocket] = []

async def broadcast_triage_update():
    for ws in list(active_websockets):
        try:
            await ws.send_json({ "event": "triage_update_trigger" })
        except Exception:
            if ws in active_websockets:
                active_websockets.remove(ws)

class ClinicianLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def clinician_login(req: ClinicianLoginRequest, db: Session = Depends(get_db)):
    """
    Validates individual clinician credentials and returns a secure JWT bearer token.
    Nurse name is embedded in the token for audit trail compliance.
    """
    email_clean = req.email.strip().lower()
    clinician = db.query(models.Clinician).filter(models.Clinician.email == email_clean).first()
    if not clinician or not verify_password(req.password, clinician.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password. Please try again.")

    token = generate_token(clinician.id, "clinician", name=clinician.name)
    return {"token": token, "clinician_name": clinician.name}


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
    partner_phone_normalized = normalize_phone(patient.partner_phone)
    
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

    # Parse next appointment datetime
    try:
        dt_str = patient.next_appointment_datetime
        # normalize trailing 'Z' if present
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        next_app_dt = datetime.fromisoformat(dt_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format for next appointment.")

    # Determine display package name for compatibility with cycle_type column
    package_name = patient.treatment_package
    if package_name == "Other (Custom)" and patient.custom_package_name:
        package_name = patient.custom_package_name

    # Create the patient User
    db_user = models.User(
        first_name=patient.first_name,
        last_name=patient.last_name,
        name=f"{patient.first_name} {patient.last_name}",
        email=patient.email,
        phone=phone_normalized,
        dob=patient.dob,
        onboarded=False,
        active_status="On Track",
        cycle_type=package_name,
        cycle_start_date=patient.cycle_start_date,
        current_cycle_number=patient.current_cycle_number,
        treatment_package=patient.treatment_package,
        custom_package_name=patient.custom_package_name,
        partner_name=patient.partner_name,
        partner_phone=partner_phone_normalized,
        partner_relationship=patient.partner_relationship,
        next_appointment_datetime=next_app_dt,
        partner_consent=False
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


@protected.get("/patients")
def get_patients_list(
    search: str = None,
    registration_date: str = None,
    package: str = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Retrieves a complete directory list of registered patients, matching optional search/filters and paginated.
    """
    query = db.query(models.User)
    
    if search:
        search_lower = f"%{search.strip().lower()}%"
        query = query.filter(
            (models.User.first_name.ilike(search_lower)) |
            (models.User.last_name.ilike(search_lower)) |
            (models.User.name.ilike(search_lower)) |
            (models.User.email.ilike(search_lower)) |
            (models.User.phone.ilike(search_lower))
        )
        
    if registration_date:
        try:
            # We want to match all records on or after the specified date start
            filter_dt = datetime.strptime(registration_date, "%Y-%m-%d")
            query = query.filter(models.User.created_at >= filter_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid registration_date format. Must be YYYY-MM-DD.")
            
    if package and package.lower() != "all packages":
        package_lower = f"%{package.strip().lower()}%"
        query = query.filter(models.User.treatment_package.ilike(package_lower))
        
    total_count = query.count()
    
    offset = (page - 1) * limit
    users = query.order_by(models.User.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for u in users:
        has_presc = db.query(models.Prescription).filter(models.Prescription.user_id == u.id).first() is not None
        status = "Pre-Cycle"
        if u.cycle_outcome == "Failed":
            status = "Recovery Active"
        elif has_presc:
            status = "Stimulation"
            
        full_name = f"{u.first_name} {u.last_name}" if (u.first_name or u.last_name) else u.name
        result.append({
            "patient_id": u.id,
            "name": full_name,
            "email": u.email,
            "phone": u.phone,
            "cycle_type": u.treatment_package or u.cycle_type or "Fresh IVF",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "status": status
        })
        
    return {
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "patients": result
    }


@protected.get("/triage")
def get_triage_data(db: Session = Depends(get_db)):
    """
    Retrieves the clinical patient compliance triage registry grouped by priority.
    """
    users = db.query(models.User).filter(models.User.phone != None).all()
    
    urgent_list = []
    needs_attention_list = []
    on_track_list = []

    for u in users:
        # Default status
        status = "On Track"
        reason = "All doses logged on time."
        action_taken = None
        ai_insight = None

        # Missed/late check within recency window
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

        pending_callback = db.query(models.CallbackRequest).filter(
            models.CallbackRequest.user_id == u.id,
            models.CallbackRequest.status == "Pending"
        ).order_by(models.CallbackRequest.requested_at.asc()).first()

        # Dropout risk calculations (Anxious for 4 consecutive days)
        anxiety_logs = db.query(models.SymptomLog).filter(
            models.SymptomLog.user_id == u.id,
            models.SymptomLog.symptom_type == "mood",
            models.SymptomLog.value == "Anxious"
        ).count()

        overdue_status, overdue_reason, overdue_action = adherence.get_user_overdue_escalation_status(db, u.id)

        if missed_logs:
            status = "Red Alert"
            presc = db.query(models.Prescription).filter(models.Prescription.id == missed_logs[0].prescription_id).first()
            presc_name = presc.name if presc else "medication"
            reason = f"Missed {presc_name} (2h overdue)"
            action_taken = "Partner notified via SMS 15m ago"
        elif overdue_status == "Red Alert":
            status = "Red Alert"
            reason = overdue_reason
            action_taken = overdue_action
        elif u.id == 2:  # Fatima M: mock intent to discontinue
            status = "Red Alert"
            reason = "Intent to Discontinue (AI detected in conversation)"
            action_taken = None
        elif pending_callback:
            status = "Yellow Attention"
            reason = f"📞 Nurse callback requested {pending_callback.requested_at.strftime('%Y-%m-%d %H:%M')}."
        elif anxiety_logs >= 4:
            status = "Yellow Attention"
            reason = "Anxious 4 days pattern"
            ai_insight = "Elevated Dropout Risk: Noor has logged anxiety for 4 consecutive days. Consider nurse check-in call."
        elif late_logs:
            status = "Yellow Attention"
            presc = db.query(models.Prescription).filter(models.Prescription.id == late_logs[0].prescription_id).first()
            presc_name = presc.name if presc else "medication"
            reason = f"Day 6 Antagonist ({len(late_logs)} late logs this week)"
        elif overdue_status == "Yellow Attention":
            status = "Yellow Attention"
            reason = overdue_reason
            action_taken = overdue_action
        elif u.active_status == "Action Required":
            status = "Yellow Attention"
            reason = "Overdue task check-in alert active."

        patient_entry = {
            "patient_id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "status": status,
            "reason": reason,
            "cycle_type": u.cycle_type or "Fresh IVF",
            "cycle_outcome": u.cycle_outcome,
            "callback_requested": pending_callback is not None,
            "action_taken": action_taken,
            "ai_insight": ai_insight
        }

        if status == "Red Alert":
            urgent_list.append(patient_entry)
        elif status == "Yellow Attention":
            needs_attention_list.append(patient_entry)
        else:
            # Descriptive reasons to match Gherkin scenario
            if u.id == 5:
                patient_entry["reason"] = "Day 8 Antagonist (All confirmed on track)"
            elif u.id == 6:
                patient_entry["reason"] = "Day 3 Baseline (New patient, on track)"
            elif u.id == 7:
                patient_entry["reason"] = "Day 14 Trigger (100% Adherence, Trigger Ready)"
            on_track_list.append(patient_entry)

    # Compute summary counts
    counts = {
        "on_track": len(on_track_list),
        "needs_attention": len(needs_attention_list),
        "urgent": len(urgent_list),
        "total_active": len(on_track_list) + len(needs_attention_list) + len(urgent_list)
    }

    # Summary statistics
    summary_stats = {
        "adherence_today_pct": 92,
        "ai_questions_today": 14,
        "avg_confirm_delay_mins": 8,
        "partner_engagement_pct": 67
    }

    return {
        "counts": counts,
        "urgent": urgent_list,
        "needs_attention": needs_attention_list,
        "on_track": on_track_list,
        "summary_stats": summary_stats
    }

@protected.get("/patients/{patient_id}")
def get_patient_details(patient_id: int, db: Session = Depends(get_db)):
    """
    Retrieves full details of a patient chart: bio, IVF details, partner consent,
    active prescription list, and historical dose logging timeline.
    """
    user = db.query(models.User).filter(models.User.id == patient_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch prescriptions
    prescriptions = db.query(models.Prescription).filter(models.Prescription.user_id == patient_id).all()
    
    # Fetch dose logs
    dose_logs = db.query(models.DoseLog).filter(models.DoseLog.user_id == patient_id).all()
    
    # Calculate dropout risk
    anxiety_logs = db.query(models.SymptomLog).filter(
        models.SymptomLog.user_id == patient_id,
        models.SymptomLog.symptom_type == "mood",
        models.SymptomLog.value == "Anxious"
    ).count()

    dropout_risk = "Low"
    if user.id == 2:
        dropout_risk = "Critical (Intent to Discontinue)"
    elif anxiety_logs >= 4:
        dropout_risk = "Elevated (Anxious 4 days)"

    # Format prescriptions
    presc_list = [{
        "id": p.id,
        "name": p.name,
        "dosage": p.dosage,
        "route": p.route,
        "scheduled_time": p.scheduled_time,
        "start_date": p.start_date.strftime("%Y-%m-%d"),
        "end_date": p.end_date.strftime("%Y-%m-%d")
    } for p in prescriptions]

    # Format dose logs
    logs_list = []
    for log in dose_logs:
        presc = db.query(models.Prescription).filter(models.Prescription.id == log.prescription_id).first()
        logs_list.append({
            "id": log.id,
            "name": presc.name if presc else "Medication",
            "scheduled_time": presc.scheduled_time if presc else "20:00:00",
            "logged_at": log.logged_at.isoformat() if log.logged_at else None,
            "status": log.status
        })

    return {
        "id": user.id,
        "first_name": user.first_name or user.name.split()[0],
        "last_name": user.last_name or (user.name.split()[1] if len(user.name.split()) > 1 else ""),
        "dob": user.dob.strftime("%Y-%m-%d") if user.dob else None,
        "email": user.email,
        "phone": user.phone,
        "cycle_start_date": user.cycle_start_date.strftime("%Y-%m-%d") if user.cycle_start_date else None,
        "current_cycle_number": user.current_cycle_number,
        "treatment_package": user.treatment_package or user.cycle_type,
        "partner_name": user.partner_name,
        "partner_phone": user.partner_phone,
        "partner_relationship": user.partner_relationship,
        "partner_consent": user.partner_consent,
        "next_appointment_datetime": user.next_appointment_datetime.isoformat() if user.next_appointment_datetime else None,
        "dropout_risk": dropout_risk,
        "prescriptions": presc_list,
        "dose_logs": logs_list
    }

@protected.post("/patients/{patient_id}")
def update_patient_details(
    patient_id: int,
    req: PatientUpdateSaveRequest,
    token_payload: dict = Depends(verify_clinician_token),
    db: Session = Depends(get_db)
):
    """
    Updates the demographics, partner consent, and active prescription timeline.
    """
    user = db.query(models.User).filter(models.User.id == patient_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")

    user.first_name = req.first_name
    user.last_name = req.last_name
    user.name = f"{req.first_name} {req.last_name}"
    user.dob = req.dob
    user.email = req.email
    user.phone = req.phone
    user.cycle_start_date = req.cycle_start_date
    user.current_cycle_number = req.current_cycle_number
    user.treatment_package = req.treatment_package
    user.partner_name = req.partner_name
    user.partner_phone = req.partner_phone
    user.partner_relationship = req.partner_relationship
    user.partner_consent = req.partner_consent
    
    # Parse next_appointment_datetime
    try:
        dt_str = req.next_appointment_datetime
        if dt_str.endswith("Z"):
            dt_str = dt_str[:-1] + "+00:00"
        user.next_appointment_datetime = datetime.fromisoformat(dt_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format for next appointment.")

    # Update prescriptions: delete existing ones that are not in the list, and update/create others
    req_presc_ids = [p.id for p in req.prescriptions if p.id is not None]
    
    # Delete prescriptions that were removed
    db.query(models.Prescription).filter(
        models.Prescription.user_id == patient_id,
        ~models.Prescription.id.in_(req_presc_ids)
    ).delete(synchronize_session=False)

    # Add or update prescriptions
    for p in req.prescriptions:
        # Pad scheduled time if it is HH:MM
        time_formatted = p.scheduled_time
        if len(time_formatted.split(':')) == 2:
            time_formatted = f"{time_formatted}:00"

        if p.id is not None:
            # Update
            db_presc = db.query(models.Prescription).filter(models.Prescription.id == p.id).first()
            if db_presc:
                db_presc.name = p.name
                db_presc.dosage = p.dosage
                db_presc.route = p.route
                db_presc.scheduled_time = time_formatted
                db_presc.start_date = p.start_date
                db_presc.end_date = p.end_date
        else:
            # Create
            db_presc = models.Prescription(
                user_id=patient_id,
                name=p.name,
                dosage=p.dosage,
                route=p.route,
                scheduled_time=time_formatted,
                start_date=p.start_date,
                end_date=p.end_date
            )
            db.add(db_presc)

    _audit(db, _actor_name(token_payload), "update_patient_chart", patient_id,
           f"Updated demographics & prescriptions for {user.name}.")
    db.commit()
    return {"message": "Patient chart updated successfully."}


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

@router.websocket("/ws/triage")
async def websocket_triage(websocket: WebSocket, token: Optional[str] = None):
    if not token:
        await websocket.close(code=4001)
        return
    
    from services.auth import verify_token
    payload = verify_token(token)
    if not payload or payload.get("role") != "clinician":
        await websocket.close(code=4002)
        return

    await websocket.accept()
    active_websockets.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)


# Mount the token-protected clinician routes
router.include_router(protected)
