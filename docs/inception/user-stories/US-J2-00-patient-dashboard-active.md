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
  - Tapping the top-right profile avatar slides over the Profile Settings & Support panel.
  - Bottom tabs route to the Calendar page or Medications library.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: View active dashboard with due medications
  Given Sarah is an active patient on Stimulation Day 5
  And she has Gonal-F (Status: Due) and Menopur (Status: Taken) scheduled for today
  When she opens the PWA Home Page
  Then she sees the brand logo mark at the top left
  And she sees her Profile Avatar ("SK") at the top right
  And she sees "Stimulation Day 5" displayed on the progress card
  And "Today's Schedule" displays Gonal-F with a "Due" badge (Red)
  And "Today's Schedule" displays Menopur with a "✓ Taken at 19:00" badge (Sage)
  And the "Ask Me Anything" search bar and "CalmSeed Breathing" card are visible
  And the bottom navigation highlights the "Home" tab

Scenario: Tapping a Due medication card navigates to confirmation screen
  Given Sarah is on the active home page
  When she taps the Gonal-F card (Status: Due)
  Then she is redirected to the Dose Confirmation Page (US-J3-01) to log her injection
```

## 4. Screen Layout & States

The page is designed as a mobile-first column layout optimized for touch targets:

### Header Area
*   **Logo mark:** Official logo from `/static/logo.png` centered or aligned top-left.
*   **Profile Avatar Button:** Top-right corner (48x48px target, displaying initials "SK"). Tapping opens the slide-over settings page.

### Main Content Area (Scrollable)
1.  **Cycle Day Tracker Card:**
    *   Displays `Stimulation Day X` using a visual progress arc.
    *   Subtext: *"On Track · Clinic Synchronized"* (Sage badge).
2.  **Today's Medication checklist:**
    *   A list of cards for all medications scheduled for the current date.
    *   *Due State:* Red outline/badge, lists name, dose (e.g. 150 IU), route (Subcutaneous), and scheduled time. Tappable to open log view.
    *   *Taken State:* Sage background/checkmark, displays logged timestamp (e.g. *"✓ Logged 19:05"*). Disabled.
    *   *Sync Pending State:* Amber badge, indicates logged offline and awaiting server sync.
3.  **Support Tools (Side-by-Side Cards):**
    *   *Left Card:* **"Ask Me Anything"** — Styled as a search-input FAQ link. Launches the RAG AI text chat.
    *   *Right Card:* **"CalmSeed Companion"** — Launches breathing relaxation guides.
4.  **Bottom Navigation Bar (Frosted Glass Overlay):**
    *   Contains exactly three tabs: **Home** (Active), **Calendar** (active link), **Medications** (active link).

### Profile Slide-over Page (Triggered by Avatar)
Slides over from the right side of the screen:
*   **Settings Section:**
    *   Sleep Window Dropdown (Early Bird, Standard, Night Owl).
    *   Injection Comfort Toggle (First time vs. Experienced).
    *   Reminder Offset Dropdown (At scheduled time, 15m before, 30m before).
*   **Support Section:**
    *   **"Speak with a Clinic Nurse"** callback request button.
    *   Direct Clinic Hotline Dial Link.
*   **Account Actions:**
    *   **"Sign Out"** button (logs out, clears local storage, and redirects to Login page).

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | Home feed displaying daily checklist and launchers. |
| **profile-open** | Avatar tapped | Slide-over panel containing settings, support, and logout. |
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

## 6. Field-level detail
- **Bottom Navigation Tabs:** 3 items (Home, Calendar, Medications).
- **Profile Slide-over Inputs:** Sleep cycle select, comfort level select, reminder offset select, callback request action, sign-out action.

## 7. Components
- `TabNavigation`, `ProfileSlideOver`, `MedicationChecklistCard`, `CycleDayProgress`.

## 8. Design Tokens
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`.
- Accents: Navy `#13233C` (Text/Borders), Lavender `#9E8CEF` (Select highlights), Sage `#3E8E6E` (Completed states), Red `#C24C57` (Alerts/Errors).

## 9. Copy (EN)
| Key | String |
|---|---|
| cycle_day_label | "Stimulation Day {day}" |
| active_status_ok | "On Track · Clinic Sync" |
| ask_anything_placeholder | "Search clinic guides & FAQs..." |
| calmseed_title | "CalmSeed Somatic Breathing" |
| schedule_title | "Today's Schedule" |
| sign_out_btn | "Sign Out" |
| nurse_callback_btn | "Speak with a Clinic Nurse" |

## 10. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] Clear text labels under bottom navigation icons for screenreaders
- [x] Screen states in §4 implemented

## 11. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J2, J3
- **Endpoints:** `api/users.py`
- **Frontend:** `frontend/src/pages/DashboardPage.tsx`
