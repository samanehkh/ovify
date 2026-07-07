from datetime import date, datetime, time, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from db import models
from db.session import get_db
from schemas.medication import MedicationStatusResponse, DoseLogResponse
from services import adherence
from services.auth import verify_patient_token
from core.time import UAE_TZ

router = APIRouter()

@router.get("/", response_model=List[MedicationStatusResponse])
def get_daily_medications(
    token_payload: dict = Depends(verify_patient_token), 
    db: Session = Depends(get_db)
):
    user_id = token_payload.get("user_id")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.cycle_outcome == "Failed":
        return []

    # Get current date in UAE timezone
    uae_now = datetime.now(UAE_TZ)
    today = uae_now.date()
    
    # Query active prescriptions for today
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.user_id == user_id,
        models.Prescription.start_date <= today,
        models.Prescription.end_date >= today
    ).all()

    response = []
    for p in prescriptions:
        # Check if there is a dose log for today
        log = db.query(models.DoseLog).filter(
            models.DoseLog.prescription_id == p.id,
            models.DoseLog.scheduled_date == today
        ).first()

        if log:
            status_val = "Taken" if log.status in ["On Time", "Late"] else "Missed"
            response.append(MedicationStatusResponse(
                id=p.id,
                name=p.name,
                dosage=p.dosage,
                route=p.route,
                scheduled_time=p.scheduled_time,
                start_date=p.start_date,
                end_date=p.end_date,
                status=status_val,
                log_status=log.status,
                logged_at=log.logged_at,
                self_reported=log.self_reported
            ))
        else:
            response.append(MedicationStatusResponse(
                id=p.id,
                name=p.name,
                dosage=p.dosage,
                route=p.route,
                scheduled_time=p.scheduled_time,
                start_date=p.start_date,
                end_date=p.end_date,
                status="Due",
                log_status=None,
                logged_at=None,
                self_reported=False
            ))

    return response

@router.post("/{prescription_id}/confirm", response_model=DoseLogResponse)
def confirm_medication_dose(
    prescription_id: int, 
    actual_time: Optional[str] = Query(None, description="Optional reported time in HH:MM:SS format"),
    token_payload: dict = Depends(verify_patient_token),
    db: Session = Depends(get_db)
):
    user_id = token_payload.get("user_id")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify prescription exists and belongs to user
    prescription = db.query(models.Prescription).filter(
        models.Prescription.id == prescription_id,
        models.Prescription.user_id == user_id
    ).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Get current time in UAE timezone
    now = datetime.now(UAE_TZ)
    today = now.date()

    self_reported = False
    if actual_time:
        self_reported = True
        try:
            parts = actual_time.split(":")
            if len(parts) == 2:
                hour, minute = map(int, parts)
                second = 0
            elif len(parts) == 3:
                hour, minute, second = map(int, parts)
            else:
                raise ValueError
            
            # Combine with today, attach UAE timezone
            log_time = datetime.combine(today, time(hour, minute, second)).replace(tzinfo=UAE_TZ)
            
            # Guardrail 1: Reject future times
            if log_time > now:
                raise HTTPException(status_code=400, detail="Dose confirmation time cannot be in the future")
            
            # Guardrail 2: Clamp to a plausible 24-hour window
            if log_time < now - timedelta(hours=24):
                raise HTTPException(status_code=400, detail="Dose confirmation time cannot be more than 24 hours in the past")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid actual_time format. Use HH:MM:SS or HH:MM")
    else:
        log_time = now

    # Parse scheduled time and resolve closest target date (cross-midnight handling)
    try:
        parts = prescription.scheduled_time.split(":")
        if len(parts) == 2:
            s_hour, s_minute = map(int, parts)
            s_second = 0
        else:
            s_hour, s_minute, s_second = map(int, parts)
        
        scheduled_today = datetime.combine(today, time(s_hour, s_minute, s_second)).replace(tzinfo=UAE_TZ)
        scheduled_prev = scheduled_today - timedelta(days=1)
        scheduled_next = scheduled_today + timedelta(days=1)
        
        # Select closest scheduled candidate date to log_time
        candidates = [scheduled_prev, scheduled_today, scheduled_next]
        scheduled_dt = min(candidates, key=lambda dt: abs((log_time - dt).total_seconds()))
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid scheduled time in prescription database")

    # Check if already logged for this resolved target date
    target_date = scheduled_dt.date()
    existing_log = db.query(models.DoseLog).filter(
        models.DoseLog.prescription_id == prescription_id,
        models.DoseLog.scheduled_date == target_date
    ).first()
    if existing_log:
        raise HTTPException(status_code=400, detail="Medication already logged for today")

    # Calculate difference in minutes (signed)
    time_diff_mins = (log_time - scheduled_dt).total_seconds() / 60.0

    # Determine status (On Time if within -15 to +60 minutes, else Late)
    status = "On Time" if -15.0 <= time_diff_mins <= 60.0 else "Late"

    # Create dose log
    db_log = models.DoseLog(
        user_id=user_id,
        prescription_id=prescription_id,
        logged_at=log_time,
        scheduled_date=target_date,
        status=status,
        self_reported=self_reported
    )
    db.add(db_log)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Medication already logged for today")
        
    db.refresh(db_log)

    # Auto-resolve alert status if all overdue doses today are successfully logged
    adherence.auto_clear_user_alert(db, user_id)

    return db_log

@router.post("/check-overdue", response_model=List[str])
def trigger_overdue_check(db: Session = Depends(get_db)):
    return adherence.check_overdue_doses(db)

@router.post("/process-missed")
def trigger_process_missed(target_date: Optional[date] = Query(None), db: Session = Depends(get_db)):
    date_val = target_date or datetime.now(UAE_TZ).date()
    count = adherence.process_end_of_day_missed_doses(db, date_val)
    return {"message": f"Processed missed doses. {count} doses logged as Missed."}
