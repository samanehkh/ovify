from sqlalchemy import Column, Date, ForeignKey, String, TIMESTAMP, Integer, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    dob = Column(Date, nullable=True)  # captured at clinic registration (J1)
    sleep_time = Column(String, nullable=True)
    injection_comfort = Column(String, nullable=True)
    reminder_offset_minutes = Column(Integer, default=30, nullable=False)
    onboarded = Column(Boolean, default=False, nullable=False)
    active_status = Column(String, default="On Track", nullable=False)  # e.g., "On Track" or "Action Required"
    cycle_type = Column(String, nullable=True)
    cycle_outcome = Column(String, nullable=True)
    partner_phone = Column(String, nullable=True)
    partner_consent = Column(Boolean, default=False, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    cycle_start_date = Column(Date, nullable=True)
    current_cycle_number = Column(Integer, default=1, nullable=False)
    treatment_package = Column(String, nullable=True)
    custom_package_name = Column(String, nullable=True)
    partner_name = Column(String, nullable=True)
    partner_relationship = Column(String, nullable=True)
    next_appointment_datetime = Column(TIMESTAMP(timezone=True), nullable=True)
    day1_reported_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

class SymptomLog(Base):
    __tablename__ = "symptom_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    log_date = Column(Date, nullable=False)
    symptom_type = Column(String, nullable=False)
    value = Column(String, nullable=False)

class Prescription(Base):
    __tablename__ = "prescriptions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    route = Column(String, nullable=False)
    scheduled_time = Column(String, nullable=False)  # e.g., "20:00:00"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

class DoseLog(Base):
    __tablename__ = "dose_logs"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    logged_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    scheduled_date = Column(Date, nullable=False)  # The date this dose was scheduled for
    status = Column(String, nullable=False)  # "On Time", "Late", or "Missed"
    self_reported = Column(Boolean, default=False, nullable=False)
    # Nurse resolution NEVER rewrites status — the adherence history stays
    # truthful. A resolved Missed/Late is excluded from active triage alerts
    # but remains auditable as what actually happened.
    resolved = Column(Boolean, default=False, nullable=False)
    resolved_by = Column(String, nullable=True)   # nurse name from the clinician token
    resolved_at = Column(TIMESTAMP(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('prescription_id', 'scheduled_date', name='uq_prescription_scheduled_date'),
    )

class ProcessedDate(Base):
    __tablename__ = "processed_dates"
    run_date = Column(Date, primary_key=True, index=True)
    processed_at = Column(TIMESTAMP(timezone=True), nullable=False)

class CallbackRequest(Base):
    """A patient's request for a nurse callback (Journey 12 Recovery Mode).
    Persisted so the clinic actually sees and actions it — never a UI-only toggle."""
    __tablename__ = "callback_requests"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    status = Column(String, default="Pending", nullable=False)  # "Pending" or "Completed"
    completed_by = Column(String, nullable=True)  # nurse name
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)

class AuditLog(Base):
    """Attribution trail for clinically significant actions (UAE Health Data Law).
    Records WHO (actor from token) did WHAT to WHOSE record."""
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor = Column(String, nullable=False)         # e.g. nurse name or "patient:{id}"
    role = Column(String, nullable=False)          # "clinician" / "patient" / "system"
    action = Column(String, nullable=False)        # e.g. "register_patient", "resolve_alert"
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    detail = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

class Clinician(Base):
    """Individual clinician accounts for secure login (US-J1-00)."""
    __tablename__ = "clinicians"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="coordinator", nullable=False)  # coordinator / admin
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(String, nullable=False, unique=True)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

