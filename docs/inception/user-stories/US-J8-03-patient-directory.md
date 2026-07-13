# US-J8-03: Clinician Patient Directory (Tablet)

| Field | Value |
|---|---|
| **Journey** | J8 — Clinic Triage Console |
| **Persona(s)** | P3 Mona (primary) |
| **Primary intent** | Search, filter, and browse the complete register of clinic patients and access their charts. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-13 |

## 1. User story
> As **Mona (the clinic nurse)**, I want to **search and filter the complete directory of clinic patients by name, phone, or registration date**, so that **I can inspect any patient's cycle chart without searching through separate registries.**

## 2. Context & entry
- **Entry point:** Nurse clicks "List of Patients" in the left sidebar navigation of the clinician portal.
- **Preconditions:** Authenticated clinician session; `X-Clinician-Key` set.
- **Exit:**
  - Tapping a patient name/row slides open the Patient Detailed Chart & Protocol Editor (`US-J8-02`).
  - Clicking "+ New Patient" or "Dashboard / Triage" redirects to respective tabs.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Search patient by name
  Given Mona is viewing the Clinician Patient Directory page
  When she types "Sarah" in the search input bar
  Then the list dynamically filters to show only patients matching "Sarah"
  And Sarah Khan is displayed in the results table

Scenario: Filter patients by registration date range
  Given Mona is viewing the directory page
  When she selects a registration start date filter of "2026-07-01"
  Then the list updates to display only patients registered on or after "2026-07-01"
```

## 4. Screen Layout & States

The page is designed as a clean, desktop/tablet directory feed within the right-side workspace:

### 1. Header Toolbar (Search & Filters)
A unified glassmorphic panel at the top containing search fields and filter dropdowns:
*   **Search Input:** A wide search bar with a search icon: *"Search by patient name or phone number..."* (Real-time dynamic typing filter).
*   **Date Filter:** A date picker input label: *"Registration Date"* (filters patients by their creation timestamp).
*   **Cycle Package Filter Dropdown:** Filter by treatment package (e.g. `All Packages`, `IVF/ICSI`, `Egg Freezing`, `FET`).

### 2. Patient Directory Grid/Table (Latest UI Trends)
A sleek, spacious table layout with clean hover transformations:
*   **Columns:**
    1.  **Patient Details:** Shows name (supports Privacy Mode masking) and registration date.
    2.  **Contact Info:** Displays phone number and email.
    3.  **Active Status:** Visual pill badge showing cycle status (e.g., `Stimulation` in lavender, `Pre-Cycle` in gray, `On Track` in sage green).
    4.  **Assigned Protocol:** Displays treatment package description.
*   **Interactions:** Hovering over a row adds a soft background tint and a slight right translation (`translate-x-1`) to guide visual focus. Tapping a row slides open the Patient Detail Drawer (`US-J8-02`).

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Directory selected | List populated with all registered patients, search inputs blank. |
| **filtering** | Character typed / date selected | Table rows update dynamically; shows a subtle loading shimmer if API query delay occurs. |
| **empty** | Search returns no matches | "No patients found matching your search criteria. Try adjusting your filters." |

## 5. Data Contract
- **Endpoint:** `GET /api/clinician/patients` — auth: **clinician session token**.
  - Query parameters: `search?` (string), `registration_date?` (YYYY-MM-DD), `package?` (string).
- **Response 200:**
  ```json
  [
    {
      "patient_id": 1,
      "name": "Sarah Khan",
      "email": "sarah@example.com",
      "phone": "+971501234567",
      "cycle_type": "3-Cycle Egg/Embryo Accumulation",
      "created_at": "2026-07-07T08:00:00Z",
      "status": "Stimulation"
    }
  ]
  ```

## 6. Design Tokens
- Background: Ivory `#F8F5F1`, Table Surface: White `#FFFFFF`, Borders: Navy-10 `#E6E9EE`.
- Active highlighting: Lavender `#9E8CEF` (Active inputs/selections).

## 7. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white/ivory cards satisfies 4.5:1 ratio)
- [x] Column headers are properly marked up for screenreaders (`<th>`)
- [x] Screen states in §4 implemented

## 8. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J8
- **Endpoints:** `api/clinician.py` (`get_patients_list`)
- **Frontend:** `frontend/src/pages/ClinicianPortalPage.tsx` (Directory sub-tab panel)
