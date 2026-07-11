from datetime import date, datetime, timezone, timedelta
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db import models
from services.auth import hash_password

def seed_db():
    db = SessionLocal()
    try:
        # Check if user 1 exists
        user = db.query(models.User).filter(models.User.id == 1).first()
        if not user:
            print("Seeding database: creating user Sarah...")
            user = models.User(
                id=1, 
                name="Sarah", 
                email="sarah@example.com",
                phone="+971501234567",
                onboarded=False,
                cycle_start_date=date.today() - timedelta(days=4),
                next_appointment_datetime=datetime.now(timezone.utc) + timedelta(days=3)
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if not user.phone:
                print("Seeding database: updating Sarah's phone number to +971501234567...")
                user.phone = "+971501234567"
                db.commit()

        # Check if prescriptions exist for user 1
        presc_count = db.query(models.Prescription).filter(models.Prescription.user_id == 1).count()
        if presc_count == 0:
            print("Seeding database: creating Gonal-F and Menopur prescriptions...")
            # Let's say today is Day 5 of 12 (started 4 days ago)
            p1 = models.Prescription(
                id=1,
                user_id=1,
                name="Gonal-F",
                dosage="150 IU",
                route="Subcutaneous",
                scheduled_time="20:00:00",
                start_date=date.today() - timedelta(days=4),
                end_date=date.today() + timedelta(days=7)
            )
            p2 = models.Prescription(
                id=2,
                user_id=1,
                name="Menopur",
                dosage="75 IU",
                route="Subcutaneous",
                scheduled_time="20:00:00",
                start_date=date.today() - timedelta(days=4),
                end_date=date.today() + timedelta(days=7)
            )
            db.add_all([p1, p2])
            db.commit()
            print("Database prescriptions seeded successfully.")

        # Seed clinician Mona for US-J1-00
        clinician = db.query(models.Clinician).filter(models.Clinician.email == "mona.nurse@clinic.ae").first()
        if not clinician:
            print("Seeding database: creating clinician Mona...")
            clinician = models.Clinician(
                name="Mona",
                email="mona.nurse@clinic.ae",
                hashed_password=hash_password("SecurePassword123"),
                role="coordinator"
            )
            db.add(clinician)
            db.commit()
            print("Default clinician seeded successfully.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()

