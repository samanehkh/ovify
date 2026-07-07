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
