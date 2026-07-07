# Implementation Plan - Journey 1: Clinic Patient Registration (AI Protocol Parser)

**Status:** Completed & Verified  
**Target:** Clinician web onboarding, Whisper/NLP dictation parsing, and patient seeding.  

---

## 1. Backend NLP Parsing Service
Created the natural language parsing module in `services/protocol_parser.py`:
- **Approved Formulary**: Gonal-F, Menopur, Cetrotide, and Ovitrelle.
- **Parser Engine**: Uses lookahead regex patterns `re.split(r'[,;]|\.(?!\d)|\band\b', text)` to separate drug schedules without breaking decimal doses (like `0.25mg`).
- **Data Extraction**: Extracts dosages, injection hours (AM/PM), and start day triggers. Start date shifts forward relative to current server date (e.g. `"tomorrow"` or `"Day 6"`).
- **Red Flag warnings**: Matches capitalization or unrecognized medication keywords (e.g. `Gonal-X 150 IU`) and flags them.

---

## 2. API Endpoints (FastAPI)
Added new routing rules in `api/clinician.py` and mounted them at `/api/clinician` in `main.py`:
* **`POST /api/clinician/parse-protocol`**: Takes raw protocol strings and returns structured parsed medications alongside warnings.
* **`POST /api/clinician/register`**: Creates patient profile users and commits their daily prescriptions in one transaction. Enforces email/phone constraints.

---

## 3. Clinician Portal Frontend (Widescreen Tablet/Desktop Console)
Built a dedicated widescreen Clinician Portal interface at `frontend/src/pages/ClinicianPortalPage.tsx` designed specifically for tablet/desktop displays (with left-sidebar navigation instead of mobile headers):
* **Left-Sidebar Navigation**: Houses the logo, clinical center label, status flags, and intake/triage navigation links.
* **Patient Intake (J1)**: Spacious grid layout containing demographic fields, dictation input, and an auto-filled prescription grid. Flags unrecognized items in red warning alert boxes.
* **Triage Command Center (J8)**: Widescreen data table displaying patient lists, status badges (Red Alert for missed doses, Yellow for stress/late, Green for on track), and action triggers.
* **Path-based Isolation**: Completely isolated from the Patient PWA. Hosted on the standalone `/clinician` path (tablet view). Zero navigation or leakage buttons are visible inside the Patient PWA.

---

## 4. Verification & Testing
* Created integration tests in `tests/test_clinic_registration.py` verifying:
  - Clause splits containing decimals.
  - Correct AM/PM hour extractions.
  - Dropdown error flag mappings.
  - Database patient writes.
