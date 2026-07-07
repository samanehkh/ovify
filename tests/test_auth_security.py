"""
Security-focused tests: clinician login token flow and offline-sync
reconciliation of daemon-written Missed doses.
"""
from datetime import date, datetime, timedelta
from urllib.parse import quote
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models
from core.time import UAE_TZ
from services.auth import generate_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp_auth.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    user = models.User(id=1, name="Sarah", email="sarah@example.com", phone="+971501234567")
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


# ── Clinician login token flow ──────────────────────────────────────────────

def test_clinician_login_valid_key_issues_token(client):
    response = client.post("/api/clinician/login", json={"access_key": "test-clinician-secret-key", "clinician_name": "Nurse Amina"})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data and data["token"]

    # The issued token must grant access to protected clinician routes
    triage = client.get("/api/clinician/triage", headers={"Authorization": f"Bearer {data['token']}"})
    assert triage.status_code == 200


def test_clinician_login_invalid_key_rejected(client):
    response = client.post("/api/clinician/login", json={"access_key": "wrong-key", "clinician_name": "Nurse Amina"})
    assert response.status_code == 401


def test_clinician_route_rejects_invalid_token(client):
    response = client.get("/api/clinician/triage", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401


def test_clinician_route_rejects_patient_role_token(client):
    # A valid PATIENT token must not unlock the clinician console
    patient_token = generate_token(1, "patient")
    response = client.get("/api/clinician/triage", headers={"Authorization": f"Bearer {patient_token}"})
    assert response.status_code == 401


# ── Offline-sync reconciliation: Missed → Late (self-reported) ──────────────

def test_offline_sync_upgrades_missed_to_late(client, test_db):
    now_uae = datetime.now(UAE_TZ)
    # The dose was actually taken 30 minutes ago...
    log_time = now_uae - timedelta(minutes=30)
    # ...for a schedule 2 hours before that (so the report classifies as Late)
    scheduled_dt = log_time - timedelta(hours=2)

    prescription = models.Prescription(
        id=1,
        user_id=1,
        name="Gonal-F",
        dosage="150 IU",
        route="Subcutaneous",
        scheduled_time=scheduled_dt.strftime("%H:%M:%S"),
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() + timedelta(days=5),
    )
    test_db.add(prescription)

    # The end-of-day daemon already wrote a Missed record before the patient's
    # offline queue could sync
    missed_log = models.DoseLog(
        user_id=1,
        prescription_id=1,
        logged_at=scheduled_dt,
        scheduled_date=scheduled_dt.date(),
        status="Missed",
        self_reported=False,
    )
    test_db.add(missed_log)
    test_db.commit()

    # The offline queue syncs the truthful ISO timestamp of the injection
    response = client.post(
        f"/api/medications/1/confirm?actual_time={quote(log_time.isoformat())}"
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "Late"

    # The record was UPGRADED in place — no duplicate rows, flagged self-reported
    logs = test_db.query(models.DoseLog).filter(models.DoseLog.prescription_id == 1).all()
    assert len(logs) == 1
    test_db.refresh(logs[0])
    assert logs[0].status == "Late"
    assert logs[0].self_reported is True


def test_iso_timestamp_rejected_if_in_future(client, test_db):
    prescription = models.Prescription(
        id=1,
        user_id=1,
        name="Gonal-F",
        dosage="150 IU",
        route="Subcutaneous",
        scheduled_time="20:00:00",
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() + timedelta(days=5),
    )
    test_db.add(prescription)
    test_db.commit()

    future_time = quote((datetime.now(UAE_TZ) + timedelta(hours=3)).isoformat())
    response = client.post(f"/api/medications/1/confirm?actual_time={future_time}")
    assert response.status_code == 400


def test_clinician_login_requires_name(client):
    # Attribution is mandatory: a valid key with no name is rejected
    response = client.post("/api/clinician/login",
                           json={"access_key": "test-clinician-secret-key", "clinician_name": "  "})
    assert response.status_code == 400


def test_sweep_endpoints_require_clinician_auth(client):
    # D1: the manual sweep triggers are clinical operations
    r1 = client.post("/api/medications/check-overdue", headers={"Authorization": "Bearer bogus"})
    r2 = client.post("/api/medications/process-missed", headers={"Authorization": "Bearer bogus"})
    assert r1.status_code == 401
    assert r2.status_code == 401

    # A patient token must not suffice either
    patient_token = generate_token(1, "patient")
    r3 = client.post("/api/medications/check-overdue", headers={"Authorization": f"Bearer {patient_token}"})
    assert r3.status_code == 401


def test_nurse_callback_persisted_and_surfaced_in_triage(client, test_db):
    # D3: patient requests a callback -> persisted -> triage shows it -> resolve completes it
    response = client.post("/users/1/callback-request")
    assert response.status_code == 200
    assert response.json()["status"] == "Pending"

    # Idempotent: second request returns the same pending item, no duplicate
    response2 = client.post("/users/1/callback-request")
    assert response2.status_code == 200
    assert response2.json()["callback_id"] == response.json()["callback_id"]
    assert test_db.query(models.CallbackRequest).count() == 1

    # Triage surfaces the pending callback as Yellow Attention
    triage = client.get("/api/clinician/triage").json()
    me = next(p for p in triage if p["id"] == 1)
    assert me["callback_requested"] is True
    assert me["status"] == "Yellow Attention"
    assert "callback" in me["reason"].lower()

    # Nurse resolution completes the callback with attribution
    resolve = client.post("/api/clinician/resolve-alert/1")
    assert resolve.status_code == 200
    cb = test_db.query(models.CallbackRequest).first()
    test_db.refresh(cb)
    assert cb.status == "Completed"
    assert cb.completed_by == "Test Nurse"


def test_patient_cannot_request_callback_for_another_user(client):
    other_token = generate_token(2, "patient")
    response = client.post("/users/1/callback-request",
                           headers={"Authorization": f"Bearer {other_token}"})
    assert response.status_code == 403


def test_live_confirm_after_same_evening_sweep_upgrades_missed(client, test_db):
    # D12 companion: the 23:50 same-evening sweep may write "Missed" minutes
    # before the patient taps Confirm live at 23:58 — the confirmation must
    # upgrade the record, not bounce with "already logged".
    now_uae = datetime.now(UAE_TZ)
    scheduled_dt = now_uae - timedelta(hours=3)

    prescription = models.Prescription(
        id=1,
        user_id=1,
        name="Gonal-F",
        dosage="150 IU",
        route="Subcutaneous",
        scheduled_time=scheduled_dt.strftime("%H:%M:%S"),
        start_date=date.today() - timedelta(days=2),
        end_date=date.today() + timedelta(days=5),
    )
    test_db.add(prescription)
    test_db.add(models.DoseLog(
        user_id=1, prescription_id=1,
        logged_at=scheduled_dt, scheduled_date=scheduled_dt.date(),
        status="Missed", self_reported=False,
    ))
    test_db.commit()

    # LIVE confirm — no actual_time param at all
    response = client.post("/api/medications/1/confirm")
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "Late"

    logs = test_db.query(models.DoseLog).all()
    assert len(logs) == 1
    test_db.refresh(logs[0])
    assert logs[0].status == "Late"
    assert logs[0].self_reported is False  # it was a live confirmation


def test_phone_normalizer_shared():
    # D11: one normalizer, one behavior
    from core.phone import normalize_phone
    assert normalize_phone("+971 50-123 4567") == "+971501234567"
    assert normalize_phone("(971) 50 123 4567") == "971501234567"
    assert normalize_phone("+971501234567") == "+971501234567"
