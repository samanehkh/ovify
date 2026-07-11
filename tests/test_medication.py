from datetime import date, datetime, time, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models

# Use a temporary SQLite database for isolated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    # Setup: Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed a test user
    user = models.User(id=1, name="Sarah", email="sarah@example.com")
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed test prescriptions:
    # 1. Gonal-F: scheduled for 8:00 PM (20:00:00)
    # 2. Menopur: scheduled for 8:00 PM (20:00:00)
    p1 = models.Prescription(
        id=1,
        user_id=1,
        name="Gonal-F",
        dosage="150 IU",
        route="Subcutaneous",
        scheduled_time="20:00:00",
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() + timedelta(days=5)
    )
    p2 = models.Prescription(
        id=2,
        user_id=1,
        name="Menopur",
        dosage="75 IU",
        route="Subcutaneous",
        scheduled_time="20:00:00",
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() + timedelta(days=5)
    )
    db.add_all([p1, p2])
    db.commit()

    try:
        yield db
    finally:
        db.close()
        # Teardown: Drop tables
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

def test_get_daily_medications(client):
    response = client.get("/api/medications/?user_id=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    
    names = [med["name"] for med in data]
    assert "Gonal-F" in names
    assert "Menopur" in names
    
    statuses = [med["status"] for med in data]
    assert all(status == "Due" for status in statuses)

def test_confirm_dose_on_time(client, test_db):
    now = datetime.now()
    # Set Gonal-F (id 1) scheduled time to be 1 hour in the past
    sched_dt = now - timedelta(hours=1)
    p1 = test_db.query(models.Prescription).filter(models.Prescription.id == 1).first()
    p1.scheduled_time = sched_dt.time().strftime("%H:%M:%S")
    test_db.commit()
    
    # Log at 45 minutes in the past -> within 60 minutes window -> On Time
    actual_dt = now - timedelta(minutes=45)
    actual_time_str = actual_dt.time().strftime("%H:%M:%S")
    
    response = client.post(f"/api/medications/1/confirm?actual_time={actual_time_str}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "On Time"
    assert data["prescription_id"] == 1

    # Verify status updates to Taken in GET
    response_get = client.get("/api/medications/")
    data_get = response_get.json()
    gonal = next(m for m in data_get if m["id"] == 1)
    assert gonal["status"] == "Taken"
    assert gonal["log_status"] == "On Time"

def test_confirm_dose_late(client, test_db):
    now = datetime.now()
    sched_dt = now - timedelta(hours=3)
    p2 = test_db.query(models.Prescription).filter(models.Prescription.id == 2).first()
    p2.scheduled_time = sched_dt.time().strftime("%H:%M:%S")
    test_db.commit()
    
    actual_dt = now - timedelta(hours=1.5)
    actual_time_str = actual_dt.time().strftime("%H:%M:%S")
    
    response = client.post(f"/api/medications/2/confirm?actual_time={actual_time_str}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Late"
    assert data["prescription_id"] == 2

    # Verify status updates to Taken in GET
    response_get = client.get("/api/medications/")
    data_get = response_get.json()
    menopur = next(m for m in data_get if m["id"] == 2)
    assert menopur["status"] == "Taken"
    assert menopur["log_status"] == "Late"

def test_double_confirm_error(client, test_db):
    now = datetime.now()
    # Set Gonal-F (id 1) scheduled time to be 1 hour in the past
    sched_dt = now - timedelta(hours=1)
    p1 = test_db.query(models.Prescription).filter(models.Prescription.id == 1).first()
    p1.scheduled_time = sched_dt.time().strftime("%H:%M:%S")
    test_db.commit()
    
    # Log first time (45 minutes in the past)
    actual_dt = now - timedelta(minutes=45)
    actual_time_str = actual_dt.time().strftime("%H:%M:%S")
    response1 = client.post(f"/api/medications/1/confirm?actual_time={actual_time_str}")
    assert response1.status_code == 200
    
    # Log second time on same day -> expect 400 Bad Request
    actual_dt2 = now - timedelta(minutes=40)
    actual_time_str2 = actual_dt2.time().strftime("%H:%M:%S")
    response2 = client.post(f"/api/medications/1/confirm?actual_time={actual_time_str2}")
    assert response2.status_code == 400
    assert response2.json()["detail"] == "Medication already logged for today"

def test_invalid_user_or_prescription(client):
    # Invalid user: generate real token for user 999
    from services.auth import generate_token
    token = generate_token(999, "patient")
    response = client.get("/api/medications/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404
    
    # Invalid prescription confirmation
    response_confirm = client.post("/api/medications/999/confirm?user_id=1")
    assert response_confirm.status_code == 404

def test_check_overdue_alerts(client, test_db):
    now = datetime.now()
    # Set prescription 1 (Gonal-F) scheduled_time to be 2 hours in the past
    overdue_time = (now - timedelta(hours=2)).time().strftime("%H:%M:%S")
    
    p1 = test_db.query(models.Prescription).filter(models.Prescription.id == 1).first()
    p1.scheduled_time = overdue_time
    
    p2 = test_db.query(models.Prescription).filter(models.Prescription.id == 2).first()
    if p2:
        test_db.delete(p2)
    test_db.commit()
    
    response = client.post("/api/medications/check-overdue")
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) == 1
    assert "Sarah has not confirmed her" in alerts[0]
    assert "Gonal-F" in alerts[0]

def test_process_missed_doses(client, test_db):
    # Run end-of-day missed check for today
    response = client.post("/api/medications/process-missed")
    assert response.status_code == 200
    assert response.json()["message"] == "Processed missed doses. 2 doses logged as Missed."
    
    # Sarah's active_status should update to "Action Required"
    response_user = client.get("/users/1")
    assert response_user.status_code == 200
    assert response_user.json()["active_status"] == "Action Required"
    
    # Verify status updates to "Missed" in GET medications
    response_get = client.get("/api/medications/?user_id=1")
    assert response_get.status_code == 200
    data = response_get.json()
    assert len(data) == 2
    assert data[0]["status"] == "Missed"
    assert data[0]["log_status"] == "Missed"
