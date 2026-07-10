# US-J3-01: Confirm today's injection

| Field | Value |
|---|---|
| **Journey** | J3 — Daily Injection Flow & Confirmation |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Record that she took today's injection (and, if needed, correct the time). |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | ✅ Locked |
| **Last updated** | 2026-07-09 |

## 1. User story
> As **Sarah (a patient)**, I want to **confirm I've taken today's injection, and
> correct the time if I did it earlier**, so that **it's recorded, my clinic has it,
> and I'm not left wondering if it counted.**

_The "how to inject / mix" guidance is a separate screen — see **US-J3-02 View
injection guide**. This story is only about recording the dose._

## 2. Context & entry
- **Entry point:** taps a medication card on the Home dashboard (US-J3-00, separate story).
  The selected medication (name, dose, scheduled time, status) is passed in.
- **Preconditions:** authenticated patient (bearer token); onboarded; the medication
  is active for today; `cycle_outcome != "Failed"` (Recovery Mode has no doses).
- **Exit:** on success, returns to the Home dashboard with a confirmation toast; the
  card's status now reads "Taken".
- A **"Watch how to inject"** link on this screen opens US-J3-02 (the guide).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: Confirm on time
  Given a due injection scheduled for 8:00 PM and it is 8:10 PM
  When Sarah taps "Confirm injection completed"
  Then the dose is logged with status "On Time"
  And she returns to Home where the card shows "Taken"
  And a toast confirms it is recorded for her clinic

Scenario: Confirm late
  Given a due injection scheduled for 8:00 PM and it is 9:30 PM
  When Sarah confirms
  Then the dose is logged with status "Late"

Scenario: Correct the time (took it earlier, forgot to log)
  Given Sarah took the 8:00 PM dose but is only logging at 9:30 PM
  When she opens "I took it at a different time" and enters 20:00
  Then the dose is logged against 8:00 PM (status "On Time")
  And the entry is flagged self-reported for the nurse

Scenario: Already logged today
  Given today's dose is already recorded
  When Sarah opens this screen
  Then she sees the completed state (read-only, no confirm button) with the logged time

Scenario: Offline
  Given Sarah has no connectivity
  When she confirms
  Then the confirmation is saved on her device and shown as "Sync Pending"
  And it uploads automatically when she is back online
  And she is NEVER told it reached the clinic until it actually has

Scenario: Server error
  Given the backend rejects or fails the request (not a 4xx "already logged")
  When Sarah confirms
  Then the dose is NOT shown as done
  And she sees a plain retry message
```

## 4. Screen states
| State | Trigger | What the user sees |
|---|---|---|
| **ready / due** | dose not yet logged | med name + dose, **"Watch how to inject"** link (→ US-J3-02), **"Confirm injection completed"** button, "I took it at a different time" link |
| **time-entry** | taps the different-time link | inline time picker (default = scheduled time), confirm re-labelled |
| **submitting** | confirm tapped | button shows spinner + "Saving…"; disabled |
| **success** | 2xx logged | leaves to Home; toast "recorded for your clinic" |
| **already taken** | a log exists for today | completed panel: "Injection completed today · logged {on time/late} at {HH:MM}", **read-only, no confirm/edit** |
| **offline / queued** | `navigator.onLine === false` (or fetch failed as network) | card marked Taken with a **"Sync Pending"** badge + "Saved offline — will sync when you're online" |
| **error (recoverable)** | non-4xx failure | inline error "We couldn't log your dose just now. Please try again."; dose **stays Due** |
| **no medication selected** | reached with no selection | guard: "No medication selected" + Go back |

## 5. Data contract
- **Endpoint:** `POST /api/medications/{prescription_id}/confirm` — auth: **patient token**.
  - Query: `actual_time?` — `HH:MM(:SS)` or ISO-8601 (offline queue). Omitted = now.
- **Response 200 (`DoseLog`):** `{ id, prescription_id, status: "On Time"|"Late", scheduled_date, logged_at, self_reported }` → UI flips the card to Taken.
- **Errors → required UI reaction:**
  - `400 "already logged"` → show **already-taken** state (do not error-toast).
  - `400 future time / too far past` → keep time-entry open, show the message inline.
  - `401` → session expired → bounce to login (clear token).
  - **network / 5xx** → **offline/queued** or **error** state; **never** show success.

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| medication name + dose | display | string | — | — | from selected med; if missing → no-selection guard |
| scheduled time | display | `HH:MM` (12h) | — | — | — |
| guide link | action | link → US-J3-02 | — | — | — |
| actual_time | input | time `HH:MM` | N (only in time-entry) | not future (5-min skew); not >24h past | default = scheduled time |
| confirm | action | button | — | disabled while submitting | — |

## 7. Components
- Reuse: `Button`, `Badge` (status incl. "Sync Pending"), back/nav control, toast (`role="status"`), link.
- Existing screen: `MedicationLogPage.tsx` (guide content moves to US-J3-02).

## 8. Design tokens & layout
- Inherits constitution §5 (ivory/navy/lavender/sage/due; DM Sans/Manrope/Inter; radii).
- Phone frame, single-column, scrollable. Confirm button is the primary, most prominent control.

## 9. Copy (EN) — must obey constitution §7
| Key | String |
|---|---|
| title | "Today's injection" |
| guide_link | "Watch how to inject" |
| confirm_btn | "Confirm injection completed" |
| confirm_btn_busy | "Saving…" |
| diff_time_link | "I took it at a different time" |
| success_toast | "{med} recorded for your clinic" |
| offline_note | "Saved offline — we'll sync with your clinic when you're back online" |
| already_taken | "Injection completed today · logged {on time/late} at {time}" |
| error_recoverable | "We couldn't log your dose just now. Please try again." |
| no_selection | "No medication selected." |

_Tone check: factual acknowledgement, no cheerleading, no "great job 💜", no outcome/hope
language. "Recorded for your clinic" avoids implying a nurse is watching in real time.
Offline/error copy is truthful — never implies the clinic has it when it doesn't._

## 10. Interaction & motion
- Confirm → brief spinner → route to Home + toast. Toast auto-dismisses ~3s, `aria-live="polite"`.
- Time-entry expands inline (no modal). All transitions honour `prefers-reduced-motion`.

## 11. Accessibility & Definition of Done
- [ ] WCAG AA contrast · [ ] keyboard reachable + focus rings · [ ] `aria-label`s, no bare-emoji signals, `aria-live` toast/error
- [ ] `prefers-reduced-motion` · [ ] strings externalized (EN shipped)
- [ ] Truthful status: offline = "Sync Pending", never "sent to clinic"
- [ ] All §4 states implemented · [ ] AC pass; tests reference `US-J3-01`

## 12. Out of scope / non-goals
- **Injection guidance / video / mixing steps** → **US-J3-02** (separate story).
- **The app does NOT verify the injection was done correctly** — no "you did it right ✓"
  (that's J9 CV, deferred SaMD). *(Persona P1 #9.)*
- **Editing a logged dose is not available in MVP.** The already-taken state is read-only;
  corrections are nurse-side for now. Patient self-edit is a **planned later improvement**
  (would need an edit path + endpoint — see Q3).
- The Home dashboard list (US-J3-00); reminders/notifications (J4).

## 13. Resolved decisions
```
Q1. Success copy — RESOLVED: use the softer "recorded for your clinic" (avoids implying
    real-time nurse attention). Applied in §9.
[Answer]: Softer wording adopted.

Q2. Split the guide into its own story — RESOLVED: yes. Guide content moved to
    US-J3-02 "View injection guide"; this story is confirm-only.
[Answer]: Split approved.

Q3. Self-edit of a mis-logged dose — RESOLVED (for now): not editable by the patient in
    MVP; already-taken is read-only; corrections are nurse-side. Revisit as a later
    improvement (needs edit endpoint).
[Answer]: No self-edit now; deferred.
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J3 (Scenarios 2–4)
- **As-built:** `docs/construction/as-built/Journey_3_Medication_Adherence.md`
- **Endpoints:** `api/medications.py` (`confirm_medication_dose`)
- **Frontend:** `frontend/src/pages/MedicationLogPage.tsx`, `context/AppContext.tsx` (`submitDose`, offline queue)
- **Tests:** `tests/test_medication.py`, `tests/test_auth_security.py` (reconciliation)
- **Related:** US-J3-02 (guide), US-J3-00 (dashboard list)
