from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_triage.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Setup test patient
    user = models.User(
        id=1,
        name="Sarah Khan",
        email="sarah@example.com",
        phone="+971501234567",
        active_status="On Track",
        cycle_type="Fresh IVF"
    )
    db.add(user)
    db.commit()
    
    p = models.Prescription(
        id=1,
        user_id=1,
        name="Gonal-F",
        dosage="150 IU",
        route="Subcutaneous",
        scheduled_time="19:00:00",
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() + timedelta(days=5)
    )
    db.add(p)
    db.commit()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_triage_empty_or_on_track(client):
    # For a newly registered compliant user, status is "On Track"
    response = client.get("/api/clinician/triage")
    assert response.status_code == 200
    data = response.json()
    assert data["counts"]["on_track"] == 1
    assert data["on_track"][0]["name"] == "Sarah Khan"
    assert data["on_track"][0]["status"] == "On Track"
    assert "All doses logged" in data["on_track"][0]["reason"]

def test_triage_red_alert_missed_dose(client, test_db):
    # Log a missed dose in database
    missed_log = models.DoseLog(
        prescription_id=1,
        user_id=1,
        status="Missed",
        scheduled_date=date.today() - timedelta(days=1)
    )
    test_db.add(missed_log)
    test_db.commit()
    
    # Verify triage console catches it and ranks as "Red Alert"
    response = client.get("/api/clinician/triage")
    assert response.status_code == 200
    data = response.json()
    assert data["counts"]["urgent"] == 1
    assert data["urgent"][0]["status"] == "Red Alert"
    assert "Missed Gonal-F" in data["urgent"][0]["reason"]

def test_triage_yellow_attention_late_dose(client, test_db):
    # Log a late dose in database
    late_log = models.DoseLog(
        prescription_id=1,
        user_id=1,
        status="Late",
        scheduled_date=date.today() - timedelta(days=1)
    )
    test_db.add(late_log)
    test_db.commit()
    
    # Verify triage console catches it and ranks as "Yellow Attention"
    response = client.get("/api/clinician/triage")
    assert response.status_code == 200
    data = response.json()
    assert data["counts"]["needs_attention"] == 1
    assert data["needs_attention"][0]["status"] == "Yellow Attention"
    assert "Day 6 Antagonist" in data["needs_attention"][0]["reason"]

def test_resolve_alert_happy_path(client, test_db):
    # Setup missed dose to trigger Red Alert
    missed_log = models.DoseLog(
        prescription_id=1,
        user_id=1,
        status="Missed",
        scheduled_date=date.today() - timedelta(days=1)
    )
    test_db.add(missed_log)
    
    # Update active status
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    user.active_status = "Action Required"
    test_db.commit()
    
    # Call resolve alert
    response = client.post("/api/clinician/resolve-alert/1")
    assert response.status_code == 200
    assert "resolved successfully" in response.json()["message"]
    
    # Verify DB user reset
    assert user.active_status == "On Track"

    # AUDIT TRAIL: the original status is preserved — resolution never rewrites
    # clinical history. The log is flagged resolved with nurse attribution.
    resolved_log = test_db.query(models.DoseLog).filter(models.DoseLog.user_id == 1).first()
    test_db.refresh(resolved_log)
    assert resolved_log.status == "Missed"          # truth preserved
    assert resolved_log.resolved is True
    assert resolved_log.resolved_by == "Test Nurse"
    assert resolved_log.resolved_at is not None

    # An audit event was written for the resolution
    audit = test_db.query(models.AuditLog).filter(
        models.AuditLog.action == "resolve_alert",
        models.AuditLog.target_user_id == 1
    ).first()
    assert audit is not None
    assert audit.actor == "Test Nurse"

    # Verify triage is now "On Track" (resolved logs no longer rank)
    response_triage = client.get("/api/clinician/triage")
    assert response_triage.json()["counts"]["on_track"] == 1

def test_resolve_alert_unhappy_path_not_found(client):
    # Pass a valid user_id structure
    response = client.post("/api/clinician/resolve-alert/999")
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]


def test_triage_recency_window_old_missed_does_not_rank(client, test_db):
    # D8: an unresolved Missed from 10 days ago must NOT keep the patient Red
    old_missed = models.DoseLog(
        prescription_id=1,
        user_id=1,
        status="Missed",
        scheduled_date=date.today() - timedelta(days=10)
    )
    test_db.add(old_missed)
    test_db.commit()

    data = client.get("/api/clinician/triage").json()
    assert data["counts"]["on_track"] == 1

    # ...but a recent Missed (yesterday) still ranks Red
    recent_missed = models.DoseLog(
        prescription_id=1,
        user_id=1,
        status="Missed",
        scheduled_date=date.today() - timedelta(days=1)
    )
    test_db.add(recent_missed)
    test_db.commit()

    data = client.get("/api/clinician/triage").json()
    assert data["counts"]["urgent"] == 1

def test_get_patient_details(client):
    response = client.get("/api/clinician/patients/1")
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Sarah"
    assert data["last_name"] == "Khan"
    assert len(data["prescriptions"]) == 1
    assert data["prescriptions"][0]["name"] == "Gonal-F"

def test_update_patient_details(client, test_db):
    update_payload = {
        "first_name": "Sarah",
        "last_name": "Khan-Edited",
        "dob": "1992-05-15",
        "email": "sarah.edited@example.com",
        "phone": "+971501234567",
        "cycle_start_date": str(date.today()),
        "current_cycle_number": 2,
        "treatment_package": "3-Cycle Egg/Embryo Accumulation",
        "partner_name": "Ahmed Khan",
        "partner_phone": "+971509999999",
        "partner_relationship": "Spouse/Partner",
        "partner_consent": True,
        "next_appointment_datetime": "2026-07-15T09:00:00Z",
        "prescriptions": [
            {
                "id": 1, # Existing Gonal-F
                "name": "Gonal-F",
                "dosage": "225 IU", # edited dosage
                "route": "Subcutaneous",
                "scheduled_time": "19:00:00",
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=5))
            },
            {
                "name": "Menopur", # newly added
                "dosage": "75 IU",
                "route": "Subcutaneous",
                "scheduled_time": "19:00:00",
                "start_date": str(date.today()),
                "end_date": str(date.today() + timedelta(days=5))
            }
        ]
    }
    response = client.post("/api/clinician/patients/1", json=update_payload)
    assert response.status_code == 200
    assert "updated successfully" in response.json()["message"]

    # Verify db state updated
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    test_db.refresh(user)
    assert user.last_name == "Khan-Edited"
    assert user.current_cycle_number == 2

    prescs = test_db.query(models.Prescription).filter(models.Prescription.user_id == 1).all()
    assert len(prescs) == 2
    gonal = next(p for p in prescs if p.name == "Gonal-F")
    assert gonal.dosage == "225 IU"


def test_get_patient_directory_search_and_filters(client):
    # Test directory search
    response = client.get("/api/clinician/patients?search=Sarah")
    assert response.status_code == 200
    data = response.json()
    assert data["total_count"] == 1
    assert len(data["patients"]) == 1
    assert data["patients"][0]["name"] == "Sarah Khan"

    # Filter with non-matching package
    res_empty = client.get("/api/clinician/patients?package=NonexistentPackage")
    assert res_empty.status_code == 200
    empty_data = res_empty.json()
    assert empty_data["total_count"] == 0
    assert len(empty_data["patients"]) == 0


def test_cross_system_real_time_triage_update(client, test_db):
    # 1. Setup a missed dose to trigger Red Alert
    missed_log = models.DoseLog(
        prescription_id=1,
        user_id=1,
        status="Missed",
        scheduled_date=date.today(),
        resolved=False
    )
    test_db.add(missed_log)
    # Mark user active_status to Action Required
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    user.active_status = "Action Required"
    test_db.commit()

    # Verify triage catches the red alert
    response = client.get("/api/clinician/triage")
    assert response.status_code == 200
    assert response.json()["counts"]["urgent"] == 1

    # 2. Log injection from Patient PWA using patient token
    from services.auth import generate_token
    pt_token = generate_token(1, "patient")

    confirm_res = client.post(
        "/api/medications/1/confirm",
        headers={"Authorization": f"Bearer {pt_token}"}
    )
    assert confirm_res.status_code == 200

    # 3. Refreshed/polled triage dashboard shows patient is moved back to On Track
    triage_res = client.get("/api/clinician/triage")
    assert triage_res.status_code == 200
    data = triage_res.json()

    assert data["counts"]["urgent"] == 0
    assert data["counts"]["on_track"] == 1
    assert data["on_track"][0]["name"] == "Sarah Khan"
    assert data["on_track"][0]["status"] == "On Track"

