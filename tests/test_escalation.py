from datetime import date, datetime, timedelta, time
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from db.session import get_db, Base
from db import models
from services import adherence
from core.time import UAE_TZ

SQLALCHEMY_DATABASE_URL = "sqlite:///file:test_escalation_db?mode=memory&cache=shared"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # 1. Setup test patient with partner consent
    user = models.User(
        id=1,
        name="Sarah Khan",
        email="sarah@example.com",
        phone="+971501234567",
        active_status="On Track",
        cycle_type="Fresh IVF",
        partner_consent=True,
        partner_phone="+971509999999",
        partner_name="Ahmed"
    )
    db.add(user)
    db.commit()

    # 2. Setup prescription for today
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

    # 3. Setup push subscription for user 1
    sub = models.PushSubscription(
        user_id=1,
        endpoint="https://updates.push.services.com/mock-endpoint-sarah-123",
        p256dh="mock-p256dh",
        auth="mock-auth"
    )
    db.add(sub)
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

def test_level_1_escalation(test_db, client):
    # Set current time mock to 19:35 UAE (T+35 mins)
    mock_now = datetime.combine(date.today(), time(19, 35, 0)).replace(tzinfo=UAE_TZ)
    with patch("services.adherence.datetime") as mock_datetime:
        mock_datetime.now.return_value = mock_now
        mock_datetime.combine = datetime.combine
        
        # Run check
        adherence.check_overdue_doses(test_db)

        # Verify EscalationLog has level 1 logged
        elog = test_db.query(models.EscalationLog).filter(
            models.EscalationLog.prescription_id == 1,
            models.EscalationLog.level == 1
        ).first()
        assert elog is not None

        # Verify patient status updated to Action Required
        user = test_db.query(models.User).filter(models.User.id == 1).first()
        assert user.active_status == "Action Required"

        # Verify triage data shows Yellow Attention with Gonal-F overdue
        res = client.get("/api/clinician/triage")
        assert res.status_code == 200
        data = res.json()
        assert data["counts"]["needs_attention"] == 1
        assert data["needs_attention"][0]["status"] == "Yellow Attention"
        assert "Gonal-F dose overdue" in data["needs_attention"][0]["reason"]

def test_level_2_escalation(test_db, client):
    # Set current time mock to 20:05 UAE (T+65 mins)
    mock_now = datetime.combine(date.today(), time(20, 5, 0)).replace(tzinfo=UAE_TZ)
    with patch("services.adherence.datetime") as mock_datetime:
        mock_datetime.now.return_value = mock_now
        mock_datetime.combine = datetime.combine

        # Pre-log level 1 to isolate level 2
        l1 = models.EscalationLog(prescription_id=1, user_id=1, scheduled_date=date.today(), level=1)
        test_db.add(l1)
        test_db.commit()

        # Run check
        adherence.check_overdue_doses(test_db)

        # Verify EscalationLog has level 2 logged
        elog = test_db.query(models.EscalationLog).filter(
            models.EscalationLog.prescription_id == 1,
            models.EscalationLog.level == 2
        ).first()
        assert elog is not None

        # Verify triage dashboard status stays Needs Attention
        res = client.get("/api/clinician/triage")
        assert res.status_code == 200
        data = res.json()
        assert data["counts"]["needs_attention"] == 1
        assert data["needs_attention"][0]["status"] == "Yellow Attention"

def test_level_3_escalation(test_db, client):
    # Set current time mock to 21:05 UAE (T+125 mins)
    mock_now = datetime.combine(date.today(), time(21, 5, 0)).replace(tzinfo=UAE_TZ)
    with patch("services.adherence.datetime") as mock_datetime:
        mock_datetime.now.return_value = mock_now
        mock_datetime.combine = datetime.combine

        # Pre-log level 1 and 2
        l1 = models.EscalationLog(prescription_id=1, user_id=1, scheduled_date=date.today(), level=1)
        l2 = models.EscalationLog(prescription_id=1, user_id=1, scheduled_date=date.today(), level=2)
        test_db.add(l1)
        test_db.add(l2)
        test_db.commit()

        # Run check
        adherence.check_overdue_doses(test_db)

        # Verify EscalationLog has level 3 logged
        elog = test_db.query(models.EscalationLog).filter(
            models.EscalationLog.prescription_id == 1,
            models.EscalationLog.level == 3
        ).first()
        assert elog is not None

        # Verify triage dashboard status escalates to Red Alert
        res = client.get("/api/clinician/triage")
        assert res.status_code == 200
        data = res.json()
        assert data["counts"]["urgent"] == 1
        assert data["urgent"][0]["status"] == "Red Alert"
        assert "Missed Gonal-F (2h overdue)" in data["urgent"][0]["reason"]

def test_escalation_idempotency(test_db):
    # Set current time mock to 21:05 UAE (T+125 mins)
    mock_now = datetime.combine(date.today(), time(21, 5, 0)).replace(tzinfo=UAE_TZ)
    with patch("services.adherence.datetime") as mock_datetime:
        mock_datetime.now.return_value = mock_now
        mock_datetime.combine = datetime.combine

        # Run check twice
        adherence.check_overdue_doses(test_db)
        adherence.check_overdue_doses(test_db)

        # Verify only one log exists per level
        logs_l1 = test_db.query(models.EscalationLog).filter(models.EscalationLog.level == 1).all()
        logs_l2 = test_db.query(models.EscalationLog).filter(models.EscalationLog.level == 2).all()
        logs_l3 = test_db.query(models.EscalationLog).filter(models.EscalationLog.level == 3).all()

        assert len(logs_l1) == 1
        assert len(logs_l2) == 1
        assert len(logs_l3) == 1
