<!--
OVIFY USER STORY TEMPLATE
One story = one screen, one primary user intent.
Copy this file to US-J<journey>-<NN>-<slug>.md and fill every section.
Delete none of the headings — write "N/A — <reason>" if a section truly doesn't apply.
The UI agent and human reviewers treat filled sections as binding.
-->

# US-J<journey>-<NN>: <Screen / action title>

| Field | Value |
|---|---|
| **Journey** | J<n> — <name> |
| **Persona(s)** | P1 Sarah (primary) · <others> |
| **Primary intent** | <the one thing the user comes to this screen to do> |
| **Scope** | ✅ MVP · 🟡 Roadmap · SaMD: 🟢 Non-SaMD / 🟡 candidate / 🔴 deferred |
| **Status** | 🚧 Draft / ✅ Locked |
| **Last updated** | YYYY-MM-DD |

## 1. User story
> As **<persona>**, I want **<capability>**, so that **<value>**.

## 2. Context & entry
- **Entry point:** how the user arrives here (deep link, tab, tap on X).
- **Preconditions:** what must be true first (authenticated, onboarded, a dose is due…).
- **Exit:** where a successful completion leaves them.

## 3. Acceptance criteria (Gherkin)
```gherkin
Scenario: <happy path>
  Given ...
  When ...
  Then ...
```
_Cover: happy path + every edge case that has a screen state in §5._

## 4. Screen states  ← the load-bearing section
List **every** state this screen can be in and what the user sees in each.
Missing a state here is how offline/error/empty bugs ship.

| State | Trigger | What the user sees |
|---|---|---|
| loading | … | … |
| ready / default | … | … |
| empty | … | … |
| submitting | … | … |
| success | … | … |
| error (recoverable) | … | … |
| offline / queued | … | … |
| forbidden / expired | … | … |

## 5. Data contract
The exact API this screen binds to — so UI and backend cannot drift.

- **Endpoint(s):** `METHOD /path` — auth: `<none | patient | clinician | partner token>`
- **Request:** params / body fields + types.
- **Response (2xx):** fields + types the UI reads.
- **Error responses:** status → meaning → **how the UI must react** (this is where
  "never show success on failure" is enforced).

## 6. Field-level detail
Every input **and** every displayed data field on the screen.

| Field | Kind | Type / format | Required | Validation | Empty / fallback behaviour |
|---|---|---|---|---|---|
| … | input/display | … | Y/N | … | … |

## 7. Components
Reusable UI pieces this screen uses (from the component inventory). Flag any **new**
component this story would introduce.

## 8. Design tokens & layout
- Inherits `docs/constitution.md` §5 (palette, type, radii, glass).
- Layout: phone frame / widescreen; single-column; note any deviation from tokens.

## 9. Copy (EN)
Every user-facing string on this screen, including state/error copy. **Must obey
constitution §7** (never cheerlead, never promise, calibrate warmth not hope;
truthful status; non-diagnostic).

| Key | String |
|---|---|
| … | "…" |

## 10. Interaction & motion
Transitions, feedback, timings. Must honour `prefers-reduced-motion`.

## 11. Accessibility & Definition of Done
- [ ] WCAG AA contrast (no low-opacity text on ivory/white)
- [ ] Keyboard reachable; visible focus rings
- [ ] `aria-label`s on all controls; no bare emoji as sole signal; live regions for toasts/errors
- [ ] `prefers-reduced-motion` respected
- [ ] i18n-ready (strings externalized; no hardcoded copy) — EN shipped, AR scaffolded
- [ ] Truthful status (no fabricated data; pending ≠ done)
- [ ] All §5 screen states implemented
- [ ] Acceptance criteria pass; tests reference this story ID

## 12. Out of scope / non-goals
What this story explicitly does **not** do (prevents agent overreach).

## 13. Open questions
Unresolved decisions, in the `[Answer]:` protocol — resolve before build.
```
Q1. <question>?
[Answer]:
```

## 14. Traceability
- **Journey:** `docs/inception/user-journeys.md` → J<n>
- **As-built:** `docs/construction/as-built/Journey_<n>_*.md`
- **Endpoints:** `<files>`
- **Frontend:** `<files>`
- **Tests:** `<test ids>`
