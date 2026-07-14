# US-J4-00: Missed-Dose Multi-Level Escalation

| Field | Value |
|---|---|
| **Journey** | J4 — Missed-Dose Multi-Level Escalation |
| **Persona(s)** | P1 Sarah (patient), P3 Mona (nurse), Ahmed (partner) |
| **Primary intent** | Automatically escalate unconfirmed injections to prevent cycle cancellations. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-14 |

## 1. User story
> As a **Clinic Coordinator (Mona) and Patient (Sarah)**, we want **the system to execute a multi-level escalation workflow if a patient does not confirm their scheduled injection**, so that **we intervene before a missed dose causes cycle cancellation.**

## 2. Context & entry
- **Entry point:** Background scheduler/worker daemon runs checking for active stim prescriptions.
- **Preconditions:** Dose is scheduled for today; status remains "Due" after target time passes.
- **Exit:** Patient logs the injection (resolving alerts) OR nurse resolves the alert manually from the dashboard.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Multi-level escalation triggers when patient is unresponsive
  Given the injection Gonal-F was scheduled for 19:00 (7:00 PM) and is unconfirmed
  When the clock reaches 19:30 (T+30 mins)
  Then the system triggers Level 1 Escalation
  And sends a push notification to Sarah's PWA
  And sets Sarah's status to "Needs Attention" (Amber) on the Clinic Triage Dashboard

  When the clock reaches 20:00 (T+60 mins)
  Then the system triggers Level 2 Escalation
  And sends an automated SMS alert to Sarah's partner Ahmed: "Ahmed, Sarah's 7 PM Gonal-F injection has not been confirmed yet. Please verify if she needs support."

  When the clock reaches 21:00 (T+120 mins)
  Then the system triggers Level 3 Escalation
  And sets Sarah's status to "Urgent Alerts" (Red) on the Clinic Triage Dashboard
  And sends an automated SMS alert to Mona's on-call phone number
```

## 4. Operational Escalation Rules

### Level 1: Patient Reminder (T+30 minutes overdue)
*   **Trigger:** Dose unconfirmed at `scheduled_time + 30 minutes`.
*   **Action:** Triggers PWA push notification: *"Time for your Gonal-F injection. Please log it once completed."*
*   **Dashboard Status:** Updates from "On Track" to "Needs Attention" (Amber) with reason: *"Gonal-F dose overdue"*.

### Level 2: Partner Alert (T+60 minutes overdue)
*   **Trigger:** Dose unconfirmed at `scheduled_time + 60 minutes`.
*   **Action:** If partner consent is `True` and phone is registered, dispatches SMS to partner: *"[Partner Name], [Patient Name]'s [Scheduled Time] [Medication Name] injection has not been confirmed. Please check in with her."*
*   **Dashboard Status:** Stays in "Needs Attention" (Amber).

### Level 3: Clinical Alarm (T+120 minutes overdue)
*   **Trigger:** Dose unconfirmed at `scheduled_time + 120 minutes`.
*   **Action:** 
    1.  Flips status to "Urgent Alerts" (Red) with reason: *"Missed [Medication Name] (2h overdue)"*.
    2.  Dispatches SMS alert directly to the on-call Nurse phone number: *"Urgent: [Patient Name] missed [Medication Name] injection scheduled for [Scheduled Time]. 2 hours overdue."*

---

## 5. Free Dispatch Alternative (Web Push) & Carrier Failovers
To avoid API premium costs associated with Twilio SMS / WhatsApp, the system prioritizes free **Web Push Notifications** (Push API via PWA service worker):
1. **Primary Dispatch Channel:** Free Browser Web Push is triggered first to Sarah's device.
2. **Consent Gating:** Relies on browser-native prompt permissions requested during user onboarding (`US-J1-03`).
3. **SMS / WhatsApp Fallback:** If the browser does not support the Push API (e.g., standard iOS PWA standalone limitations or permission is denied), or if the patient remains unresponsive after T+60/T+120 minutes, the system automatically falls back to:
   - Level 2 Support Partner Backup: Twilio WhatsApp Gateway (Primary) / Twilio Programmable SMS (Secondary, if WhatsApp latencies > 10s or carrier block 30007 occur).
   - Level 3 Clinician Backup: Twilio Programmable SMS direct to Mona's on-call phone.

> [!IMPORTANT]
> **Launch & Operational Cost Recommendation:**
> Integrating the Web Push primary + SMS fallback strategy is highly recommended for the launch. It minimizes early operational costs by keeping 95% of daily patient reminders free of carrier fees while maintaining the clinical safety net for non-responsive alerts.

## 6. Accessibility & DoD
- [x] Clear logs kept in `ProcessedDate` ledger table to prevent double-alerts
- [x] Consent gates checked before Level 2 dispatch
- [x] Screen states in §4 implemented

## 7. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J4
- **Endpoints:** Background worker inside `main.py`
