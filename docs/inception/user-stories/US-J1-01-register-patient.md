# US-J1-01: Register Patient Profile (Tablet)

| Field | Value |
|---|---|
| **Journey** | J1 — Clinic Patient Registration |
| **Persona(s)** | P3 Mona (primary) · P1 Sarah (viewing) |
| **Primary intent** | Manually input patient details, cycle parameters, treatment packages, supporter contacts, next appointments, and stimulation protocols on the clinic tablet. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Mona (the clinic nurse)**, I want to **manually input patient details, select a treatment package, set their next scan appointment, configure their daily medications, and connect their support partner on my tablet**, so that **I can review a preview of all details and register the patient in one session.**

## 2. Context & entry
- **Entry point:** Nurse taps "Register New Patient" in the left sidebar menu or the "+ New Patient" button at the top right of the dashboard.
- **Preconditions:** Authenticated clinician session (`X-Clinician-Key` set) on the clinic tablet.
- **Exit:** 
  - On submit: Taps "Register Patient" to view a **Registration Preview Popup**. Confirming registration inside this popup commits details to the database and sends the invitation SMS.
  - On cancel: Taps "Cancel Draft" to discard inputs and redirect directly back to the Home/Triage Dashboard (`US-J8-01`).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Successful patient registration with preview verification
  Given Mona is logged into the Tablet Portal and has opened the registration form
  When she enters bio details: First "Sarah", Last "Khan", DOB "1992-05-15", Phone "+971501234567", Email "sarah@example.com"
  And increments Current Cycle Number to "2" using the "+" button
  And selects Treatment Package "3-Cycle Egg/Embryo Accumulation"
  And adds a Support Partner: Name "Ahmed Khan", Phone "+971509999999", Role "Spouse/Partner"
  And adds Gonal-F to the protocol
  And taps the "Register Patient" button at the bottom of the page
  Then the system opens the "Registration Preview Popup" displaying all entered details
  When Mona verifies details and taps "Confirm Registration" inside the popup
  Then the patient record is committed to the database
  And an onboarding SMS is sent to Sarah
  And Sarah is shown in the triage directory
  And Mona receives success toast: "Sarah Khan registered successfully. SMS invite sent."

Scenario: Discarding the registration draft
  Given Mona has entered partial patient details in the registration form
  When she taps the "Cancel Draft" button
  Then she is immediately redirected to the Home/Triage Dashboard page
  And all entered draft details are discarded
```

## 4. Screen Layout & States

The screen enforces a **2-column Landscape Layout** optimized for touch inputs:

### Left Sidebar Panel (Navigation - Fixed 25% Width)
*   **Logo:** Displays official logo from `/static/logo.png`.
*   **Active Staff:** Greets the logged-in nurse: "Staff: Mona".
*   **Main Navigation:**
    1.  **Dashboard / Triage:** Links to the primary triage console.
    2.  **List of Patients:** Links to the search and filter patient directory.
    3.  **Clinic Predictions:** Analytics on success rates and patient compliance.
    4.  **Formulary Setup:** Configure clinic-approved drugs and standard dosages.
    5.  **Clinician Management:** List of active staff profiles.
*   **Registration Trigger:** A highlighted **"Register New Patient"** button (mirrored by a top-right `+ New Patient` header icon).

### Right Content Panel (Form Workspace - Scrollable 75% Width)
A single, scrollable page styled with the official design system:
1.  **Section 1: Patient Biological Profile**
    *   First Name, Last Name, Email, DOB (Date Picker), and Phone Number (country-code validated).
2.  **Section 2: Treatment & Cycle Setup**
    *   Cycle Start Date (default: tomorrow).
    *   **Current Cycle Number Selector:** An incremental select counter featuring `[-]` and `[+]` buttons around the active count (range 1 to 3).
    *   Treatment Package Dropdown:
        *   Predefined: `Single IVF/ICSI Cycle (Fresh)`, `Frozen Embryo Transfer (FET) Cycle`, `3-Cycle Egg/Embryo Accumulation`, `Social Egg Freezing (Oocyte Vitrification)`, `IUI (Intrauterine Insemination)`.
        *   `Other (Custom)`: When tapped, dynamically reveals text field `Custom Package Name`.
3.  **Section 3: Escalation Support Contact**
    *   Support Supporter Name, Phone Number, and Relationship Role: `[Spouse/Partner]` `[Family]` `[Friend]`.
4.  **Section 4: Next Appointment**
    *   Date Picker and Time Picker.
5.  **Section 5: Stimulation Protocol Builder**
    *   **Hybrid Autocomplete Selector:** Search input bar + touch quick-grid cards: `[Gonal-F]` `[Menopur]` `[Cetrotide]` `[Ovitrelle]` `[Lupron]`.
    *   **Prescription List:** Tapping a medication adds a card with:
        *   Medication Name, Dosage Dropdown, Route Dropdown, Scheduled Time, and Start Date picker.
        *   Action: `[Delete]` button (Red trash icon).
6.  **Section 6: Action Panel (Bottom Bar)**
    *   `[Cancel Draft]`: Redirects directly to the Home/Triage Dashboard (`US-J8-01`).
    *   `[Turn Screen to Patient]`: Opens a modal displaying only Sarah's contact details in massive font for patient validation.
    *   `[Register Patient]`: Opens the **Registration Preview Popup** (details verified -> clicks "Confirm" -> DB save is completed -> shows success toast).

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | Blank form sections, left sidebar navigation active. |
| **preview** | Register Patient clicked | Registration Preview Popup displaying all entered bio, cycle, and med details. |
| **submitting** | Confirm Registration clicked | Button shows spinner + "Registering..."; inputs disabled. |
| **success** | 200 OK | Leaves to Triage Dashboard; toast "Registered successfully. SMS invite sent." |
| **error (recoverable)** | 400 Duplicate | Red inline alert banner inside preview or form: "Phone number already registered." |
| **offline** | Wi-Fi disconnected | Red banner: "Connection lost. Please restore connectivity to register a patient." |

## 5. Data Contract
- **Endpoint:** `POST /api/clinician/register` — auth: **clinician token / header API key**.
- **Request:**
  ```json
  {
    "first_name": "string",
    "last_name": "string",
    "phone": "string",
    "email": "string",
    "dob": "YYYY-MM-DD",
    "cycle_start_date": "YYYY-MM-DD",
    "current_cycle_number": "integer",
    "treatment_package": "string",
    "custom_package_name": "string?",
    "partner_name": "string",
    "partner_phone": "string",
    "partner_relationship": "string",
    "next_appointment_datetime": "string",
    "prescriptions": [
      {
        "name": "string",
        "dosage": "string",
        "route": "string",
        "scheduled_time": "HH:MM:SS",
        "start_date": "YYYY-MM-DD"
      }
    ]
  }
  ```
- **Response 200:**
  ```json
  {
    "message": "Patient registered successfully.",
    "user_id": "integer"
  }
  ```

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| first_name | input | text | Y | alphabetic | — |
| last_name | input | text | Y | alphabetic | — |
| phone | input | +971... | Y | normalized numeric | — |
| email | input | email | Y | regex validation | — |
| dob | input | date | Y | age 18 to 50 | — |
| cycle_start_date | input | date | Y | >= today | default = tomorrow |
| current_cycle_number| input | integer counter | Y | `+` and `-` increments (range 1 to 3) | default = 1 |
| treatment_package | input | dropdown | Y | predefined list | — |
| custom_package_name | input | text | N | visible if "Other" selected | — |
| partner_name | input | text | Y | alphabetic | — |
| partner_phone | input | +971... | Y | normalized numeric | — |
| partner_relationship| input | dropdown | Y | Spouse/Partner, Family, Friend | — |
| next_appointment | input | datetime | Y | future time | — |

## 7. Components
- Shared navigation sidebar, incremental counter button group (`+` / `-`), registration preview popup.

## 8. Design tokens & layout
- Background: Ivory `#F8F5F1`, Cards: White `#FFFFFF`, Typography: Headings in `DM Sans`, Body in `Manrope`, Buttons/Labels in `Inter`.
- Accent: Navy `#13233C` (Primary buttons), Lavender `#9E8CEF` (Active inputs), Sage `#3E8E6E` (Completed states), Red `#C24C57` (Errors).

## 9. Copy (EN)
| Key | String |
|---|---|
| sidebar_register | "Register New Patient" |
| sidebar_triage | "Dashboard / Triage" |
| sidebar_patients | "List of Patients" |
| sidebar_predictions| "Clinic Predictions" |
| sidebar_formulary | "Formulary Setup" |
| sidebar_staff | "Clinician Management" |
| next_appointment | "Next scan appointment" |
| custom_package | "Custom Package Name" |
| patient_verify | "Turn screen to patient for confirmation" |
| preview_title | "Review Patient Registration" |
| success_toast | "{name} registered successfully. Onboarding SMS invite sent." |
| cancel_btn | "Cancel Draft" |

## 10. Interaction & motion
- Fade-in layout. Tapping Gonal-F quick pill slides a new prescription card into the right workspace.

## 11. Accessibility & Definition of Done
- [x] WCAG AA contrast (navy text on white cards satisfies 4.5:1 ratio)
- [x] High-contrast visible focus states for inputs
- [x] Large touch-friendly target sizes (min 48x48px)
- [x] Screen states in §4 implemented

## 12. Out of scope / non-goals
- **AI transcription/parsing** of prescriptions is excluded (manual dropdown/grid entry only).
- **Direct dosage calculations/recommendations** (pure data entry list to avoid SaMD categorization).

## 13. Open questions
```
Q1. Do we automatically schedule a default follow-up scan if next_appointment is left blank?
[Answer]: No. Mona must explicitly select a date and time to finalize registration to ensure clinic capacity allocation.
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J1, J8
- **Endpoints:** `api/clinician.py` (`register_patient`)
- **Frontend:** `frontend/src/pages/ClinicianPortalPage.tsx`
