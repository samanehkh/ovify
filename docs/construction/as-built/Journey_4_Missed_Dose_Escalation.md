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

---

## 5. As-Built Truth Sync (2026-07-08)

Reconciled against code at commit `7d3f2e0`+.

| Item | Status |
|---|---|
| **Level 1 cadence: plan says checks every 15 min. As-built: every 5 min.** Partner "webhook" remains a console log (`[PARTNER WEBHOOK ALERT] …`) — no Twilio/SMS integration exists. | ⚠️ Deviation (accepted for local dev; message says exactly what BRD J4 specifies) |
| **Level 2 timing: plan says 23:50 same-day EOD sweep. As-built: idempotent `processed_dates` ledger processing dates up to *yesterday*, every 5 min.** More robust (survives restarts, never silently loses a day — each date processed exactly once), but the Red Alert appears the **following morning**, not same-evening. BRD J4 specifies T+120-min same-evening escalation. | ⚠️ Deviation — **needs product decision**: keep ledger + add a same-day sweep pass, or accept next-morning escalation for MVP |
| **Level 3 resolution: `resolve-alert` rewrites `Missed`/`Late` logs to `"On Time"`.** This **destroys the adherence audit trail** — a resolved miss becomes indistinguishable from genuine on-time compliance, corrupting the compliance data the clinic pays for and breaking Health Data Law auditability. | 🔴 **Defect** — resolution must be its own state (e.g. `"Resolved by Nurse"` + resolution reason + timestamp), never history rewriting |
| **Auto-clear**: patient `active_status` now auto-resets to "On Track" when all of today's overdue doses get logged (`adherence.auto_clear_user_alert`) — no manual nurse action needed for self-corrected lates. | ⚠️ Deviation (accepted — better UX than plan) |
| Escalation thresholds (60 min partner, EOD clinic) are hardcoded constants, not clinic-configurable. BRD J4 defines T+30/T+60/T+120 levels; as-built implements two of three (no T+30 gentle PWA ping). | ⚠️ Deviation (accepted for MVP) — T+30 push requires web-push infra (Phase 2) |
| `check-overdue` / `process-missed` endpoints unauthenticated. | 🔴 **Defect** — same as J3 sync |

> **Post-fix update (2026-07-08):** All 🔴 rows and the timing decision above are resolved — Level 3 resolution now preserves dose statuses (`resolved`/`resolved_by`/`resolved_at` flags + audit event, D2); sweep endpoints are clinician-gated (D1); and the daemon runs a **same-evening sweep after 23:50 UAE** on top of the catch-up ledger, restoring BRD J4's same-night Red Alert (D12). A live confirm minutes after the sweep upgrades the Missed record instead of bouncing. See `DEFECT_REGISTER.md`.
