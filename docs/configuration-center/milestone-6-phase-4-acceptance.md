# Milestone 6 — Phase 4: Ecosystem Operations (ACCEPTANCE)

**Status:** READY FOR REVIEW
**Scope:** Ecosystem Health, Package Diagnostics, Capability Explorer, Lifecycle Operations, Operational Journal, Ecosystem REST/API.
**Contract:** additive, read-heavy observer/coordinator. Golden config contract unchanged (see §14).

---

## 1. Scope

Phase 4 layers an **Ecosystem Operations Layer** on top of the already-LOCKED
Plugin SDK (M6 P1), Impact Provider SDK (M6 P2), and Marketplace Foundation (M6 P3).
It is an **operational observer/coordinator**, not a redesign of the Marketplace
and not a public-marketplace security implementation. Six capabilities:

1. Ecosystem Health — read-only deterministic facade.
2. Package Diagnostics — read-only diagnostic engine.
3. Capability Explorer — projection-only capability surface.
4. Lifecycle/Operational Status — monitoring of package lifecycle.
5. Ecosystem Operational Journal — append-only, immutable, correlation-aware.
6. Additive REST surface (`/v1/ecosystem/*`) + facade/composition.

---

## 2. Architecture placement

```
                    Configuration Center
                           │
             ┌─────────────┴─────────────┐
       Configuration               Ecosystem
        Authority                 Operations (NEW, additive)
       Store/Pipeline/            │ read + explicit-op
       Resolver/Governance        ├── Marketplace Foundation (locked)
                                  ├── Plugin SDK / Impact SDK (locked)
                                  └── projections: Health/Diagnostics/Explorer/Journal
```

All ecosystem reads flow through the **public** PackageManager / registries; the layer
never acquires Store, Registry, Resolver, Governance, Revision, or Pipeline authority.

---

## 3. Health model (`health.ts`)

- Deterministic status `HEALTHY | DEGRADED | CRITICAL` from observable conditions only.
- Package registry surface: total / active / installed / invalid counts.
- `dependencyHealth` distinguishes truly-missing dependencies or cycles (**CRITICAL**)
  from incompatible versions / conflicts / duplicates (**DEGRADED**).
- `compatibilityHealth` — incompatible versions / plugin error count.
- `capabilityHealth` — provided vs unmet required capabilities.
- `lifecycleAnomalies` — active/installed package whose dependency is not active/installed.
- Classification: invalid manifests OR dependency CRITICAL OR plugin errors/
  compatibility CRITICAL → **CRITICAL**; any degraded/anomaly/unmet-cap → **DEGRADED**;
  else **HEALTHY**. No heuristics.

---

## 5. Diagnostics model (`diagnostics.ts`)

Read-only engine over the Marketplace registry. Kinds detected:
- `invalid-manifest`, `checksum-mismatch` (recomputed FNV-1a), `missing-dependency`,
  `dependency-conflict`, `dependency-cycle`, `incompatible-version`,
  `unreachable-dependency`, `blocked-removal`, `orphan-package`, `orphan-capability`.
- Severity `error`/`warning`; counts returned.
- Guaranteed no-mutation: consumes registry state snapshots only.

---

## 6. Capability projection (`explorer.ts`)

- `EcosystemExplorer` is a **projection**, not a second capability registry — it holds no
  capability state. It unions existing sources via adapters:
  - host capabilities (`__host__`),
  - `PackageCapabilitySource` over Marketplace `provides[]` (optionally
    Plugin SDK `CapabilityRegistry` / Impact SDK through additional adapters).
- `list(required?)`, `providersOf(...)`, `ofProvider(...)` — deterministic sort.

---

## 7. Lifecycle operations (`operations.ts`)

- `EcosystemOperations` monitors `DISCOVERED → VALIDATED → RESOLVED → INSTALLED →
  ACTIVE → REMOVED` via the **Locked `PackageManager` public surface** (install/remove;
  no internal registry state access).
- `status()`/`packages()` projection: current state, last transition, version,
  dependency status, checksum status, failure reason, operational timestamp.

---

## 8. Operational journal (`journal.ts`)

- **Append-only**: monotonic `seq`, chronological `timestamp`.
- **Immutable**: records are `Object.freeze`d on append; `list()`/`byPackage()`
  return frozen copies — mutation attempts throw.
- **Correlation-aware** and **actor-aware**; deterministic.
- `maxEntries` retention cap supported (in-memory operational audit only — not WORM).

Event types: `package.discovered|validated|install.started|install.completed|
install.failed|activated|remove.started|remove.completed|remove.blocked|
remove.forced|integrity.failed|dependency.failed`.

---

## 8. Force-removal semantics

Per the operator decision, the audit record is **enriched at the operations layer**,
NOT by changing the locked `PackageManager.remove(name, version, policy)` signature.

- `forceRemove(name, version, ctx)` requires an explicit non-empty `reason`.
- It captures `affectedDependents` BEFORE the removal and records
  `package.remove.forced` (with actor, reason/details, correlationId) in the journal;
  then calls the PackageManager public force path and records `remove.completed`.
- An empty reason is refused and recorded as `package.remove.blocked`.
- Force removal is therefore **never a silent bypass** — it is authorized, explicit,
  reason-aware, and always audited.

---

## 9. REST API

New additive router `src/settings/ecosystem/routes.ts`, mounted at `/v1/ecosystem`
in `src/routes/index.ts` behind `requireAuth`. Thin zod-validated mapping:

```
GET  /ecosystem/health
GET  /ecosystem/diagnostics            ?package=
GET  /ecosystem/packages
GET  /ecosystem/packages/:name
GET  /ecosystem/capabilities           ?required=a,b
GET  /ecosystem/events                 ?type=&package=
GET  /ecosystem/operations/:id
POST /ecosystem/packages/:name/install       (actor/correlationId)
POST /ecosystem/packages/:name/remove
POST /ecosystem/packages/:name/force-remove  (reason required)
```

Read-heavy; mutations are explicit, route through the PackageManager public surface,
and are always journaled. The locked `settings/api/*` surface is untouched.

---

## 10. UI

No UI implemented in this phase (Ecosystem Overview/Packages/Capabilities/Diagnostics/
Operations are listed under "Frontend **can** add" and would be built on
`/v1/ecosystem/*`). The `SettingsShell` contract is unchanged.

---

## 11. Security boundary

- Checksum remains **identity/integrity**, never trust/authenticity.
- Operations are **consumer-only**: diagnostics/health/journal never commit config,
  never create a revision, never call `pipeline.run()`, never mutate Registry/Resolver/
  Governance.
- No duplicate registry/dependency/capability authority; projections only.
- Force removal requires an explicit reason and is always journaled.

---

## 12. Deferred (unchanged)

Publisher signatures, PKI, trust/reputation, sandbox, remote hosting, provenance,
billing, multi-tenant isolation, distributed registry, Kafka/event streaming,
cryptographic audit chain, supply-chain security, auto-upgrade, self-healing — all
future scope. This is **not** a secure public marketplace.

---

## 13. Tests

New file: `tests/unit/settings/config-ecosystem-operations.test.ts` (**24 tests**)
covering per the required list:
- Health: healthy / degraded / critical (invalid, missing dep, incompatible),
- Diagnostics: valid, invalid manifest, checksum mismatch, missing, conflict-set cycle,
  incompatible version, blocked removal,
- Capability: discovery, filtering, package association, unavailable capability,
- Journal: append, immutable (frozen + mutation-throws), chronological, correlation,
- Operations: install trail, blocked removal record, **force-removal audit** (reason-aware + `remove.forced`), empty-reason refusal,
- Architecture: ConfigCenter store `revisionCount` unchanged across operations.

**Run:**
```
npx vitest run tests/unit/settings tests/architecture/config-registry-golden.test.ts tests/architecture/config-sdk-boundaries.test.ts
Test Files  18 passed (18)
Tests      236 passed (236)     [212 prior + 24 new]
```

**Typecheck:** `npx tsc -p tsconfig.json --noEmit` — clean for `src/settings/` (pre-existing
business-os/council + unrelated `src/*` errors unchanged).

---

## 14. Golden Contract verification

- Golden registry test (`config-registry-golden.test.ts`) — 4/4 passed.
  checksum **`-277bfa6c205e0594`**, `configVersion` **1**, **44 fields** — unchanged.
- Configuration catalog, defaults, scopes, metadata — untouched.

---

## 15. Locked-file verification

- New additive files under `src/settings/ecosystem/` (types, journal, journal-types,
  health, diagnostics, explorer, operations, composition, routes, `index.ts` barrel).
- Mount added in `src/routes/index.ts` (root aggregator; not a locked settings/api file).
- **No edits** to `src/settings/{registry,store,resolver,sdk,pipeline,defaults,health,
  metrics,capabilities,events,security}.ts`, `api/*`, `automation/*`, `governance/*`,
  `plugins/*`, `impact/*`, `marketplace/*` — all locked P1–P3 contracts byte-for-byte intact.

---

## 16. Pre-existing failures (unchanged, unrelated)

- `tests/architecture/import-boundaries.test.ts` — 2 failures (`public/` importing
  `internal/`; `executives/` non-contracts import). Configuration Center not involved.
- `business-os/council/*` and other `unrelated src/*` tsc errors — unchanged, not introduced
  by Phase 4.

---

## 17. Final status: **READY FOR REVIEW**

Implements the full requested Phase 4 surface additively and isolated: deterministic
health, read-only diagnostics, projection-only capability explorer, journaled lifecycle
operations with **always-audited force removal**, and an additive protected REST surface.
Golden contract, existing 212 tests, and all locked P1–P3 contracts remain intact.

Please review and declare **APPROVED** / **requested changes**.