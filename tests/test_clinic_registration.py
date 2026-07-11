from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_clinician.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
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

def test_parse_protocol_happy_path(client):
    text = "Patient starts Gonal-F 150 IU daily at 7 PM starting tomorrow, and Cetrotide 0.25mg daily at 8 AM starting Day 6"
    response = client.post("/api/clinician/parse-protocol", json={"protocol_text": text})
    assert response.status_code == 200
    data = response.json()
    
    parsed = data["parsed_medications"]
    assert len(parsed) == 2
    
    gonal = next(m for m in parsed if m["name"] == "Gonal-F")
    assert gonal["dosage"] == "150 IU"
    assert gonal["scheduled_time"] == "19:00:00"
    assert gonal["start_date"] == (date.today() + timedelta(days=1)).isoformat()
    
    cetrotide = next(m for m in parsed if m["name"] == "Cetrotide")
    assert cetrotide["dosage"] == "0.25mg"
    assert cetrotide["scheduled_time"] == "08:00:00"
    assert cetrotide["start_date"] == (date.today() + timedelta(days=5)).isoformat()
    
    assert len(data["unrecognized_medications"]) == 0

def test_parse_protocol_unrecognized_drug(client):
    text = "Patient starts Gonal-X 150 IU daily starting tomorrow"
    response = client.post("/api/clinician/parse-protocol", json={"protocol_text": text})
    assert response.status_code == 200
    data = response.json()
    
    assert len(data["parsed_medications"]) == 0
    unrecognized = data["unrecognized_medications"]
    assert len(unrecognized) == 1
    assert unrecognized[0]["text"] == "Gonal-X 150 IU"
    assert "We couldn't identify this medication" in unrecognized[0]["message"]

def test_register_patient_success(client, test_db):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    end_date = (date.today() + timedelta(days=12)).isoformat()
    
    payload = {
        "first_name": "Sarah",
        "last_name": "Khan",
        "phone": "+971 50 123 4567",
        "email": "sarah.khan@example.com",
        "dob": "1992-05-15",
        "cycle_start_date": tomorrow,
        "current_cycle_number": 1,
        "treatment_package": "3-Cycle Egg/Embryo Accumulation",
        "partner_name": "Ahmed Khan",
        "partner_phone": "+971 50 999 9999",
        "partner_relationship": "Spouse/Partner",
        "next_appointment_datetime": (date.today() + timedelta(days=3)).isoformat() + "T09:00:00Z",
        "prescriptions": [
            {
                "name": "Gonal-F",
                "dosage": "150 IU",
                "route": "Subcutaneous",
                "scheduled_time": "19:00:00",
                "start_date": tomorrow,
                "end_date": end_date,
                "flagged": False
            }
        ]
    }
    
    response = client.post("/api/clinician/register", json=payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert "registered successfully" in data["message"]
    user_id = data["user_id"]
    
    # Verify User exists in database
    user = test_db.query(models.User).filter(models.User.id == user_id).first()
    assert user is not None
    assert user.name == "Sarah Khan"
    assert user.phone == "+971501234567" # normalized
    assert user.onboarded is False
    assert user.partner_phone == "+971509999999"
    assert user.treatment_package == "3-Cycle Egg/Embryo Accumulation"
    
    # Verify Prescription exists in database
    presc = test_db.query(models.Prescription).filter(models.Prescription.user_id == user_id).first()
    assert presc is not None
    assert presc.name == "Gonal-F"
    assert presc.dosage == "150 IU"

def test_register_patient_duplicate_phone(client, test_db):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    # Create first user
    user = models.User(name="Sarah", email="sarah1@example.com", phone="+971501234567")
    test_db.add(user)
    test_db.commit()
    
    payload = {
        "first_name": "Sarah",
        "last_name": "Khan Duplicate",
        "phone": "+971 50 123 4567",
        "email": "sarah2@example.com",
        "dob": "1992-05-15",
        "cycle_start_date": tomorrow,
        "current_cycle_number": 1,
        "treatment_package": "3-Cycle Egg/Embryo Accumulation",
        "partner_name": "Ahmed Khan",
        "partner_phone": "+971 50 999 9999",
        "partner_relationship": "Spouse/Partner",
        "next_appointment_datetime": (date.today() + timedelta(days=3)).isoformat() + "T09:00:00Z",
        "prescriptions": []
    }
    response = client.post("/api/clinician/register", json=payload)
    assert response.status_code == 400
    assert "Phone number already registered" in response.json()["detail"]

def test_register_patient_duplicate_email(client, test_db):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    user = models.User(name="Sarah", email="sarah@example.com", phone="+971500000000")
    test_db.add(user)
    test_db.commit()
    
    payload = {
        "first_name": "Sarah",
        "last_name": "Khan Duplicate Email",
        "phone": "+971501234567",
        "email": "sarah@example.com",
        "dob": "1992-05-15",
        "cycle_start_date": tomorrow,
        "current_cycle_number": 1,
        "treatment_package": "3-Cycle Egg/Embryo Accumulation",
        "partner_name": "Ahmed Khan",
        "partner_phone": "+971 50 999 9999",
        "partner_relationship": "Spouse/Partner",
        "next_appointment_datetime": (date.today() + timedelta(days=3)).isoformat() + "T09:00:00Z",
        "prescriptions": []
    }
    response = client.post("/api/clinician/register", json=payload)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

def test_parse_protocol_empty_text(client):
    response = client.post("/api/clinician/parse-protocol", json={"protocol_text": ""})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]



def _base_payload(**overrides):
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    end_date = (date.today() + timedelta(days=12)).isoformat()
    payload = {
        "first_name": "Sarah",
        "last_name": "Khan",
        "phone": "+971 50 123 4567",
        "email": "sarah.khan@example.com",
        "dob": "1992-05-15",
        "cycle_start_date": tomorrow,
        "current_cycle_number": 1,
        "treatment_package": "3-Cycle Egg/Embryo Accumulation",
        "partner_name": "Ahmed Khan",
        "partner_phone": "+971 50 999 9999",
        "partner_relationship": "Spouse/Partner",
        "next_appointment_datetime": (date.today() + timedelta(days=3)).isoformat() + "T09:00:00Z",
        "prescriptions": [
            {
                "name": "Gonal-F",
                "dosage": "150 IU",
                "route": "Subcutaneous",
                "scheduled_time": "19:00:00",
                "start_date": tomorrow,
                "end_date": end_date,
                "flagged": False
            }
        ]
    }
    payload.update(overrides)
    return payload


def test_register_persists_dob(client, test_db):
    # D5: DOB entered by the nurse must land in the patient record
    response = client.post("/api/clinician/register", json=_base_payload())
    assert response.status_code == 200

    user = test_db.query(models.User).filter(models.User.email == "sarah.khan@example.com").first()
    assert user is not None
    assert user.dob is not None
    assert user.dob.isoformat() == "1992-05-15"


def test_register_rejects_unapproved_medication(client, test_db):
    # D6: server-side formulary re-validation — the register endpoint must not
    # trust the client's prescription list
    payload = _base_payload()
    payload["prescriptions"][0]["name"] = "Gonal-X"  # not in formulary
    response = client.post("/api/clinician/register", json=payload)
    assert response.status_code == 400
    assert "formulary" in response.json()["detail"].lower()
    assert "Gonal-X" in response.json()["detail"]

    # Nothing was persisted
    assert test_db.query(models.User).filter(models.User.email == "sarah.khan@example.com").first() is None

