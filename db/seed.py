from datetime import date, datetime, timezone, timedelta
from sqlalchemy.orm import Session
from db.session import SessionLocal
from db import models
from services.auth import hash_password

def seed_db():
    db = SessionLocal()
    try:
        # 1. Clinician Mona
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

        # Helper to seed a patient
        def seed_patient(pid, first, last, email, phone, cycle_start_offset, package, appt_offset=4, comfort="Standard"):
            user = db.query(models.User).filter(models.User.id == pid).first()
            if not user:
                print(f"Seeding patient: {first} {last}")
                user = models.User(
                    id=pid,
                    first_name=first,
                    last_name=last,
                    name=f"{first} {last}",
                    email=email,
                    phone=phone,
                    dob=date(1992, 5, 15),
                    onboarded=True,
                    active_status="On Track",
                    cycle_type=package,
                    cycle_start_date=date.today() - timedelta(days=cycle_start_offset),
                    current_cycle_number=1,
                    treatment_package=package,
                    partner_name="Ahmed Khan" if pid == 1 else "Spouse",
                    partner_phone="+971509999999" if pid == 1 else "+971500000000",
                    partner_relationship="Spouse/Partner",
                    partner_consent=True,
                    injection_comfort=comfort,
                    next_appointment_datetime=datetime.now(timezone.utc) + timedelta(days=appt_offset),
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user

        # Seed the 7 standard patients
        sarah = seed_patient(1, "Sarah", "Khan", "sarah@example.com", "+971501234567", 4, "3-Cycle Egg/Embryo Accumulation")
        fatima = seed_patient(2, "Fatima", "M.", "fatima@example.com", "+971502222222", 6, "ICSI Cycle Package")
        layla = seed_patient(3, "Layla", "Ebrahim", "layla@example.com", "+971503333333", 5, "Standard IVF Package")
        noor = seed_patient(4, "Noor", "Hadid", "noor@example.com", "+971504444444", 10, "3-Cycle Egg/Embryo Accumulation")
        maria = seed_patient(5, "Maria", "S.", "maria@example.com", "+971505555555", 7, "Natural Cycle IVF")
        anisha = seed_patient(6, "Anisha", "P.", "anisha@example.com", "+971506666666", 2, "Fresh IVF Cycle")
        hana = seed_patient(7, "Hana", "A.", "hana@example.com", "+971507777777", 13, "IVF with PGTA")

        # Helper to seed prescriptions
        def seed_prescription(id_val, uid, name, dosage, time_str, start_offset, end_offset):
            p = db.query(models.Prescription).filter(models.Prescription.id == id_val).first()
            if not p:
                p = models.Prescription(
                    id=id_val,
                    user_id=uid,
                    name=name,
                    dosage=dosage,
                    route="Subcutaneous",
                    scheduled_time=time_str,
                    start_date=date.today() - timedelta(days=start_offset),
                    end_date=date.today() + timedelta(days=end_offset)
                )
                db.add(p)
                db.commit()
            return p

        # Seed Prescriptions
        seed_prescription(1, 1, "Gonal-F", "150 IU", "20:00:00", 4, 7)
        seed_prescription(2, 1, "Menopur", "75 IU", "20:00:00", 4, 7)
        
        seed_prescription(3, 2, "Gonal-F", "225 IU", "19:00:00", 6, 6)
        
        seed_prescription(4, 3, "Cetrotide", "0.25 mg", "08:00:00", 5, 5)
        
        seed_prescription(5, 4, "Gonal-F", "150 IU", "20:00:00", 10, 5)
        
        seed_prescription(6, 5, "Gonal-F", "150 IU", "20:00:00", 7, 5)
        seed_prescription(7, 6, "Rekovelle", "12 mcg", "20:00:00", 2, 10)
        seed_prescription(8, 7, "Ovitrelle", "250 mcg", "22:00:00", 13, 1)

        # Seed logs/symptoms to trigger dynamic triage states
        # 1. Sarah Khan: Missed dose yesterday
        log_sarah = db.query(models.DoseLog).filter(models.DoseLog.user_id == 1, models.DoseLog.status == "Missed").first()
        if not log_sarah:
            db.add(models.DoseLog(
                user_id=1,
                prescription_id=1,
                scheduled_date=date.today() - timedelta(days=1),
                status="Missed",
                resolved=False
            ))
            db.commit()

        # 2. Layla Ebrahim: 3 late logs this week
        log_layla_count = db.query(models.DoseLog).filter(models.DoseLog.user_id == 3, models.DoseLog.status == "Late").count()
        if log_layla_count == 0:
            for d in [1, 2, 3]:
                db.add(models.DoseLog(
                    user_id=3,
                    prescription_id=4,
                    scheduled_date=date.today() - timedelta(days=d),
                    status="Late",
                    resolved=False
                ))
            db.commit()

        # 3. Noor Hadid: Anxious for 4 consecutive days
        symptom_noor_count = db.query(models.SymptomLog).filter(models.SymptomLog.user_id == 4, models.SymptomLog.symptom_type == "mood").count()
        if symptom_noor_count == 0:
            for d in [0, 1, 2, 3]:
                db.add(models.SymptomLog(
                    user_id=4,
                    log_date=date.today() - timedelta(days=d),
                    symptom_type="mood",
                    value="Anxious"
                ))
            db.commit()

        # 4. Fatima M: dropout flag
        # We'll set a mock marker on Fatima's record so she displays dropout risk
        # in the API response

        print("Database fully seeded with all 7 patient profiles.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
