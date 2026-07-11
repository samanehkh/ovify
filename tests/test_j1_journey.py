"""
J1 Journey — Comprehensive Backend Tests
=========================================
Covers US-J1-00 (Clinician Auth), US-J1-01 (Register Patient),
US-J1-02 (Patient OTP Activation), US-J1-03 (Onboarding Wizard).

Each user story section is clearly delimited.
Happy paths ✅ and Unhappy paths ❌ are both covered.
"""

from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models
from services.auth import hash_password, generate_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_j1_full.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Shared fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed clinician Mona (US-J1-00)
    clinician = models.Clinician(
        name="Mona",
        email="mona.nurse@clinic.ae",
        hashed_password=hash_password("SecurePassword123"),
        role="coordinator",
    )
    db.add(clinician)

    # Seed patient Sarah (US-J1-02 / J1-03)
    user = models.User(
        id=1,
        name="Sarah Khan",
        email="sarah@example.com",
        phone="+971501234567",
        onboarded=False,
        partner_name="Ahmed Khan",
        partner_phone="+971509999999",
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


def _reg_payload(**overrides):
    """Minimal valid registration payload (US-J1-01)."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    payload = {
        "first_name": "Layla",
        "last_name": "Hassan",
        "phone": "+971 50 777 7777",
        "email": "layla.hassan@example.com",
        "dob": "1990-03-20",
        "cycle_start_date": tomorrow,
        "current_cycle_number": 1,
        "treatment_package": "Single IVF/ICSI Cycle (Fresh)",
        "partner_name": "Omar Hassan",
        "partner_phone": "+971 50 888 8888",
        "partner_relationship": "Spouse/Partner",
        "next_appointment_datetime": (date.today() + timedelta(days=4)).isoformat() + "T10:00:00Z",
        "prescriptions": [
            {
                "name": "Gonal-F",
                "dosage": "150 IU",
                "route": "Subcutaneous",
                "scheduled_time": "20:00:00",
                "start_date": tomorrow,
                "end_date": (date.today() + timedelta(days=12)).isoformat(),
                "flagged": False,
            }
        ],
    }
    payload.update(overrides)
    return payload


# ══════════════════════════════════════════════════════════════════════════════
# US-J1-00 · Clinician Authentication
# ══════════════════════════════════════════════════════════════════════════════

class TestClinicianAuth:
    """US-J1-00: Clinician logs into the B2B portal with email + password."""

    # ── Happy paths ────────────────────────────────────────────────────────

    def test_valid_credentials_returns_token_and_name(self, client):
        """✅ Correct email+password issues a JWT and returns nurse_name."""
        res = client.post(
            "/api/clinician/login",
            json={"email": "mona.nurse@clinic.ae", "password": "SecurePassword123"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "token" in data and data["token"]
        assert data["clinician_name"] == "Mona"

    def test_issued_token_grants_triage_access(self, client):
        """✅ Token from login unlocks clinician-gated routes."""
        res = client.post(
            "/api/clinician/login",
            json={"email": "mona.nurse@clinic.ae", "password": "SecurePassword123"},
        )
        token = res.json()["token"]
        triage = client.get("/api/clinician/triage", headers={"Authorization": f"Bearer {token}"})
        assert triage.status_code == 200

    # ── Unhappy paths ──────────────────────────────────────────────────────

    def test_wrong_password_returns_401(self, client):
        """❌ Wrong password → 401 Unauthorized."""
        res = client.post(
            "/api/clinician/login",
            json={"email": "mona.nurse@clinic.ae", "password": "WrongPassword!"},
        )
        assert res.status_code == 401

    def test_unknown_email_returns_401(self, client):
        """❌ Email not in database → 401."""
        res = client.post(
            "/api/clinician/login",
            json={"email": "ghost@clinic.ae", "password": "SecurePassword123"},
        )
        assert res.status_code == 401

    def test_missing_password_field_returns_422(self, client):
        """❌ Missing required 'password' field → 422 Unprocessable Entity."""
        res = client.post(
            "/api/clinician/login",
            json={"email": "mona.nurse@clinic.ae"},
        )
        assert res.status_code == 422

    def test_missing_email_field_returns_422(self, client):
        """❌ Missing required 'email' field → 422."""
        res = client.post(
            "/api/clinician/login",
            json={"password": "SecurePassword123"},
        )
        assert res.status_code == 422

    def test_empty_body_returns_422(self, client):
        """❌ Empty payload → 422."""
        res = client.post("/api/clinician/login", json={})
        assert res.status_code == 422

    def test_invalid_token_on_triage_returns_401(self, client):
        """❌ Tampered/expired token → 401 on protected route."""
        res = client.get(
            "/api/clinician/triage",
            headers={"Authorization": "Bearer not.a.real.token"},
        )
        assert res.status_code == 401

    def test_patient_token_cannot_access_triage(self, client):
        """❌ Patient-role JWT must not unlock clinician console (role check)."""
        patient_token = generate_token(1, "patient")
        res = client.get(
            "/api/clinician/triage",
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert res.status_code == 401

    def test_no_auth_header_on_triage_returns_401(self, client):
        """❌ No Authorization header on protected route → 401."""
        res = client.get("/api/clinician/triage", headers={"Authorization": ""})
        assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════════════════
# US-J1-01 · Register Patient
# ══════════════════════════════════════════════════════════════════════════════

class TestRegisterPatient:
    """US-J1-01: Mona registers a patient from the clinic tablet."""

    # ── Happy paths ────────────────────────────────────────────────────────

    def test_full_registration_creates_user_and_prescriptions(self, client, test_db):
        """✅ Complete valid payload → user + prescription persisted."""
        res = client.post("/api/clinician/register", json=_reg_payload())
        assert res.status_code == 200, res.text
        data = res.json()
        assert "registered successfully" in data["message"]

        user = test_db.query(models.User).filter(models.User.id == data["user_id"]).first()
        assert user is not None
        assert user.name == "Layla Hassan"
        assert user.phone == "+971507777777"  # normalized
        assert user.onboarded is False
        assert user.treatment_package == "Single IVF/ICSI Cycle (Fresh)"

        presc = test_db.query(models.Prescription).filter(
            models.Prescription.user_id == data["user_id"]
        ).first()
        assert presc is not None
        assert presc.name == "Gonal-F"

    def test_registration_stores_partner_details(self, client, test_db):
        """✅ Partner name, phone, and relationship are persisted."""
        res = client.post("/api/clinician/register", json=_reg_payload())
        assert res.status_code == 200
        user = test_db.query(models.User).filter(models.User.id == res.json()["user_id"]).first()
        assert user.partner_name == "Omar Hassan"
        assert user.partner_phone == "+971508888888"
        assert user.partner_relationship == "Spouse/Partner"

    def test_registration_stores_dob(self, client, test_db):
        """✅ DOB entered by nurse is stored in patient record."""
        res = client.post("/api/clinician/register", json=_reg_payload())
        assert res.status_code == 200
        user = test_db.query(models.User).filter(models.User.id == res.json()["user_id"]).first()
        assert user.dob is not None
        assert user.dob.isoformat() == "1990-03-20"

    def test_registration_stores_cycle_number(self, client, test_db):
        """✅ Current cycle number is stored correctly."""
        res = client.post("/api/clinician/register", json=_reg_payload(current_cycle_number=2))
        assert res.status_code == 200
        user = test_db.query(models.User).filter(models.User.id == res.json()["user_id"]).first()
        assert user.current_cycle_number == 2

    def test_registration_multiple_prescriptions(self, client, test_db):
        """✅ Multiple medications in stimulation protocol are all persisted."""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        end_date = (date.today() + timedelta(days=12)).isoformat()
        payload = _reg_payload(prescriptions=[
            {"name": "Gonal-F", "dosage": "150 IU", "route": "Subcutaneous",
             "scheduled_time": "20:00:00", "start_date": tomorrow, "end_date": end_date, "flagged": False},
            {"name": "Menopur", "dosage": "75 IU", "route": "Subcutaneous",
             "scheduled_time": "20:00:00", "start_date": tomorrow, "end_date": end_date, "flagged": False},
        ])
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 200
        count = test_db.query(models.Prescription).filter(
            models.Prescription.user_id == res.json()["user_id"]
        ).count()
        assert count == 2

    def test_registration_with_custom_package(self, client, test_db):
        """✅ 'Other (Custom)' package with custom_package_name is saved."""
        res = client.post("/api/clinician/register", json=_reg_payload(
            treatment_package="Other (Custom)",
            custom_package_name="Minimal Stimulation IVF",
        ))
        assert res.status_code == 200
        user = test_db.query(models.User).filter(models.User.id == res.json()["user_id"]).first()
        assert user.treatment_package == "Other (Custom)"
        assert user.custom_package_name == "Minimal Stimulation IVF"

    # ── Unhappy paths ──────────────────────────────────────────────────────

    def test_duplicate_phone_returns_400(self, client, test_db):
        """❌ Same phone number as existing patient → 400."""
        # Sarah is already seeded with +971501234567
        payload = _reg_payload(phone="+971 50 123 4567")
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 400
        assert "Phone number already registered" in res.json()["detail"]

    def test_duplicate_email_returns_400(self, client, test_db):
        """❌ Same email as existing patient → 400."""
        payload = _reg_payload(email="sarah@example.com")
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 400
        assert "Email already registered" in res.json()["detail"]

    def test_missing_first_name_returns_422(self, client):
        """❌ Required field 'first_name' missing → 422."""
        payload = _reg_payload()
        del payload["first_name"]
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 422

    def test_missing_phone_returns_422(self, client):
        """❌ Required field 'phone' missing → 422."""
        payload = _reg_payload()
        del payload["phone"]
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 422

    def test_missing_cycle_type_returns_422(self, client):
        """❌ Required field 'treatment_package' missing → 422."""
        payload = _reg_payload()
        del payload["treatment_package"]
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 422

    def test_unapproved_medication_returns_400(self, client, test_db):
        """❌ Medication not in formulary → 400, nothing persisted."""
        payload = _reg_payload()
        payload["prescriptions"][0]["name"] = "Gonal-X"  # not in formulary
        res = client.post("/api/clinician/register", json=payload)
        assert res.status_code == 400
        assert "formulary" in res.json()["detail"].lower()
        # Ensure no user was committed
        assert test_db.query(models.User).filter(
            models.User.email == "layla.hassan@example.com"
        ).first() is None

    def test_no_auth_header_returns_401_or_403(self, client):
        """❌ No clinician token → access denied."""
        res = client.post(
            "/api/clinician/register",
            json=_reg_payload(),
            headers={"Authorization": ""},
        )
        assert res.status_code in (401, 403)

    def test_patient_token_cannot_register(self, client):
        """❌ Patient JWT must not be accepted on clinician register route."""
        patient_token = generate_token(1, "patient")
        res = client.post(
            "/api/clinician/register",
            json=_reg_payload(),
            headers={"Authorization": f"Bearer {patient_token}"},
        )
        assert res.status_code in (401, 403)


# ══════════════════════════════════════════════════════════════════════════════
# US-J1-02 · Patient Activation (OTP)
# ══════════════════════════════════════════════════════════════════════════════

class TestPatientActivation:
    """US-J1-02: Sarah taps SMS link, verifies OTP, and activates her account."""

    # ── Happy paths ────────────────────────────────────────────────────────

    def test_request_otp_registered_phone_succeeds(self, client):
        """✅ Registered phone → OTP sent confirmation."""
        res = client.post("/users/request-otp", json={"phone": "+971501234567"})
        assert res.status_code == 200
        assert res.json()["otp_sent"] is True

    def test_request_otp_with_spaces_in_phone_succeeds(self, client):
        """✅ Phone with spaces is normalized and accepted."""
        res = client.post("/users/request-otp", json={"phone": "+971 50 123 4567"})
        assert res.status_code == 200
        assert res.json()["otp_sent"] is True

    def test_verify_otp_returns_user_and_token(self, client):
        """✅ Correct OTP → full user payload + JWT token."""
        res = client.post("/users/verify-otp", json={"phone": "+971501234567", "otp": "123456"})
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Sarah Khan"
        assert data["onboarded"] is False
        assert "token" in data and data["token"]

    def test_verify_otp_normalizes_phone_with_dashes(self, client):
        """✅ Phone formatted with dashes is still matched correctly."""
        res = client.post("/users/verify-otp", json={"phone": "+971-50-123-4567", "otp": "123456"})
        assert res.status_code == 200
        assert res.json()["name"] == "Sarah Khan"

    def test_verify_otp_response_contains_partner_info(self, client):
        """✅ Response includes partner_phone (used by onboarding wizard consent toggle)."""
        res = client.post("/users/verify-otp", json={"phone": "+971501234567", "otp": "123456"})
        assert res.status_code == 200
        assert res.json()["partner_phone"] == "+971509999999"

    # ── Unhappy paths ──────────────────────────────────────────────────────

    def test_request_otp_unregistered_phone_returns_404(self, client):
        """❌ Phone not in any patient chart → 404."""
        res = client.post("/users/request-otp", json={"phone": "+971500000000"})
        assert res.status_code == 404
        assert "not registered" in res.json()["detail"]

    def test_request_otp_missing_phone_returns_422(self, client):
        """❌ Empty request body → 422."""
        res = client.post("/users/request-otp", json={})
        assert res.status_code == 422

    def test_verify_otp_wrong_code_returns_400(self, client):
        """❌ Wrong 6-digit code → 400 Invalid OTP."""
        res = client.post("/users/verify-otp", json={"phone": "+971501234567", "otp": "999999"})
        assert res.status_code == 400
        assert "Invalid OTP" in res.json()["detail"]

    def test_verify_otp_unregistered_phone_returns_404(self, client):
        """❌ Phone not registered → 404 even if OTP is correct."""
        res = client.post("/users/verify-otp", json={"phone": "+971500000001", "otp": "123456"})
        assert res.status_code == 404

    def test_verify_otp_missing_otp_field_returns_422(self, client):
        """❌ Missing 'otp' field → 422."""
        res = client.post("/users/verify-otp", json={"phone": "+971501234567"})
        assert res.status_code == 422

    def test_verify_otp_missing_phone_field_returns_422(self, client):
        """❌ Missing 'phone' field → 422."""
        res = client.post("/users/verify-otp", json={"otp": "123456"})
        assert res.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# US-J1-03 · Onboarding Personalization Wizard
# ══════════════════════════════════════════════════════════════════════════════

class TestOnboardingWizard:
    """US-J1-03: Sarah completes 3-step wizard; preferences + consent saved."""

    # ── Happy paths ────────────────────────────────────────────────────────

    def test_onboard_first_time_patient_sets_all_fields(self, client, test_db):
        """✅ First-time patient, Standard sleep, 30 min offset → fully onboarded."""
        res = client.post("/users/1/onboard", json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "injection_comfort": "First time",
            "reminder_offset_minutes": 30,
        })
        assert res.status_code == 200
        data = res.json()
        assert data["onboarded"] is True
        assert data["sleep_time"] == "10:00 PM - 12:00 AM"
        assert data["injection_comfort"] == "First time"
        assert data["reminder_offset_minutes"] == 30
        assert data["active_status"] == "On Track"

    def test_onboard_experienced_patient_sets_comfort(self, client, test_db):
        """✅ Experienced comfort level is saved correctly."""
        res = client.post("/users/1/onboard", json={
            "sleep_time": "11:00 PM - 1:00 AM",
            "injection_comfort": "Experienced",
            "reminder_offset_minutes": 0,
        })
        assert res.status_code == 200
        assert res.json()["injection_comfort"] == "Experienced"
        assert res.json()["reminder_offset_minutes"] == 0

    def test_onboard_early_bird_sleep_window(self, client, test_db):
        """✅ Early Bird sleep window (9:00 PM - 11:00 PM) is accepted."""
        res = client.post("/users/1/onboard", json={
            "sleep_time": "9:00 PM - 11:00 PM",
            "injection_comfort": "First time",
            "reminder_offset_minutes": 15,
        })
        assert res.status_code == 200
        assert res.json()["sleep_time"] == "9:00 PM - 11:00 PM"
        assert res.json()["reminder_offset_minutes"] == 15

    def test_onboard_persists_to_database(self, client, test_db):
        """✅ Changes are committed to DB, not just returned in response."""
        client.post("/users/1/onboard", json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "injection_comfort": "First time",
            "reminder_offset_minutes": 30,
        })
        db_user = test_db.query(models.User).filter(models.User.id == 1).first()
        test_db.refresh(db_user)
        assert db_user.onboarded is True
        assert db_user.active_status == "On Track"
        assert db_user.reminder_offset_minutes == 30

    def test_partner_consent_active_saved(self, client, test_db):
        """✅ Partner consent toggle ON → partner_consent=True saved."""
        res = client.post("/users/1/partner-consent", json={
            "partner_phone": "+971509999999",
            "partner_consent": True,
        })
        assert res.status_code == 200
        db_user = test_db.query(models.User).filter(models.User.id == 1).first()
        test_db.refresh(db_user)
        assert db_user.partner_consent is True

    def test_partner_consent_inactive_saved(self, client, test_db):
        """✅ Partner consent toggle OFF → partner_consent=False saved."""
        res = client.post("/users/1/partner-consent", json={
            "partner_phone": "+971509999999",
            "partner_consent": False,
        })
        assert res.status_code == 200
        db_user = test_db.query(models.User).filter(models.User.id == 1).first()
        test_db.refresh(db_user)
        assert db_user.partner_consent is False

    def test_partner_phone_normalized_on_consent(self, client, test_db):
        """✅ Partner phone with spaces is normalized before storage."""
        client.post("/users/1/partner-consent", json={
            "partner_phone": "+971 50 999 9999",
            "partner_consent": True,
        })
        db_user = test_db.query(models.User).filter(models.User.id == 1).first()
        test_db.refresh(db_user)
        assert db_user.partner_phone == "+971509999999"

    # ── Unhappy paths ──────────────────────────────────────────────────────

    def test_onboard_missing_sleep_time_returns_422(self, client):
        """❌ 'sleep_time' is required → 422."""
        res = client.post("/users/1/onboard", json={
            "injection_comfort": "First time",
            "reminder_offset_minutes": 30,
        })
        assert res.status_code == 422

    def test_onboard_missing_comfort_returns_422(self, client):
        """❌ 'injection_comfort' is required → 422."""
        res = client.post("/users/1/onboard", json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "reminder_offset_minutes": 30,
        })
        assert res.status_code == 422

    def test_onboard_missing_reminder_offset_returns_422(self, client):
        """❌ 'reminder_offset_minutes' is required → 422."""
        res = client.post("/users/1/onboard", json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "injection_comfort": "First time",
        })
        assert res.status_code == 422

    def test_onboard_nonexistent_user_returns_404(self, client):
        """❌ User ID 999 does not exist → 404."""
        res = client.post("/users/999/onboard", json={
            "sleep_time": "10:00 PM - 12:00 AM",
            "injection_comfort": "First time",
            "reminder_offset_minutes": 30,
        })
        assert res.status_code == 404

    def test_onboard_cross_user_access_returns_403(self, client):
        """❌ Patient token for user 2 cannot onboard user 1 (IDOR guard)."""
        other_token = generate_token(2, "patient")
        res = client.post(
            "/users/1/onboard",
            json={
                "sleep_time": "10:00 PM - 12:00 AM",
                "injection_comfort": "First time",
                "reminder_offset_minutes": 30,
            },
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert res.status_code == 403

    def test_onboard_no_token_returns_401(self, client):
        """❌ No bearer token on authenticated route → 401."""
        res = client.post(
            "/users/1/onboard",
            json={
                "sleep_time": "10:00 PM - 12:00 AM",
                "injection_comfort": "First time",
                "reminder_offset_minutes": 30,
            },
            headers={"Authorization": ""},
        )
        assert res.status_code == 401

    def test_partner_consent_no_token_returns_401(self, client):
        """❌ Partner consent endpoint requires patient auth → 401."""
        res = client.post(
            "/users/1/partner-consent",
            json={"partner_phone": "+971509999999", "partner_consent": True},
            headers={"Authorization": ""},
        )
        assert res.status_code == 401

    def test_partner_consent_cross_user_returns_403(self, client):
        """❌ User 2 cannot update user 1's partner consent."""
        other_token = generate_token(2, "patient")
        res = client.post(
            "/users/1/partner-consent",
            json={"partner_phone": "+971509999999", "partner_consent": True},
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert res.status_code == 403

    def test_partner_consent_missing_phone_returns_422(self, client):
        """❌ 'partner_phone' is required in consent payload → 422."""
        res = client.post("/users/1/partner-consent", json={"partner_consent": True})
        assert res.status_code == 422
