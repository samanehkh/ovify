import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from api import symptoms, users, medications, clinician, partner
from db.session import Base, engine
from db import models  # Ensure all models are registered on Base metadata
import os
from db.seed import seed_db

# Create database tables
Base.metadata.create_all(bind=engine)
if os.getenv("SEED_DATABASE", "true").lower() == "true":
    seed_db()

async def adherence_background_daemon():
    """
    Background worker loop that runs periodically to check for overdue doses,
    and runs the idempotent missed-dose catch-up ledger for historical dates.
    """
    print("[BACKGROUND DAEMON] Adherence tracking worker started.")
    while True:
        try:
            from db.session import SessionLocal
            from services import adherence
            from datetime import timedelta, datetime
            from db.models import ProcessedDate
            from core.time import UAE_TZ
            
            uae_now = datetime.now(UAE_TZ)
            today = uae_now.date()
            
            db = SessionLocal()
            try:
                # 1. Check for overdue doses (Scenario 7)
                adherence.check_overdue_doses(db)
                
                # 2. Idempotent missed-dose catch-up ledger for historical dates
                # Check dates from 14 days ago to yesterday
                for offset in range(14, 0, -1):
                    target_date = today - timedelta(days=offset)

                    # Check if already processed
                    already_run = db.query(ProcessedDate).filter(ProcessedDate.run_date == target_date).first()
                    if not already_run:
                        print(f"[BACKGROUND DAEMON] Processing missed doses catch-up for date {target_date}...")
                        count = adherence.process_end_of_day_missed_doses(db, target_date)

                        # Save processed log
                        log_run = ProcessedDate(run_date=target_date, processed_at=uae_now)
                        db.add(log_run)
                        db.commit()
                        if count > 0:
                            print(f"[BACKGROUND DAEMON] Caught up: Logged {count} missed doses for date {target_date}.")

                # 3. Same-day end-of-day sweep (BRD J4: the clinic Red Alert must
                # land the same evening, not next morning). After 23:50 UAE we
                # process TODAY's unlogged doses. Idempotent by design — the
                # function only inserts where no log exists — and deliberately
                # NOT recorded in the ledger, so a dose confirmed at 23:58 after
                # an earlier sweep still reconciles via Missed→Late upgrade and
                # tomorrow's ledger pass double-checks the date.
                if uae_now.hour == 23 and uae_now.minute >= 50:
                    count = adherence.process_end_of_day_missed_doses(db, today)
                    if count > 0:
                        print(f"[BACKGROUND DAEMON] Same-evening sweep: logged {count} missed doses for {today}.")
            finally:
                db.close()
        except Exception as e:
            print(f"[BACKGROUND DAEMON ERROR] {e}")
            
        # Check every 5 minutes
        await asyncio.sleep(5 * 60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Spawn background task
    daemon_task = asyncio.create_task(adherence_background_daemon())
    yield
    # Shutdown: Cancel task
    daemon_task.cancel()

app = FastAPI(lifespan=lifespan)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Ovify RESTful API. The backend is running successfully!"}

app.include_router(symptoms.router, prefix="/symptoms", tags=["symptoms"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(medications.router, prefix="/api/medications", tags=["medications"])
app.include_router(clinician.router, prefix="/api/clinician", tags=["clinician"])
app.include_router(partner.router, prefix="/api/partner", tags=["partner"])
