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

---

## 5. As-Built Truth Sync (2026-07-08)

Reconciled against code at commit `7d3f2e0`+. Classification: ✅ accurate ·
⚠️ as-built deviation (accepted) · 🔴 defect (to fix).

| Item | Status |
|---|---|
| Sections 1–3 (parser, register endpoint, portal UI) | ✅ Accurate |
| **Clinician authentication** (not in this plan): all `/api/clinician/*` routes now require a `role=clinician` Bearer token from `POST /api/clinician/login` (nurse enters the clinic access key; key checked server-side, never shipped in the client bundle). Portal has a login screen, sign-out, and 401 session-expiry fallback. | ⚠️ Deviation (accepted) — add to plan scope |
| **`dob` is collected by the intake form and accepted by `RegisterPatientRequest`, but the `User` model has no `dob` column — the value is silently discarded.** | 🔴 **Defect** — either persist it (age is clinically relevant per BRD J11 roadmap) or remove the field |
| **`POST /register` performs no server-side formulary validation** on the prescriptions array — it persists whatever medication names/dosages the client sends. Parser flags unrecognized drugs, but the register step doesn't re-check. | 🔴 **Defect** — re-validate against the approved formulary at registration time |
| Phone normalization (strip to digits/+) duplicated across `users.py`, `partner.py`, `clinician.py` with identical inline code. | ⚠️ Debt — extract one normalizer before field-level pass |
| No SMS invite is actually sent ("SMS invite sent" message is aspirational copy). | ⚠️ Deviation (accepted for local dev; Twilio is pre-launch scope) |
| Clinician token has no per-nurse identity (shared clinic key, `user_id=0`) — registration events aren't attributable to an individual nurse. | 🔴 **Defect** (pre-pilot) — Health Data Law auditability |

> **Post-fix update (2026-07-08):** All 🔴 rows above are resolved — `users.dob` is persisted (D5), `/register` re-validates prescriptions against the approved formulary server-side and rejects unknowns with a 400 (D6), phone normalization is centralized in `core/phone.py` (D11), and registrations are attributed to the named nurse in the new `audit_log` table (D4). See `DEFECT_REGISTER.md`.
