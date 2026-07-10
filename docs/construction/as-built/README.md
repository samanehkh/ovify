# Ovify — As-Built Record

This folder is the authoritative record of **what was actually built** and how
it deviates from the original specs. One file per journey (`Journey_*.md`);
this README carries the cross-cutting/global truth-sync.

> Migrated 2026-07-09 from the former `.spec-kit/spec.md` Part 4 during the docs/ tidy-up.

---

## Part 4: As-Built Truth Sync (2026-07-08)

This section reconciles Parts 1–3 with the code as it exists at commit `7d3f2e0`+.
Each delta is classified: **✅ accurate** · **⚠️ as-built deviation (accepted)** ·
**🔴 defect (to fix)**.

### 4.1 Authentication (not covered by Parts 1–3 at all)

| As-built reality | Classification |
|---|---|
| All patient endpoints require `Authorization: Bearer <token>` (HMAC-signed, 24h expiry, `role=patient`). Token issued by `POST /users/verify-otp`. `user_id` is derived from the token — the `user_id` query param in §2.3 is now ignored by the server. | ⚠️ Deviation (accepted) — spec predates auth. §2.3 must be rewritten in the field-level pass. |
| Clinician routes require `role=clinician` Bearer tokens from `POST /api/clinician/login` (nurse-entered clinic access key, verified server-side). Partner routes require `role=partner` tokens. | ⚠️ Deviation (accepted) |
| Server fails closed on boot if `AUTH_SECRET_KEY` / `CLINICIAN_API_KEY` env vars are missing. | ⚠️ Deviation (accepted) |
| OTP is mocked as `123456` for patient and partner login. | ⚠️ Deviation (accepted for local dev; real SMS OTP is pre-launch scope) |
| `POST /api/medications/check-overdue` and `POST /api/medications/process-missed` have **no auth at all**. | 🔴 **Defect** — must be gated (clinician token or internal-only) before deployment. |
| Clinician tokens carry no individual nurse identity (single shared access key; `user_id=0`). No per-nurse audit trail. | 🔴 **Defect** (pre-pilot) — UAE Health Data Law auditability requires per-user identity. |

### 4.2 Database schema (§2.2 is stale)

| Spec §2.2 says | As-built | Classification |
|---|---|---|
| `users`: id, name, email | Also: `phone` (unique), `sleep_time`, `injection_comfort`, `onboarded`, `active_status`, `cycle_type`, `cycle_outcome`, `partner_phone`, `partner_consent`, `created_at` | ⚠️ Deviation (accepted) — schema grew with Journeys 1/2/7/12 |
| `dose_logs`: …status "On Time" or "Late" | Status also takes `"Missed"`. New column `self_reported` (bool) distinguishes live confirmations from patient-reported times. New `UniqueConstraint(prescription_id, scheduled_date)` prevents double-logging races. | ⚠️ Deviation (accepted) |
| (absent) | New table `processed_dates` — idempotent ledger recording which calendar dates the missed-dose sweep has processed. | ⚠️ Deviation (accepted) |
| (absent) | `cycles` table exists but is **not used** by the dashboard; stim-day progress is derived from prescription start/end dates. | 🔴 **Defect / debt** — decide: wire `cycles` in or remove it. |

### 4.3 Dose-timing rules (§2.3 is wrong in two ways)

| Spec says | As-built | Classification |
|---|---|---|
| "within ±60 minutes" → On Time | **Signed window: −15 to +60 minutes.** Confirming >15 min *early* is Late; spec's symmetric ±60 never existed in final code. | ⚠️ Deviation (accepted — clinically safer) — update §2.3 wording. |
| `actual_time` = reported HH:MM(:SS), assumed today | Also accepts **full ISO-8601 timestamps** (offline queue). Guardrails: future times rejected (5-min skew tolerance); bare times max 24h old; ISO max 48h old. Cross-midnight resolution anchors on the *reported* date. All server timing pinned to UAE tz (`core/time.py`). | ⚠️ Deviation (accepted) |
| (absent) | **Missed→Late reconciliation:** if the EOD sweep already wrote `Missed` and a self-reported confirmation arrives later, the log is upgraded in place to `Late (self_reported=true)` — no duplicate row, truthful record. | ⚠️ Deviation (accepted — this is the desired clinical behavior; must be added to Scenario 5's Gherkin in the field-level pass) |

### 4.4 Scenario 5 (missed-dose sweep) timing

Spec says the Missed record is written "when the day ends (23:59:59)". As-built: the
daemon (every **5 minutes**, not 15) runs an idempotent catch-up over the previous
14 days **up to yesterday** — meaning today's unlogged dose is recorded as Missed on
the *next* daemon pass **after midnight**, not at 23:59:59 sharp.

**Classification: ⚠️ deviation — needs a product decision.** The ledger design is more
robust (survives restarts, never loses a day), but the clinic Red Alert now appears
the following morning rather than same-evening. If same-evening escalation is required
(BRD J4 says T+120 min), add a same-day sweep pass on top of the ledger.

### 4.5 Frontend (§2.4 is obsolete)

§2.4 describes AJAX inside `index.html`. That artifact is **archived** (`Archive/index.html`).
The patient app is the React/Vite PWA under `frontend/` — real service worker
(`vite-plugin-pwa`), typed API layer (`src/services/api.ts`), Bearer-token auth,
i18n scaffold with RTL switching, and an **offline dose queue**:

* Doses logged offline persist in `localStorage` with full ISO timestamps, render as
  honest **"Sync Pending"** (not "Taken"), and drain on app mount, window focus, and
  the `online` event.
* Sync drops items definitively rejected by the server (4xx) and retries only
  transient failures (network/5xx).
* Queue merging is date-scoped — a stale queued item cannot mark today's dose taken.

⚠️ Deviation (accepted) — §2.4 to be rewritten as a React/PWA spec in the field-level pass.

### 4.6 Testing (§Part 3 update)

Tests now span `tests/test_medication.py`, `test_user_onboarding.py`,
`test_clinic_registration.py`, `test_triage_console.py`, `test_partner_sharing.py`,
`test_recovery_mode.py`, `test_auth_security.py` (43 passing). Auth is exercised with
real signed tokens (no test bypass). `tests/test_cycle.py` covers the legacy
cycle-prediction module only.

### 4.7 Defect Resolution Addendum (2026-07-08, same day — post-fix)

All 🔴 defect rows in §4.1–§4.5 above have since been resolved (see
`implementation_plans/DEFECT_REGISTER.md` for the full closure record, D1–D12).
The rows above are retained as the historical record of the gap; current behavior:

* **Sweep endpoints** (`check-overdue`, `process-missed`) are clinician-token gated (D1).
* **Nurse resolution preserves history**: `dose_logs` gains `resolved`/`resolved_by`/`resolved_at`;
  status is never rewritten; triage ranks only unresolved logs within a rolling
  **7-day recency window** (D2, D8).
* **Nurse callbacks are persisted** in a new `callback_requests` table, surfaced in triage,
  completed on resolution with attribution (D3).
* **Attribution**: clinician login requires the nurse's name (embedded in the token);
  a new `audit_log` table records register/resolve/outcome/callback actions (D4).
* **`users.dob`** is persisted at registration (D5); **`/register` re-validates against
  the approved formulary server-side** (D6).
* **`injection_comfort` drives guide depth** (Experienced → condensed guide);
  `sleep_time` remains data-only until a reminder engine exists (D7 — partial, documented).
* **Recovery-mode copy fully localized** (EN/AR) including the callback section (D9).
* **The legacy `cycles` module was removed** — model, router, schemas, prediction
  service, and tests (§4.2's unused-table row) (D10). Phone normalization is
  centralized in `core/phone.py` (D11).
* **§4.4's product decision is resolved BRD-side**: the daemon now runs a
  same-evening sweep after 23:50 UAE (Red Alert lands the same night per BRD J4),
  with the idempotent ledger retained as the restart backstop. A live confirmation
  arriving minutes after the sweep upgrades the `Missed` record instead of bouncing (D12).
