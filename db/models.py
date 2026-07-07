from sqlalchemy import Column, Date, ForeignKey, String, TIMESTAMP, Integer, Boolean
from sqlalchemy.sql import func
from db.session import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, unique=True, nullable=True)
    sleep_time = Column(String, nullable=True)
    injection_comfort = Column(String, nullable=True)
    onboarded = Column(Boolean, default=False, nullable=False)
    active_status = Column(String, default="On Track", nullable=False)  # e.g., "On Track" or "Action Required"
    cycle_type = Column(String, nullable=True)
    cycle_outcome = Column(String, nullable=True)
    partner_phone = Column(String, nullable=True)
    partner_consent = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Cycle(Base):
    __tablename__ = "cycles"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)

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
