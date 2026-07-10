# ADR-0001: Same-evening missed-dose sweep + idempotent catch-up ledger

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Product Owner (samanehkh), engineering
- **Journey / Area:** J4 Missed-Dose Escalation (was defect D12)

## Context
The background adherence daemon originally wrote "Missed" dose records only via
an idempotent catch-up ledger that processed dates **up to yesterday**. This was
robust against restarts (each date processed exactly once) but meant a patient's
missed dose surfaced as a clinic Red Alert the **following morning**, not the
same evening. BRD Journey 4 specifies same-evening escalation (T+120 min Red
Alert). The two were in conflict.

## Decision
Run a **same-evening sweep after 23:50 UAE** for today's unlogged doses (so the
Red Alert lands the same night per BRD J4), while **retaining the idempotent
`processed_dates` ledger** as the restart/downtime backstop. Extend dose-confirm
reconciliation so a live or self-reported confirmation arriving minutes after the
sweep **upgrades** the Missed record to Late instead of rejecting it.

## Consequences
- **Positive:** BRD-aligned same-night clinic escalation; ledger still guarantees
  no day is ever silently skipped; late confirmations reconcile truthfully.
- **Negative / trade-offs:** two code paths write Missed records (sweep + ledger);
  both must stay idempotent (they only insert where no log exists).
- **Follow-ups:** revisit if push notifications (Phase 2) add a T+30 gentle ping,
  which would change the escalation ladder.

## Alternatives considered
- **Next-morning ledger only** — simpler, one code path, but violates BRD J4's
  same-evening promise to clinics. Rejected.
- **Same-day sweep only, drop the ledger** — loses restart safety; a daemon down
  over midnight would permanently miss that day. Rejected.
