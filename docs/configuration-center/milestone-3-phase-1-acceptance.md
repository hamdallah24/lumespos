# Milestone 3 — Phase 1: Persistent Snapshot Foundation — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Migrated Configuration Snapshot from in-memory ephemeral state to a
persistent, immutable, verifiable operational artifact — **without changing any
locked contract from Milestone 1 & 2.**

---

## Scope Guard (Milestones 1 & 2 remain LOCKED)

- No change to the locked core: Registry, Store, Resolver, SDK, Event Bus,
  Governance Pipeline (lifecycle), REST API Contract, SettingsShell Contract,
  Golden Contract.
- The pipeline's `run()` lifecycle is untouched. Verification/GC/retention are
  additive user-layer components, not pipeline modifications.
- Golden contract **still passes** (checksum `-277bfa6c205e0594`, configVersion 1,
  44 fields) — Registry contract is byte-identical across Phase 1.

## Deliverables (M3 Phase 1)

1. **SQL-backed Snapshot** — `SnapshotPersistence` abstraction with:
   - `MemorySnapshotPersistence` (runtime/tests — same contract as the config
     store, which is also runtime-injected in M1).
   - `SqlSnapshotPersistence` (drizzle `settings_snapshot` table; operational
     path; DB client injected, never opened at import).
   - Records carry: `snapshotId`, `revisionNo`, `configVersion`, `checksum`,
     `createdAt`, `createdBy/actor`, `reason`, `triggerType`, `metadata`, `payload`.
   - Payload = **Resolver effective configuration** (44 keys), not just overrides.
2. **Snapshot Fingerprint** — `{ checksum, registryChecksum, configVersion, revisionNo }`.
3. **Snapshot Origin** — `manual | automatic | pre-deploy | scheduled | rollback | migration`
   → stored as `origin` + DB `triggerType`.
4. **Snapshot Status** — `ACTIVE | ARCHIVED | PINNED | RESTORED | EXPIRED`
   (metadata only; never alters payload).
5. **Snapshot Metadata** — `actor, correlationId, pipelineStage, reason, sourceRevision`.
6. **Snapshot Integrity** — every snapshot has an FNV-1a canonical checksum;
   restore succeeds only when the recomputed checksum matches.
7. **Retention Manager** — `keep latest N` (per bucket), `keep younger than X days`,
   manual `pin`, automatic cleanup; never collects pinned or referenced snapshots.
8. **Garbage Collector** — separate process; deletes only snapshots that pass
   retention AND are not pinned AND not referenced; **always emits a `snapshot.gc`
   audit event**.
9. **Restore Verification** — exists → checksum → configVersion → payload integrity
   → registry compatibility. Any failure blocks restore **before** the pipeline.
10. **Restore Workflow** — `Verify → (Pipeline Preview→Diff→Impact→Policy→Health)
    → Commit NEW revision → ConfigurationChanged → Subscriber reconcile`. History
    stays linear; Store is never touched directly.

## Schema (additive, `lib/db/src/schema/settings.ts`)

`settings_snapshot` extended additively: `snapshotId` (unique), `triggerType`,
`scopeType`/`workspaceId`/`branchId`/`executiveRole`, `changes`, `registryChecksum`,
`revisionNo`, `status`, `pinned`, `fingerprint`, `metadata`. Existing columns
preserved; `updateSettingsSnapshotSchema` added for partial updates.

## API additions (additive — M2 contract endpoints unchanged)

`POST /snapshots`, `GET /snapshots/:id`, `POST /snapshots/:id/verify`,
`POST /snapshots/:id/restore`, `POST /snapshots/:id/pin` (`/unpin`),
`GET /snapshots/:id/compare/:otherId`, `POST /snapshots/retention`,
`POST /snapshots/gc`. The original `POST /packages/install`, `POST /restore`,
`GET /snapshots` remain intact. Contract updated in
`docs/configuration-center/rest-api-contract.md`.

## Quality Gates — ALL PASS

**60 / 60 configuration tests.**
- `config-center.test.ts` (19) — core unchanged.
- `config-api.test.ts` (12) — user surface unchanged (M2).
- `config-registry-golden.test.ts` (4) — golden checksum `-277bfa6c205e0594` intact.
- `config-sdk-boundaries.test.ts` (3) — SDK surface intact.
- **`config-snapshot-persistence.test.ts` (22)** — NEW: persistence contract,
  immutability, effective payload (44 keys), fingerprint/origin/status/metadata,
  retention (latest-N, age, pinned, referenced), GC (plus audit event, pin-safe),
  verification (exists/checksum/configVersion), restore (new revision + linear,
  RESTORED status, verification gate, policy gate).

**Typecheck:** settings module clean; remaining repo errors are pre-existing in
unrelated subsystems (business-os/eios-runtime/finance/etc.), none import
`src/settings`.

## Design Choice — persistence abstraction

No live Postgres is reachable in this test/dev environment (same situation that
kept the M1 config *Store* in-memory). The `SnapshotPersistence` interface makes
the entire domain (capture/retention/GC/verification/restore) persistence-agnostic:
the SQL repository is the operational path; the memory repository is identical in
behavior for tests/dev. This keeps the M2 sync surface (`list/get/search/count`)
backwards-compatible.

## Explicitly deferred (as directed)

Incremental/delta snapshots, cross-region replication, object storage,
compression, snapshot-specific at-rest encryption, hash-chain, WORM storage —
all remain on the roadmap after Persistent Snapshot is stable.

## Recommendation

**Accept Milestone 3 Phase 1.** Snapshot is now a trusted operational artifact
for rollback, recovery, audit, history and governance, without altering the locked
Configuration Center foundation. Phase 2 (Live Health) may proceed.