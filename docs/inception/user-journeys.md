# Ovify — Agile User Journeys & SDLC Specifications

**Document Version:** 1.4.2  
**Status:** 🚀 FINALIZED (Aligned to Hub71 Business Plan & PO Polish recommendations)  
**Author:** Product Owner, Digital Health & IVF  
**Target Folder:** BRDs/  
**v1.4.0 changes:** Incorporated "PO's Polish" updates: (1) Added EMR-absent fallback validation scenario to Journey 5. (2) Re-drafted Journey 6 PWA safe-mode copy to restrict vocabulary to pelvic-rest reassurance, forbidding alarmist terminology. (3) Added Twilio SMS fallback integration parameters to Journey 4.  
**v1.4.2 changes:** Standardized companion-app naming to **Support/Partner** throughout (Journeys 1, 3, 4, 7, 12 and summary tables), aligned to BRD §4.2/§5.2. Partner-only features (billing, semen-timing) remain conditionally scoped to spouse/partner supporter type.  

This document contains industry-standard, SDLC-ready user stories and journeys aligned with Agile/Scrum methodologies. These files are designed to be imported directly into JIRA, Azure DevOps, or used by developers and QA engineers to build and test the Ovify platform.

---

## HOW TO READ THESE JOURNEYS

Each user journey includes:
1.  **User Story:** Written in standard Agile format: *As a [User Role], I want [Feature], so that [Business Value/Benefit].*
2.  **Narrative & Description:** Background context, user channels, and core logic.
3.  **Process Flow:** A visual layout of user decision points and system activities.
4.  **Acceptance Criteria (Gherkin Syntax):** Formatted using `Given`, `When`, `Then` to cover happy paths, edge cases, and system/AI failures.
5.  **Design & Technical Notes:** Data schemas, APIs, frontend UI specifications, and AI requirements.
6.  **Unit & Integration Testing Notes:** Guidance for test case writing and automation.

---

## MVP vs ROADMAP SPLIT

This document is divided into two build tiers. Only **Part A** is approved for development on the current 500K AED raise. **Part B is roadmap** and is explicitly *not* approved for full build — see per-journey status tags and BRD §7.3 for the regulatory gating on each.

### Part A — MVP (Approved for Development) — 5 Journeys
| # | Journey | Why it's in the MVP |
| :-- | :--- | :--- |
| 1 | Clinic Patient Registration | Nurse adoption hook; non-SaMD |
| 2 | Patient Onboarding | Frictionless activation; non-SaMD |
| 3 | Daily Injection Flow & Confirmation | Core daily loop; non-SaMD |
| 4 | Missed-Dose Multi-Level Escalation | Hero feature — prevents cancellations; non-SaMD |
| 8 | Clinic Dashboard & Triage Console | B2B value surface; non-SaMD |

These five form a complete, demoable, sellable product that directly serves the nurse-time and dropout KPIs.

### Part B — Roadmap (NOT Approved for Full Build) — 7 Journeys
| # | Journey | Tier | Gating before build |
| :-- | :--- | :--- | :--- |
| 12 | Failed-Cycle Recovery Mode | Phase 2 (non-device) | Prioritisation + design; low regulatory risk |
| 5 | Ask Me Anything AI | Phase 2 (SaMD-candidate) | Dosage/diagnosis guardrails + legal sign-off |
| 7 | Support/Partner Daily Support | Phase 2 (consent-gated) | Granular, revocable consent model (Health Data Law) |
| 6 | CalmSeed Voice Companion | Phase 2 (SaMD-candidate) | Substantiate/remove torsion claim; validate stress scoring |
| 9 | Edge CV Dose Verification | Deferred (SaMD) | Clinical validation + MOHAP/DHA device pathway |
| 10 | TWW Symptom Triage | Deferred (SaMD) | Device pathway; MVP may log symptoms WITHOUT classification |
| 11 | AI Protocol/Dose Recommendation | Deferred (SaMD) | Device pathway; template selection (no dosing) may ship earlier |

---

# DETAILED JOURNEY SPECIFICATIONS

Journeys are listed in their original numeric sequence for traceability. **Build status is governed by the status tag under each heading, not by position** — MVP and roadmap journeys are interleaved. Only journeys tagged **✅ MVP — Approved for Development** are in scope for the current raise.

## JOURNEY 1: CLINIC PATIENT REGISTRATION
**Status:** ✅ MVP — Approved for Development · 🟢 Non-SaMD

### 1.1 User Story
**As a** Clinic Nurse or Coordinator,  
**I want to** register a new IVF patient in under 90 seconds, use the AI Onboarding Engine to parse protocol details, and invite their support/partner,  
**So that** the patient receives onboarding instructions instantly and is registered for reminders before leaving the clinic.

### 1.2 Description
This is the clinic-side entry point for Ovify. The nurse inputs basic patient details. The AI Onboarding Engine allows the nurse to copy-paste or dictate the protocol, automatically parsing text/audio to pre-fill medication timelines.

### 1.3 Process Flow
```
[Nurse logs in] ──► [Clicks +New Patient] ──► [Fills Bio Details] ──► 
[Paste/Dictate Protocol] ──► [🤖 AI Parses & Pre-fills Timeline] ──► [Clicks Register] ──► [SMS sent to Patient]
```

### 1.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful patient registration using the AI Onboarding Engine
  Given the Nurse is logged into the Clinic Web Portal
  When the Nurse clicks the "+ New Patient" button
  And inputs the patient's name "Sarah Khan", phone "+971501234567", DOB "1992-05-15", and cycle type "Fresh IVF"
  And clicks "Dictate Protocol" and reads out: "Patient starts Gonal-F 150 IU daily at 7 PM starting tomorrow, and Cetrotide 0.25mg daily at 8 AM starting Day 6"
  Then the AI Onboarding Engine parses the audio
  And automatically pre-fills the digital medication timeline with Gonal-F and Cetrotide at correct times and start dates
  And displays a confirmation message: "Sarah Khan registered successfully. SMS invite sent."

Scenario: AI Onboarding Parser fails to recognize a drug (Edge Case)
  Given the Nurse has uploaded a protocol text note
  When the text contains an unrecognized drug name "Gonal-X 150"
  Then the AI Onboarding Parser flags the item
  And highlights the text in Red
  And displays a warning: "We couldn't identify this medication. Please select from the dropdown."

Scenario: Server re-validates formulary at registration (Never Trust the Client)
  Given a registration request reaches the backend containing a prescription "Gonal-X 150 IU"
  When the register endpoint re-checks every medication against the approved clinic formulary
  Then the API rejects the request with HTTP 400 naming the unapproved medication
  And persists neither the patient record nor any prescriptions
  And the registration event, when successful, is written to the audit log attributed to the named nurse
```

### 1.5 Design & Technical Notes
*   **Frontend (Clinic Portal):** Developed in React (Web). Audio recording widget using Web Audio API for dictation.
*   **Backend API:** `POST /api/v1/patients/register-parse`
*   **AI Model:** Whisper API (for audio-to-text) + NER (Named Entity Recognition) pipeline mapping to the clinic's approved formulary database.

### 1.6 Unit Testing Notes
*   **Test Case 1 (Audio Parsing):** Verify transcription engine matches key terms ("Gonal-F", "Menopur", "Cetrotide", "IU") across varying accents.

---

## JOURNEY 2: PATIENT ONBOARDING & PERSONALIZATION
**Status:** ✅ MVP — Approved for Development · 🟢 Non-SaMD

### 2.1 User Story
**As an** onboarded IVF patient,  
**I want to** easily activate the Ovify PWA from a web link without an app store, verify via OTP, and customize my injection reminder timing,  
**So that** my treatment companion is personalized to my sleep cycle and daily routine.

### 2.2 Description
This journey details the patient's first interaction with the PWA. Friction must be minimal. The patient sets their bedtimes and injection preferences.

### 2.3 Process Flow
```
[Receives SMS Link] ──► [Opens PWA in browser] ──► [Authenticates via OTP] ──► 
[Inputs sleep cycle] ──► [Selects injection comfort] ──► [Saves profile]
```

### 2.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful onboarding flow and PWA install
  Given the Patient opens the PWA link from their onboarding SMS
  When the Patient enters their phone number and submits the OTP
  And answers the personalization wizard:
    | Question | Answer |
    | Sleep time | "10:00 PM - 12:00 AM" |
    | Injection Comfort | "First time" |
  Then the system saves the preferences to the database
  And updates the patient status to "Active"
  And displays the PWA installation prompt ("Add to Home Screen")
  And schedules the first medication reminder

Scenario: Personalization branches the patient guide experience
  Given the Patient has completed onboarding with Injection Comfort set to "Experienced"
  When the Patient opens the Medication Log Page for their daily dose
  Then the system collapses the detailed step-by-step video and guidelines
  And shows a condensed, checklist-only view with high-level summaries to prevent UI fatigue
  But if the Patient had selected "First time", the system displays the fully expanded step-by-step videos and injection guides

Scenario: OTP verification fails to deliver (Sad Path Fallback)
  Given the Patient is on the Login Screen and requests an access code
  When the SMS network experiences latency and the OTP does not arrive within 30 seconds
  And the Patient clicks the "Resend Code" trigger
  Then the system checks the routing carrier and falls back to a voice-call OTP gateway to guarantee authentication
```

---

## JOURNEY 3: DAILY INJECTION FLOW & CONFIRMATION
**Status:** ✅ MVP — Approved for Development · 🟢 Non-SaMD

### 3.1 User Story
**As an** IVF patient,  
**I want to** receive an injection reminder, view the preparation video guide, and confirm completion with one tap,  
**So that** I take my hormone doses accurately and my clinic dashboard is updated.

### 3.2 Description
This is the core daily workflow. The patient receives a notification, can view guides if anxious, and confirms the injection.

### 3.3 Process Flow
```
[T-30 Alert] ──► [Patient taps alert] ──► [Optional: View Video] ──► 
[Administers Injection] ──► [Clicks Done] ──► [Clinic Dashboard turns Green]
```

### 3.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Patient confirms injection on time
  Given a Gonal-F injection is scheduled for 7:00 PM
  When the system sends a push notification at 6:30 PM (T-30 min)
  And the Patient opens the PWA and clicks "I'm Ready"
  And clicks "✅ Confirmed Done" at 7:02 PM
  Then the system logs the injection time as 7:02 PM (Adherence status: "On Time")
  And updates the Clinic Dashboard card for this patient to Green
  And sends a confirmation SMS/Push to the Support/Partner app: "Sarah completed her injection."

Scenario: Patient logs a backdated injection retroactively (Forgot to Tap)
  Given the Patient administered their injection at 7:00 PM but forgot to confirm on the app
  When the Patient opens the PWA at 9:30 PM (T+150 min)
  And selects "Log offline or specify actual injection time"
  And inputs the actual administration time as "19:00"
  Then the system logs the dose with the actual time "19:00" (Adherence status: "On Time")
  And resolves any active Missed Dose triage alerts on the Clinic Dashboard
  And sends an updated notification to the Support/Partner companion app

Scenario: Offline injection logging saves locally and syncs (Offline-First)
  Given the Patient is in an area with zero network connectivity when an injection is due
  When the Patient administers the dose and taps "Confirm Injection Completed"
  Then the PWA intercepts the request and saves it locally in the offline queue
  And displays a warning: "Logged offline: Your confirmation is saved locally and will upload when online."
  And keeps the UI checkmarks green to prevent anxiety
  When network connectivity is restored
  Then the PWA automatically synchronizes the queued log with the backend database
  And updates the Clinic Dashboard compliance status

Scenario: Backend database down at confirmation time (Graceful Degradation)
  Given the Patient has active internet connectivity but the FastAPI backend is down
  When the Patient clicks "Confirm Injection Completed"
  Then the PWA handles the server error gracefully by queueing the log locally
  And triggers a reassuring, styled feedback toast: "Connection timeout. Your confirmation is safely saved on this device."
```

---

## JOURNEY 4: MISSED DOSE MULTI-LEVEL ESCALATION
**Status:** ✅ MVP — Approved for Development · 🟢 Non-SaMD

### 4.1 User Story
**As an** IVF Clinic Coordinator,  
**I want the system to** execute a multi-level escalation workflow if a patient does not confirm their injection,  
**So that** we intervene before a missed dose causes cycle cancellation.

### 4.2 Description
An automated safety net. T+30 (Amber Dashboard), T+60 (Support/Partner alert), T+120 (Red Dashboard & SMS to Nurse).

### 4.3 Process Flow
```
[Scheduled Time: 7:00 PM] ──► [T+30: Unconfirmed] ──► [PWA Gentle Ping] ──► 
[T+60: Unconfirmed] ──► [Support/Partner Alerted] ──► [T+120: Unconfirmed] ──► [🏥 Clinic Dashboard Red Alert]
```

### 4.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Multi-level escalation triggers when patient is unresponsive
  Given the injection was scheduled for 7:00 PM and is unconfirmed
  When the clock reaches 8:00 PM (T+60)
  Then the system triggers Level 2 Escalation
  And sends a push notification to the Support/Partner: "Ahmed, Sarah's 7 PM injection has not been confirmed yet..."
  When the clock reaches 9:00 PM (T+120)
  Then the system triggers Level 3 Escalation
  And sets the Clinic Dashboard status for Sarah to Red ("URGENT - MISSED DOSE")
  And sends an automated SMS/WhatsApp alert to the on-call Nurse phone number
```

### 4.5 Design & Technical Notes
*   **Escalation Logic:** Built using background workers (e.g., Celery/Redis).
*   **Twilio Tariff Safeguard:** WhatsApp authentication fees in UAE/KSA are subject to high telco-operator surcharges. If the WhatsApp gateway API reports delivery latency > 10 seconds or returns tariff error 30007 (carrier blocking), the escalation dispatcher must fallback to Twilio Programmable SMS within 5 seconds to guarantee transmission.

---

## JOURNEY 5: "ASK ME ANYTHING" AI CHATBOT
**Status:** 🟡 ROADMAP — Phase 2, NOT approved for build · SaMD-candidate (gating: dosage/diagnosis guardrails + legal sign-off, per BRD §7.3)

### 5.1 User Story
**As an** IVF patient,  
**I want to** ask natural language questions to the "Ask Me Anything" AI Chatbot in Arabic or English,  
**So that** I get instant, clinically-grounded, non-diagnostic answers that are aware of my specific treatment schedule and EMR details.

### 5.2 Description
The "Ask Me Anything" AI chatbot utilizes RAG to answer queries 24/7. It accesses EMR data to remain context-aware of the patient's specific drug schedule, while enforcing medical guardrails.

### 5.3 Process Flow
```
[Patient inputs text] ──► [AMA AI checks EMR sync status] ────► Sync Active ───► [Extracts EMR schedule]
                                                       └───► Sync Absent ───► [Enforces Graceful Fallback]
                                                                                   │
                                                                                   ▼
                                                                     [Answers general guidelines]
                                                                     [Displays EMR-absent warning]
```

### 5.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Patient asks a safe, educational question
  Given the Patient opens the "Ask Me Anything" chat window
  When the Patient types: "Is spotting normal after my injection?"
  Then the AI parses the intent as "educational - side effect"
  And returns a RAG-generated response within 4 seconds: "Light spotting is common... Normal: few drops... Contact clinic: heavy bleeding..."
  And appends the medical disclaimer: "This is for informational purposes only. Always consult your doctor..."

Scenario: Patient asks about their specific trigger time (EMR Synced)
  Given the Patient has an active EMR record with a trigger scheduled for 10:15 PM tonight
  When the Patient asks: "What time is my trigger shot scheduled?"
  Then the AMA AI accesses their active EMR profile
  And replies: "According to your clinic protocol, your trigger shot is scheduled for 10:15 PM tonight. Please verify with your physical schedule sheets."

Scenario: Patient asks cycle-specific question when EMR Integration is absent (Graceful Degradation)
  Given the Patient belongs to a clinic on the Starter subscription tier (EMR Integration disabled)
  When the Patient asks: "What time should I take my trigger shot tonight?"
  Then the AI detects EMR sync status is "Absent"
  And blocks active schedule extraction
  And replies: "I do not have access to your active clinic chart. Please refer to your timeline check-ins or contact your nursing team directly. Generally, trigger shots are timed exactly 35-36 hours before egg collection."

Scenario: Patient asks a dosage alteration question (Guardrail Trigger)
  Given the Patient is in the chatbot window
  When the Patient asks: "My dose is 150 IU Gonal-F, should I increase it to 225?"
  Then the AI blocks the request
  And returns: "I cannot advise on dosage adjustments. Please contact your nursing team directly at +9715000000 to discuss any changes."
```

### 5.5 Design & Technical Notes
*   **AI Architecture & Integration Guard:** The conversational agent checks the boolean flag `is_emr_synced` in the patient's context schema. If `false`, the LLM system prompt is updated with the instruction: *System is running in isolated mode. Do not output cycle-specific parameters. Redirect to timeline inputs and clinic nurses.*
*   **API:** `POST /api/v1/ai/ama/query`

---

## JOURNEY 6: CALMSEED AI VOICE-DRIVEN SOMATIC COMPANION
**Status:** 🟡 ROADMAP — Phase 2, NOT approved for build · SaMD-candidate (gating: substantiate or remove the ovarian-torsion prevention claim; validate stress scoring, per BRD §7.3)

### 6.1 User Story
**As an** anxious IVF patient,  
**I want to** speak to the CalmSeed AI emotional companion,  
**So that** it reads my vocal intonation and stress levels, and dynamically suggests safe, context-appropriate breathing, yoga, journaling, or physical exercises.

### 6.2 Description
The vocal emotional companion. Patients speak to the agent; the AI extracts acoustic stress prosody. It cross-checks their cycle status to filter out physical movements that carry an ovarian torsion risk, utilizing gentle, pelvic-rest language instead of clinical alarmist terms.

### 6.3 Process Flow
```
[Patient records voice] ──► [🤖 CalmSeed extracts tone & prosody] ──► 
[Fetches current cycle day] ──► [Checks safety parameters] ──► [Recommends safe Somatic exercise]
```

### 6.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Patient records voice during late-stimulation (Safe Pelvic-Rest Reassurance UI Mode)
  Given the Patient's cycle is on "Day 9 (Stimulation)"
  When the Patient records a voice check-in: "I am feeling so anxious about my collection scan, my stomach feels so heavy..."
  Then the CalmSeed AI processes the voice note and detects "High Anxiety"
  And notes the cycle day (Day 9 = late stim, ovaries enlarged)
  And blocks any twisting, high-impact, or inversion yoga recommendations
  And suggests: "Box Breathing (4-4-4-4)" and "Gentle seated neck and shoulder release"
  And displays the supportive, non-alarmist message: "As your follicles grow, we adapt your exercises to focus on resting your pelvic area. Today, we suggest box breathing and neck releases. 💜"
  And strictly hides clinical, fear-inducing terms such as "ovarian torsion", "medical emergency", or "complications"

Scenario: Patient records voice during baseline phase (All exercises unlocked)
  Given the Patient's cycle is on "Day 2 (Pre-Stimulation)"
  When the Patient records a voice check-in indicating moderate stress
  Then the CalmSeed AI detects "Moderate Stress"
  And notes the cycle day (Day 2 = ovaries normal size)
  And suggests a 10-minute "Fertility Flow Yoga Sequence" (including hip opening poses and mild twists)
```

### 6.5 Design & Technical Notes
*   **Acoustic & Safety Locks:** The somatic exercise recommendation library must have a metadata tagging schema. Exercises containing tags `core_compression`, `torsion_risk`, `deep_twist`, or `inversion` are programmatically set to `active = false` when the patient's cycle state variable `cycle_day` falls in the range `[stimulation_day_7, retrieval_day_plus_3]`.
*   **Content Restrictions:** The PWA copywriting guidelines strictly forbid clinical warnings about ovarian torsion from displaying to patients. All safe-mode warnings are framed as *“nurturing pelvic rest while your body does the hard work.”*
*   **API:** `POST /api/v1/ai/calmseed/voice-analyze`

---

## JOURNEY 7: SUPPORT/PARTNER DAILY SUPPORT & CONTEXTUAL PROMPTS
**Status:** 🟡 ROADMAP — Phase 2, NOT approved for build · Consent-gated (gating: granular, revocable consent for mood/health-data sharing under UAE Health Data Law, per BRD §7.3)

### 7.1 User Story
**As a** registered Support/Partner person,  
**I want to** receive daily updates about the patient's cycle stage and actionable supportive tips,  
**So that** I can actively participate in the journey and support the patient's emotional state.

### 7.2 Description
Equips the support/partner with tools to support. Prompts are cycle-day specific and synchronized with patient mood markers.

### 7.3 Process Flow
```
[Cycle day shifts] ──► [🤖 AI generates support/partner tip] ──► 
[PWA Push sent to Support/Partner] ──► [Support/Partner logs in, views suggestions]
```

### 7.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Support/Partner receives daily trigger alert
  Given the Patient's cycle is on "Day 10 (Stimulation)"
  And the patient reported "Anxious" yesterday
  When the clock reaches 8:00 AM
  Then the system triggers a push notification to the Support/Partner: "Good morning! Today is Sarah's 10th stimulation day. She's feeling a bit anxious..."
  And provides 2 concrete recommendations: "1. Offer to drive her to the clinic scan. 2. Prepare her favorite meal tonight."

Scenario: Patient revokes partner data sharing consent (Granular Consent Lifecycle)
  Given the Patient previously authorized cycle sharing with their partner phone number
  When the Patient opens Settings, untoggles the "Granular Consent Grant" checkmark, and clicks Save
  Then the system updates the user profile record in the database (`partner_consent = false`)
  And displays a feedback message: "Sharing consent revoked."
  When the Support Partner opens the partner companion app and attempts to access the cycle dashboard
  Then the API gates the request and returns a HTTP 403 status code
  And the partner app renders a legal notice screen: "Consent Revoked: Sharing has been paused. Please consult your partner to re-establish secure link."
  And prevents any patient medication logs, mood check-ins, or protocol details from loading
```

---

## JOURNEY 8: CLINIC DASHBOARD & TRIAGE COMMAND CENTER
**Status:** ✅ MVP — Approved for Development · 🟢 Non-SaMD (risk-vector ranking must remain non-prescriptive — informs, does not direct care)

### 8.1 User Story
**As a** Clinic Nurse,  
**I want a** priority triage console that ranks active patients by their Dynamic Patient Risk Vector,  
**So that** I can review all patients in 10 minutes and prioritize intervention calls.

### 8.2 Description
Represents the B2B dashboard. Contains categorized panels (Urgent Alerts, Attention Needed, On Track) and displays clinic-wide stats.

### 8.3 Process Flow
```
[Nurse logs in] ──► [Dashboard loads] ──► [First look: Red Alerts (Missed Injections)] ──► 
[Second look: Yellow Attention (High Stress/Late Dose)] ──► [Third look: Clinic Stats]
```

### 8.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Nurse views dashboard and resolves a Red Missed Dose alert
  Given the Nurse is on the Clinic Dashboard
  When the Dashboard displays 1 Red Alert: "Sarah Khan — Missed injection (Gonal-F) — 2 hours overdue"
  And the Nurse calls the patient and confirms they administered the dose but forgot to click confirm
  And the Nurse clicks the "[Resolved]" button on the dashboard card
  Then the card shifts to "On Track (Green)"
  And the underlying dose log KEEPS its truthful "Missed" status — resolution NEVER rewrites clinical history
  And the log is flagged resolved with the nurse's name and timestamp (audit trail)
  And an audit event is recorded attributing the resolution to the named nurse

Scenario: Triage ranking uses a recency window (No Forever-Red Patients)
  Given a patient has one unresolved "Missed" dose log from 10 days ago
  And has logged every dose on time since
  When the Nurse opens the Triage Console
  Then the patient ranks as "On Track" — alerts only consider unresolved logs from the last 7 days
  But a Missed dose from yesterday still ranks the patient as "Red Alert"
```

---

## JOURNEY 9: EDGE COMPUTER VISION INJECTION VERIFICATION (NEW)
**Status:** 🔴 ROADMAP — DEFERRED (SaMD), NOT approved for build · Medication-error prevention = device function. Requires clinical validation + MOHAP/DHA device pathway (per BRD §7.3)

### 9.1 User Story
**As an** IVF patient,  
**I want to** capture a photo of my prepared syringe or dialed injection pen before injecting,  
**So that** the Edge Computer Vision Guide can verify that my medication type and dose are correct, preventing errors.

### 9.2 Description
This is an advanced safety feature. The patient holds the pen/syringe up to their phone camera, the computer-vision model parses the dial window or syringe graduations, and confirms it matches the protocol dose.

### 9.3 Process Flow
```
[Pre-injection screen] ──► [Patient taps Verify Dose] ──► [Camera opens] ──► [Snaps photo] ──► 
[🤖 Edge Computer Vision analyses photo] ──► [Green light: Proceed / Red light: Warning]
```

### 9.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Successful photo-verification of Gonal-F pen dialed to 150 IU
  Given the Patient has the Gonal-F pen dialed to 150 IU
  And the protocol scheduled dose is 150 IU
  When the Patient uploads a photo of the pen dial window
  Then the edge computer-vision engine extracts the text from the dial window
  And verifies that the text matches "150"
  And displays a green success screen: "Dose verified: 150 IU. You are ready to inject! ✅"

Scenario: Photo-verification flags incorrect dosage (Error Prevention)
  Given the Patient's scheduled dose is 150 IU
  When the Patient uploads a photo of the pen dial showing "225"
  Then the computer-vision engine extracts the text "225"
  And compares it to the scheduled dose "150"
  And triggers a Red Warning banner: "⚠️ WARNING: Your dial shows 225 IU, but your scheduled dose is 150 IU. Please rotate the dial back to 150 IU and verify again."
```

---

## JOURNEY 10: TWO-WEEK WAIT (TWW) SYMPTOM LOG & TRIAGE CLASSIFIER (NEW)
**Status:** 🔴 ROADMAP — DEFERRED (SaMD), NOT approved for build · Naming a probable condition + risk level = diagnosis. MVP may log symptoms WITHOUT classification; full triage requires a device pathway (per BRD §7.3)

### 10.1 User Story
**As an** IVF patient in the Two-Week Wait period,  
**I want to** log my daily physical and emotional symptoms,  
**So that** the AI can classify my symptoms, provide clinical-guideline reassurance, and flag urgent symptoms to my nurse.

### 10.2 Description
The TWW (the 14 days between embryo transfer and pregnancy blood test) is the most anxiety-inducing stage. This feature provides structured tracking and a safety net for complications like OHSS or ectopic pregnancies.

### 10.3 Process Flow
```
[TWW Phase starts] ──► [Daily Symptom Checklist] ──► [Patient enters symptoms] ──► 
[🤖 AI Classifies Risk] ──► Reassurance (Low) OR Clinic Escalation (High)
```

### 10.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Patient logs minor symptoms (Low Risk)
  Given the Patient is on Day 6 post-embryo transfer
  When the Patient logs symptoms: "Mild cramping, light spotting, feeling tired"
  Then the AI classifier rates the clinical risk level as "Low (Normal post-transfer symptoms)"
  And displays reassurance content: "These symptoms are very common after transfer. Cramping can be a sign of early implantation..."
  And saves the logs silently to the patient history

Scenario: Patient logs severe symptoms indicating OHSS risk (High Risk Escalation)
  Given the Patient is on Day 4 post-transfer
  When the Patient logs: "Severe bloating, rapid weight gain of 1.5kg since yesterday, and mild shortness of breath"
  Then the AI classifier flags the clinical risk level as "High (Possible OHSS)"
  And displays an immediate alert banner: "⚠️ Please contact your clinic immediately. We have notified your nursing team..."
  And triggers an automated Red Alert in the Clinic Dashboard
```

---

## JOURNEY 11: AI CLINIC PROTOCOL TEMPLATE AUTO-SELECTION (NEW)
**Status:** 🔴 ROADMAP — DEFERRED (SaMD), NOT approved for build · Recommending a starting dose = clinical decision support (Class II); "doctor approves" does not exempt it. Template selection WITHOUT dosing may ship earlier; dose suggestion requires a device pathway (per BRD §7.3)

### 11.1 User Story
**As a** Clinic Doctor or Nurse,  
**I want the system to** analyze patient baseline metrics (Age, AMH, AFC, BMI) and suggest the optimal starting protocol template,  
**So that** we reduce formulation errors and save administrative planning time.

### 11.2 Description
B2B-facing clinical optimization tool. AI reviews incoming patient biomarkers against past success trends to recommend starting dosages.

### 11.3 Process Flow
```
[Nurse inputs Patient Intake Data] ──► [System runs data through optimization engine] ──► 
[🤖 AI matches AMH/AFC/Age] ──► [Displays Recommended Template + Starting Dosages] ──► [Doctor approves/edits]
```

### 11.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: System auto-suggests a protocol for a patient with high AMH (PCOS profile)
  Given the Nurse has entered the patient profile: Age: 31, AMH: 6.8 ng/mL, AFC: 26, BMI: 22
  When the Nurse opens the "Protocol Setup" step
  Then the AI Protocol Selector automatically flags: "PCOS/High Responder Profile"
  And recommends the "Short Antagonist (PCOS Guard) Template" with a starting Gonal-F dose of 125 IU
  And displays the rationale: "High AMH and AFC indicate high risk of OHSS. Recommending conservative gonadotropin dosing..."
  And provides a button to "[Apply Template]"
```

---

## JOURNEY 12: FAILED-CYCLE EMOTIONAL RECOVERY & NEXT-STEP PLANNING (NEW)
**Status:** 🟡 ROADMAP — Phase 2 (non-device), NOT approved for build · Low regulatory risk; gating is prioritisation + design only (per BRD §7.3)

### 12.1 User Story
**As an** IVF patient who has received a negative pregnancy test,  
**I want** the system to transition to an empathetic "Recovery Mode" that supports my mental health and schedules my next consultation,  
**So that** I don't feel abandoned by the clinic and have a clear recovery plan.

### 12.2 Description
Critical retention and wellness journey. Addresses the "between-cycles silence". Changes the PWA styling, stops injection prompts, schedules next consultation, and introduces emotional support resources.

### 12.3 Process Flow
```
[Clinic enters negative Beta HCG] ──► [PWA transitions to Recovery Mode] ──► 
[Deactivates reminders] ──► [Unlocks recovery guides] ──► [Schedules next consultation]
```

### 12.4 Acceptance Criteria (Gherkin)
```gherkin
Scenario: Patient cycle is marked as negative
  Given the clinic embryologist/nurse logs a "Negative Beta HCG" result in the Clinic dashboard
  When the clock syncs to the patient PWA
  Then the system immediately deactivates all active stimulation reminders
  And displays an empathetic, gentle greeting banner: "We are holding you in our thoughts today, Sarah 💜"
  And shifts PWA interface colors to soft calming sage/neutral tones
  And unlocks the "Emotional Recovery & Reset Program"
  And sends a notification to the Support/Partner app with guidance: "Sarah's test was negative. The best thing to do today is simply be present..."

Scenario: Recovery-mode nurse callback is persisted and actioned (Never a UI-Only Promise)
  Given the Patient is in Recovery Mode and taps "Request Nurse Callback"
  When the PWA sends the request to the backend
  Then the system persists a Pending callback record in the database
  And only THEN shows the patient "✓ Callback Requested (Within 24 Hours)"
  And the Clinic Triage Console surfaces the patient as "Yellow Attention — 📞 Nurse callback requested"
  When the Nurse resolves the patient's alert
  Then the callback record is marked Completed with the nurse's name and timestamp
  And a repeated tap while a request is Pending returns the same request (idempotent — no duplicates)
  But if the backend is unreachable, the patient sees an honest error with a direct-call fallback — never a false confirmation
```

---

## SUMMARY: DEVELOPMENT SEQUENCE

### Part A — MVP (Approved for Development)

| Step | Journey | Target User | Technology Highlight | B2B Value / Clinical ROI | Regulatory Scope (BRD §7.3) |
|---|---|---|---|---|---|
| **1** | Clinic Patient Registration | Nurse | 🤖 AI Onboarding dictation parser (nurse-verified) | Under 90 seconds registration | 🟢 Non-SaMD |
| **2** | Patient Onboarding | Patient | PWA Install + OTP verification | Frictionless setup, higher adoption | 🟢 Non-SaMD |
| **3** | Daily Injection Flow | Patient | Frosted Glass UX, Video guides | Reduced dosage confusion | 🟢 Non-SaMD |
| **4** | Missed Dose Escalation | Patient / Support/Partner | Celery queues, multi-level alerts + SMS fallback | Prevents cycle failure — hero feature | 🟢 Non-SaMD |
| **8** | Clinic Dashboard | Clinician | Real-time WebSockets grid dashboard | 10-minute daily patient reviews | 🟢 Non-SaMD |

### Part B — Roadmap (NOT Approved for Full Build)

| Step | Journey | Target User | Technology Highlight | Tier & Gating (BRD §7.3) |
|---|---|---|---|---|
| **12**| Recovery Mode | Patient | Dynamic UI Theme Transition | 🟡 Phase 2 (non-device) — prioritisation + design |
| **5** | Ask Me Anything AI | Patient | RAG LLM + EMR context-awareness & graceful degradation | 🟡 Phase 2 (SaMD-candidate) — guardrails + legal sign-off |
| **7** | Support/Partner daily support | Support/Partner | Context-aware PWA push notifications | 🟡 Phase 2 (consent-gated) — Health Data Law consent model |
| **6** | CalmSeed Support | Patient | 🤖 Vocal Biomarker prosody analysis + pelvic-rest warning copy | 🟡 Phase 2 (SaMD-candidate) — substantiate/remove torsion claim |
| **9** | AI Photo-Verification | Patient | 🤖 Edge ONNX Computer Vision OCR | 🔴 Deferred (SaMD) — device pathway required |
| **10**| TWW Symptom Triage | Patient | Triage risk transformer | 🔴 Deferred (SaMD) — logging-only allowed in MVP |
| **11**| AI Protocol Template | Doctor | 🤖 Classifier models (AMH/AFC/BMI) | 🔴 Deferred (SaMD) — template-only allowed in MVP |

---

## ACCESSIBILITY (A11Y) & DUAL-LANGUAGE ARABIC PARITY (DoD)

To align with UAE and international digital health platform compliance criteria, all user journeys in **Part A** and **Part B** must satisfy the following **Definition of Done (DoD)** rules:

### 1. Web Content Accessibility Guidelines (WCAG 2.2 AA)
* **Contrast Thresholds**: All text elements (body copies, labels, sub-texts, instructions) must enforce a minimum contrast ratio of **4.5:1** against the background. Low-opacity colors (like light grey Navy-55) are prohibited on ivory backgrounds.
* **Keyboard Reachability**: All interactive buttons, checkboxes, custom list items, and form elements must be fully focusable using keyboard tab navigation. Clear visible focus rings (`focus:ring-2 focus:ring-lavender`) must be rendered.
* **Semantic HTML**: No raw emojis can be used as standalone interactive targets. Screen readers must be supplied with descriptive `aria-label` tags (e.g. `aria-label="Warning Alert"`, not just "⚠️").

### 2. Arabic RTL (Right-to-Left) Parity
* **Bi-directional Layout Grid**: Dynamic CSS wrappers must adapt text alignments and flex directions from left-to-right (LTR) to right-to-left (RTL) upon setting `document.documentElement.dir = 'rtl'`. Text padding, border locations, and icon positions must mirror cleanly to prevent interface truncation or text overlap.
* **Clinical Language Translation**: Emotional reassuring check-in responses, error popups, safety preparation instructions, and drug timeline labels must load from data-driven content dictionaries. Hardcoded copywriting in view templates is forbidden.

---

## IOS PWA NOTIFICATION ESCALATION POLICY (CRITICAL SAFETY NET)

Because web-push notifications on iOS PWAs are heavily restricted by Apple sandboxes and require active homescreen installation, the Missed-Dose Escalation engine (Journey 4) enforces an **SMS-Primary / Push-Secondary** dispatcher architecture for critical IVF stimulation alarms:
* **Reminders (T-30 / Scheduled)**: Emitted via Web Push gateway if PWA connection is active.
* **Level 1 Alert (T+30 Unconfirmed)**: Emitted as a backup SMS message to ensure delivery if PWA push goes undelivered.
* **Level 2 Alert (T+60 Unconfirmed)**: Partner/Supporter companion alert is sent as a Direct Twilio SMS (to the verified companion phone) rather than relying on web-push connection states.
* **Level 3 Alert (T+120 Urgent Triage)**: Clinic emergency alerts are dispatched via Direct Telephony/SMS API.

---

**STATUS:**
*   **Part A (Journeys 1, 2, 3, 4, 8):** 🚀 APPROVED & READY FOR DEVELOPMENT
*   **Part B (Journeys 5, 6, 7, 9, 10, 11, 12):** 🟡 ROADMAP — NOT approved for build; each gated per BRD §7.3 before entering a sprint.

**Version Control:** MVP journeys aligned with JIRA Project Board `OVIFY-2026-V1`. Roadmap journeys held in backlog pending regulatory/consent gating. All documents are version-controlled active references in source code.
