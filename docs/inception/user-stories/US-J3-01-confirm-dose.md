# US-J3-01: Injection Guide & Dose Confirmation (PWA)

| Field | Value |
|---|---|
| **Journey** | J3 — Daily Injection Flow & Confirmation |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Review preparation instructions, view instructional videos, and log daily injection completion. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-11 |

## 1. User story
> As **Sarah (the patient)**, I want to **view step-by-step instructions, device photos, and a demonstration video on the same screen where I log my dose**, so that **I can inject safely and verify completion without flipping between different pages.**

## 2. Context & entry
- **Entry point:** Taps any medication card marked "Due" on the Home dashboard (`US-J2-00` checklist).
- **Preconditions:** Authenticated patient session (bearer token); onboarded; medication is scheduled for today.
- **Exit:**
  - On submit: logs the dose, returns to the Home dashboard with a toast, and updates the card status on the home checklist to **inactive/disabled** showing *"✓ Logged [Time]"*.
  - On back click: returns to the Home dashboard without logging.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: View unified guide and confirm Gonal-F dose
  Given Sarah opens the Gonal-F card (scheduled for 19:00, dosage 150 IU)
  Then she is directed to the "Step-by-step Guide: Gonal-F" page
  And she sees a back button "←" at the top
  And she sees a photo of the Gonal-F pen with text overlay: "Dosage: 150 IU"
  And she sees the demo video box with a play icon overlay in the center
  And she sees "Preparation guidelines" listing steps 1, 2, and 3 with decorative checkmarks
  When she taps the primary button "Confirm Injection Completed"
  Then the system records the dose log in the database
  And redirects her back to the Home Page
  And she receives a success toast
  And the Gonal-F card on the home page is now disabled and displays: "✓ Taken at 19:00"
```

## 4. Screen Layout & States

The screen is rendered as a clean, mobile-first scrollable page with modern design components:

### Top Navigation Bar
*   **Back Trigger:** `←` back arrow icon button (top-left) returning to Home dashboard.
*   **Title:** *"Step-by-step Guide: [Medication Name]"* (DM Sans, medium weight).

### 1. Device Graphic Header (Glassmorphic Container)
*   A premium card container featuring a high-contrast photo of the specific injection device.
*   **Dosage Overlay:** A stylized glass-pill badge overlaid at the bottom-right of the image container displaying: **"Dosage: [Prescribed Dosage]"** (e.g. *"Dosage: 150 IU"*) with a frosted background (`backdrop-filter: blur(8px)`) and a thin border.

### 2. Video Demonstration Block (Interactive Glow Player)
*   A rounded video player frame containing the demo clip preview with a dark overlay.
*   **Visual Overlay:** A prominent, translucent **Play Icon Button** is centered on top. Features a soft lavender glow-pulse animation to invite interaction.
*   **Duration Pill:** A tiny badge in the bottom-left showing duration (e.g., *"1:45 mins"*).

### 3. Preparation Guidelines List (Visual Timeline Cards)
Instead of a simple list, steps are displayed as individual **Timeline Cards** to ease cognitive load:
1.  **Step 1:** *"1. Wash your hands thoroughly with soap and water."*
2.  **Step 2:** *"2. Clean the injection site with an alcohol swab and let it air dry."*
3.  **Step 3:** *"3. Prepare the injection device and select your prescribed dose."*
*   *Design:* Each card features a left accent border and is accompanied by a custom-designed circle containing a checkmark in Sage green to guide the user's flow.

### 4. Bottom Action Panel
*   **Primary Button:** A wide, touch-friendly primary button: **`[Confirm Injection Completed]`** (Midnight Navy to Deep Indigo gradient).
*   *Micro-interaction:* Hovering/pressing scales the button down slightly (`scale-[0.98]`) for tactile feedback, showing a spinner and disabling on tap.

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | Page displays back button, device photo, play-button video, checklist, and enabled confirm button. |
| **submitting** | Confirm tapped | Button disabled, shows spinner "Logging injection...". |
| **success** | 200 OK saved | Returns to Home page; target medication card transitions to deactivated state with green checkmark. |

## 5. Data Contract
- **Endpoint:** `POST /api/medications/{prescription_id}/confirm` — auth: **patient Bearer token**.
- **Response 200:**
  ```json
  {
    "id": 42,
    "prescription_id": 12,
    "status": "Taken",
    "scheduled_date": "2026-07-11",
    "logged_at": "2026-07-11T19:05:00Z"
  }
  ```

## 6. Design Tokens & Brand Rules
- Background: Ivory `#F8F5F1`, Cards/Blocks: White `#FFFFFF`, Fonts: Headings in `DM Sans`, Body in `Manrope`.
- Accents: Navy `#13233C` (Primary actions/borders), Lavender `#9E8CEF` (Interactive plays/highlights), Sage `#3E8E6E` (Confirmation success).

## 7. Copy (EN)
| Key | String |
|---|---|
| header_title | "Step-by-step Guide: {name}" |
| dosage_badge | "Dosage: {dosage}" |
| prep_header | "Preparation guidelines" |
| prep_step1 | "1. Wash your hands thoroughly with soap and water." |
| prep_step2 | "2. Clean the injection site with an alcohol swab and let it air dry." |
| prep_step3 | "3. Prepare the injection device and select your prescribed dose." |
| confirm_btn | "Confirm Injection Completed" |

## 8. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white/ivory surfaces)
- [x] Clear aria-labels on video play and back arrow controls
- [x] Touch target dimensions satisfy minimum 48x48px
- [x] Screen states in §4 implemented

## 9. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J3
- **Endpoints:** `api/medications.py`
- **Frontend:** `frontend/src/pages/MedicationLogPage.tsx` (Combined guide/log workspace)
