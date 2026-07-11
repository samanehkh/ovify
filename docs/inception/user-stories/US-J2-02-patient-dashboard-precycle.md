# US-J2-02: Patient Home Dashboard (Awaiting Cycle Start)

| Field | Value |
|---|---|
| **Journey** | J2 — Patient Onboarding & Personalization |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | View cycle sync status, review scheduled scan appointments, and launch support utilities (CalmSeed / RAG AI). |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Sarah (a patient awaiting her cycle to start)**, I want to **view my upcoming scan appointments and access my anxiety management tools on my home page**, so that **I feel prepared for my baseline checks and reassured about my upcoming schedule.**

## 2. Context & entry
- **Entry point:** App launch (after onboarding completed but before the clinic nurse registers active stimulation prescriptions in the database).
- **Preconditions:** Authenticated session; `onboarded === true`; no active prescriptions in database.
- **Exit:**
  - Tapping top-right Profile Avatar slides open account details and logout.
  - Bottom tabs route to Calendar, Medications, or Settings.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: View pre-cycle dashboard with scheduled next scan
  Given Sarah has completed onboarding and has no active prescriptions
  And her next_appointment_datetime in the database is "2026-07-15 09:00:00"
  When she opens the PWA Home Page
  Then she sees the brand logo mark at the top left
  And she sees her Profile Avatar ("SK") at the top right
  And she sees a prominent card: "Awaiting Cycle Start"
  And she sees a card displaying: "Next scan appointment: Tuesday, 15 July at 09:00"
  And CalmSeed Somatic Breathing and RAG AI launchers are visible
  And the bottom navigation highlights the "Home" tab
```

## 4. Screen Layout & States

The page is designed as a mobile-first column layout utilizing modern premium UI patterns:

### Header Area
*   **Logo mark:** Official logo from `/static/logo.png` aligned top-left.
*   **Profile Avatar Button:** Top-right corner (48x48px target, displaying initials "SK"). Tapping opens the slide-over settings page.

### Main Content Area (Scrollable Feed)
1.  **Awaiting Cycle Start Status Card:**
    *   A card containing the status message: **"Awaiting Cycle Start"** with a soft lavender glow.
    *   Subtext: *"Your clinic has registered your profile. Your daily medication timeline will go live here once your cycle starts."*
2.  **Next Scan Appointment Card:**
    *   If a next scan appointment was set during registration, it is displayed prominently below the status card:
    *   *Copy:* **"Next scan appointment: [Day of week, Date] at [Time]"** (e.g. *"Tuesday, 15 July at 09:00"*).
    *   Features a calendar-check icon.
3.  **Support Tools (Side-by-Side Cards):**
    *   *Left Card: "Ask Me Anything" (RAG FAQ Link)* — Integrated search-pill input styling.
    *   *Right Card: "CalmSeed Companion"* — Features an active **looping CSS breathing bubble animation** to provide immediate relaxation value.
4.  **Adaptive Baseline Guide (Axis A):**
    *   *First-Timer:* Shows detailed step-by-step accordion/toggle guides explaining the baseline appointment (ultrasound scan details, blood tests, why cysts are checked).
    *   *Experienced:* Displays a simple check-list: *"Baseline check: Day 2 or 3 of menstruation. Ensure you bring your prescription sheets."*
5.  **Bottom Navigation Bar (Floating Glassmorphic Dock):**
    *   Frosted glass backdrop (`backdrop-filter: blur(12px)`), rounded corners (`border-radius: 24px`).
    *   Contains four tabs: **Home** (Active), **Calendar** (Disabled), **Medications** (Disabled), and **Settings** (Active).

### Profile Slide-over Page (Triggered by Avatar)
Slides over from the right side of the screen:
*   Displays Sarah's profile info: **Name, Phone Number, Email**.
*   **"Sign Out"** button.

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | Home feed displaying circular status card, next scan card, breathing bubble, and baseline guide. |
| **profile-open** | Avatar tapped | Slide-over profile details page with the prominent Sign Out button. |
| **submitting-logout**| Sign Out tapped | Session cleared, page redirects back to Login. |

## 5. Data Contract
- **Endpoint:** `GET /api/users/{user_id}/dashboard` — auth: **patient Bearer token**.
- **Response 200:**
  ```json
  {
    "cycle_day": null,
    "cycle_status": "Pre-Cycle",
    "today_schedule": [],
    "day1_reported_at": null,
    "next_appointment_datetime": "2026-07-15T09:00:00Z"
  }
  ```

## 6. Design Tokens & Layout
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`.
- Accents: Navy `#13233C` (Primary buttons/borders), Lavender `#9E8CEF` (Active icons), Sage `#3E8E6E` (Success state).

## 7. Copy (EN)
| Key | String |
|---|---|
| cycle_status_awaiting | "Awaiting Cycle Start" |
| next_scan_label | "Next scan appointment: {date}" |
| prep_guide_header | "Follicle scan preparation" |
| prep_guide_body | "Your baseline scan will check your ovaries before daily injections start." |

## 8. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] Clear text labels under bottom navigation icons for screenreaders
- [x] Screen states in §4 implemented

## 9. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J2
- **Endpoints:** `api/users.py`
- **Frontend:** `frontend/src/pages/DashboardPage.tsx`
