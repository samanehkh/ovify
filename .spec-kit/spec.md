# Ovify Specification — Homepage Dashboard & Journey 3 (Medication Logging)

> **⚠️ TRUTH-SYNC NOTICE (2026-07-08):** The implementation has evolved beyond this
> spec. **Part 4 (As-Built Truth Sync)** at the bottom of this document is the
> authoritative record of where reality differs from Parts 1–3. Read Part 4 before
> relying on any schema, API, or timing rule stated below.

## Part 1: Homepage Dashboard (UI/UX Specification)

### 1.1 User Story
**As an IVF patient,** I want to open the Ovify app on my phone and immediately see my today's treatment status, today's injection task, and a reassuring emotional check-in — so that I feel supported, informed, and know exactly what to do without calling my clinic.

### 1.2 Acceptance Criteria
* The homepage loads within 2 seconds on mobile with no additional navigation required.
* The patient sees their **first name and a warm greeting** based on time of day (e.g., "Good morning, Sara").
* The **Today's Task card** is prominently visible and shows today's injection name, dosage, and time.
* A **Treatment Progress Bar** shows which stimulation day the patient is currently on (e.g., "Day 5 of 12").
* The **CalmSeed Emotional Check-in strip** appears below the task card with a soft prompt (e.g., "How are you feeling?") and 5 selectable mood options.
* A **"Ask Ovify AI"** shortcut button is visible at the bottom for quick questions.
* The layout is mobile-first, single-column, and requires **zero horizontal scrolling**.
* All text must render in **English** (Arabic bilingual support is Phase 2).

### 1.3 Visual Design Requirements
* **Color Palette:**
  * Background: Ivory `#F8F5F1` (light, soft, non-clinical)
  * Primary accent: Lavender `#9E8CEF`
  * Secondary accent: Blush `#F4A0A0`
  * Text: Dark Navy `#13233C`
  * Muted text: `#6B7A99`
* **Typography:**
  * Headings: `DM Sans` (700 weight)
  * Body text: `Manrope` (400–500 weight)
  * Data/labels: `Inter` (400–600 weight)
  * All three loaded from Google Fonts.
* **Component Style:**
  * Cards use glassmorphism: `rgba(255,255,255,0.65)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.65)`, `border-radius: 20px`.
  * Lavender glow on interactive elements: `box-shadow: 0 8px 32px rgba(158,140,239,0.18)`.
  * Hover transitions: `transform: translateY(-3px)`, `transition: all 0.3s cubic-bezier(0.16,1,0.3,1)`.
  * Background: layered radial gradients in lavender and blush at low opacity (6–10%) over ivory.

---

## Part 2: Journey 3: Daily Injection Flow & Confirmation (API & DB Specification)

### 2.1 Acceptance Criteria (Gherkin Scenarios)

#### Scenario 1: Retrieve active medications for today
```gherkin
Given a patient "Sarah" with user ID 1 is logged in
And she has two active prescriptions:
  | Name      | Dosage | Time    |
  | Gonal-F   | 150 IU | 8:00 PM |
  | Menopur   | 75 IU  | 8:00 PM |
When she opens the homepage dashboard
Then the system queries the database for active prescriptions for today
And returns the list with their logs for today:
  | Name      | Dosage | Time    | Status |
  | Gonal-F   | 150 IU | 8:00 PM | Due    |
  | Menopur   | 75 IU  | 8:00 PM | Due    |
```

#### Scenario 2: Confirm dose on-time (within the 60-minute window)
```gherkin
Given a Gonal-F injection scheduled for 8:00 PM (20:00)
When the patient logs the injection at 8:15 PM (20:15)
Then the system creates a new dose log in the database
And records the status as "On Time"
And the homepage status for Gonal-F updates to "Taken"
```

#### Scenario 3: Confirm dose late (outside the 60-minute window)
```gherkin
Given a Menopur injection scheduled for 8:00 PM (20:00)
When the patient logs the injection at 9:30 PM (21:30)
Then the system creates a new dose log in the database
And records the status as "Late"
And the homepage status for Menopur updates to "Taken"
```

#### Scenario 4: Scheduled reminder and offline dose logging
```gherkin
Given a Gonal-F injection scheduled for 8:00 PM (20:00)
When the clock reaches 8:00 PM
Then the system sends an injection reminder: "Please log your Gonal-F 150 IU dose"
When the patient logs the dose at 9:30 PM (21:30) using the "Log Offline" option with a reported actual injection time of 8:00 PM (20:00)
Then the system creates a dose log in the database
And calculates adherence status ("On Time") based on the reported actual injection time rather than the entry submission timestamp
```

#### Scenario 5: Missed dose (Patient does not log at all)
```gherkin
Given a Menopur injection scheduled for 8:00 PM (20:00)
When the day ends (23:59:59) and the dose remains unlogged
Then the system automatically logs a "Missed" dose record in the database for that scheduled date
And updates the patient's active status to alert the clinic coordinators
```

#### Scenario 6: Step-by-step injection assistance
```gherkin
Given a patient is ready to administer their scheduled Gonal-F dose
When they select the Gonal-F card to open the injection guide
Then the page displays the following details:
  | Component          | Detail                                                         |
  | Medication Photo  | High-resolution visual of the Gonal-F pen                     |
  | Drug Details       | Name: Gonal-F, Dosage: 150 IU                                  |
  | Video Guide        | Inline tutorial ready to play without leaving the screen       |
  | Prep Checklist     | 1. Wash hands, 2. Clean injection site, 3. Store pen in fridge |
  | Log Action Button  | A highly visible "Injection Completed" button                   |
When the patient checks all items and clicks "Injection Completed"
Then the system records the logged dose in the database
And the medication status on the homepage updates to "Taken" (with the "On track" indicator updated to verify completion)
```

#### Scenario 7: Partner notification hook for late or missed doses
```gherkin
Given a Gonal-F injection scheduled for 8:00 PM (20:00)
When the clock reaches 9:00 PM (60 minutes overdue) and the dose remains unlogged
Then the system triggers a background webhook/message event for the partner application
And logs the payload: "Sarah has not confirmed her 8:00 PM Gonal-F injection yet."
```

### 2.2 Database Schema
To support Journey 3 adherence logging, we define three relational tables. The schemas must work with SQLite (local development) and Azure Database for PostgreSQL (production).

#### `users` Table
* `id`: Integer (Primary Key, Autoincrement)
* `name`: String (e.g., "Sarah")
* `email`: String (Unique)

#### `prescriptions` Table
* `id`: Integer (Primary Key, Autoincrement)
* `user_id`: Integer (Foreign Key -> `users.id`)
* `name`: String (e.g., "Gonal-F")
* `dosage`: String (e.g., "150 IU")
* `route`: String (e.g., "Subcutaneous")
* `scheduled_time`: String (Time in HH:MM:SS format, e.g. "20:00:00")
* `start_date`: Date (Stimulation protocol start date)
* `end_date`: Date (Stimulation protocol end date)

#### `dose_logs` Table
* `id`: Integer (Primary Key, Autoincrement)
* `user_id`: Integer (Foreign Key -> `users.id`)
* `prescription_id`: Integer (Foreign Key -> `prescriptions.id`)
* `logged_at`: DateTime (Timestamp when the patient clicked confirm)
* `scheduled_date`: Date (The calendar date this dose was due, e.g., "2026-07-03")
* `status`: String ("On Time" or "Late")

### 2.3 API Specification (FastAPI)

#### Get Daily Medications
* **Endpoint:** `GET /api/medications`
* **Query Params:** `user_id: int`
* **Description:** Retrieves all prescriptions active today for the user. Evaluates `dose_logs` for today's date to set each medication's current status ("Due" or "Taken").
* **Response Status:** `200 OK`

#### Log Medication Dose
* **Endpoint:** `POST /api/medications/{prescription_id}/confirm`
* **Query Params:** `user_id: int`
* **Description:** Records dose confirmation in the `dose_logs` table. Dynamically checks if the current server time is within \pm 60 minutes of the scheduled time. If so, logs `status = "On Time"`; otherwise logs `status = "Late"`.
* **Response Status:** `200 OK` or `201 Created`

### 2.4 PWA AJAX Integration
* The front-end (`index.html`) must use AJAX (`fetch`) to query `/api/medications?user_id=1` on page load.
* Replace the static medications markup with a dynamic template generated by JS using fetched data.
* If a medication is "Due", show a "Confirm Dose" button on the card.
* Tapping the "Confirm Dose" button sends a `POST` request to `/api/medications/{id}/confirm?user_id=1`. On success, show a visual toast message, update the status badge on the card to "Taken", and remove the button.

---

## Part 3: Verification & Technical Considerations

* **Frontend:** React (built with Vite) and styled with TailwindCSS, organized as a Progressive Web App (PWA) under the `frontend/` directory.
* **Backend:** FastAPI (Python) serving purely as a RESTful JSON API. CORS must be enabled to permit requests from the React dev server (default: `http://localhost:5173`).
* **Database:** SQLite (local development `test.db`) and Azure Database for PostgreSQL (production).
* **Testing:** Write backend unit and integration tests in `tests/test_cycle.py` using pytest to verify database persistence, schema validation, API responses, and dose timing compliance rules.

---

## Part 4: As-Built Truth Sync (2026-07-08)

This section reconciles Parts 1–3 with the code as it exists at commit `7d3f2e0`+.
Each delta is classified: **✅ accurate** · **⚠️ as-built deviation (accepted)** ·
**🔴 defect (to fix)**.

### 4.1 Authentication (not covered by Parts 1–3 at all)

| As-built reality | Classification |
|---|---|
| All patient endpoints require `Authorization: Bearer <token>` (HMAC-signed, 24h expiry, `role=patient`). Token issued by `POST /users/verify-otp`. `user_id` is derived from the token — the `user_id` query param in §2.3 is now ignored by the server. | ⚠️ Deviation (accepted) — spec predates auth. §2.3 must be rewritten in the field-level pass. |
| Clinician routes require `role=clinician` Bearer tokens from `POST /api/clinician/login` (nurse-entered clinic access key, verified server-side). Partner routes require `role=partner` tokens. | ⚠️ Deviation (accepted) |
| Server fails closed on boot if `AUTH_SECRET_KEY` / `CLINICIAN_API_KEY` env vars are missing. | ⚠️ Deviation (accepted) |
| OTP is mocked as `123456` for patient and partner login. | ⚠️ Deviation (accepted for local dev; real SMS OTP is pre-launch scope) |
| `POST /api/medications/check-overdue` and `POST /api/medications/process-missed` have **no auth at all**. | 🔴 **Defect** — must be gated (clinician token or internal-only) before deployment. |
| Clinician tokens carry no individual nurse identity (single shared access key; `user_id=0`). No per-nurse audit trail. | 🔴 **Defect** (pre-pilot) — UAE Health Data Law auditability requires per-user identity. |

### 4.2 Database schema (§2.2 is stale)

| Spec §2.2 says | As-built | Classification |
|---|---|---|
| `users`: id, name, email | Also: `phone` (unique), `sleep_time`, `injection_comfort`, `onboarded`, `active_status`, `cycle_type`, `cycle_outcome`, `partner_phone`, `partner_consent`, `created_at` | ⚠️ Deviation (accepted) — schema grew with Journeys 1/2/7/12 |
| `dose_logs`: …status "On Time" or "Late" | Status also takes `"Missed"`. New column `self_reported` (bool) distinguishes live confirmations from patient-reported times. New `UniqueConstraint(prescription_id, scheduled_date)` prevents double-logging races. | ⚠️ Deviation (accepted) |
| (absent) | New table `processed_dates` — idempotent ledger recording which calendar dates the missed-dose sweep has processed. | ⚠️ Deviation (accepted) |
| (absent) | `cycles` table exists but is **not used** by the dashboard; stim-day progress is derived from prescription start/end dates. | 🔴 **Defect / debt** — decide: wire `cycles` in or remove it. |

### 4.3 Dose-timing rules (§2.3 is wrong in two ways)

| Spec says | As-built | Classification |
|---|---|---|
| "within ±60 minutes" → On Time | **Signed window: −15 to +60 minutes.** Confirming >15 min *early* is Late; spec's symmetric ±60 never existed in final code. | ⚠️ Deviation (accepted — clinically safer) — update §2.3 wording. |
| `actual_time` = reported HH:MM(:SS), assumed today | Also accepts **full ISO-8601 timestamps** (offline queue). Guardrails: future times rejected (5-min skew tolerance); bare times max 24h old; ISO max 48h old. Cross-midnight resolution anchors on the *reported* date. All server timing pinned to UAE tz (`core/time.py`). | ⚠️ Deviation (accepted) |
| (absent) | **Missed→Late reconciliation:** if the EOD sweep already wrote `Missed` and a self-reported confirmation arrives later, the log is upgraded in place to `Late (self_reported=true)` — no duplicate row, truthful record. | ⚠️ Deviation (accepted — this is the desired clinical behavior; must be added to Scenario 5's Gherkin in the field-level pass) |

### 4.4 Scenario 5 (missed-dose sweep) timing

Spec says the Missed record is written "when the day ends (23:59:59)". As-built: the
daemon (every **5 minutes**, not 15) runs an idempotent catch-up over the previous
14 days **up to yesterday** — meaning today's unlogged dose is recorded as Missed on
the *next* daemon pass **after midnight**, not at 23:59:59 sharp.

**Classification: ⚠️ deviation — needs a product decision.** The ledger design is more
robust (survives restarts, never loses a day), but the clinic Red Alert now appears
the following morning rather than same-evening. If same-evening escalation is required
(BRD J4 says T+120 min), add a same-day sweep pass on top of the ledger.

### 4.5 Frontend (§2.4 is obsolete)

§2.4 describes AJAX inside `index.html`. That artifact is **archived** (`Archive/index.html`).
The patient app is the React/Vite PWA under `frontend/` — real service worker
(`vite-plugin-pwa`), typed API layer (`src/services/api.ts`), Bearer-token auth,
i18n scaffold with RTL switching, and an **offline dose queue**:

* Doses logged offline persist in `localStorage` with full ISO timestamps, render as
  honest **"Sync Pending"** (not "Taken"), and drain on app mount, window focus, and
  the `online` event.
* Sync drops items definitively rejected by the server (4xx) and retries only
  transient failures (network/5xx).
* Queue merging is date-scoped — a stale queued item cannot mark today's dose taken.

⚠️ Deviation (accepted) — §2.4 to be rewritten as a React/PWA spec in the field-level pass.

### 4.6 Testing (§Part 3 update)

Tests now span `tests/test_medication.py`, `test_user_onboarding.py`,
`test_clinic_registration.py`, `test_triage_console.py`, `test_partner_sharing.py`,
`test_recovery_mode.py`, `test_auth_security.py` (43 passing). Auth is exercised with
real signed tokens (no test bypass). `tests/test_cycle.py` covers the legacy
cycle-prediction module only.

### 4.7 Defect Resolution Addendum (2026-07-08, same day — post-fix)

All 🔴 defect rows in §4.1–§4.5 above have since been resolved (see
`implementation_plans/DEFECT_REGISTER.md` for the full closure record, D1–D12).
The rows above are retained as the historical record of the gap; current behavior:

* **Sweep endpoints** (`check-overdue`, `process-missed`) are clinician-token gated (D1).
* **Nurse resolution preserves history**: `dose_logs` gains `resolved`/`resolved_by`/`resolved_at`;
  status is never rewritten; triage ranks only unresolved logs within a rolling
  **7-day recency window** (D2, D8).
* **Nurse callbacks are persisted** in a new `callback_requests` table, surfaced in triage,
  completed on resolution with attribution (D3).
* **Attribution**: clinician login requires the nurse's name (embedded in the token);
  a new `audit_log` table records register/resolve/outcome/callback actions (D4).
* **`users.dob`** is persisted at registration (D5); **`/register` re-validates against
  the approved formulary server-side** (D6).
* **`injection_comfort` drives guide depth** (Experienced → condensed guide);
  `sleep_time` remains data-only until a reminder engine exists (D7 — partial, documented).
* **Recovery-mode copy fully localized** (EN/AR) including the callback section (D9).
* **The legacy `cycles` module was removed** — model, router, schemas, prediction
  service, and tests (§4.2's unused-table row) (D10). Phone normalization is
  centralized in `core/phone.py` (D11).
* **§4.4's product decision is resolved BRD-side**: the daemon now runs a
  same-evening sweep after 23:50 UAE (Red Alert lands the same night per BRD J4),
  with the idempotent ledger retained as the restart backstop. A live confirmation
  arriving minutes after the sweep upgrades the `Missed` record instead of bouncing (D12).
