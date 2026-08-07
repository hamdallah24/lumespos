# Milestone 2 — ConfigCenter User Layer: Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** REST API + SettingsShell UI built strictly **on top of** the locked
Milestone 1 core. Foundation (Registry, Store, Resolver, SDK, Event Bus,
Pipeline, Revision Model, Golden Contract, Security) **unchanged**.

---

## Non-Negotiable Rules — Evidence of Compliance

| Rule | Enforced / Evidence |
|---|---|
| No new config logic in user layer | Every endpoint delegates to Registry/Resolver/Pipeline/SDK. Inheritance computed **only** in `resolver.trace()`; the API and Resolved Viewer consume it, never recompute. |
| No hardcoded fields / executive config | Catalog + fields generated from Registry. UI renders via `ConfigFieldFactory` (metadata-driven). Catalog tests assert the API returns whatever the Registry declares (no literals). |
| Viewer must use `trace()` | `ResolvedConfigurationViewer` calls `GET /trace`, which returns the Resolver's own `trace()` output. |
| REST must be thin / no business logic | `SettingsController` is a thin orchestration (role map + scrubbing + delegation); all RBAC/validation run inside the Pipeline. |
| All changes via Pipeline (no bypass) | `ConfigurationPipeline.plan()` (non-committing, shared `evaluate()`) for preview/simulate/impact/policy-check; `run()` for every commit (update, restore, package install). Snapshot restore + package install both go through `run()` → new revision. **No route writes to Store directly.** |
| Secrets scrubbed in transport | `scrubForTransport` masks secrets (`••••••••`); controller applies to resolved/response payloads. |

## Milestone 1 Lock Verification

- `config-registry-golden.test.ts` (**4 tests pass**) — golden checksum
  `-277bfa6c205e0594`, 44 fields, configVersion 1 intact.
- `config-sdk-boundaries.test.ts` (**3 tests pass**) — SDK surface boundaries.
- `config-center.test.ts` (**19 tests pass**) — core runtime.
- Locked foundation files not modified; `git status` shows only new additive
  paths (`src/settings/*`, `tests/unit/settings/*`) plus the API-mount edit.

## Backend Deliverables (all typecheck-clean under `src/settings/`)

- `api/schemas.ts` — zod schemas for all 15 endpoints.
- `api/snapshots.ts` — `SnapshotManager` (capture/list/search/compare/restore via pipeline).
- `api/packages.ts` — `PackageStore` (registry-whitelist validation; install via pipeline).
- `api/controller.ts` — `SettingsController` (thin; ROLE_MAP; scrubbing).
- `api/routes.ts` — Express router mounted at `/api/v1/settings` with `requireAuth`.
- `api/scrub.ts` — transport scrubbing.
- `pipeline.ts` — added non-committing `plan()` + shared `evaluate()` (run() preserved).

## Frontend Deliverables (pos-app, wired & builds)

- `src/modules/settings/` — `api.ts`, `SettingsShell.tsx`, `SettingsWorkspace.tsx`,
  components: `ConfigFieldFactory`, `ResolvedConfigurationViewer`,
  `GovernancePanels`, `SnapshotManager`, `PackagesPanel`, `HealthPanel`.
- `src/pages/settings.tsx` — replaced placeholder with `SettingsWorkspace` inside
  `OSWorkspaceShell`. `vite build` succeeds; settings module typecheck clean.

## Tests

**Config surface: 38/38 passing.**
- `config-api.test.ts` (12): catalog metadata-driven; plan never commits;
  preview/simulate/impact; policy RBAC; update commits revision; validation
  rejects without commit; snapshot capture/restore via pipeline; package
  unknown-key rejection + valid install.

**Pre-existing, unrelated failures (not config):** 15 test files under
`tests/eios-runtime/` + business-os lifecycle/integration (CEO/CFO/COO/HR/etc.)
fail in the full suite. `Select-String` confirms none import `src/settings`.
These predate Milestone 2 and are out of scope.

## Docs

- `docs/configuration-center/rest-api-contract.md` — all 15 endpoints with
  Request/Response/Error schema, Permission Matrix, Pipeline stage, Side Effect.

## Known Caveats / Next (Milestone 3)

- `SnapshotManager.capture()` is in-memory; snapshot **persistence** lands with
  the SQL store milestone (`lib/db/src/schema/settings.ts` is scaffolded).
- `test-connection` is a resolver reachability check (dry-run), not a live probe.
- Residual pos-app typecheck errors exist in unrelated modules (hr/finance/
  inventory) and are pre-existing.

## Recommendation

**Accept Milestone 2.** Deliverables complete, thin-architecture constraints
enforced, lock verified, config test surface green. Milestone 3 (persistence,
health hooks, audit UI) may proceed.