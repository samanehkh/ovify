from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_recovery.db"
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
        active_status="Action Required",
        cycle_outcome=None
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

def test_update_outcome_failed_success(client, test_db):
    # Verify they have active medications originally
    response_meds = client.get("/api/medications/?user_id=1")
    assert response_meds.status_code == 200
    assert len(response_meds.json()) == 1

    # Clinician records cycle outcome as "Failed"
    response = client.post("/api/clinician/update-outcome/1", json={"cycle_outcome": "Failed"})
    assert response.status_code == 200
    data = response.json()
    assert data["cycle_outcome"] == "Failed"
    
    # Verify User database record is updated
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    assert user.cycle_outcome == "Failed"
    # Verify user active alert status is cleared to "On Track"
    assert user.active_status == "On Track"
    
    # Verify GET medications now returns [] (halting alarms)
    response_meds_after = client.get("/api/medications/?user_id=1")
    assert response_meds_after.status_code == 200
    assert len(response_meds_after.json()) == 0

def test_update_outcome_not_found(client):
    response = client.post("/api/clinician/update-outcome/999", json={"cycle_outcome": "Failed"})
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]

def test_update_outcome_success_preserves_meds(client, test_db):
    # Clinician records cycle outcome as "Success"
    response = client.post("/api/clinician/update-outcome/1", json={"cycle_outcome": "Success"})
    assert response.status_code == 200
    data = response.json()
    assert data["cycle_outcome"] == "Success"
    
    # Verify User database record is updated
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    assert user.cycle_outcome == "Success"
    
    # Verify GET medications still returns 1 active prescription (preserves alerts)
    response_meds = client.get("/api/medications/?user_id=1")
    assert response_meds.status_code == 200
    assert len(response_meds.json()) == 1

def test_update_outcome_null_resets_outcome(client, test_db):
    # Setup initial outcome to Failed
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    user.cycle_outcome = "Failed"
    test_db.commit()
    
    # Clinician resets cycle outcome to null
    response = client.post("/api/clinician/update-outcome/1", json={"cycle_outcome": None})
    assert response.status_code == 200
    data = response.json()
    assert data["cycle_outcome"] is None
    
    # Verify database update
    assert user.cycle_outcome is None
    
    # Verify medications are active again
    response_meds = client.get("/api/medications/?user_id=1")
    assert response_meds.status_code == 200
    assert len(response_meds.json()) == 1

