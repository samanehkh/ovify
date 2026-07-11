# US-J2-00: Patient Home Dashboard (Active Cycle)

| Field | Value |
|---|---|
| **Journey** | J2 — Patient Onboarding & Personalization |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Monitor daily medication compliance, track current cycle day, and launch supporting utilities (RAG AI / CalmSeed / Profile Menu). |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Sarah (an active patient undergoing stimulation)**, I want to **view my current stimulation day, track my daily medication checklist, and launch my support tools on my home page**, so that **I can ensure 100% protocol compliance and manage my cycle anxiety.**

## 2. Context & entry
- **Entry point:** App launch (after onboarding completed and when active prescriptions are registered in the patient chart).
- **Preconditions:** Authenticated session; `onboarded === true`; active prescriptions found in database.
- **Exit:**
  - Tapping a medication card marked "Due" redirects to **US-J3-01** (Confirm Dose).
  - Tapping the top-right profile avatar slides open the Profile Settings.
  - Bottom tabs route to Calendar, Medications, or Settings page.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: View active dashboard with due medications
  Given Sarah is an active patient on Stimulation Day 5
  And she has Gonal-F (Status: Due) and Menopur (Status: Taken) scheduled for today
  When she opens the PWA Home Page
  Then she sees the brand logo mark at the top left
  And she sees her Profile Avatar ("SK") at the top right
  And she sees "Stimulation Day 5" displayed inside the SVG Circular Progress Ring
  And "Today's Schedule" displays Gonal-F with a "Due" badge (Lavender outline)
  And "Today's Schedule" displays Menopur with a "✓ Taken" badge (Sage)
  And the "Ask Me Anything" search bar and "CalmSeed Breathing" card are visible
  And the bottom navigation highlights the "Home" tab
```

## 4. Screen Layout & States

The page is designed as a mobile-first column layout utilizing modern premium UI patterns:

### Header Area
*   **Logo mark:** Official logo from `/static/logo.png` aligned top-left.
*   **Profile Avatar Button:** Top-right corner (48x48px target, initials "SK"). Tapping slides open the Profile Settings.

### Main Content Area (Scrollable Feed)
1.  **Cycle Day Tracker (Circular SVG Progress Ring):**
    *   A centered circular SVG indicator showing progress through the stimulation cycle.
    *   Features a soft glowing radial backdrop to give a modern depth effect.
    *   Displays `Day X` in the center using a premium high-contrast font weight.
    *   Subtext: *"On Track · Clinic Sync"* in a pill badge (Sage color).
2.  **Today's Schedule Checklist (Interactive Glow-Pill Cards):**
    *   *Due/Upcoming State:* Soft terracotta or warm lavender border/badge (avoiding harsh warning red unless overdue). Subtle hover scaling (`scale-[1.02]`) and soft interactive shadows.
    *   *Taken State:* Sage background/checkmark with logged timestamp. Disabled from further interaction.
    *   *Sync Pending State:* Amber badge, indicates logs saved offline and awaiting auto-sync.
3.  **Support Tools (Side-by-Side Cards):**
    *   *Left Card: "Ask Me Anything" (RAG FAQ Link)* — Integrated search-pill input styling.
    *   *Right Card: "CalmSeed Companion"* — Features an active **looping CSS breathing bubble animation** (expanding and contracting to guide breathing) to provide immediate relaxation value.
4.  **Bottom Navigation Bar (Floating Glassmorphic Dock):**
    *   A floating navigation dock with a frosted glass backdrop (`backdrop-filter: blur(12px)`) and rounded corners (`border-radius: 24px`).
    *   Contains four tabs: **Home** (Active), **Calendar**, **Medications**, and **Settings**. Active icon uses a spring-like micro-interaction scaling effect.

### Profile Slide-over Page (Triggered by Avatar)
Slides over from the right side of the screen:
*   Displays Sarah's profile info: **Name, Phone Number, Email**.
*   **"Sign Out"** button.

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | Home feed displaying circular progress ring, breathing indicator, and checklist cards. |
| **profile-open** | Avatar tapped | Slide-over settings panel containing settings, support, and logout. |
| **submitting-logout**| Sign Out tapped | Session cleared, page redirects back to Login. |
| **offline** | Wi-Fi lost | Dashboard remains functional; offline banner displayed at top: "Offline Mode — Logs will sync when reconnected." |

## 5. Data Contract
- **Endpoint:** `GET /api/users/{user_id}/dashboard` — auth: **patient Bearer token**.
- **Response 200:**
  ```json
  {
    "cycle_day": 5,
    "cycle_status": "Stimulation",
    "today_schedule": [
      {
        "medication_id": 12,
        "name": "Gonal-F",
        "dosage": "150 IU",
        "route": "Subcutaneous",
        "scheduled_time": "19:00:00",
        "status": "Due",
        "logged_at": null
      },
      {
        "medication_id": 13,
        "name": "Menopur",
        "dosage": "75 IU",
        "route": "Subcutaneous",
        "scheduled_time": "19:00:00",
        "status": "Taken",
        "logged_at": "2026-07-11T19:05:00Z"
      }
    ]
  }
  ```

## 6. Design Tokens & Layout
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`.
- Accents: Navy `#13233C` (Primary buttons/borders), Lavender `#9E8CEF` (Active icons), Sage `#3E8E6E` (Success state).

## 7. Copy (EN)
| Key | String |
|---|---|
| cycle_day_label | "Stimulation Day {day}" |
| active_status_ok | "On Track · Clinic Sync" |
| ask_anything_placeholder | "Search clinic guides & FAQs..." |
| calmseed_title | "CalmSeed Somatic Breathing" |
| schedule_title | "Today's Schedule" |

## 8. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] Clear text labels under bottom navigation icons for screenreaders
- [x] Screen states in §4 implemented

## 9. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J2, J3
- **Endpoints:** `api/users.py`
- **Frontend:** `frontend/src/pages/DashboardPage.tsx`
