# Milestone 4 — Phase 3: Drift Detection — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Added a **DriftDetector** — the "eyes" of the automation layer — that
answers whether the Configuration Center's current effective state still matches
the state it should be (its latest snapshot baseline). All changes are additive
and no locked contract (M1–M4 Phase 2) changed.

---

## Scope Guard (Milestones 1–4 Phase 2 remain LOCKED)

- No change to Registry, Store, Resolver, SDK, Event Bus, Governance Pipeline,
  REST API contract, SettingsShell, Snapshot, Live Health, Audit, Golden
  contract, BackgroundScheduler, or SnapshotMaintenanceService contracts.
- **Resolver is read only through the SDK** (`ConfigResolver.effective`), per
  M4 Rule 4. The detector never touches Resolver internals.
- **Registry is read only for field criticality** (classification), via the
  public `registry.get(key)` — no mutation.
- No Store write, no pipeline invocation, no restore: verified by an explicit
  no-store-mutation test.
- Golden contract **still passes** (checksum `-277bfa6c205e0594`, configVersion
  1, 44 fields).

## Deliverables (M4 Phase 3)

1. **`DriftDetector`** (`src/settings/automation/drift.ts`):
   - `detect()` — compares the **latest Snapshot baseline** (expected) vs the
     **Resolver effective output** (`sdk.effective`, current) and produces a
     `DriftReport` (cycleId, detectedAt, severity, baseline info, scope,
     baselineRevision, changes[], affectedKeys[], recommendation).
   - **Classification**: `NONE` (no delta), `WARNING` (only low/medium changes),
     `CRITICAL` (any high/critical change). When no baseline snapshot exists it
     short-circuits to `NONE` with a clear recommendation.
   - `status()` — the latest report; `reportHistory()` — bounded (50) journal.
   - `registerJob(scheduler, intervalMs)` — registers exactly **one** job
     (`config.drift.detection`) through the generic `BackgroundScheduler`.
2. **Read-only REST endpoints** (additive):
   - `GET /api/v1/settings/drift` — run a fresh detection.
   - `GET /api/v1/settings/drift/status` — last report (no re-run).
   - Zod schemas `driftReportResponseSchema` / `driftStatusResponseSchema` added.
3. **Automation barrel** — exports `DriftDetector` and its types.
4. **Unit tests** (`tests/unit/settings/config-drift-detection.test.ts`, 7 tests).

## Architecture Rules honored

- **Rule 1 (no store writes):** drift never commits configuration; the pipeline
  is not invoked by the detector (only by tests to stage a drift).
- **Rule 4 (no Resolver internals):** reads use the SDK `effective()`.
- **Rule 6 (no core refactor):** only new files (drift.ts + test) plus additive
  REST wiring on the controller/routes/schemas; no locked surface changed.

## Quality Gates

- Configuration tests: **120 / 120 PASS** (113 prior + 7 new).
- Golden Contract checksum: **`-277bfa6c205e0594`** (unchanged), Registry v1,
  44 fields identical.
- `tsc` for `src/settings`: no new errors.
- Locked modules: no changes.
- Failures elsewhere (business-os, council, ai) remain **pre-existing unrelated**.

## Forward Direction

Drift Detection is now the foundation for Phase 4 — where Drift, Health,
Snapshot, Retention and GC integrate into a single continuous maintenance cycle.