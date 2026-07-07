from datetime import date, datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_partner.db"
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
        partner_phone=None,
        partner_consent=False
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

def test_partner_sharing_consent_flow(client, test_db):
    # 1. Verify partner dashboard returns 401 originally (no token)
    res = client.get("/api/partner/dashboard")
    assert res.status_code == 401

    # 2. Patient registers partner phone number and grants consent
    res = client.post("/users/1/partner-consent", json={
        "partner_phone": "+971509999999",
        "partner_consent": True
    })
    assert res.status_code == 200
    user = test_db.query(models.User).filter(models.User.id == 1).first()
    assert user.partner_phone == "+971509999999"
    assert user.partner_consent is True

    # 3. Verify partner login succeeds and returns token
    res_login = client.post("/api/partner/login", json={
        "phone": "+971509999999",
        "otp": "123456"
    })
    assert res_login.status_code == 200
    data_login = res_login.json()
    assert data_login["patient_name"] == "Sarah Khan"
    token = data_login["token"]

    # 4. Verify partner dashboard returns patient details with default prompt (no mood logged yet)
    res_dash = client.get("/api/partner/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res_dash.status_code == 200
    data = res_dash.json()
    assert data["patient_name"] == "Sarah Khan"
    assert data["mood"] is None
    assert "hasn't logged her mood today" in data["support_prompt"]

    # 5. Log patient mood as "Anxious" today
    symptom_log = models.SymptomLog(
        user_id=1,
        symptom_type="mood",
        value="Anxious",
        log_date=date.today()
    )
    test_db.add(symptom_log)
    test_db.commit()

    # 6. Verify partner dashboard returns Sarah's mood and tailored prompt
    res_dash_mood = client.get("/api/partner/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res_dash_mood.status_code == 200
    data_mood = res_dash_mood.json()
    assert data_mood["mood"] == "Anxious"
    assert "checked in as feeling Anxious today" in data_mood["support_prompt"]

    # 7. Patient revokes partner consent
    client.post("/users/1/partner-consent", json={
        "partner_phone": "+971509999999",
        "partner_consent": False
    })
    
    # 8. Verify partner dashboard queries are now blocked (403 Forbidden)
    res_blocked = client.get("/api/partner/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert res_blocked.status_code == 403
    assert "consent is currently revoked" in res_blocked.json()["detail"]

def test_partner_login_unregistered_partner(client):
    res = client.post("/api/partner/login", json={
        "phone": "+971501111111",
        "otp": "123456"
    })
    assert res.status_code == 404
    assert "No patient user has registered this number" in res.json()["detail"]

def test_partner_login_invalid_otp(client, test_db):
    # Link partner first
    client.post("/users/1/partner-consent", json={
        "partner_phone": "+971509999999",
        "partner_consent": True
    })
    
    res = client.post("/api/partner/login", json={
        "phone": "+971509999999",
        "otp": "999999"
    })
    assert res.status_code == 400
    assert "Invalid OTP code" in res.json()["detail"]
