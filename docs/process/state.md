# Ovify — Project State

> Live, human-maintained state of the build and the AI-DLC-style documentation
> process. Update this when a phase or major artifact changes. Replaces the
> retired `.spec-kit/state/sdlc_state.json` (which held stale period-tracker data).

_Last updated: 2026-07-09_

## Product

- **Name:** Ovify — IVF stimulation companion (tri-app: Patient PWA, Clinician Console, Partner App)
- **Stack:** React + Vite PWA · FastAPI · SQLite (local) / Azure PostgreSQL (target)
- **MVP journeys:** J1 Registration · J2 Onboarding · J3 Daily Injection · J4 Missed-Dose Escalation · J8 Triage · J12 Recovery Mode
- **Roadmap (not built):** J5 AMA AI · J6 CalmSeed · J7 Partner daily support · J9 CV dose check · J10 TWW triage · J11 Protocol auto-select

## Documentation phase status

| Artifact | Location | Status |
|---|---|---|
| Constitution (agent guardrails) | `docs/constitution.md` | ✅ Current |
| Business case (BRD) | `docs/inception/business-case.md` | ✅ Current |
| User journeys (Gherkin) | `docs/inception/user-journeys.md` | ✅ Current |
| **Personas** | `docs/inception/personas.md` | ⬜ Not started (Step 1) |
| **User stories + template** | `docs/inception/user-stories/` | ⬜ Not started (Steps 2–3) |
| Traceability matrix | `docs/inception/traceability.md` | ⬜ Not started |
| As-built record | `docs/construction/as-built/` | ✅ Current (6 journeys + overview) |
| Defect register | `docs/construction/defect-register.md` | ✅ D1–D12 all closed |
| ADRs | `docs/construction/decisions/` | ✅ ADR-0001 (sweep timing) |
| Architecture | `docs/construction/architecture.md` | ✅ Current |
| Agent swarm design | `docs/process/agent-design.md` | ✅ Current |

## Current initiative

**Comprehensive user stories** — writing field-level, UI-agent-ready stories
(persona → story → AC → screen states → data contract → components → tokens →
i18n → DoD) one at a time, human-reviewed. Sequence: personas → template proven
on one story → journey-by-journey.

## Verification baseline

- Backend: `pytest` — 44/46. The 2 failures (`test_confirm_dose_on_time`,
  `test_double_confirm_error`) are **time-of-day flaky**: they hardcode
  `actual_time=20:00:00`, which the future-time guardrail correctly rejects when
  the suite runs before 20:00 UAE. Not a code regression — genuine test debt
  (tests must use times relative to `now`, not wall-clock literals). Fix in the
  field-level pass.
- Frontend: `tsc -b && vite build` green
- Agents: `agents/orchestrator.py` compiles; `ui_designer_agent.py` resolves
  `docs/constitution.md`.
