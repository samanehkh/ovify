# Ovify Defect Register — from As-Built Truth Sync (2026-07-08)

Consolidated from the truth-sync sections in each journey plan and
`.spec-kit/spec.md` Part 4. This is the working backlog for the field-level
pass. Severity: **P1** = fix before any deployment/pilot · **P2** = fix during
field-level journey pass · **P3** = debt/decision.

| ID | Journey | Defect | Severity |
|---|---|---|---|
| D1 | J3/J4 | ~~Sweep endpoints unauthenticated~~ **FIXED 2026-07-08**: both gated behind `verify_clinician_token`; 401 tests added | ✅ Fixed |
| D2 | J4/J8 | ~~resolve-alert rewrote history~~ **FIXED 2026-07-08**: status preserved; `resolved`/`resolved_by`/`resolved_at` columns; triage ranks only unresolved logs; audit event written | ✅ Fixed |
| D3 | J12 | ~~Callback was UI-only~~ **FIXED 2026-07-08**: `callback_requests` table; idempotent `POST /users/{id}/callback-request` (token + IDOR); surfaces as Yellow "📞 callback requested" in triage; completed on resolve with nurse attribution; UI only confirms after server ack | ✅ Fixed |
| D4 | J1/J8 | ~~No per-nurse identity~~ **MITIGATED 2026-07-08**: login requires nurse name (400 without); name embedded in token; new `audit_log` table records register/resolve/outcome/callback actions with actor. *Full per-nurse accounts (individual credentials) remain pre-pilot scope.* | ✅ Mitigated |
| D5 | J1 | ~~dob discarded~~ **FIXED 2026-07-08**: `users.dob` column added, persisted at registration, returned in `UserResponse`; test asserts round-trip | ✅ Fixed |
| D6 | J1 | ~~No formulary re-validation~~ **FIXED 2026-07-08**: `/register` rejects (400) any prescription not matching the approved formulary, naming the offending drugs; nothing persisted on rejection; live-verified with "Gonal-X" | ✅ Fixed |
| D7 | J2 | **PARTIALLY FIXED**: `injection_comfort == "Experienced"` now drives guide depth (collapsed video + condensed checklist, "Experienced Mode" badge in `MedicationLogPage`); both fields editable in Settings. `sleep_time` remains data-only — there is no reminder engine yet for it to drive; wire it in when push notifications land (Phase 2). | ⚠️ Partial — sleep_time deferred with reason |
| D8 | J8 | ~~Forever-Red ranking~~ **FIXED 2026-07-08**: triage alerts consider only unresolved logs within a rolling 7-day window (`TRIAGE_RECENCY_WINDOW`); test: 10-day-old Missed → On Track, yesterday's Missed → Red | ✅ Fixed |
| D9 | J12 | ~~Mixed EN/AR recovery screen~~ **FIXED 2026-07-08**: "Thinking of you", alarm-pause note, and the entire nurse-callback section (header/body/button states/error fallback) moved into `content/i18n.ts` with Arabic translations | ✅ Fixed |
| D10 | J3 | ~~Unused cycles table~~ **REMOVED 2026-07-08**: the `cycles` model, `/cycles` router, `schemas/cycle.py`, `services/prediction.py`, and `tests/test_cycle.py` were legacy from the superseded period-tracker prototype — no MVP journey or frontend used them. Deleted (git history preserves them). Stim-day progress remains prescription-derived by design. | ✅ Removed |
| D11 | J1 | ~~Duplicated phone normalization~~ **FIXED 2026-07-08**: single `core/phone.py::normalize_phone()` used by all 5 call sites across users/partner/clinician routers; unit-tested | ✅ Fixed |
| D12 | J4 | ~~Escalation timing decision~~ **RESOLVED 2026-07-08 (BRD-aligned option implemented)**: daemon now runs a same-evening sweep after 23:50 UAE for today's unlogged doses (Red Alert lands same night per BRD J4), while the idempotent ledger continues to backstop restarts/downtime. Reconciliation extended so a LIVE confirm minutes after the sweep upgrades the Missed record instead of bouncing. | ✅ Resolved |

## Accepted as-built deviations (not defects — documented in the journey syncs)

- Bearer-token auth model everywhere (spec predated it)
- Signed −15/+60 dose window (replaces spec's ±60)
- ISO-timestamp offline logging + Missed→Late reconciliation + `self_reported` flag
- `processed_dates` idempotent sweep ledger; 5-min daemon cadence
- Offline queue UX (Sync Pending badge, mount/focus/online drain, 4xx drop)
- Mock OTP `123456`; partner alert = console log (Twilio is pre-launch scope)
- Escalation thresholds hardcoded; no T+30 gentle push (web-push is Phase 2)
