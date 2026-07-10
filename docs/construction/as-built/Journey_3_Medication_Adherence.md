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

---

## 6. As-Built Truth Sync (2026-07-08)

Reconciled against code at commit `7d3f2e0`+.

| Item | Status |
|---|---|
| **Timing window (§2): plan says "±60 minutes". As-built: signed −15/+60 window** — confirming more than 15 min *early* classifies as Late. The symmetric ±60 wording is wrong. | ⚠️ Deviation (accepted — clinically safer); fix plan wording in field-level pass |
| **`actual_time` now also accepts full ISO-8601 timestamps** (used by the offline queue). Guardrails: future times rejected (5-min skew tolerance), bare HH:MM max 24h old, ISO max 48h old. Cross-midnight doses resolve against the *reported* date. All timing pinned to UAE tz via `core/time.py`. | ⚠️ Deviation (accepted) — add to plan scope |
| **`dose_logs.self_reported`** (bool) records whether the time was patient-reported vs live-confirmed — nurse-visible truthfulness signal. `UniqueConstraint(prescription_id, scheduled_date)` blocks double-log races. | ⚠️ Deviation (accepted) |
| **Missed→Late reconciliation:** a self-reported confirmation arriving after the EOD sweep wrote `Missed` upgrades that record in place to `Late (self_reported=true)`. Tested in `tests/test_auth_security.py`. | ⚠️ Deviation (accepted — desired clinical behavior) |
| **Daemon (§3): plan says 15-minute scans + 23:50 same-day sweep. As-built: 5-minute scans + an idempotent `processed_dates` catch-up ledger that processes dates up to *yesterday*.** Missed records therefore land after midnight, not at 23:50 same-day. | ⚠️ Deviation — **needs product decision** (see J4 sync §5) |
| **Frontend offline dose queue** (not in this plan): offline confirms persist in `localStorage` with full ISO timestamps, show an honest "Sync Pending" badge, drain on app mount / window focus / `online` event, drop 4xx-rejected items, retry only network/5xx, and merge date-scoped so stale items can't mark today taken. | ⚠️ Deviation (accepted) — add to plan scope |
| All medication endpoints token-gated (`role=patient`); `user_id` comes from the token, not the query param. | ⚠️ Deviation (accepted) |
| **`check-overdue` and `process-missed` trigger endpoints are unauthenticated.** | 🔴 **Defect** — gate before deployment |
| Prep checklist remains decorative in `MedicationLogPage.tsx` (§4 says "decorative safety instructions" — accurate but the checklist should not gate the log action; currently it doesn't in React app). | ✅ Accurate |

> **Post-fix update (2026-07-08):** The 🔴 rows above are resolved — sweep trigger endpoints are clinician-token gated (D1), and the legacy `cycles` module was removed entirely (D10). Reconciliation now upgrades a daemon-written `Missed` on ANY genuine confirmation (live or self-reported), not just offline syncs. See `DEFECT_REGISTER.md`.
