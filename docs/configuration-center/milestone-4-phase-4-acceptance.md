# Milestone 4 — Phase 4: Automatic Operations & Continuous Maintenance — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Added the **`BackgroundMaintenanceService`** — the "operations brain" —
that orchestrates all locked automation capabilities (Snapshot Maintenance,
Drift Detection, Live Health) into **one continuous maintenance cycle**,
registered as **one job** on the generic `BackgroundScheduler`. One scheduler,
one lifecycle, one execution report, one operational heartbeat. No locked
contract (M1–M4 Phase 3) changed.

---

## Scope Guard (Milestones 1–4 Phase 3 remain LOCKED)

- No change to Registry, Store, Resolver, SDK, Event Bus, Governance Pipeline,
  REST API contract, SettingsShell, Snapshot, Live Health, Audit, Golden,
  BackgroundScheduler, SnapshotMaintenanceService, or DriftDetector contracts.
- The service **composes** the already-locked automation surfaces
  (`SnapshotMaintenanceService`, `DriftDetector`, a health-reporter callback).
  It never touches Registry/Store/Resolver/Pipeline internals.
- **Read-only for Configuration Center** — verified by an explicit
  no-store-mutation test.
- **Audit integration is additive**: each cycle appends **one** journal entry
  (per cycle, not per job) to a bounded cycle journal. The Audit Center
  contract itself is untouched; the journal is the artifact that Audit Center
  can consume in a later milestone.
- Golden contract **still passes** (checksum `-277bfa6c205e0594`, configVersion
  1, 44 fields).

## Deliverables (M4 Phase 4)

1. **`BackgroundMaintenanceService`** (`src/settings/automation/maintenance-service.ts`):
   - `runCycle()` — one cycle: **Retention → Integrity → Garbage Collection →
     Drift Detection → Health Verification → Maintenance Report**.
   - **Step isolation** — a failure in one step is recorded (`error`) and the
     cycle continues; it never aborts the whole cycle.
   - `metrics()` — operational metrics: total cycles, success/failure counts,
     degraded periods, skipped jobs, average duration, last cycle time.
   - `status()` — running state, current cycle/step, last successful cycle,
     last failed cycle, latest cycle.
   - `cycleHistory()` — bounded journal (100), **one audit entry per cycle**.
   - `registerJob(scheduler, intervalMs)` — registers exactly **one** job
     (`config.maintenance.cycle`) on the generic scheduler.
2. **Read-only REST endpoints** (additive):
   - `GET /api/v1/settings/maintenance` — operational status + metrics.
   - `GET /api/v1/settings/maintenance/history` — bounded cycle journal.
   - `POST /api/v1/settings/maintenance/run` — manually trigger one cycle
     (409 when already running).
   - Zod schemas for cycle/status/metrics/history added.
3. **Maintenance Dashboard** (`pos-app` `MaintenanceDashboard.tsx`) — read-only
   tab ("Maintenance") added to `SettingsWorkspace`: operational metrics,
   latest cycle, cycle history, and a manual run trigger.
4. **Automation barrel** — exports the service and its types.
5. **Unit tests** (`tests/unit/settings/config-maintenance-service.test.ts`,
   9 tests).

## Architecture Rules honored

- **Rule 1 (no store writes):** the orchestrator never commits configuration;
  it only invokes read-only automation surfaces.
- **Rule 6 (no core refactor):** no locked surface modified; only new files +
  additive REST/UI wiring.

## Quality Gates

- Configuration tests: **129 / 129 PASS** (120 prior + 9 new).
- Golden Contract checksum: **`-277bfa6c205e0594`** (unchanged), Registry v1,
  44 fields identical.
- `tsc` for `src/settings`: no new errors.
- `pos-app` typecheck: no settings errors; **vite build passes**.
- Locked modules: no changes.
- Failures elsewhere (business-os, council, ai) remain **pre-existing unrelated**.

## Milestone 4 Complete

With Phase 4, **Milestone 4 — Automation & Operations is complete**:
Scheduler → Automatic Snapshot Maintenance → Automatic GC → Drift Detection →
Automatic Health Verification → Background Maintenance Service → Scheduler
REST API → Maintenance Dashboard, all additive on a stable, locked foundation.