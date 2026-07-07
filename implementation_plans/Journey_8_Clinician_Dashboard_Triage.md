# Implementation Plan - Journey 8: Clinic Dashboard & Triage Console

**Status:** Completed & Verified  
**Target:** Clinician active patient triage view, dynamic risk prioritization, and alert resolutions.  

---

## 1. Backend Triage Calculations
Added dynamic risk priority checks inside `api/clinician.py`:
- **Red Alert (Urgent)**: Triggered if a patient has any recorded dose log in `dose_logs` with a status of `"Missed"`.
- **Yellow Attention**: Triggered if a patient has a `"Late"` log, or their active status is `"Action Required"` (e.g. overdue tasks past 60 mins).
- **On Track (Green)**: Default status if all recorded doses are logged on time.
- **Risk Mappings**: Dynamically queries `models.Prescription` records and maps user profiles. This is completely non-prescriptive, informing the nurse of compliance without directing care pathways.

---

## 2. API Endpoints (FastAPI)
Added new clinician routes in `api/clinician.py`:
* **`GET /api/clinician/triage`**: Queries active patients, evaluates their logging histories, and returns computed triage states.
* **`POST /api/clinician/resolve-alert/{user_id}`**: Resets the patient's active status back to `"On Track"` and marks missed/late logs to `"On Time"` (remediated) to clear active console alerts.

---

## 3. Frontend Integration
Updated the triage console component inside `frontend/src/pages/ClinicianPortalPage.tsx`:
* Uses React `useEffect` to fetch live data from `GET /api/clinician/triage` on sub-tab activation.
* Replaces the static mocks with mapped table rows.
* Renders **Resolve Alert** buttons only for patients showing active clinical alerts (Red/Yellow). Clicking the button triggers the resolve endpoint and refreshes the console grid automatically.

---

## 4. Verification & Testing
* Created integration tests in `tests/test_triage_console.py` verifying:
  - **Happy Path**: Correct ranking calculations for on-track, late, and missed doses, and verify that the resolve alert route successfully clears user status and updates database dose log statuses.
  - **Unhappy Path**: Resolve alert attempts on invalid user IDs return a `404 Not Found` response.

---

## 5. As-Built Truth Sync (2026-07-08)

Reconciled against code at commit `7d3f2e0`+.

| Item | Status |
|---|---|
| Sections 1–3 (triage calculations, endpoints, frontend wiring) | ✅ Accurate |
| **Authentication** (not in this plan): all triage routes require a `role=clinician` Bearer token from `POST /api/clinician/login`; portal has login/sign-out and 401 fallback. Auto-injected real tokens in tests. | ⚠️ Deviation (accepted) — add to plan scope |
| **`resolve-alert` remediates `Missed`/`Late` → `"On Time"`, erasing the audit trail.** Same defect as J4 §5 — the triage console's own history becomes untrustworthy after any resolution. | 🔴 **Defect** — dedicated resolution status + reason + nurse identity |
| Triage view also surfaces `cycle_outcome`, a **"Mark Failed"** action (launches J12 Recovery Mode, confirm-gated) and a "Recovery Active" state — beyond this plan's scope but shipped. | ⚠️ Deviation (accepted) — add to plan scope |
| Red/Yellow ranking scans a patient's **entire dose-log history** — one Missed log from weeks ago keeps a patient Red forever (until resolution rewrites it, which is the defect above). No recency window. | 🔴 **Defect** — rank on a rolling window (e.g. current cycle / last 7 days) in the field-level pass |
| No per-nurse identity on resolutions (shared clinic token). | 🔴 **Defect** (pre-pilot) — same as J1 sync |

> **Post-fix update (2026-07-08):** All 🔴 rows above are resolved — resolution preserves the audit trail with nurse attribution (D2/D4), triage ranks only unresolved logs within a rolling 7-day recency window (D8), and pending nurse-callback requests surface as Yellow Attention (D3). See `DEFECT_REGISTER.md`.
