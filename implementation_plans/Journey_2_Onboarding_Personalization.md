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
