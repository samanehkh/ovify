# Implementation Plan - Journey 4: Missed-Dose Multi-Level Escalation

**Status:** Completed & Verified  
**Target:** Background tracking daemons, overdue triggers, and clinician triage escalations.  

---

## 1. Multi-Level Escalation Workflows
The system implements a 3-level response workflow for incomplete tasks:

### Level 1: Overdue Trigger (60-Minute Partner Webhook)
* **Trigger**: A background thread checks active schedules every 15 minutes. If a dose remains unconfirmed 60 minutes after its scheduled hour, Level 1 triggers.
* **Action**: Calls the partner webhook simulation, logging the exact payload:  
  `"[BACKGROUND DAEMON ALERT] Sarah has not confirmed her 8:00 PM Gonal-F injection yet."`

### Level 2: End-of-Day Clinic Escalation (EOD Sweep)
* **Trigger**: The background daemon sweeps active user cycles at 23:50.
* **Action**:
  1. Creates a database record in `dose_logs` with `status = "Missed"`.
  2. Updates patient `active_status` to `"Action Required"`.
  3. Activates the clinic warning banner on the patient's Homepage PWA: *"Clinic Alert: Action Required. We detected a missed or late injection... Your clinic coordinator has been notified..."*.
  4. Displays the patient under **Red Alert (Urgent)** in the Clinician Triage Dashboard.

### Level 3: Nurse Review & Resolution
* **Trigger**: Clinic coordinator resolves the alert on the Clinician Portal dashboard.
* **Action**:
  1. Resets patient status back to `"On Track"`.
  2. Remediates Missed logs to `"On Time"`, clearing alert cards from both interfaces.

---

## 2. API Endpoints
Implemented routes inside [api/medications.py](file:///Users/samaneh/Documents/Ovify/api/medications.py) and [api/clinician.py](file:///Users/samaneh/Documents/Ovify/api/clinician.py):
* **`POST /api/medications/check-overdue`**: Evaluates active unlogged prescriptions past 60 minutes and logs webhook payloads.
* **`POST /api/medications/process-missed`**: Inserts missed dose log records and updates patient statuses to `"Action Required"`.
* **`POST /api/clinician/resolve-alert/{user_id}`**: Remediates logs and resets user active status to `"On Track"`.

---

## 3. Background Daemon Configuration
Configured the background thread in [main.py](file:///Users/samaneh/Documents/Ovify/main.py) using `asyncio` inside the FastAPI `lifespan` handler. It runs tasks periodically without blocking client request threads.

---

## 4. Verification & Testing
* Created integration tests inside `tests/test_medication.py` and `tests/test_triage_console.py` verifying:
  - Overdue logging alerts for late injection times.
  - End-of-day sweeps correctly inserting Missed logs and updating clinical statuses.
  - Triage resolutions clearing alerts from both database records and user screens.
