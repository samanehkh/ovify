# US-J3-02: View injection guide

| Field | Value |
|---|---|
| **Journey** | J3 — Daily Injection Flow & Confirmation |
| **Persona(s)** | P1 Sarah (primary) |
| **Primary intent** | Learn / re-check *how* to prepare and give today's injection. |
| **Scope** | ✅ MVP · SaMD: 🟢 Non-SaMD |
| **Status** | 🚧 Draft — awaiting challenge |
| **Last updated** | 2026-07-09 |

## 1. User story
> As **Sarah (a patient)**, I want to **watch how to prepare and give my injection, at
> the level of detail I need**, so that **I feel confident I'm doing it right — without
> having to search forums.**

## 2. Context & entry
- **Entry point:** the "Watch how to inject" link on the Confirm screen (US-J3-01);
  possibly also from the dashboard card.
- **Preconditions:** authenticated patient; a specific medication is in context.
- **Exit:** returns to the Confirm screen (she has NOT confirmed anything by viewing).

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: First-time patient sees the full guide
  Given Sarah's injection_comfort is "First time"
  When she opens the guide for Gonal-F
  Then she sees the video and the full expanded step-by-step preparation steps

Scenario: Experienced patient sees the condensed guide
  Given injection_comfort is "Experienced"
  When she opens the guide
  Then the video is collapsed and the steps are condensed to a short checklist

Scenario: Medication that requires mixing
  Given the medication is Menopur (needs reconstitution)
  When she opens the guide
  Then the preparation steps include the mixing / reconstitution steps

Scenario: Ready-to-use pen
  Given the medication is Gonal-F (pen, no mixing)
  When she opens the guide
  Then no mixing steps are shown
```

## 4. Screen states
| State | Trigger | What the user sees |
|---|---|---|
| **guided (default)** | `injection_comfort == "First time"` | medication image, **video** (or poster placeholder), full expanded prep steps |
| **streamlined** | `injection_comfort == "Experienced"` | collapsed video, condensed checklist |
| **mixing-required** | drug needs reconstitution (Menopur) | prep steps include mixing/reconstitution |
| **no-mixing** | ready-to-use pen (Gonal-F) | mixing steps omitted |
| **video unavailable** | no video asset (MVP) | poster image + text steps only; no broken player |

## 5. Data contract
- **Reads the in-context medication** (name → determines drug-specific steps + image).
  No write. No dedicated endpoint in MVP (guide content is static/derived).
- ⚠️ **Open:** is guide content hardcoded per drug in the frontend, or served from a
  clinic-approved content source? (See §13 Q1.)

## 6. Field-level detail
| Field | Kind | Type / format | Required | Validation | Empty / fallback |
|---|---|---|---|---|---|
| medication image | display | image | — | — | generic injection image if unknown drug |
| video | display | video (placeholder MVP) | — | — | poster image; never a broken player |
| prep steps | display | ordered list; **drug-specific** | — | — | generic steps if drug unknown |
| density | derived | `injection_comfort` | — | — | default to "First time" (fuller) if unset |

## 7. Components
- Reuse: back/nav control, collapsible section, image.
- **New/needs spec:** real video player (today poster + placeholder) — content out of scope.

## 8. Design tokens & layout
- Inherits constitution §5. Phone frame, single-column, scrollable.

## 9. Copy (EN) — must obey constitution §7
| Key | String |
|---|---|
| title | "How to prepare and inject" |
| video_cta | "Watch the preparation video" |
| steps_header | "Preparation steps" |
| _(drug-specific step copy — TBD with clinical input)_ | … |

_Tone: instructional, calm, factual. **Non-diagnostic, no verification** — the guide
teaches; it never asserts she performed it correctly (P1 #9, constitution §7.3)._

## 10. Interaction & motion
- Collapsible video/steps honour `prefers-reduced-motion`. Viewing never mutates state.

## 11. Accessibility & Definition of Done
- [ ] WCAG AA · [ ] keyboard reachable · [ ] captions/transcript for the video (a11y) ·
  [ ] `prefers-reduced-motion` · [ ] strings externalized
- [ ] Density branches on Axis A only (never tone) · [ ] AC pass; tests ref `US-J3-02`

## 12. Out of scope / non-goals
- **No verification** that she injected correctly (J9 CV, deferred SaMD).
- Video content production; free-form Q&A (J5 AMA, deferred).
- Confirming the dose (US-J3-01).

## 13. Open questions
```
Q1. Guide content source: hardcoded per drug in the frontend (fast, but not clinically
    governed) vs. a clinic-approved content store (governed, but needs a content model)?
[Answer]:

Q2. Video: ship MVP with poster-only placeholder and text steps, or block this story
    until real clinical video exists?
[Answer]:

Q3. Do we need captions/transcript at MVP for accessibility, or is that a fast-follow?
[Answer]:
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J3 (Scenario 6, step-by-step guide)
- **As-built:** `docs/construction/as-built/Journey_3_Medication_Adherence.md`
- **Frontend:** `frontend/src/pages/MedicationLogPage.tsx` (guide portion)
- **Persona:** P1 #8 (trusted source), #9 (no certification), #10 (drug-specific depth)
- **Related:** US-J3-01 (confirm)
