# US-J8-02: Patient Detailed Chart & Protocol Editor (Tablet)

| Field | Value |
|---|---|
| **Journey** | J8 — Clinic Triage Console |
| **Persona(s)** | P3 Mona (primary) |
| **Primary intent** | Review full patient demographics, cycle history, partner consent, dose logs, and update prescriptions. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-13 |

## 1. User story
> As **Mona (the clinic nurse)**, I want to **view a patient's full profile, log history, and current prescription protocol in a slide-over drawer**, so that **I can inspect compliance details and adjust their medication schedules without leaving the triage console.**

## 2. Context & entry
- **Entry point:** Taps a patient's name inside any triage deck in the Clinician Console (`US-J8-01`).
- **Preconditions:** Authenticated clinician session; `X-Clinician-Key` set; patient details exist in the database.
- **Exit:**
  - Taps `✕` close button: slides drawer shut, returning to Triage Console.
  - Taps `Save Changes`: commits prescription edits to database, refreshes the chart, and shuts the drawer.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Review Sarah Khan's detailed chart
  Given Mona is viewing the Triage Console
  When she taps "Sarah Khan" in the feed
  Then the Patient Detailed Chart drawer slides open from the right
  And she sees Sarah's Bio: DOB "1992-05-15", Phone "+971507777777", Email "sarah.khan.new@example.com"
  And she sees Cycle Details: Cycle Start Date, Current Cycle "1", Treatment Package "3-Cycle Accumulation"
  And she sees Support details: Ahmed Khan (+971509999999) with status "Consent Granted"
  And she sees the daily dose log timeline showing past injections (Status: On Time / Late)
  And she sees the Active Stimulation Protocol builder showing Gonal-F and Menopur
  When Mona taps the close button "✕"
  Then the drawer closes and she returns to the main Triage Console
```

## 4. Screen Layout & States

The screen is rendered as a slide-over panel (width 400px - 500px on tablet) expanding from the right viewport edge:

### Panel Header
*   **Actions:** `✕` close button at top-right; `Save Changes` primary button at bottom or header.
*   **Title:** Patient Name (e.g. *"Sarah Khan"*).
*   **Active Alert Badge:** Displays their triage risk state (e.g., `"Urgent Alert: Missed Dose"` in Red, or `"On Track"` in Green).

### Drawer Body (Scrollable Feed)
1.  **Section 1: Biological Profile**
    *   First/Last Name, Email, DOB, Phone Number.
2.  **Section 2: IVF Details & Cycle Info**
    *   Current Cycle Number (e.g. `Cycle #1`).
    *   Treatment Package: Predefined name or Custom "Other" string.
    *   Cycle Start Date.
3.  **Section 3: Supporter details & Consent**
    *   Partner Name, Phone, and Relationship.
    *   **Data Sharing Consent State:** A prominent badge displaying `"Consent Granted"` (Sage green) or `"Consent Pending/Revoked"` (Amber).
4.  **Section 4: Active Stimulation Protocol Editor**
    *   Lists all registered prescriptions.
    *   *Editor tools:* Nurse can adjust dosage values, route types, and scheduled times. She can tap `🗑️ Delete` or `+ Add Medication` to edit the timeline.
5.  **Section 5: Dose Log History Timeline**
    *   A chronological timeline showing past logging attempts.
    *   *Columns:* Date, Med Name, Scheduled Time, Logged Time, Status (`On Time`, `Late`, or `Missed`).
6.  **Section 6: AI Compliance & Risk Assessments**
    *   Displays patient behavioral compliance ratings.
    *   Dropout Risk Rating: `"Low"`, `"Elevated"` (with specific pattern reasons: e.g. *Anxious for 4 consecutive days*), or `"Critical"`.

---

| State | Trigger | What the user sees |
|---|---|---|
| **closed** | Default load | Drawer hidden; main triage console active. |
| **open** | Patient clicked | Slide-over drawer visible from the right; load animation. |
| **saving** | Save Changes clicked | Form locked, button shows spinner "Saving protocol changes...". |
| **success** | 200 OK committed | Toast "Patient chart updated successfully."; drawer closes. |

## 5. Data Contract
- **Endpoint:** `GET /api/clinician/patients/{patient_id}` — auth: **clinician session token**.
- **Response 200:**
  ```json
  {
    "id": 1,
    "first_name": "Sarah",
    "last_name": "Khan",
    "dob": "1992-05-15",
    "email": "sarah.khan.new@example.com",
    "phone": "+971507777777",
    "cycle_start_date": "2026-07-12",
    "current_cycle_number": 1,
    "treatment_package": "3-Cycle Egg/Embryo Accumulation",
    "partner_name": "Ahmed Khan",
    "partner_phone": "+971509999999",
    "partner_relationship": "Spouse/Partner",
    "partner_consent": true,
    "next_appointment_datetime": "2026-07-15T09:00:00Z",
    "dropout_risk": "Elevated (Anxious 4 days)",
    "prescriptions": [
      {
        "id": 12,
        "name": "Gonal-F",
        "dosage": "150 IU",
        "route": "Subcutaneous",
        "scheduled_time": "19:00:00",
        "start_date": "2026-07-12",
        "end_date": "2026-07-24"
      }
    ],
    "dose_logs": [
      {
        "id": 88,
        "name": "Gonal-F",
        "scheduled_time": "19:00:00",
        "logged_at": "2026-07-12T19:05:00Z",
        "status": "On Time"
      }
    ]
  }
  ```

## 6. Design Tokens & Brand Rules
- Background: White `#FFFFFF`, Borders: Navy-10 `#E6E9EE`, Section headers: DM Sans.
- Accents: Lavender `#9E8CEF` (Active inputs), Sage `#3E8E6E` (Consent success), Red `#C24C57` (Delete buttons/Missed alerts).

## 7. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] Slide-over respects keyboard `Escape` button to close the panel
- [x] Screen states in §4 implemented

## 8. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J8
- **Endpoints:** `api/clinician.py` (`get_patient_details`)
- **Frontend:** `frontend/src/pages/ClinicianPortalPage.tsx` (Slide-over Detail Drawer)
