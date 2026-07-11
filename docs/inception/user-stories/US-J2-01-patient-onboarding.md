# US-J2-01: Onboarding Personalization Wizard (PWA)

| Field | Value |
|---|---|
| **Journey** | J2 — Patient Onboarding & Personalization |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Select sleep cycle offsets, configure notification lead-time, authorize partner data-sharing consent, and grant push permissions. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Sarah (the patient)**, I want to **personalize my sleep window, reminder timing, and partner sharing options in a step-by-step wizard**, so that **my daily IVF timeline is tailored to my lifestyle and remains legally compliant with my data sharing choices.**

## 2. Context & entry
- **Entry point:** Automatically redirects from `US-J1-02` (OTP verification success) if PWA launches and detects `onboarded === false` in the patient chart.
- **Preconditions:** Authenticated patient session (valid Bearer token saved locally).
- **Exit:** Redirects to the Patient Home Dashboard (`US-J3-00`).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Complete onboarding as first-time patient with partner consent
  Given Sarah has verified her OTP and launched the PWA from her home screen
  When the wizard loads Step 1 (Sleep Cycle)
  And she selects "Standard: 10:00 PM - 12:00 AM" and taps "Next"
  And the wizard loads Step 2 (Reminder Preferences)
  And she selects Injection Comfort "First time" and Notification Offset "30 minutes before" and taps "Next"
  And the wizard loads Step 3 (Consent & Security)
  And she toggles "Share my progress with my partner (Ahmed)" to active
  And taps "Enable Notifications" and grants the native browser permission
  And taps "Start My Cycle"
  Then the system updates her database user record: sleep_time="10:00 PM - 12:00 AM", injection_comfort="First time", partner_consent=true, onboarded=true, active_status="On Track"
  And redirects her to the Home Dashboard
  And displays her personalized Day 1 stimulation card with fully expanded guides

Scenario: Complete onboarding as experienced patient with no partner sharing
  Given Sarah is in the wizard
  When she selects Injection Comfort "Experienced" in Step 2
  And toggles partner sharing to inactive in Step 3
  And completes onboarding
  Then the system updates her database record with injection_comfort="Experienced" and partner_consent=false
  And she is redirected to the Home Dashboard
  And her medication cards display in streamlined (collapsed checklist-only) mode
```

## 4. Screen states & Stepper Flow
The wizard is rendered as a clean, single-card layout with a **3-step progress bar** at the top:

### Step 1: Sleep Window Selection
- **Visuals:** Prompt: *"When do you usually go to bed?"*.
- **Touch Targets:** Three large segmented buttons:
  - `[Early Bird: 9:00 PM - 11:00 PM]`
  - `[Standard: 10:00 PM - 12:00 AM]` (Pre-selected)
  - `[Night Owl: 11:00 PM - 1:00 AM]`
- **Action:** `[Next]` button.

### Step 2: Reminder Preferences & Comfort Level
- **Visuals:** Prompts: *"Is this your first IVF cycle?"* and *"When should we remind you?"*.
- **Comfort touch targets:**
  - `[First time - show me detailed video guides]` (Maps to Axis A: Guided)
  - `[Experienced - show me quick checklists]` (Maps to Axis A: Streamlined)
- **Reminder offset targets:**
  - `[At scheduled time]`
  - `[15 minutes before]`
  - `[30 minutes before]` (Pre-selected)
- **Action:** `[Next]` button.

### Step 3: Consent & Safety Setup
- **Visuals:** Prompts: *"Stay connected"* and *"Enable notifications"*.
- **Consent toggle:** A clean switch: *"Share my cycle compliance logs and support prompts with Ahmed (+971509999999)"*.
- **Pre-Permission hook card:** Displays a reassuring note explaining that daily injection alarms require push access to prevent cycle cancellations.
- **Action:**
  - `[Enable Notifications]` (triggers native browser permissions).
  - `[Start My Cycle]` (primary action, submits form, disabled until notification flow is resolved or bypassed).

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Step loads | Sleek ivory form card, current step active. |
| **submitting** | "Start My Cycle" tapped | Shows spinner, "Personalizing your schedule..."; buttons disabled. |
| **success** | 200 OK | Smooth cross-fade transition to the Patient Home Dashboard. |
| **error (recoverable)** | 500 error | "We couldn't save your preferences. Please check your connection and try again." |

## 5. Data Contract
- **Endpoint:** `POST /api/users/{user_id}/onboard` — auth: **patient Bearer token**.
- **Request:**
  ```json
  {
    "sleep_time": "string",
    "injection_comfort": "string",
    "reminder_offset_minutes": "integer"
  }
  ```
- **Response 200:**
  ```json
  {
    "id": 1,
    "name": "Sarah Khan",
    "onboarded": true,
    "active_status": "On Track"
  }
  ```
- **Endpoint 2:** `POST /api/users/{user_id}/partner-consent` — auth: **patient Bearer token**.
- **Request:**
  ```json
  {
    "partner_phone": "string",
    "partner_consent": "boolean"
  }
  ```
- **Response 200:**
  ```json
  {
    "partner_phone": "+971509999999",
    "partner_consent": true
  }
  ```

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| sleep_time | select | string | Y | predefined list | default = "Standard" |
| injection_comfort | select | string | Y | "First time" or "Experienced" | default = "First time" |
| reminder_offset_minutes| select | integer | Y | `0`, `15`, or `30` | default = 30 |
| partner_consent | input | boolean toggle | Y | true/false | default = true |

## 7. Components
- Shared `ProgressBar`, `Card`, `Switch` toggle, and PWA `PushNotificationRequest` button.

## 8. Design tokens & layout
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`, Buttons/Labels in `Inter`.
- Accent: Navy `#13233C` (Primary buttons), Lavender `#9E8CEF` (Active card selectors).

## 9. Copy (EN)
| Key | String |
|---|---|
| step1_title | "Customise your schedule" |
| sleep_question | "When do you usually go to bed?" |
| step2_title | "Injection guidelines" |
| comfort_question | "Is this your first IVF cycle?" |
| offset_question | "When should we remind you before an injection?" |
| step3_title | "Secure data sharing & notifications" |
| sharing_toggle | "Share my cycle compliance logs and support prompts with Ahmed (+971509999999)" |
| sharing_disclaimer | "We only share your daily injection check-in status and support tips. We never share raw clinical files or doctors' notes." |
| notification_explain| "Ovify needs your permission to send daily injection alarms. Missed alarms may lead to cycle cancellation." |
| notification_btn | "Enable Notifications" |
| submit_btn | "Start My Cycle" |

## 10. Interaction & motion
- Fade-in card layouts. Wizard slides left-to-right when Mona taps "Next".

## 11. Accessibility & Definition of Done
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] Large touch-friendly target sizes (min 48x48px)
- [x] Interactive screens respect `prefers-reduced-motion` settings
- [x] Screen states in §4 implemented

## 12. Out of scope / non-goals
- **Detailed diagnostic symptom checklist** (strictly personalization & setup focus).
- **Custom sleep time configuration** beyond the three standard preset windows.

## 13. Open questions
```
Q1. Can Sarah change these selections later?
[Answer]: Yes. Selections can be modified in the Settings panel in the dashboard, but setting them during onboarding is mandatory.
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J2
- **Endpoints:** `api/users.py` (`onboard_user`, `update_partner_consent`)
- **Frontend:** `frontend/src/pages/OnboardingWizardPage.tsx`
