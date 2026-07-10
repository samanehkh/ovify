# Ovify

An IVF ovarian-stimulation companion — a **tri-app** system:

- **Patient PWA** — daily injection guidance, one-tap dose confirmation, emotional check-ins, offline-first.
- **Clinician Console** — patient registration (AI protocol parser) + compliance triage.
- **Partner App** — consent-gated cycle updates and supportive prompts.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite (PWA, TailwindCSS), token auth, EN/AR (RTL) i18n |
| Backend | FastAPI (Python), SQLAlchemy |
| Database | SQLite (local dev) · Azure PostgreSQL (target) |
| Auth | HMAC-signed bearer tokens (patient / clinician / partner roles) |

## Run it locally

```bash
# Backend (terminal 1)
AUTH_SECRET_KEY="dev-secret-key" CLINICIAN_API_KEY="my-clinic-access-key-123" \
  SEED_DATABASE=false uvicorn main:app --port 8000

# Frontend (terminal 2)
cd frontend && npm install && npm run dev
```

Portals: patient `http://localhost:5173/` · clinician `/clinician` · partner `/partner`.
Mock OTP is `123456`; clinic access key is whatever you set `CLINICIAN_API_KEY` to.

```bash
pytest          # backend tests (46 green)
cd frontend && npm run build   # typecheck + build
```

## Documentation — start at [`docs/`](docs/)

All product, engineering, and process docs live under `docs/`, organized by
phase (inception = what/why, construction = how it was built, process = the
AI-DLC-style machinery). Framework-agnostic: built on standard primitives
(personas, INVEST user stories, Gherkin acceptance criteria, ADRs, a constitution).

```
docs/
├── constitution.md          Agent guardrails, brand tokens, regulatory gating (governs everything)
├── inception/               WHAT & WHY
│   ├── business-case.md     The BRD
│   ├── personas.md          Who we build for
│   ├── user-journeys.md     Gherkin journeys (MVP + roadmap, SaMD gating)
│   └── user-stories/        Field-level, UI-agent-ready stories (+ _TEMPLATE.md)
├── construction/            HOW it was built
│   ├── as-built/            Per-journey record of what shipped vs. spec
│   ├── defect-register.md   D1–D12 (all closed)
│   ├── decisions/           ADRs (architecture decision records)
│   └── architecture.md
└── process/                 The AI-DLC machinery
    ├── agent-design.md      LangGraph agent swarm design
    └── state.md             Live project + doc-phase state
```

The runnable agents live in [`agents/`](agents/).
