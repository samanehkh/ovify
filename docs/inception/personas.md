# Ovify — Personas

Personas define **who** each user story serves. Every user story references a
persona by ID. A persona is only useful if it changes a design decision — so
each one carries an explicit **Design implications** section that the UI agent
(and human reviewers) must honour.

> **Status:** P1 (Patient) locked 2026-07-09. P3 (Nurse/Coordinator) and
> P4 (Partner/Supporter) pending — drafted but not yet challenged/locked.
>
> **Scope note:** MVP is **English-only** for persona/story work. The codebase
> already carries EN/AR (RTL) i18n scaffolding; broader language support is a
> parked expansion, not an MVP persona concern.

---

## P1 — Sarah · The Patient

**One line:** An IVF patient managing a daily, high-stakes injection protocol on
her phone, mostly alone, mostly at night, mostly anxious.

### Who
- 34, undergoing IVF ovarian stimulation. Lives in Dubai, works full-time.
- **Primary device:** her own phone; installs the PWA to her home screen.
- **Language:** English (MVP scope).

### Context of use
- Short sessions, **at night, tired, often in bed** — frequently right before or
  after a self-injection she is nervous about.
- Occasionally **panic-logging** a late or forgotten dose (e.g. 12:30 AM),
  where her cognitive capacity is at its lowest.

### Emotional state
- Hopeful but frightened. Every symptom feels like a signal.
- Afraid of "doing it wrong" and ruining the cycle.
- Reluctant to contact the clinic — does not want to be "a burden."

### Goals
- Know exactly what to do today, confirm she did it, feel she's on track.
- Reach a human quickly and without shame when something feels wrong.
- Get her many questions answered from a source she trusts — and feel sure she is
  preparing and administering the injection correctly.

### Fears
- Missing or mistiming a dose; injecting the wrong amount.
- **Preparing/mixing the medication wrong** (e.g. Menopur reconstitution — powder +
  solvent — vs. a ready-to-use pen).
- Being alone with a frightening symptom at 2 AM.
- Being "a pest" to the nursing team.
- Acting on **bad information from forums / Google** searched in a panic.

### Information & verification behaviour
- **Curious and question-driven.** She wants to understand *why* — why this dose,
  what's normal, what happens next. She does not just want instructions; she wants
  reasons.
- **She searches.** When the app does not answer, she Googles and reads IVF forums —
  which amplifies anxiety and risks misinformation, usually late at night.
- **She wants to verify her technique** — "am I dialling the right dose? did I mix
  this correctly?" — and looks for confirmation she got it right.
- **Design consequence:** be her **trusted first source** so she never needs the
  forum (anticipate the common questions inline). Support verification by **showing
  clear reference of what correct looks like** and letting her compare — but see the
  SaMD boundary in _Design implications_ #8: the app must never *certify* correctness.

### "Done" feels like
- "✓ logged, my clinic can see it, I did it right today."

---

### Two independent axes (do not conflate them)

Sarah varies along **two separate axes**. The original design mistake was letting
one toggle drive both. They must never cross.

#### Axis A — Injection competence → drives GUIDE DENSITY only
- Measures **only**: "can she physically prepare and administer the injection?"
- Source: the `injection_comfort` onboarding answer (`"First time"` / `"Experienced"`).
- **This is a competence signal, NOT an emotional one.** An injection-expert nurse
  doing her own IVF is "Experienced" here and may still be emotionally fragile.
- Design effect:
  - **Guided (default):** full step-by-step video + expanded prep checklist.
  - **Streamlined ("Experienced"):** collapsed video, condensed checklist.
  - It changes **how much guidance** is shown — nothing about tone.

#### Axis B — Emotional / cycle history → drives TONE
- Would be sourced from cycle history the clinic knows (cycle number, prior
  outcome): fresh hopeful start · re-attempt after a loss · routine repeat.
- **⚠️ Parked (known limitation):** we do **not** capture this today. The only
  signal we have is `cycle_outcome = "Failed"` (binary, after the fact, drives
  Recovery Mode). Until Axis B data exists, **tone is uniform for all patient
  states** per the invariant below. See _Known limitations_.

---

### Tone invariant (applies to ALL patient states)

> **Never cheerlead. Never promise outcomes. Calibrate warmth, never hope.**

- Forbidden: "You've got this!", "Day 5 of your miracle journey!", "your baby",
  any outcome-promising or relentlessly upbeat framing. This alienates hopeful
  first-timers and can actively re-traumatise anyone carrying a prior loss.
- Required: calm, warm, factual, non-promissory. Acknowledge effort and presence
  ("You're doing hard work today"), never predicted success.
- This is a **constitution guardrail** (see `docs/constitution.md` §7) so every
  agent inherits it.

---

### Safety-escalation behaviour (the burden-vs-danger conflict)

Sarah's default when she has a worrying symptom is **silence** — fear of being a
burden beats fear of the symptom. In IVF this is dangerous (e.g. OHSS: severe
bloating, rapid weight gain, breathlessness). The design must actively counteract
her default **without becoming a medical device.**

**Resolution (SaMD-safe):**
- **Do NOT classify symptoms.** Ovify is deliberately non-SaMD (BRD §7.3, J10 deferred).
- **Demolish the social cost of reaching a human.** Make "tell my clinic something
  feels off" frictionless, expected, no-justification-needed, and framed as the
  *good-patient* action, not pestering ("You will never be a bother — that's what
  we're here for"). Reuses the persisted nurse-callback primitive (D3).
- **General, clinic-approved, non-diagnostic safety-net copy is allowed** — it is
  education, not classification ("Severe bloating, sudden weight gain, or trouble
  breathing → call your clinic now").
- **No self-assessment / symptom checkers.** A checklist implying "these = worry"
  slides toward SaMD *and* risks false reassurance — she ticks boxes, infers she's
  fine, doesn't call, deteriorates. **The app must never be the thing that decides
  she is okay.**

---

### Design implications (consolidated — what the UI agent must honour)
1. **Calm over dense.** One clear action at a time; large tap targets for tired hands.
2. **Truthful status always.** Never fabricate reassuring data (no fake "Day 5 of
   12"); "Sync Pending" must read as pending, never as done.
3. **Guide density follows Axis A only** (Guided default → Streamlined for competent).
4. **Tone follows the invariant** — warm, never cheerleading, never outcome-promising.
5. **Frictionless human contact** as a standing affordance; contacting the clinic is
   never framed as a bother.
6. **Non-diagnostic safety education only; no self-assessment.**
7. **Accessibility is non-negotiable** (this persona reads low-contrast text badly at
   night): WCAG AA contrast, keyboard-reachable, `aria-label`s (no bare emoji as the
   only signal), `prefers-reduced-motion`.
8. **Answer her questions inline; be the trusted first source.** Anticipate the common
   "why / what's normal / how do I mix this" questions so she never needs a forum.
   Interim form is a **curated, clinic-approved FAQ** — not a free chatbot (free Q&A =
   Journey 5 "Ask Me Anything", deferred SaMD-candidate).
9. **Support self-verification, never certify it.** Show clear reference of what
   correct looks like (correct dial reading, correctly-reconstituted vial) and let her
   compare. The app must **never** issue a "you did it right ✓" verdict — automated
   dose/technique verification is Journey 9 (CV), a deferred medical-device function.
   Same invariant as safety escalation: *the app never decides she is okay.*
10. **Preparation depth is drug-specific.** Drugs needing reconstitution/mixing
    (e.g. Menopur) get explicit mixing steps; ready-to-use pens (e.g. Gonal-F) do not.
    This is orthogonal to Axis A density.

### Known limitations (parked, deliberate)
- **Axis B tone data not captured.** Clinic does not pass cycle-number / prior
  outcome, so in-cycle tone cannot adapt to emotional history. MVP holds tone
  uniform (warm-non-promissory) for all non-Recovery states. Revisit if/when the
  clinic registration passes cycle history. _Tracked as an open item in
  `docs/process/state.md`._
- **English-only** for MVP persona/story scope (EN/AR scaffolding exists in code).
- **Her curiosity outruns MVP scope.** Free-form Q&A (Journey 5, AMA) and automated
  technique/dose verification (Journey 9, CV) are both deferred (SaMD-gated). MVP
  serves her curiosity with a curated FAQ + reference imagery only. Until then, some
  questions will send her off-app — a known retention/safety gap.

---

## P3 — Mona · The Clinic Nurse / Coordinator

**One line:** A busy, highly-interrupted clinic nurse managing 30–50 active patient cycles, using a clinic-provided tablet to register patients, review daily alerts on rounds, and coordinate care.

### Who
- 38 years old, IVF Coordinator at a clinic in Dubai.
- **Primary device:** Clinic-provided **Tablet** (e.g., iPad, used in-hand during patient consultations, on desk, or carried during clinic rounds).
- **Environment:** Fast-paced, high mobility. Frequently walking between reception, consultation rooms, and the recovery ward.
- **Language:** English (MVP scope).

### Context of use
- **On-the-go registration:** Setting up a patient's profile directly on the tablet while sitting next to the patient during their exit consultation.
- **Triage on rounds:** Reviewing patient alert lists while walking through the ward or discussing patient statuses with doctors.

### Emotional state
- Overworked and protective of her patients.
- Constantly fighting "cognitive overload" from tracking multiple schedules.
- Feels the weight of responsibility — she knows one patient mistake can cancel a cycle.

### Goals
- Register a patient and set up their medications in under 60 seconds using only touch controls.
- Clearly see red alerts (missed doses) and tap to call or resolve them while on the move.
- Show the patient the screen to confirm their details before finalizing registration.

### Fears
- Dropping the tablet or fat-fingering input fields (e.g., entering the wrong dosage due to small touch targets).
- Losing internet connection while walking between clinic rooms.
- Clunky virtual keyboard overlays blocking half the screen during data entry.

### "Done" feels like
- "✓ Patient registered, protocol saved, SMS invitation sent to patient's phone."

---

### Design implications (consolidated — B2B Tablet Surface)
1. **Touch-Optimized Targets:** Dropdowns, date selectors, and buttons must be large (minimum 48x48px tap target) to prevent fat-finger entry errors.
2. **Smart Form Layouts:** Position forms so the virtual screen keyboard does not cover active input fields or the primary action buttons when it pops up.
3. **Landscape & Portrait Support:** The interface must transition gracefully between landscape (table-friendly overview) and portrait (easy to hold in one hand during rounds).
4. **Audit Logs:** Track and log the specific nurse credentials active on the shared tablet session for every transaction.
5. **Formulary Validation:** Use search-as-you-type dropdowns for medications to prevent typos or unapproved drug entry.

---

## P4 — Partner / Supporter *(pending — not yet challenged)*
_Drafted in discussion; to be locked in a later pass._
