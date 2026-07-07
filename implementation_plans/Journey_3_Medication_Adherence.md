# Implementation Plan - Journey 3: Daily Injection Flow & Adherence Logging

**Status:** Completed & Verified  
**Target:** Daily task schedules, adherence time limits, and clinical alert escalations.  

---

## 1. Database Schema
Created two tables inside `db/models.py` to support prescription schedules:
- **`prescriptions`**: Stores drug names (Gonal-F, Menopur), scheduled times, dosages, routes, start date, and end date.
- **`dose_logs`**: Logs individual administration entries (prescription_id, user_id, status: `"On Time"` / `"Late"` / `"Missed"`, logged_at, and scheduled_date).

---

## 2. API Endpoints (FastAPI)
Added medication logging routes inside `api/medications.py`:
* **`GET /api/medications`**: Returns active prescriptions today, checking status (`"Due"`, `"Taken"`, or `"Missed"`).
* **`POST /api/medications/{prescription_id}/confirm`**: Confirms a dose. Automatically evaluates adherence if administration falls within $\pm 60$ minutes of the schedule (marking `"On Time"` or `"Late"`). Supports custom reported time overrides (`actual_time`) for offline logs.
* **`POST /api/medications/check-overdue`**: Evaluates overdue injections past 60 minutes and triggers partner webhook payloads.
* **`POST /api/medications/process-missed`**: End-of-day background processor logging missed injections and updating user status to `"Action Required"`.

---

## 3. Background Daemon (FastAPI lifespan)
Integrated an automated periodic async loop inside `main.py` which:
- Scans active cycles every 15 minutes.
- Fires console alerts simulating partner webhook notifications for late injections.
- Performs end-of-day checks past 23:50 to insert `"Missed"` logs for today's incomplete tasks.

---

## 4. Frontend Injection Guide View
Developed guides inside `frontend/src/pages/MedicationLogPage.tsx` and the dashboard:
* Displays high-res pen images, video guide, and decorative safety instructions.
* Dynamic stim day calculator ring based on cycle start and end dates.
* sliding Sage success toast alerts upon successful logging.
* Persistent clinic alert warning banner showing coordinator status checks.

---

## 5. Verification & Testing
* Created integration tests inside `tests/test_medication.py` covering:
  - $\pm 60$ minute window limits (tests for 7:02 PM on-time vs 9:30 PM late).
  - Missed dose database logs.
  - User status escalations.
  - Double confirmation logging blocks.
