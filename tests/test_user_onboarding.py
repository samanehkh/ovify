from datetime import date
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models

# Isolated SQLite test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_onboarding.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Seed a pre-registered patient (from clinic registration)
    user = models.User(
        id=1,
        name="Sarah",
        email="sarah@example.com",
        phone="+971501234567",
        onboarded=False
    )
    db.add(user)
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

def test_request_otp_success(client):
    response = client.post("/users/request-otp", json={"phone": "+971501234567"})
    assert response.status_code == 200
    assert response.json()["otp_sent"] is True

def test_request_otp_unregistered_number(client):
    response = client.post("/users/request-otp", json={"phone": "+971500000000"})
    assert response.status_code == 404
    assert "not registered" in response.json()["detail"]

def test_verify_otp_success(client):
    response = client.post("/users/verify-otp", json={"phone": "+971501234567", "otp": "123456"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Sarah"
    assert data["onboarded"] is False

def test_verify_otp_invalid_code(client):
    response = client.post("/users/verify-otp", json={"phone": "+971501234567", "otp": "999999"})
    assert response.status_code == 400
    assert "Invalid OTP code" in response.json()["detail"]

def test_confirm_onboarding_success(client, test_db):
    # Perform onboarding submission
    response = client.post(
        "/users/1/onboard", 
        json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "injection_comfort": "First time"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["onboarded"] is True
    assert data["sleep_time"] == "10:00 PM - 12:00 AM"
    assert data["injection_comfort"] == "First time"
    assert data["active_status"] == "On Track"

    # Verify changes are persisted in database
    db_user = test_db.query(models.User).filter(models.User.id == 1).first()
    assert db_user.onboarded is True
    assert db_user.sleep_time == "10:00 PM - 12:00 AM"
    assert db_user.injection_comfort == "First time"
    assert db_user.active_status == "On Track"

def test_confirm_onboarding_user_not_found(client):
    response = client.post(
        "/users/999/onboard",
        json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "injection_comfort": "First time"
        }
    )
    assert response.status_code == 404
    assert "User not found" in response.json()["detail"]

