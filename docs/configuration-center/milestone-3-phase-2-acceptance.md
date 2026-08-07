# Milestone 3 — Phase 2: Live Health — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Added a richer, **read-only Live Health** observability layer for
ConfigCenter (overview, diagnostics, metrics, readiness, liveness) **without
changing any locked contract from Milestone 1, 2, or 3 Phase 1.**

---

## Scope Guard (Milestones 1, 2 & 3 Phase 1 remain LOCKED)

- No change to the locked core: Registry, Store, Resolver, SDK, Event Bus,
  Governance Pipeline (lifecycle), REST API Contract, SettingsShell Contract,
  Golden Contract.
- The locked M1 `ConfigCenterHealth.report()` and the existing
  `GET /health` response are **untouched**. Live Health is a new, separate
  `ConfigCenterLiveHealth` facade + new sub-endpoints — it is purely additive.
- Live Health is **read-only**: it never mutates the Registry, Store, or Pipeline.
  Verified by an explicit no-mutation test.
- Golden contract **still passes** (checksum `-277bfa6c205e0594`, configVersion 1,
  44 fields) — Registry contract is byte-identical across Phase 2.

## Deliverables (M3 Phase 2)

1. **`ConfigCenterLiveHealth` facade** (`src/settings/api/health/source.ts`) —
   composition over the same internals used by M1 health plus the M3 Snapshot
   Manager:
   - `summary()` — aggregate `ok | degraded | error` + registry/store/resolver/
     eventBus/snapshots/capabilities/updatedAt.
   - `diagnostics()` — a list of named checks with status + detail.
   - `metrics()` — `ConfigMetrics.snapshot()` (counters + latencies).
   - `readiness()` — `ready` + status; `ready = false` when any **critical**
     check (registry.consistency, store.revision, snapshots.integrity) is not ok.
   - `liveness()` — cheap probe that the Registry responds (`alive`, `stamp`).
2. **Diagnostics checks** — `registry.consistency`, `resolver.warmed`,
   `store.revision`, `eventbus.delivery`, `snapshots.integrity`,
   `metrics.sanity`.
3. **Event bus delivery** — derived from store-declared revision vs
   bus-delivered revision; a positive delta degrades the check (signal, not
   error, because the bus is synchronous by contract).
4. **Snapshot observability** — count, retention candidates, retention policy,
   and last `RESTORED` snapshot surfaced in the summary.

## API additions (additive — every existing endpoint unchanged)

- `GET /health/summary` — live overview aggregate.
- `GET /health/diagnostics` — `{ status, checks: { id, title, status, detail }[] }`.
- `GET /health/metrics` — `{ counters, latencies }`.
- `GET /health/readiness` — `{ ready, status, checks }`.
- `GET /health/liveness` — `{ alive, status, stamp }`.

All are GET, require auth, and are side-effect-free. Contract updated in
`docs/configuration-center/rest-api-contract.md`.

## Frontend (pos-app)

`HealthPanel.tsx` now polls every 5s and renders the merged M1 + M3 Phase 2
view: living status, readiness banner, registry/store/resolver/eventBus cards,
snapshot card (count, retention policy, last restore), diagnostics list, and
capabilities. Client methods added to `settings/api.ts` (healthSummary,
healthDiagnostics, healthMetrics, healthReadiness, healthLiveness).

## Quality Gates — ALL PASS

- `config-live-health.test.ts` (12) — **NEW**: summary aggregate, registry
  checksum parity, store revision, event bus delivery, snapshot counts/retention,
  RESTORED lastRestore, diagnostics shape, metrics, readiness criticality,
  liveness, **no-mutation guarantee**.
- `config-center.test.ts` (19) · `config-api.test.ts` (12) ·
  `config-snapshot-persistence.test.ts` (22) — all unchanged and passing.
- `config-registry-golden.test.ts` (4) — golden checksum intact.
- **Total config surface: 65 / 65 tests pass.**
- `pos-app` typecheck: settings module clean (no settings errors).
- `api-server` typecheck: settings module clean; remaining repo errors are
  pre-existing in unrelated subsystems (business-os/eios-runtime/finance/hr/
  inventory/purchasing/ric), none import `src/settings`.

## Design Choice — additive observability, not a rewrite

The M1 `ConfigCenterHealth` contract is locked, so Phase 2 composes a separate
`ConfigCenterLiveHealth` facade that reuses the same internals rather than
altering the locked reporter. This keeps rollback-safe progress: any consumer of
`GET /health` is unaffected, and the new endpoints layer richer detail only.

Snapshot observability reuses the existing thread-safe `SnapshotManager` surface
(`count`, `retentionCandidates`, `getRetentionPolicy`, `list`) — no new
persistence coupling and no Store bypass.

## Explicitly deferred (as directed)

Per-revision subscriber lag histograms, Prometheus/OTel export, distributed
event-bus health, request log correlation in health views, alerting/rules
engine, and automatic health-driven actions remain on the roadmap.

## Recommendation

**Accept Milestone 3 Phase 2.** Live Health now gives operators a real-time,
read-only health/diagnostics/readiness view of ConfigCenter on top of the locked
foundation. Phase 3 (Audit Center) may proceed.