# US-J2-02: Patient Home Dashboard (Pre-Cycle / Awaiting Baseline Scan)

| Field | Value |
|---|---|
| **Journey** | J2 — Patient Onboarding & Personalization |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Report the start of her menstrual cycle (Day 1) and access pre-cycle preparation details. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Sarah (a patient waiting to start her cycle)**, I want to **view my pre-cycle guidelines and report the start of my period on my home dashboard**, so that **my clinic is instantly notified to schedule my baseline follicle scan.**

## 2. Context & entry
- **Entry point:** App launch (after onboarding completed but before the clinic nurse registers active stimulation prescriptions in the database).
- **Preconditions:** Authenticated session; `onboarded === true`; no active prescriptions in database.
- **Exit:**
  - Tapping "Report Day 1" opens the confirmation modal.
  - Tapping top-right Profile Avatar slides open settings, support, and logout.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: View pre-cycle dashboard as first-time patient
  Given Sarah has completed onboarding but has no active prescriptions
  And her injection_comfort is "First time"
  When she opens the PWA Home Page
  Then she sees the brand logo mark at the top left
  And she sees her Profile Avatar at the top right
  And she sees a prominent button: "📢 My Period Has Started"
  And she sees the full expanded "Baseline Scan Guide" explaining what to expect on Day 2/3
  And CalmSeed Somatic Breathing and RAG AI launchers are visible

Scenario: Sarah reports Day 1 start
  Given Sarah is on the pre-cycle home page
  When she taps "📢 My Period Has Started"
  Then the system opens the "Confirm Day 1" modal
  When she taps "Confirm flow started"
  Then the system submits the day 1 report to the clinic (HTTP 200)
  And her home page status transitions to "Day 1 Reported · Booking Baseline Scan"
  And the "My Period Has Started" button becomes disabled and read-only
  And an alert is sent to the Clinic Triage Dashboard (US-J8-01)
```

## 4. Screen Layout & States

The screen enforces a mobile-first column layout matching the official brand rules:

### Header Area
*   **Logo mark:** Official logo from `/static/logo.png` aligned top-left.
*   **Profile Avatar Button:** Top-right corner (48x48px tap target) displaying initials "SK". Tapping opens settings.

### Main Content Area (Scrollable Feed)
1.  **Menstrual Cycle Reporting Card:**
    *   *Default State:* A spacious card containing the action button **"📢 My Period Has Started"** (Navy outline, bold text) with a status tip: *"Full flow must be established. If in doubt, contact your clinic."*
    *   *Confirmation Step:* Tapping the button opens a modal requesting a simple confirmation: *"Has full menstrual flow (not just spotting) started today? [Confirm Flow Started] [Go Back]"* to avoid false starts.
    *   *Reported State:* Replaced by an organic Sage-green card: **"✓ Day 1 Reported"** with subtext: *"Awaiting clinic booking. Mona will call you to schedule your baseline scan."*
2.  **Support Tools (Side-by-Side Cards):**
    *   *Left Card: "Ask Me Anything" (RAG FAQ Link)* — Integrated search-pill input styling.
    *   *Right Card: "CalmSeed Companion"* — Features an active **looping CSS breathing bubble animation** to provide immediate relaxation value.
3.  **Adaptive Baseline Guide (Axis A):**
    *   *First-Timer:* Shows detailed step-by-step accordion/toggle guides explaining the baseline appointment (ultrasound scan details, blood tests, why cysts are checked).
    *   *Experienced:* Displays a simple check-list: *"Baseline check: Day 2 or 3 of menstruation. Ensure you bring your prescription sheets."*
4.  **Bottom Navigation Bar (Floating Glassmorphic Dock):**
    *   A floating navigation dock with a frosted glass backdrop (`backdrop-filter: blur(12px)`) and rounded corners (`border-radius: 24px`).
    *   Contains three tabs: **Home** (Active), **Calendar** (Disabled - no active cycle), and **Medications** (Disabled - no active cycle).

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | "My Period Has Started" button enabled; baseline guides visible. |
| **confirming** | Button tapped | Modal overlay: "Report Day 1? Select this if full menstrual flow has started today. [Confirm] [Go Back]" |
| **submitting** | Confirm tapped | Spinner on button, "Notifying clinic..."; inputs disabled. |
| **success** | 200 OK | Button changes to "✓ Day 1 Reported · Awaiting scan schedule". |
| **offline / queued** | Network lost | Offline badge "Sync Pending". Local queue registers the Day 1 report. |

## 5. Data Contract
- **Endpoint:** `POST /api/users/{user_id}/report-day1` — auth: **patient Bearer token**.
- **Request:**
  ```json
  {
    "reported_at": "string (ISO-8601 UTC timestamp)"
  }
  ```
- **Response 200:**
  ```json
  {
    "status": "Day 1 Reported",
    "reported_date": "YYYY-MM-DD",
    "baseline_scan_status": "Pending Booking"
  }
  ```

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| reported_at | derived | ISO-8601 string | Y | — | current time |
| report_btn | action | button | — | disabled if already reported | — |

## 7. Components
- Shared navigation bottom bar (3-tabs), top header profile avatar, custom confirm modal.

## 8. Design Tokens
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`.
- Accents: Navy `#13233C` (Primary buttons/borders), Lavender `#9E8CEF` (Select highlights), Sage `#3E8E6E` (Success state).

## 9. Copy (EN)
| Key | String |
|---|---|
| report_period_btn | "📢 My Period Has Started" |
| report_confirm_title | "Report Day 1?" |
| report_confirm_body | "Please confirm that you have started your period today. We will notify your clinic team to book your baseline scan." |
| reported_status | "✓ Day 1 Reported · Awaiting scan schedule" |
| prep_guide_header | " Follicle scan preparation" |
| prep_guide_body | "Your baseline scan will occur on Day 2 or 3 of your period. This checks your ovaries before you start daily hormone injections." |

## 10. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] Clear focus rings and large touch-friendly targets (min 48x48px)
- [x] Screen states in §4 implemented

## 11. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J2
- **Endpoints:** `api/users.py`
- **Frontend:** `frontend/src/pages/DashboardPage.tsx` (Pre-cycle layout)
