# Implementation Plan - Journey 12: Failed-Cycle Recovery Mode

**Status:** Completed & Verified  
**Target:** Cycle outcome updates, alarm halts, physical/emotional recovery content rendering, and nurse call check-ins.  

---

## 1. Database Model & Schema
Added clinical cycle outcome storage inside `db/models.py` and `schemas/user.py`:
- **`cycle_outcome`**: Optional string field on `User` model (takes `"Failed"`, `"Success"`, or `None`).

---

## 2. API Endpoints
Implemented outcome triggers and injection halts inside the routers:
* **`POST /api/clinician/update-outcome/{user_id}`**: Clinicians record outcome results. If cycle is marked `"Failed"`, it resets patient `active_status` back to `"On Track"` to prevent clinical triage alarms.
* **`GET /api/medications/?user_id={user_id}`**: Intercepts queries when `user.cycle_outcome == "Failed"` and automatically returns an empty array `[]`. This halts any daily dose notifications, logging alerts, or schedules for patients in recovery.

---

## 3. Frontend Patient Experience
Created the empathetic recovery mode dashboard layout in `frontend/src/pages/DashboardPage.tsx`:
* Displays a supportive message if `user.cycle_outcome === 'Failed'`, informing them that dose tracking is paused.
* Renders unlocked supportive guide panels: **Physical Recovery**, **Emotional Healing**, and **Care Team Consultation**.
* Provides a **Request Nurse Callback** booking button (with visual callback requested state toggles).
* Keeps the CalmSeed emotional mood selector active to assist mental health check-ins during recovery.

---

## 4. Verification & Testing
* Created integration tests in `tests/test_recovery_mode.py` verifying:
  - Outcome update endpoints successfully saving values and clearing triage alarms.
  - Active prescription logs return `[]` to prevent alert fatigue after failure.
  - Rejects outcome entries for invalid user IDs (`404 Not Found`).

---

## 5. As-Built Truth Sync (2026-07-08)

Reconciled against code at commit `7d3f2e0`+.

| Item | Status |
|---|---|
| Sections 1–3 (outcome field, endpoints, recovery dashboard) | ✅ Accurate |
| Clinician outcome updates now behind `role=clinician` token auth; "Mark Failed" is confirm-gated in the portal UI. | ⚠️ Deviation (accepted) |
| Partner dashboard receives `cycle_outcome`, so a registered, consented partner sees recovery state — matches BRD J12's partner notification intent (no push/SMS, consistent with local-dev messaging posture). | ⚠️ Deviation (accepted) |
| Recovery-mode copy is **partially localized**: `recoveryTitle`/`recoveryText`/`recoverySteps` live in `content/i18n.ts`, but "Thinking of you", the alarm-pause note, and the nurse-callback section remain hardcoded English in `DashboardPage.tsx` — Arabic mode shows mixed-language content on the most emotionally sensitive screen in the product. | 🔴 **Defect** — move the remaining strings into the i18n layer (field-level pass) |
| "Request Nurse Callback" is a **client-side visual toggle only** — no backend record is created, so no coordinator will actually call. The button makes a promise the system cannot keep, to a patient who just received the worst news of her cycle. | 🔴 **Defect** — persist callback requests server-side + surface them in the triage console |
| BRD J12 also specifies scheduling the next consultation and a PWA theme shift to sage tones — neither implemented. | ⚠️ Deviation (accepted for MVP) — note in roadmap |

> **Post-fix update (2026-07-08):** Both 🔴 rows above are resolved — nurse-callback requests are persisted server-side (`callback_requests` table, idempotent endpoint, triage surfacing, completion on resolve; the UI only confirms after server acknowledgement) (D3), and the entire recovery screen including the callback section is localized EN/AR via `content/i18n.ts` (D9). See `DEFECT_REGISTER.md`.
