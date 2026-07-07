from datetime import date, datetime, time, timezone, timedelta
from sqlalchemy.orm import Session
from db import models

# Global UAE Timezone
UAE_TZ = timezone(timedelta(hours=4))

def check_overdue_doses(db: Session) -> list[str]:
    """
    Checks active prescriptions for today. If any dose is more than 60 minutes
    overdue and has not been logged, trigger a partner notification and return the logged message.
    """
    uae_now = datetime.now(UAE_TZ)
    today = uae_now.date()
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
                parts = p.scheduled_time.split(":")
                if len(parts) == 2:
                    hour, minute = map(int, parts)
                    second = 0
                else:
                    hour, minute, second = map(int, parts)
                scheduled_dt = datetime.combine(today, time(hour, minute, second)).replace(tzinfo=UAE_TZ)
            except ValueError:
                continue

            # Check if current time is more than 60 minutes past scheduled time
            if uae_now > (scheduled_dt + timedelta(minutes=60)):
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
            # Create a "Missed" dose log at the end of target day
            logged_at = datetime.combine(target_date, time(23, 59, 59)).replace(tzinfo=UAE_TZ)
            db_log = models.DoseLog(
                user_id=p.user_id,
                prescription_id=p.id,
                logged_at=logged_at,
                scheduled_date=target_date,
                status="Missed",
                self_reported=False
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

def auto_clear_user_alert(db: Session, user_id: int):
    """
    Checks if the user has any overdue, unconfirmed doses today.
    If all scheduled doses today that are overdue have been taken,
    auto-resolves the user status back to 'On Track'.
    """
    uae_now = datetime.now(UAE_TZ)
    today = uae_now.date()
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
        
    # Check today's active prescriptions
    prescriptions = db.query(models.Prescription).filter(
        models.Prescription.user_id == user_id,
        models.Prescription.start_date <= today,
        models.Prescription.end_date >= today
    ).all()
    
    overdue_unconfirmed = False
    for p in prescriptions:
        log = db.query(models.DoseLog).filter(
            models.DoseLog.prescription_id == p.id,
            models.DoseLog.scheduled_date == today
        ).first()
        
        if not log:
            try:
                parts = p.scheduled_time.split(":")
                if len(parts) == 2:
                    s_hour, s_minute = map(int, parts)
                    s_second = 0
                else:
                    s_hour, s_minute, s_second = map(int, parts)
                scheduled_dt = datetime.combine(today, time(s_hour, s_minute, s_second)).replace(tzinfo=UAE_TZ)
                
                # Overdue threshold: 120 minutes past scheduled time
                if uae_now > (scheduled_dt + timedelta(minutes=120)):
                    overdue_unconfirmed = True
                    break
            except ValueError:
                continue
                
    if not overdue_unconfirmed:
        user.active_status = "On Track"
        db.commit()

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
