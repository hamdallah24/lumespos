# Milestone 4 — Phase 1: Generic Background Scheduler — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Added a **generic Background Scheduler** primitive that drives
automation jobs (register/unregister, enable/disable, interval execution,
manual execution, execution history, next-run, last-run, status) **without
changing any locked contract from Milestone 1–3.**

---

## Scope Guard (Milestones 1–3 remain LOCKED)

- No change to the locked core: Registry, Store, Resolver, SDK, Event Bus,
  Governance Pipeline, REST API Contract, SettingsShell Contract, Snapshot
  Contract, Live Health Contract, Audit Contract, Golden Contract.
- The scheduler is a **new, additive module** under `src/settings/automation/`.
  It is not referenced by, nor referenced from, any existing configuration
  module yet — Phase 6 (Background Maintenance Service) will consume it.
- The scheduler is **generic and domain-blind**: it only knows `Job`, `Interval`,
  `Tick`, `Execute`. It imports **no** Snapshot, Health, Audit, or other config
  module — verified by the absence of any such import.
- Golden contract **still passes** (checksum `-277bfa6c205e0594`, configVersion 1,
  44 fields) — Registry contract byte-identical across this phase.

## Deliverables (M4 Phase 1)

1. **`BackgroundScheduler`** (`src/settings/automation/scheduler.ts`) — a pure
   scheduling primitive with:
   - `register(job)` — id + `intervalMs` + `execute` + optional `enabled:false`.
   - `unregister(id)` — removes the job.
   - `enable(id) / disable(id) / isEnabled(id)`.
   - `setInterval(id, ms)` — re-arms an existing job's cadence.
   - `runNow(id)` — manual execution, independent of interval/enabled state.
   - `tick()` — runs all **due**, enabled, non-running jobs; injectable clock for
     deterministic scheduling.
   - `start() / stop()` — the timer loop (`isRunning()` reflects state).
   - Per-job `status(jobId)`, `list()`, `snapshot()` exposing: last run, next
     run, run count, error count, execution history (bounded), and status.
2. **Execution model** — each run produces a `JobExecutionRecord`
   (`startedAt/finishedAt/durationMs/status/manual/error`); successful and
   failed runs are journaled; a concurrent-double-run is rejected (jobs are
   isolated by an in-flight set).
3. **`src/settings/automation/index.ts`** — barrel exporting the scheduler and
   its types. Intentionally does **not** create a singleton or auto-start: the
   service lifecycle is owned by Phase 6.
4. **Unit tests** (`tests/unit/settings/config-scheduler.test.ts`, 16 tests).

## Design Rules honored (M4 Architecture Rules)

- **Rule 1 (no store writes):** the scheduler has no reference to the Store; it
  only invokes user-supplied `execute` callbacks.
- **Rule 2 (no DB bypass):** the scheduler has no database access of any kind.
- **Rules 3–5 (no internal knowledge):** the scheduler imports nothing from
  Snapshot, Resolver/Event-Bus internals — it is a capability-agnostic timer.
- **Rule 6 (no core refactor):** no exiting file under `src/settings` was edited;
  only wholly new files were added.

## Quality Gates

- Configuration tests: **103 / 103 PASS** (87 prior + 16 new scheduler).
- Golden Contract checksum: **`-277bfa6c205e0594`** (unchanged), Registry v1,
  44 fields identical.
- `tsc` for `src/settings` surfaces: no new errors.
- Locked modules: no changes.
- Failures elsewhere (`ai/runtime`, `business-os/*`, `council/*`) remain
  classified as **pre-existing unrelated failures**.

## Forward Direction

Phase 1 delivers the scheduling **primitive only**. Phase 2 will attach the
first domain job (Automatic Snapshot Maintenance) as an additive consumer,
still without touching `SnapshotManager` or any locked contract.