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
- **Exit:** Redirects to the Patient Home Dashboard. If active prescriptions exist, redirects to `US-J2-00` (Active Stimulation). If no active prescriptions exist, redirects to `US-J2-02` (Awaiting Cycle Start).

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
  Then the system updates her database user record: sleep_time="10:00 PM - 12:00 AM", injection_comfort="First time", partner_consent=true, onboarded=true
  And redirects her to the Home Dashboard
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
  - `[At scheduled time]` (0m)
  - `[15 minutes before]` (15m)
  - `[30 minutes before]` (30m) (Pre-selected)
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

## 6. Design tokens & layout
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`.
- Accent: Navy `#13233C` (Primary buttons), Lavender `#9E8CEF` (Active selectors).

## 7. Copy (EN)
| Key | String |
|---|---|
| step1_title | "Customise your schedule" |
| sleep_question | "When do you usually go to bed?" |
| step2_title | "Injection guidelines" |
| comfort_question | "Is this your first IVF cycle?" |
| offset_question | "When should we remind you before an injection?" |
| step3_title | "Secure data sharing & notifications" |
| sharing_toggle | "Share my cycle compliance logs and support prompts with partner" |
| notification_explain| "Ovify needs your permission to send daily injection alarms." |
| submit_btn | "Start My Cycle" |
