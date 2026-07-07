# Implementation Plan - Journey 2: Patient Onboarding & Personalization

**Status:** Completed & Verified  
**Target:** PWA Patient Onboarding Wizard & OTP Authentication  

---

## 1. Database Schema Updates
We extended the `User` model in `db/models.py` with the following profile fields:
- `phone`: String (Unique, nullable). Allows looking up pre-registered patient charts.
- `sleep_time`: String (Nullable). Stores bedtime settings (e.g. `"10:00 PM - 12:00 AM"`).
- `injection_comfort`: String (Nullable). Stores self-administration experience levels.
- `onboarded`: Boolean (Default: `False`). Tracks onboarding workflow completion status.

---

## 2. API Endpoints (FastAPI)
Added three endpoints inside `api/users.py`:
* **`POST /users/request-otp`**: Normalizes phone input and returns mock OTP sent status.
* **`POST /users/verify-otp`**: Normalizes phone input, validates access code (`123456`), and logs the user in.
* **`POST /users/{user_id}/onboard`**: Saves sleep time and comfort level, toggles `onboarded = True`, and updates status to `"On Track"`.

---

## 3. Frontend Wizard Layout (Vite + React)
Built a multi-step login and personalization shell:
* **Step 1: SMS Access Code** (Enter phone, verify code).
* **Step 2: Bedtime Selection** (Sets sleep window).
* **Step 3: Comfort Level** (Reassurance preference).
* **Step 4: PWA Prompt** (Guide banner for Home Screen bookmarking).
* Centralized authentication session storage inside `localStorage` for PWA state persistence.

---

## 4. Verification & Testing
* Created integration tests in `tests/test_user_onboarding.py` verifying:
  - Phone number normalization rules.
  - Invalid OTP error handling.
  - Profile state updates.

---

## 5. As-Built Truth Sync (2026-07-08)

Reconciled against code at commit `7d3f2e0`+.

| Item | Status |
|---|---|
| Sections 1–3 (schema fields, OTP endpoints, wizard UI) | ✅ Accurate |
| **`POST /users/verify-otp` now returns a signed Bearer token** (`role=patient`, 24h expiry) via `UserAuthResponse`; the frontend stores it and attaches it to every subsequent call. | ⚠️ Deviation (accepted) — add to plan scope |
| **`/users/{id}`, `/users/{id}/onboard`, `/users/{id}/partner-consent` are token-gated with an IDOR check** (403 if the path `user_id` ≠ token `user_id`). | ⚠️ Deviation (accepted) |
| OTP remains mocked (`123456`); no real SMS delivery. | ⚠️ Deviation (accepted for local dev) |
| **`sleep_time` and `injection_comfort` are stored but never read** — reminder timing ignores the sleep window, and the injection guide shows the identical full walkthrough to "First time" and "Experienced" users. Personalization data is collected and functionally dead. | 🔴 **Defect** — make the fields drive behavior or stop collecting them (field-level pass, J2/J3) |
| PWA install step: the app is now a real PWA (`vite-plugin-pwa`, generated service worker), so the "Add to Home Screen" instruction is truthful. | ✅ Accurate (as of this sync) |

> **Post-fix update (2026-07-08):** `injection_comfort` now drives guide depth — "Experienced" collapses the video and shows a condensed checklist in `MedicationLogPage` (D7 partial). `sleep_time` remains data-only by explicit decision until a reminder engine exists (Phase 2 push notifications). See `DEFECT_REGISTER.md`.
