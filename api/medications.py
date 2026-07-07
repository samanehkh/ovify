from datetime import date, datetime, time, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db import models
from db.session import get_db
from schemas.medication import MedicationStatusResponse, DoseLogResponse
from services import adherence

router = APIRouter()

@router.get("/", response_model=List[MedicationStatusResponse])
def get_daily_medications(user_id: int, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.cycle_outcome == "Failed":
        return []

    today = date.today()
    
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
                logged_at=log.logged_at
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
                logged_at=None
            ))

    return response

@router.post("/{prescription_id}/confirm", response_model=DoseLogResponse)
def confirm_medication_dose(
    prescription_id: int, 
    user_id: int, 
    actual_time: Optional[str] = Query(None, description="Optional reported time in HH:MM:SS format"),
    db: Session = Depends(get_db)
):
    # Verify user exists
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

    today = date.today()

    # Check if already logged for today
    existing_log = db.query(models.DoseLog).filter(
        models.DoseLog.prescription_id == prescription_id,
        models.DoseLog.scheduled_date == today
    ).first()
    if existing_log:
        raise HTTPException(status_code=400, detail="Medication already logged for today")

    now = datetime.now()

    # Parse log_time (actual injection time)
    if actual_time:
        try:
            hour, minute, second = map(int, actual_time.split(":"))
            log_time = datetime.combine(today, time(hour, minute, second))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid actual_time format. Use HH:MM:SS")
    else:
        log_time = now

    # Parse scheduled time
    try:
        s_hour, s_minute, s_second = map(int, prescription.scheduled_time.split(":"))
        scheduled_dt = datetime.combine(today, time(s_hour, s_minute, s_second))
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid scheduled time in prescription database")

    # Calculate difference in minutes
    time_diff = abs((log_time - scheduled_dt).total_seconds()) / 60.0

    # Determine status (On Time if within 60 mins, else Late)
    status = "On Time" if time_diff <= 60.0 else "Late"

    # Create dose log
    db_log = models.DoseLog(
        user_id=user_id,
        prescription_id=prescription_id,
        logged_at=log_time,
        scheduled_date=today,
        status=status
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)

    return db_log

@router.post("/check-overdue", response_model=List[str])
def trigger_overdue_check(db: Session = Depends(get_db)):
    return adherence.check_overdue_doses(db)

@router.post("/process-missed")
def trigger_process_missed(target_date: Optional[date] = Query(None), db: Session = Depends(get_db)):
    date_val = target_date or date.today()
    count = adherence.process_end_of_day_missed_doses(db, date_val)
    return {"message": f"Processed missed doses. {count} doses logged as Missed."}
