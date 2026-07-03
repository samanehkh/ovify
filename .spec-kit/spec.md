# Ovify Specification — Homepage Dashboard & Journey 3 (Medication Logging)

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
