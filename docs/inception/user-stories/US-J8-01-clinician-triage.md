# US-J8-01: Clinician Triage Console (Tablet)

| Field | Value |
|---|---|
| **Journey** | J8 — Clinic Triage Console |
| **Persona(s)** | P3 Mona (primary) |
| **Primary intent** | Review clinical metrics, triage active patient lists by urgency, and identify dropout risks. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-13 |

## 1. User story
> As **Mona (the clinic nurse)**, I want to **view my active patients grouped by urgency and review clinical metrics on my dashboard**, so that **I can address missed injections, follow up on side-effects, and coordinate scans in under 10 minutes.**

## 2. Context & entry
- **Entry point:** Nurse signs in to the clinician portal (`US-J1-00`) and lands on this dashboard page.
- **Preconditions:** Authenticated clinician session (`X-Clinician-Key` set) on the clinic tablet.
- **Exit:** Tapping any patient name slides open the Patient Detailed Chart & Protocol Editor (`US-J8-02`).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Review three-deck triage system
  Given Mona is logged into the Clinician Portal Triage Dashboard
  When the page loads
  Then she sees four summary cards at the top: "On Track", "Needs Attention", "Urgent", and "Total Active"
  And the "Urgent Alerts" feed displays Sarah Khan (Missed Gonal-F, 2 hours overdue) and Fatima M (AI-flagged Intent to Discontinue)
  And the "Needs Attention" feed displays Layla Ebrahim (3 late logs pattern) and Noor Hadid (Anxious 4 days pattern)
  And the Noor Hadid entry displays the AI Insight box: "Elevated Dropout Risk: Noor has logged anxiety for 4 consecutive days. Consider nurse check-in call."
  And the "On Track" feed displays Maria S, Anisha, and Hana
  And the bottom statistics bar displays: Adherence Today (92%), AI Questions (14), Avg Confirm (8m), and Partner Engaged (67%)

Scenario: Toggle Privacy Mode
  Given Mona is viewing the triage list in a shared clinic area
  When she toggles the "Privacy Mode" switch in the header
  Then all patient last names in the feeds are masked (e.g., "Sarah K." instead of "Sarah Khan")
  And diagnostic AI comments remain hidden until specifically tapped

Scenario: Dynamic triage update upon patient dose logging
  Given Sarah Khan has an unresolved missed dose alert in "Urgent Alerts"
  When Sarah Khan logs the dose on her Patient PWA (changing database dose status to "Taken")
  And the Clinician Triage dashboard performs its periodic poll or is manually refreshed
  Then Sarah Khan's entry is automatically cleared from "Urgent Alerts"
  And the "On Track" count increases by 1

```

## 4. Screen Layout & States

The screen enforces a B2B Tablet landscape dashboard view:

### Top Header Bar
*   **Logo & Console Title:** *"Ovify Clinician Console"*.
*   **Active Staff Badge:** *"Staff: Mona"*.
*   **Privacy Toggle:** A toggle switch: *"Privacy Mode (Mask Names)"*. When active, hides full last names.

### Metric Cards (Row 1)
Four grid cards displaying high-level counts:
1.  **On Track:** Sage green, bold count (e.g. `32`).
2.  **Needs Attention:** Soft amber, bold count (e.g. `2`).
3.  **Urgent:** Soft red/terracotta, bold count (e.g. `2`).
4.  **Total Active:** Midnight Navy, bold count (e.g. `36`).

### Triage Decks (Horizontal Stacked Rows)
> [!IMPORTANT]
> **DEVELOPER IMPLEMENTATION NOTE:** The patient records and reasons listed below are **illustrative examples** to show the target layout. Do not hardcode these cards. The system must query the database dynamically to group patient records based on real-time dose compliance, logged side-effects, and AI sentiment scores.

Three horizontal sections stacked vertically, each containing a vertical stack/list of cards matching the urgency states:

#### 1. Urgent Alerts Column (Red Outline - Missed Doses / Retention Risks)
*   *Card 1 (Sarah Khan):*
    *   *Details:* Missed Gonal-F 150 IU · 2 hours overdue.
    *   *Action:* Supporter notified via SMS · 15 mins ago.
*   *Card 2 (Fatima M.):*
    *   *Details:* Intent to Discontinue.
    *   *Action:* AI detected drop-out intent in conversation at 11:30 PM yesterday.

#### 2. Needs Attention Column (Amber Outline - Behavioral/Dosage Patterns)
*   *Card 1 (Layla Ebrahim):*
    *   *Details:* Day 6 Antagonist · 3 late logs this week (lateness pattern).
    *   *Schedule:* Target time 7:00 PM.
*   *Card 2 (Noor Hadid):*
    *   *Details:* Day 11 Long Protocol · Anxious for 4 days.
    *   *AI Insight Alert Box:* *"Elevated Dropout Risk: Patient has logged anxiety for 4 consecutive days. Consider a proactive nurse check-in call."*

#### 3. On Track Column (Green Outline - Compliant)
*   *Card 1 (Maria S.):* Day 8 Antagonist · Confirmed on track.
*   *Card 2 (Anisha):* Day 3 Baseline · New patient · On track.
*   *Card 3 (Hana):* Day 14 Trigger · 100% Adherence · Trigger Ready (ready for egg collection trigger check).

### Bottom Summary Stats Bar
A full-width bar at the very bottom of the viewport showing aggregate daily compliance:
*   `Adherence Today: 92%`
*   `AI Questions Today: 14`
*   `Avg Confirmation Delay: 8 mins`
*   `Support Engagement Rate: 67%` (Partners responding to SMS alerts)

---

| State | Trigger | What the user sees |
|---|---|---|
| **ready** | Default load | Full dashboard visible, metrics populated, patient names unmasked. |
| **private** | Privacy toggled | Last names masked, comments hidden behind tap targets. |
| **loading** | Reload clicked | Spinner overlays, feeds disabled. |
| **success** | 200 OK | Metrics refreshed with green sync dot. |

## 5. Data Contract
- **Endpoint:** `GET /api/clinician/triage` — auth: **clinician session token**.
- **Response 200:**
  ```json
  {
    "counts": {
      "on_track": 32,
      "needs_attention": 2,
      "urgent": 2,
      "total_active": 36
    },
    "urgent": [
      {
        "patient_id": 1,
        "name": "Sarah Khan",
        "reason": "Missed Gonal-F 150 IU (2h overdue)",
        "action_taken": "Partner notified via SMS 15m ago"
      },
      {
        "patient_id": 2,
        "name": "Fatima M.",
        "reason": "Intent to Discontinue (AI detected in conversation)"
      }
    ],
    "needs_attention": [
      {
        "patient_id": 3,
        "name": "Layla Ebrahim",
        "reason": "Day 6 Antagonist (3 late logs this week)",
        "target_time": "19:00:00"
      },
      {
        "patient_id": 4,
        "name": "Noor Hadid",
        "reason": "Day 11 Long Protocol (Anxious 4 days)",
        "ai_insight": "Elevated Dropout Risk: Patient has logged anxiety for 4 consecutive days. Consider nurse check-in call."
      }
    ],
    "on_track": [
      {
        "patient_id": 5,
        "name": "Maria S.",
        "reason": "Day 8 Antagonist (All confirmed on track)"
      },
      {
        "patient_id": 6,
        "name": "Anisha",
        "reason": "Day 3 Baseline (New patient, on track)"
      },
      {
        "patient_id": 7,
        "name": "Hana",
        "reason": "Day 14 Trigger (100% Adherence, Trigger Ready)"
      }
    ],
    "summary_stats": {
      "adherence_today_pct": 92,
      "ai_questions_today": 14,
      "avg_confirm_delay_mins": 8,
      "partner_engagement_pct": 67
    }
  }
  ```

## 6. Design Tokens & Brand Rules
- Conforms to B2B guidelines. Ivory background `#F8F5F1`, Cards: White `#FFFFFF`, Fonts: Headings in `DM Sans`, Body in `Manrope`.
- Accent colors match triage severity:
  - Green `#3E8E6E` (On track)
  - Yellow `#E2A93E` (Needs attention)
  - Red `#C24C57` (Urgent alerts)

## 7. Accessibility & DoD
- [x] WCAG AA contrast (navy text on white/ivory cards satisfies 4.5:1 ratio)
- [x] Toggle controls have clear label associations
- [x] Screen states in §4 implemented

## 8. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J8
- **Endpoints:** `api/clinician.py` (`get_triage_data`)
- **Frontend:** `frontend/src/pages/ClinicianPortalPage.tsx` (Triage sub-tab console)

## 9. Real-Time WebSockets Sync Contract
To eliminate polling latency and ensure the triage console updates within 200ms when a patient logs their dose:
*   **Websocket Route:** `ws://localhost:8000/api/clinician/ws/triage`
*   **Authentication:** Clinicians authenticate during handshake using the clinician token passed in query parameters (`ws://.../ws/triage?token=...`).
*   **Event Messages:** When the server receives a dose confirmation from any patient (`POST /api/medications/{prescription_id}/confirm`), it broadcasts a reload signal to all active clinician WebSocket connections:
    ```json
    { "event": "triage_update_trigger" }
    ```
*   **Frontend Action:** Upon receiving the trigger event, the React context listener automatically refetches triage data, flashing the affected card with a subtle green border before shifting its deck position.

