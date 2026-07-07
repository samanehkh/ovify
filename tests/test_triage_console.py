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
    assert len(data) == 1
    assert data[0]["name"] == "Sarah Khan"
    assert data[0]["status"] == "On Track"
    assert "All doses logged" in data[0]["reason"]

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
    assert data[0]["status"] == "Red Alert"
    assert "Missed Gonal-F injection" in data[0]["reason"]

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
    assert data[0]["status"] == "Yellow Attention"
    assert "Logged Gonal-F injection late" in data[0]["reason"]

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
    
    # Verify DB dose logs cleared to "On Time"
    cleared_log = test_db.query(models.DoseLog).filter(models.DoseLog.user_id == 1).first()
    assert cleared_log.status == "On Time"
    
    # Verify triage is now "On Track"
    response_triage = client.get("/api/clinician/triage")
    assert response_triage.json()[0]["status"] == "On Track"

def test_resolve_alert_unhappy_path_not_found(client):
    response = client.post("/api/clinician/resolve-alert/999")
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]
