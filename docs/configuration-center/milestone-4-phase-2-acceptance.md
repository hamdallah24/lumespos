# Milestone 4 — Phase 2: Automatic Snapshot Maintenance — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Added an **additive automation layer** that runs retention analysis,
garbage collection, integrity verification and maintenance reporting over the
locked Snapshot contract — driven entirely by the generic `BackgroundScheduler`.
No locked contract (Registry, Store, Resolver, SDK, Event Bus, Governance
Pipeline, REST API, SettingsShell, Snapshot, Live Health, Audit, Golden) changed.

---

## Scope Guard (Milestones 1–4 Phase 1 remain LOCKED)

- **No snapshot internals are imported.** The maintenance layer uses only the
  public `SnapshotManager` surfaces: `retentionCandidates()`, `runGc()`,
  `verify(id)`, `getRetentionPolicy()`, `list()`. It does **not** import
  `GarbageCollector`, `RetentionManager`, `SnapshotVerifier` or any persistence
  type.
- **GC is not re-implemented.** `runGc()` delegates straight to the locked
  `SnapshotManager.runGc()` → the existing `GarbageCollector`.
- **No mutation of Configuration Center.** The layer never writes to the Store,
  Registry or Resolver. Verified by an explicit no-store-mutation test
  (`store.revisionCount` unchanged across a maintenance run).
- **All jobs go through the generic scheduler.** No dedicated scheduler exists.
- **Health contract untouched.** The layer exposes an in-memory read-only
  `healthStatus()` sink; it does not modify the Live Health API.
- Golden contract **still passes** (checksum `-277bfa6c205e0594`, configVersion
  1, 44 fields).

## Deliverables (M4 Phase 2)

1. **`SnapshotMaintenanceService`** (`src/settings/automation/snapshot-maintenance.ts`):
   - `runRetention()` — retention analysis (policy + candidates). Pure read.
   - `runIntegrity()` — checksum/configVersion/payload/registry-compat checks via
     `SnapshotManager.verify()` for every snapshot. **Verifies only, never
     restores.**
   - `runGc()` — delegates to the locked `SnapshotManager.runGc()` and projects
     its `GcAuditEvent` (collected, snapshotIds, skippedPinned, skippedReferenced).
   - `runMaintenanceCycle()` — one full cycle producing a `MaintenanceReport`
     with `cycleId` (correlationId), `startedAt/finishedAt/durationMs`, `status`,
     and retention/integrity/gc sections. Journal bounded to 50 entries.
   - `healthStatus()` — brief read-only sink for dashboards (status, cycleId,
     at, integrityFailures, collected). Does not alter the Health API.
   - `registerJobs(scheduler, intervals)` — registers **three** jobs
     (`snapshot.maintenance.retention`, `…integrity`, `…gc`) through the generic
     `BackgroundScheduler`.
2. **Automation barrel update** — `automation/index.ts` exports the service and
   all its types alongside the scheduler.
3. **Unit tests** (`tests/unit/settings/config-snapshot-maintenance.test.ts`,
   10 tests).

## Architecture Rules honored

- **Rule 1 (no store writes):** maintenance never commits configuration; no
  pipeline invocation anywhere in the layer.
- **Rule 2 (no DB bypass):** all snapshot reads go through `SnapshotManager`/
  its injected persistence abstraction.
- **Rule 3 (no Snapshot internals):** the layer knows only the manager surface.
- **Rule 6 (no core refactor):** no existing `src/settings` file was modified;
  only new files were added.

## Quality Gates

- Configuration tests: **113 / 113 PASS** (103 prior + 10 new).
- Golden Contract checksum: **`-277bfa6c205e0594`** (unchanged), Registry v1,
  44 fields identical.
- `tsc` for `src/settings`: no new errors.
- Locked modules: no changes.
- Failures elsewhere (business-os, council, ai) remain **pre-existing unrelated**.

## Forward Direction

Phase 2 delivers automatic snapshot maintenance. Phase 3 (Automatic Garbage
Collection as its own scheduled surface) and Phase 4 (Drift Detection) build on
the same scheduler + consumer pattern.