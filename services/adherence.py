from datetime import date, datetime, time, timedelta
from sqlalchemy.orm import Session
from db import models

def check_overdue_doses(db: Session) -> list[str]:
    """
    Checks active prescriptions for today. If any dose is more than 60 minutes
    overdue and has not been logged, trigger a partner notification and return the logged message.
    """
    today = date.today()
    now = datetime.now()
    alerts = []

    # Get active prescriptions for today
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.start_date <= today,
        models.Prescription.end_date >= today
    ).all()

    for p in prescriptions:
        # Check if already logged today
        log = db.query(models.DoseLog).filter(
            models.DoseLog.prescription_id == p.id,
            models.DoseLog.scheduled_date == today
        ).first()

        if not log:
            # Parse scheduled time
            try:
                hour, minute, second = map(int, p.scheduled_time.split(":"))
                scheduled_dt = datetime.combine(today, time(hour, minute, second))
            except ValueError:
                continue

            # Check if current time is more than 60 minutes past scheduled time
            if now > (scheduled_dt + timedelta(minutes=60)):
                user = db.query(models.User).filter(models.User.id == p.user_id).first()
                username = user.name if user else f"User {p.user_id}"
                
                # Format the webhook alert message
                message = f"{username} has not confirmed her {format_time_12h(p.scheduled_time)} {p.name} injection yet."
                alert_log = f"[PARTNER WEBHOOK ALERT] {message}"
                print(alert_log)
                alerts.append(message)
                
    return alerts

def process_end_of_day_missed_doses(db: Session, target_date: date) -> int:
    """
    Finds all active prescriptions for the target_date that remain unlogged,
    inserts a 'Missed' DoseLog record, and updates the patient's status to alert coordinators.
    """
    # Query all active prescriptions on target_date
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.start_date <= target_date,
        models.Prescription.end_date >= target_date
    ).all()

    missed_count = 0
    users_to_alert = set()

    for p in prescriptions:
        # Check if a log exists for this prescription on target_date
        log = db.query(models.DoseLog).filter(
            models.DoseLog.prescription_id == p.id,
            models.DoseLog.scheduled_date == target_date
        ).first()

        if not log:
            # Create a "Missed" dose log
            # Log it at end of the target day
            logged_at = datetime.combine(target_date, time(23, 59, 59))
            db_log = models.DoseLog(
                user_id=p.user_id,
                prescription_id=p.id,
                logged_at=logged_at,
                scheduled_date=target_date,
                status="Missed"
            )
            db.add(db_log)
            users_to_alert.add(p.user_id)
            missed_count += 1

    if missed_count > 0:
        # Update user active_status to alert coordinators
        for u_id in users_to_alert:
            user = db.query(models.User).filter(models.User.id == u_id).first()
            if user:
                user.active_status = "Action Required"
        db.commit()

    return missed_count

def format_time_12h(time_str: str) -> str:
    parts = time_str.split(':')
    if len(parts) < 2:
        return time_str
    hour = int(parts[0])
    minute = parts[1]
    ampm = 'PM' if hour >= 12 else 'AM'
    display_hour = hour % 12
    display_hour = 12 if display_hour == 0 else display_hour
    return f"{display_hour}:{minute} {ampm}"
