# Ovify — Final Business Requirements Document (BRD)

**Document Version:** 1.4.3  
**Status:** 🚀 FINALIZED (Aligned to Hub71 Business Plan & PO Polish recommendations)  
**Author:** Product Owner, Digital Health & IVF  
**Target Folder:** BRDs/  
**v1.4.0 changes:** Incorporated "PO's Polish" recommendations: (1) Added EMR graceful degradation constraint to §5.1 (FR-PA-004). (2) Mandated non-alarmist patient-facing copy for CalmSeed late-stimulation safety locks in §4.4 and §5.1 (FR-PA-005). (3) Added Twilio/WhatsApp tariff and SMS fallback safeguards to §10.2.  
**v1.4.1 changes:** Regulatory-claim hardening: (1) §4.4 CalmSeed safety guardrail reworded from "eliminate the risk of Ovarian Torsion" to "reduce activity that is contraindicated during ovarian enlargement, per clinical guidance" — removes an absolute medical-device safety claim from the BRD body. (2) §6.2 (NFR-SEC-002) now cites UAE Federal Decree-Law No. 2 of 2019 as the primary governing standard with GDPR as secondary; removed inapplicable US HIPAA reference.  
**v1.4.2 changes:** Aligned §11 Implementation Plan to the strict 5-journey MVP scope (J1, J2, J3, J4, J8 named per phase) and added §11.1 placing all Phase 2 / Deferred journeys out of the funded build, consistent with §7.3. Standardized companion-app naming to "Support/Partner" with Partner-only feature scoping (§4.2, §5.2, FR-CP-001).  
**v1.4.3 changes:** Updated §1.2 Brand Identity to match the production website and clinic demos — single unified palette (Navy #13233C / Deep Navy #091220, Lavender #9E8CEF, Blush #FFA8A8, Ivory #FDFDFB), tonal (not chromatic) clinic-vs-patient differentiation, and correct typography (DM Sans / Manrope / Inter). Replaces the prior unbuilt dual-palette spec and Outfit/Inter reference.  

---

## 1. Executive Summary & Brand Positioning

### 1.1 The Vision
The **Ovify** platform is an AI-powered, non-medical digital health software platform for IVF clinics in the Gulf. We solve one expensive, everyday problem: patients who fall off their treatment because managing daily injections at home is confusing and stressful. 

During an IVF cycle, patients must administer self-injections at home, every day, for two to three weeks. Between clinic visits, there is no visibility into whether they are doing it correctly or at all. A single missed or mistimed dose can cancel a cycle worth 30,000 to 55,000 AED. Globally, 54% to 65% of patients drop out before completing their recommended treatment cycles. 

Ovify closes that gap with a unified, three-part AI-powered ecosystem:
*   **Patient App:** A phone-based Progressive Web App (PWA) that walks the patient through each injection, step by step, with reminders, one-tap confirmations, a CalmSeed voice-driven emotional somatic companion, and an "Ask Me Anything" AI explainer answering clinical queries instantly in Arabic or English. It installs from a web link with no app store needed.
*   **Support/Partner App:** Keeps the patient's chosen support person or partner informed with daily reminders and cycle tasks, lowering the patient's emotional and cognitive workload.
*   **Clinic Dashboard:** A priority triage console that ranks active patients by a Dynamic Patient Risk Vector, helping nurses intervene before cycle failures.

Clinics pay a flat annual platform license per site. In return, they protect cycles, cut hours of repetitive nurse follow-up, and give patients a calmer experience.

### 1.2 Brand Identity & Visual System
The Ovify brand represents **"empathy engineered."** The implemented brand (per the production website and clinic demos) uses a **single unified palette** applied across all surfaces, with tone — not a separate set of colors — distinguishing the clinical B2B context from the calming patient/supporter context. This keeps one coherent identity while still reading as professional in the dashboard and warm in the patient PWA.

*   **Core Palette (single source of truth):**
    *   **Navy** `#13233C` and **Deep Navy** `#091220` — primary brand/clinical anchor (dashboards, headers, dark sections).
    *   **Lavender** `#9E8CEF` and **Deep Lavender** `#7E6BD3` — primary accent / patient-calming tone.
    *   **Blush** `#FFA8A8` and **Deep Blush** `#E58C8C` — secondary warm accent.
    *   **Ivory** `#FDFDFB` / **White** `#FFFFFF` — backgrounds and surfaces.
    *   **Error/Alert** `#E55767` — used sparingly for urgent dashboard states only.
*   **Mode is tonal, not chromatic:**
    *   **Clinic surfaces (B2B):** Navy-led, data-dense, professional — objective, operational, focused on efficiency.
    *   **Patient & Support/Partner surfaces (B2C):** Lavender/blush-led, soft, reassuring — empathetic, clear, warm, and jargon-free.
*   **Typography (Google Fonts):**
    *   **DM Sans** — headings (`--head`).
    *   **Manrope** — body copy (`--body`).
    *   **Inter** — data, labels, and numeric/dashboard UI (`--data`).

---

## 2. Market Opportunity & Regional Analysis

### 2.1 UAE IVF Market Overview
The UAE and Saudi Arabia represent some of the highest IVF cycle volumes and out-of-pocket fertility spending in the world. 

| Metric | Value | Source |
| :--- | :--- | :--- |
| **UAE IVF Market Size (2024)** | **$270M - $310M USD** | TechSci Research, Grand View Research |
| **Projected CAGR (2024-2030)** | **5.6% - 8.5%** | Multiple market reports |
| **Average IVF Cycle Cost (UAE)** | **30,000 - 55,000 AED** | Hub71 Business Plan |
| **Active IVF Clinics in UAE** | **35 - 45 clinics** | UAE Ministry of Health & Prevention (MOHAP) |
| **Estimated Annual IVF Cycles (UAE)**| **15,000 - 20,000 cycles** | Derived from market size and cycle costs |

### 2.2 TAM / SAM / SOM (UAE & GCC Focus)
The market sizing confirms that while the UAE is highly profitable, it represents a regional entry point. Expansion across the GCC (specifically Saudi Arabia) is the path to venture-scale SaaS revenue.

**Licensing TAM (B2B SaaS core, the defensible floor):**
*   **TAM (Total Addressable Market - GCC):** **~15,000,000 AED/year**, calculated as 120-140 clinics × ~120,000 AED average annual contract value.
*   **SAM (Serviceable Available Market - UAE):** **~2,500,000 AED/year**, representing the ~25 premium and mid-tier clinics in the UAE willing to adopt digital-first infrastructure.
*   **SOM (Serviceable Obtainable Market - Year 3):** **~960,000 - 1,200,000 AED/year**, a realistic Year 3 capture of 12-15 clinics at ~80,000 AED average contract value.

#### 2.2.1 Reconciling Ambition with the Number
A ~15M AED licensing ceiling is too small for a pure venture thesis. Three levers, *each validated only after the licensing core proves out*, extend the addressable market:
*   **Patient-side revenue surface:** wellness, partner network, and financing referrals (Engine 3) attach to every active cycle, not every clinic — scaling with the ~50,000–70,000 GCC cycles/year rather than the ~140 clinics.
*   **Broader MENA, not just GCC:** Egypt, Jordan, and Levant fertility volumes materially enlarge the clinic base beyond the GCC count used above.
*   **Adjacent adherence verticals:** the same coordination/escalation engine generalises to other complex home-medication journeys (oncology orals, fertility-adjacent endocrinology).

**Bottom line for investors:** treat the ~1M AED Year-3 SOM and ~15M AED licensing TAM as the **proven floor and base case**. The venture upside is explicitly the cycle-attached and multi-geography expansion — not a re-labelling of the licensing number.

### 2.3 GCC Expansion Potential
*   **UAE (Now):** 35-45 clinics, 15k-20k cycles/year. The testbed for localized features and regulatory frameworks.
*   **Saudi Arabia (Year 3):** 50-60 clinics, 25k-35k cycles/year. Enter in Year 3, where cycle volumes and fertility spend are highest.
*   **Kuwait + Bahrain + Qatar:** 20-30 clinics, 8k-12k cycles/year. High-margin supplementary markets.
*   **Total GCC Potential:** **120-140 clinics**, representing **50,000 - 70,000 cycles annually**.

---

## 3. Problem Statement & Operational Gaps

The IVF journey today is operationally and emotionally fragmented. We identify three critical gaps that undermine clinic profitability and patient outcomes:

| Who Feels It | The Problem Today |
| :--- | :--- |
| **Patients** | Self-inject for weeks while anxious and hormone-affected, with no support between visits. Many quietly disengage. |
| **Clinics** | No visibility into home injections. A missed dose is only discovered when a cycle fails, losing the patient's money and the clinic's reputation. |
| **Nurses** | Spend up to 15 hours a week chasing logs and answering the same injection questions by phone and WhatsApp. This drives burnout and turnover. |

### 3.1 The Patient Dropout Crisis (54% - 65% Abandonment Rate)
Medical literature indicates that between 54% and 65% of patients drop out of IVF treatments before completing their recommended three cycles, even when financially covered. The primary driver of dropout is **psychological and physical burden**, not medical failure. Patients feel abandoned between clinical check-ups, leading to cycle discontinuation and directly impacting clinic patient lifetime value (LTV).

### 3.2 Medication Adherence Blindness
Stimulation protocols are highly complex, requiring daily self-injection of gonadotropins (Gonal-F, Menopur) and antagonists (Cetrotide) within tight, 15-minute timing windows. 
*   **Handwritten Protocols:** Nurses write complex schedules on paper. If the sheet is lost or misinterpreted, critical errors occur.
*   **No Verification:** Clinics have zero visibility into whether patients administer injections correctly or at all, until follicular scans reveal suboptimal response or premature ovulation, causing cycle failure.

### 3.3 Nurse Overload and Operational Chaos
Nurses spend an average of **15 hours per week** answering repetitive, non-clinical patient inquiries via phone and WhatsApp:
*   *“How do I mix Menopur?”*
*   *“I had a drop of blood after my injection, is this normal?”*
*   *“I took my injection 10 minutes late, did I ruin my cycle?”*
This administrative load leads to nurse burnout, high staff turnover, and reduced operational efficiency.

---

## 4. Target Solution: The Ovify Tri-App Architecture

Ovify delivers an integrated, synchronized three-application platform powered by a central **AI Intelligence Layer**.

```
                ┌──────────────────────────────────┐
                │        Clinic Web Portal         │
                │     (B2B Command Center)         │
                └────────────────┬─────────────────┘
                                 │
                        Protocol Push & Alerts
                                 │
                ┌────────────────┴─────────────────┐
                │       AI Intelligence Layer       │
                │ (CalmSeed, AMA, OCR, Vision)     │
                └────────────────┬─────────────────┘
                                 │
                   Personalized Sync & Prompts
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
┌────────┴─────────┐                       ┌──────────┴──────────┐
│   Patient PWA    │ ◄─── Support Prompts ──►│ Support/Partner PWA │
│  (Calming Mode)  │                         │   (Support Mode)    │
└──────────────────┘                       └─────────────────────┘
```

### 4.1 The Ovify Patient PWA
A light, fast Progressive Web App (PWA) that serves as the patient's daily companion. It converts clinical complexity into a structured daily checklist, provides voice-based emotional regulation, and offers plain-language education.

### 4.2 The Ovify Support/Partner PWA
A dedicated companion app for the patient's chosen support person or partner. It synchronizes with the patient’s active treatment cycle day, sending contextual notifications, empathy micro-prompts, and logistics alerts without disclosing sensitive medical charts. Partner-specific features (e.g., billing, semen-timing) are conditionally enabled only when the supporter is the patient's spouse/partner.

### 4.3 The Clinic Admin Web Portal
A clinical command center that replaces paper-based protocol distribution. It allows nurses to register a patient in about 90 seconds, select pre-saved protocol templates, send real-time adjustments, and monitor patient compliance, distress patterns, and missed doses.

### 4.4 The AI Intelligence Layer
*   **AI Onboarding Engine:** Allows nurses to dictate or paste medication protocols, automatically parsing text or audio to construct structured patient timelines.
*   **Ask Me Anything AI:** A Retrieval-Augmented Generation (RAG) LLM chatbot trained on embryology and clinical guidelines, answering patient questions 24/7 in English and Arabic with strict clinical guardrails and EMR context-awareness.
*   **CalmSeed AI:** A voice-driven emotional and somatic companion. Patients record a voice entry; the AI reads vocal intonation, intent, and language to dynamically suggest box breathing, safe movements, journaling, or phone call support.
    *   *Safety Guardrail:* Implements strict cycle-stage safety locks. In late-stimulation (Stimulation Day 7+ through Retrieval Day + 3), it programmatically disables abdominal twist, bend, or high-impact physical recommendations to **reduce activity that is contraindicated during ovarian enlargement, per clinical guidance**.
    *   *Patient Communication Directive:* Patient-facing copy during safety lockouts must utilize gentle, reassuring phrasing (e.g., *"As your follicles grow, we adapt your exercises to focus on resting your pelvic area. Today, we suggest box breathing and neck releases."*) and strictly avoid alarmist medical terms such as "ovarian torsion" or "clinical complications" to prevent patient panic.
*   **Edge Computer Vision Guide:** Verifies syringe preparation and pen dialing from photos before injection.
*   **Dynamic Patient Risk Vector & Supervised Adherence Model:** A classification model that learns logging latencies to predict dropouts 48 hours in advance, while Natural Language Processing (NLP) screens logs for psychological distress.

---

## 5. Functional Requirements

### 5.1 Patient PWA Requirements
*   **FR-PA-001: Mobile-First PWA:** Must load in under 2 seconds on low-bandwidth connections, requiring no App Store download.
*   **FR-PA-002: Daily Timeline & Checklists:** Dynamically display medications, doses, timing windows, scan appointments, and companion tasks (e.g., hydration, supplements).
*   **FR-PA-003: Medication Video Guides:** Render high-definition, step-by-step videos for drug mixing (e.g., Menopur, Merional) and pen dialing (e.g., Gonal-F, Rekvelle).
*   **FR-PA-004: Ask Me Anything AI Chatbot:** RAG-grounded conversational interface explaining medical terms, protocols, and symptoms in Arabic/English. Must be integrated with active EMR schedules to resolve specific dosing timing queries.
    *   *Graceful Degradation:* If B2B EMR integration is absent (e.g., Starter-tier clinics running standalone), the chatbot must fallback to parsing the local PWA database schedule, and explicitly output a warning: *"I do not have access to your active clinic chart. Please refer to your timeline check-ins."*
*   **FR-PA-005: CalmSeed Voice Check-In:** Record voice entries. The system reads tone, prosody, and intent to provide personalized mindfulness, breathing, or physical exercises.
    *   *Safety Constraints:* Cross-checks active cycle status. During late-stimulation, restricts somatic exercises to zero-twist, low-impact breathing and meditations.
    *   *Reassuring UX Copy:* Any safe-mode message must avoid the term "ovarian torsion," phrasing the restriction as a supportive, phase-specific focus on pelvic area rest.
*   **FR-PA-006: Edge Computer Vision Verification:** Camera integration to capture a photo of a dialed injection pen or filled syringe, validating volume/units locally on the device before administration.
*   **FR-PA-007: Two-Week Wait (TWW) Daily Symptom Log:** Track daily physical inputs (spotting, cramps, nausea, temperature) and provide medical-disclaimer-compliant triage recommendations.
*   **FR-PA-008: Lab Results Visualizer:** Render embryology reports (egg count, fertilization, embryo grades) using simple, supportive visual metaphors and emotional containment guidelines.

### 5.2 Support/Partner PWA Requirements
*Role scoping:* The app supports two supporter types — a general **Support** person (e.g., family member, friend) and a **Partner** (spouse). Features marked **(Partner-only)** are conditionally enabled based on the supporter type selected at onboarding and must not surface for a general Support person.
*   **FR-PR-001: Shared Cycle Calendar:** Synchronized calendar showing injection dates, scan dates, and egg collection schedules.
*   **FR-PR-002: Dynamic Empathy Prompts:** Send daily notifications suggesting supportive actions (e.g., *“Sarah has a Gonal-F injection at 7 PM. Prepare a quiet space and get a cold compress.”*).
*   **FR-PR-003: Trigger & Semen Timing Alerts (Partner-only):** Highly synchronized alerts for the partner's required abstinence window and exact drop-off/ejaculation times. Surfaced only when the supporter type is "Partner".
*   **FR-PR-004: Financial & Billing Gateway (Partner-only):** Integration with clinic billing to receive invoice links, authorize deposits, and view payment installments. Surfaced only when the supporter type is "Partner".
*   **FR-PR-005: Support/Partner AI Coach:** Conversational chat interface helping the supporter navigate relational friction and patient mood swings during hormone peaks.

### 5.3 Clinic Web Portal Requirements
*   **FR-CP-001: Patient Onboarding & Registration (90 Seconds):** Core intake form to register patient name, phone, language preference, cycle type (Fresh, FET, IUI, Egg Freezing), and support/partner contact (with supporter type: Support or Partner).
*   **FR-CP-002: AI Onboarding Parser:** Text/audio ingestion box allowing nurses to paste or dictate protocols, converting them into digital calendars automatically.
*   **FR-CP-003: Protocol Template Engine:** Pre-saved protocol templates (e.g., Short Antagonist, Long Agonist, Natural FET) to allow protocol assignment in under 60 seconds.
*   **FR-CP-004: Real-Time Patient Monitoring Dashboard (Priority Triage Console):**
    *   Ranks active patients by the Dynamic Patient Risk Vector.
    *   **Green:** Confirmed on time.
    *   **Amber:** Overdue (15-60 minutes).
    *   **Red:** Missed Dose Alert (60+ minutes past window).
*   **FR-CP-005: Patient Detail View:** View historic compliance, reported moods, parsed questions, and clinical measurements (follicle logs, lining thickness).
*   **FR-CP-006: Patient Stress Alert System:** Flag patients experiencing prolonged high stress or expressing intent to discontinue treatment based on NLP log screening.

---

## 6. Non-Functional Requirements

### 6.1 Performance & Scalability
*   **NFR-PER-001:** API response times must be `< 200ms` for 95% of standard requests.
*   **NFR-PER-002:** The RAG AI engine must return answers to patient queries in `< 4 seconds`.
*   **NFR-SCA-001:** System architecture must support up to 50,000 concurrent active cycles without performance degradation.

### 6.2 Security & Data Privacy
*   **NFR-SEC-001: End-to-End Encryption:** All data must be encrypted in transit using TLS 1.3 and at rest using AES-256.
*   **NFR-SEC-002: Regulatory Compliance:** The database architecture must comply, as the primary and governing standard, with **UAE Federal Decree-Law No. 2 of 2019 (Health Data Law)** and applicable DHA/MOHAP data requirements (see §7.2), including in-region data residency. GDPR is observed as a secondary best-practice alignment for future MENA/EU expansion. (HIPAA, a US-specific standard, is not applicable in this market and is no longer cited.)
*   **NFR-SEC-003: Multi-Factor Authentication (MFA):** Clinic dashboard users must authenticate using MFA (SMS or Authenticator App).

### 6.3 UX Aesthetics & Accessibility
*   **NFR-UX-001: WCAG 2.1 AA Compliant:** Accessible contrast ratios, support for screen readers, and text scalability.
*   **NFR-UX-002: Glassmorphism and Micro-Animations:** Patient PWA must implement a premium aesthetic using soft frosted glass containers, smooth page transitions, and positive micro-animations to create a high-fidelity, calming interface.

---

## 7. Regulatory Strategy & Legal Compliance

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REGULATORY BOUNDARY STRATEGY                    │
├───────────────────────────────────────┬────────────────────────────────┤
│ 🟢 Out of Scope (Adherence/Support)    │ 🔴 In Scope (Clinical/Medical) │
├───────────────────────────────────────┼────────────────────────────────┤
│ • Reminders & calendars               │ • Diagnostics of conditions    │
│ • RAG Q&A (Approved Guideline-based)  │ • Direct dosage modification   │
│ • Somatic breathing & mood tracking   │ • Replacing physician consults │
│ • General nutrition & yoga guides     │ • Autonomous clinical triage   │
└───────────────────────────────────────┴────────────────────────────────┘
```

### 7.1 Avoidance of Software as a Medical Device (SaMD)
To prevent lengthy clinical trials and regulatory approval delays (which can exceed 18-24 months), Ovify is strictly classified as a **Digital Health Adherence and Coordination Platform**.
*   **No Autonomous Diagnosis:** The AI will not diagnose clinical conditions (e.g., ovarian hyperstimulation, clinical depression).
*   **No Protocol Alteration:** The platform cannot alter medication dosages or timing autonomously. All adjustments must be entered by the clinic nurse/doctor.
*   **Clinical Guardrails:** Every response generated by the Ask Me Anything AI RAG LLM includes a prominent, legally reviewed clinical disclaimer.

### 7.2 Middle East & UAE Compliance (Health Data Law)
*   **UAE Federal Decree-Law No. 2 of 2019 (Health Data Law):** All patient-identifiable healthcare data must be stored and processed within servers hosted inside the UAE (e.g., Azure UAE North or AWS UAE Region). No raw health data may be exported outside the UAE without prior approval from MOHAP.
*   **DHA (Dubai Health Authority) & MOHAP Guidelines:** Patient consent must be obtained digitally during onboarding, explicitly stating how data is processed, stored, and shared with the registered clinic.

### 7.3 Regulatory Scope Map (Per-Journey SaMD Classification)
This table is the single source of truth for what Ovify may ship as non-regulated adherence/coordination software versus what requires a medical-device pathway.

| # | Journey | Classification | Rationale | Phase |
| :-- | :--- | :--- | :--- | :--- |
| 1 | Clinic Patient Registration (AI parse) | 🟢 Non-SaMD | Transcription/data-entry only; nurse verifies every parsed item before save. Parser errors are surfaced, not acted on autonomously. | MVP |
| 2 | Patient Onboarding & Personalization | 🟢 Non-SaMD | Account setup, OTP, preference capture. No clinical function. | MVP |
| 3 | Daily Injection Flow & Confirmation | 🟢 Non-SaMD | Reminders, education videos, one-tap logging. No dose calculation. | MVP |
| 4 | Missed-Dose Multi-Level Escalation | 🟢 Non-SaMD | Workflow/alerting based on a missed confirmation timestamp. No clinical interpretation. | MVP |
| 8 | Clinic Dashboard & Triage Console | 🟢 Non-SaMD | Displays adherence/logging status and ranks workload. Informs the nurse; does not direct care. Risk-vector ranking must remain non-prescriptive. | MVP |
| 12 | Failed-Cycle Recovery Mode | 🟢 Non-SaMD | UI state change + content unlock + scheduling, triggered by a clinic-entered result. No autonomous clinical action. | MVP |
| 7 | Support/Partner Daily Support & Prompts | 🟡 SaMD-candidate | Not a device function, but shares patient mood/health data with a third party — gated on granular, revocable consent under Health Data Law before release. | MVP (consent-gated) |
| 5 | Ask Me Anything AI (RAG) | 🟡 SaMD-candidate | Educational Q&A is non-SaMD, but EMR-context-aware answers about a patient's own schedule drift toward advice. Ships only with hard dosage/diagnosis guardrails, mandatory disclaimer, and logged refusal/EMR-fallback paths. | MVP (guardrailed) |
| 6 | CalmSeed Voice Somatic Companion | 🟡 SaMD-candidate | Vocal stress inference + a phase-based safety lock that makes a complication-prevention (ovarian torsion) claim. Reframe as generic phase-restricted wellness content; substantiate or remove the torsion claim. Stress scoring deferred to Phase 2. | Phase 2 |
| 9 | Edge Computer-Vision Dose Verification | 🔴 Deferred (SaMD) | "Verify your dose is correct before injecting" is medication-error prevention — a device function with direct harm potential on failure. Requires validation + device pathway. | Deferred |
| 10 | TWW Symptom Triage (OHSS/Ectopic) | 🔴 Deferred (SaMD) | Outputs a named probable condition with a clinical risk level — this is diagnosis. Requires device pathway. MVP may log symptoms for the clinic *without* classification. | Deferred (logging-only in MVP) |
| 11 | AI Protocol/Dose Recommendation | 🔴 Deferred (SaMD) | Recommending a starting gonadotropin dose is clinical decision support (Class II). "Doctor approves" does not exempt it. Template *selection* without dosing may ship; dose suggestion is deferred. | Deferred (template-only in MVP) |

**Net MVP scope (fundable on the 500K AED raise):** The strict build-now MVP is **5 journeys — 1, 2, 3, 4, 8** (registration, onboarding, injection confirmation, missed-dose escalation, clinic dashboard). All five are 🟢 Non-SaMD and directly serve the nurse-time and dropout KPIs.

---

## 8. Business Model & Commercialization

Ovify utilizes a multi-segment business model combining B2B SaaS licensing with transactional partnership fees, matching the **Hub71 Business Plan**.

### 8.1 Commercialization Engines
1.  **Engine 1: Annual Platform License (Our Core):**
    Charged to clinics as a flat annual platform license per site, billed upfront, plus a one-time implementation fee at go-live.
    
    | Plan | Annual License | Cycle Band | Cost per Cycle | Setup Fee | Target Audience |
    | :--- | :--- | :--- | :--- | :--- | :--- |
    | **Pilot** | Free (6 months) | Up to 100 | Free | Waived | First 3 clinics, for testimonials |
    | **Starter** | **55,000 AED** | Up to 150 | ~370 AED | **9,000 AED** | Boutique single-site clinics |
    | **Growth** | **99,000 AED** | Up to 500 | ~198 AED | **18,000 AED** | Mid-size fertility centres |
    | **Scale** | **249,000 AED / site**| 500+ | ~166 - 249 AED| **35,000 AED** | Hospital groups and chains |

    *Note: Connecting to Malaffi or a hospital's EMR is quoted per project, typically starting from **25,000 AED**.*

2.  **Engine 2: Co-Branded Cycle Bundle (Optional - Year 2):**
    Folds Ovify into standard cycle packages:
    *   Clinic adds a **350 AED** care-support fee to the cycle invoice (under 1% of a 35k bill).
    *   Clinic pays Ovify **150 AED** per cycle and keeps 200 AED as its own margin, turning our platform into a profit center for them.
    *   *This remains disabled in projections until validated during the pilots.*

3.  **Engine 3: Wellness & Partner Network (from Year 2):**
    *   *Wellness sessions:* Margin on fertility-friendly yoga and relaxation sessions booked via partners.
    *   *Specialist listings:* Annual listing fee from vetted nutritionists and psychologists.
    *   *Financing referrals:* Referral fee for each funded IVF loan via financing partners.
    *   *Revenue size:* Conservatively projected at **50,000 AED** in Year 2, and **150,000 AED** in Year 3.

### 8.2 Clinic ROI Calculator
We present ROI in two layers. The **case a CFO can sign off on rests on hard, recurring savings only.**

**Layer 1 — Hard Savings (the payback case), mid-sized clinic, 500 cycles/year:**
*   **Nurse Time Recovered:** ~8–12 hours/week of repetitive WhatsApp/phone follow-up deflected. At a loaded coordinator cost, this is **~70,000–90,000 AED/year** of recoverable capacity.
*   **Transcription-error rework avoided:** Fewer paper-protocol corrections and re-issued schedules. Modest but real: **~10,000–15,000 AED/year**.
*   **Hard-savings total:** **~80,000–105,000 AED/year** vs. the Growth License at **99,000 AED**.
*   **Payback on hard savings alone: roughly 1.0–1.3x (break-even to slightly positive).**

---

## 9. Success Metrics & Key Performance Indicators (KPIs)

All targets are expressed as **improvement deltas measured against each pilot clinic's own baseline**, captured during the first 4 weeks of deployment.

### 9.1 Patient KPIs
*   **Medication Adherence Lift:** Target **+15 to +25 percentage points** of injections logged within the correct timing window vs. pre-Ovify baseline.
*   **Onboarding Activation Rate:** Target **≥ 80%** of invited patients completing setup within 72 hours.
*   **Patient Satisfaction (CSAT / NPS):** Track and trend; directional target **NPS ≥ 40**.

### 9.2 Clinic KPIs
*   **Nurse Messaging Reduction:** Target **40–55% decrease** in non-urgent administrative messages/calls vs. baseline.
*   **Protocol Transcription Errors:** Target **measurable reduction vs. the paper-based baseline**, tracked via nurse-flagged corrections.
*   **Cycle Cancellation Reduction:** Target **reduction in cancellations attributable to non-compliance or dropout** vs. baseline.

---

## 10. Financial Projections & Funding Requirements

### 10.1 Three-Year Financial Projections (AED)
These projections are built bottom-up from conservative clinic counts, not optimistic growth curves.

| Metric | Year 1 | Year 2 | Year 3 |
| :--- | :--- | :--- | :--- |
| **Paying Clinics** | 2 | 6 | 13 |
| **Cycles Processed** | 400 | 2,200 | 5,500 |
| **Total Revenue** | **131,500 AED** | **885,000 AED** | **2,318,500 AED** |
| **Operating Costs** | **511,500 AED** | **809,600 AED** | **1,200,100 AED** |
| **Net Profit / (Loss)** | **(380,000) AED** | **+75,400 AED** | **+1,118,400 AED** |
| **Cumulative Position** | **(380,000) AED** | **(304,600) AED** | **+813,800 AED** |

### 10.2 The Ask (Funding Needs)
We are raising **500,000 AED** (USD 136,000) to carry the company through the build-and-pilot year to profitability, covering the Year 1 net cash need of approx. 380,000 AED and providing a buffer for Year 2.

| Category | Amount (AED) | What It Covers |
| :--- | :--- | :--- |
| **Product Build (Engineering & Design)** | **205,000 AED** | Two offshore developers and one UI/UX designer building the MVP, alongside the technical founder |
| **Founder Runway** | **100,000 AED** | Founder salary across the build-and-pilot year (reduced via Hub71 housing support) |
| **Cloud, Messaging & AI Services** | **35,000 AED** | Hosting, SMS, WhatsApp (authentication and template fees), and RAG AI services. Includes active SMS fallback configurations to manage UAE/KSA telco tariff fluctuations. |
| **Legal, Licensing & Compliance** | **45,000 AED** | Company setup, DoH-aligned data approvals, and a security review |
| **Pilots & Go-To-Market** | **40,000 AED** | Clinic onboarding, training, travel, and early brand presence |
| **Contingency & Year 2 Bridge** | **75,000 AED** | 15% buffer for slippage, plus runway until the first annual fees are collected |
| **Total** | **500,000 AED** | Funds the MVP, the three Abu Dhabi pilots, and the bridge to first paid revenue |

---

## 11. Project Implementation Plan & Milestones

The product development roadmap is structured across four key phases over 12 months. **MVP scope is strictly the 5 Non-SaMD journeys defined in §7.3 (Journeys 1, 2, 3, 4, 8); all other journeys are explicitly Phase 2 / Deferred and are out of scope for the funded build.**

*   **Months 0 - 4: Build the 5-Journey MVP:** The complete, demoable, sellable Non-SaMD core:
    *   **J1 — Clinic Patient Registration** (90-second intake + nurse-verified protocol parsing).
    *   **J2 — Patient Onboarding** (PWA install via web link, OTP, reminder personalization).
    *   **J3 — Daily Injection Flow & Confirmation** (timeline, video guides, one-tap confirm).
    *   **J4 — Missed-Dose Multi-Level Escalation** (T+30/T+60/T+120 alerts — the hero feature).
    *   **J8 — Clinic Dashboard & Triage Console** (priority triage, non-prescriptive ranking).
*   **Months 4 - 6: First Live Pilots:** Deploy the 5-journey MVP free with the first three Abu Dhabi clinics; capture each clinic's baseline (per §9) before activation and gather real adherence data.
*   **Months 7 - 9: Prove the Value:** Measure nurse hours saved, doses confirmed, and dropouts prevented as deltas against the signed baselines.
*   **Months 10 - 12: Convert to Paid:** Turn proven pilots into paying annual contracts.

### 11.1 Phase 2 & Deferred Scope (Post-MVP, Not in the Funded Build)
Sequenced only after the MVP proves out and the relevant gating (per §7.3) is cleared:
*   **Near-term Phase 2 (non-device):** J12 Recovery Mode (design/prioritisation), J5 Ask Me Anything (dosage/diagnosis guardrails + legal sign-off), J7 Support/Partner daily support (Health Data Law consent model).
*   **Phase 2 (SaMD-candidate):** J6 CalmSeed — pending substantiation/removal of the safety claim and validation of stress scoring.
*   **Deferred (SaMD — require MOHAP/DHA device pathway + clinical validation):** J9 CV Dose Verification, J10 TWW Triage (symptom *logging without classification* may ship earlier), J11 AI Protocol/Dose Recommendation (template *selection without dosing* may ship earlier).

---

## 12. Conclusion
The Ovify platform addresses critical, unmet operational and emotional gaps in the GCC fertility sector. By delivering a structured, tri-app software platform backed by a solid SaaS business model and realistic pricing aligned with clinic budgets, Ovify is positioned to scale profitably across the GCC starting from Abu Dhabi. This BRD establishes a clear, compliant, and highly profitable product blueprint that matches our Hub71 application.
