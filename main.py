import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from api import cycles, symptoms, users, medications, clinician, partner
from db.session import Base, engine
from db import models  # Ensure all models are registered on Base metadata
from db.seed import seed_db

# Create database tables
Base.metadata.create_all(bind=engine)
seed_db()

async def adherence_background_daemon():
    """
    Background worker loop that runs periodically to check for overdue doses
    and log partner alerts. At the end of the day, it automatically logs
    missed doses and flags the patient status.
    """
    print("[BACKGROUND DAEMON] Adherence tracking worker started.")
    while True:
        try:
            from db.session import SessionLocal
            from services import adherence
            from datetime import date, datetime
            
            db = SessionLocal()
            try:
                # 1. Check for overdue doses (Scenario 7)
                adherence.check_overdue_doses(db)
                
                # 2. Check for end-of-day missed doses (Scenario 5)
                now = datetime.now()
                if now.hour == 23 and now.minute >= 50:
                    count = adherence.process_end_of_day_missed_doses(db, date.today())
                    if count > 0:
                        print(f"[BACKGROUND DAEMON] Logged {count} missed doses for today.")
            finally:
                db.close()
        except Exception as e:
            print(f"[BACKGROUND DAEMON ERROR] {e}")
            
        # Run check every 15 minutes
        await asyncio.sleep(15 * 60)

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

app.include_router(cycles.router, prefix="/cycles", tags=["cycles"])
app.include_router(symptoms.router, prefix="/symptoms", tags=["symptoms"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(medications.router, prefix="/api/medications", tags=["medications"])
app.include_router(clinician.router, prefix="/api/clinician", tags=["clinician"])
app.include_router(partner.router, prefix="/api/partner", tags=["partner"])
