# Configuration Center — REST API Contract

Milestone 2 user layer. All endpoints are **thin** — HTTP → `ConfigCenter` →
`Pipeline` → `Store`. No endpoint contains validation, inheritance, resolution
or policy logic; that all lives in the locked Milestone 1 foundation.

- Base path: `/api/v1/settings`
- Auth: `requireAuth` (session). Actor role is derived from `req.user.role` and
  mapped to a `ConfigRole`; **authorization is enforced in the Pipeline**
  (`security.canWrite`), never in the route.
- All write/commit endpoints go through `ConfigurationPipeline.run()` which
  produce a new **revision** and an **audit** trail. Preview endpoints use the
  non-committing `ConfigurationPipeline.plan()` — they never touch the Store.

---

## Permission Matrix

`ConfigRole` derives from the authenticated user role: `owner→owner`,
`manager→manager`, `admin→admin`, `developer→developer`, `viewer→viewer`,
`cashier→viewer`.

| Endpoint | Method | Reading any role? | Writing requires |
|---|---|---|---|
| `/` catalog | GET | yes | — |
| `/resolved` | GET | yes | — |
| `/trace` | GET | yes | — |
| `/:key` | GET | yes | — |
| `/:key` | PUT | — | `canWrite(role, scope)` via Pipeline |
| `/preview` | POST | yes (plan) | evaluated only |
| `/simulate` | POST | yes (plan) | evaluated only |
| `/impact` | POST | yes (plan) | evaluated only |
| `/policy-check` | POST | yes (plan) | evaluated only |
| `/restore` | POST | — | `canWrite` via Pipeline |
| `/packages/install` | POST | — | `canWrite` via Pipeline |
| `/health` | GET | yes | — |
| `/health/summary` | GET | yes | — |
| `/health/diagnostics` | GET | yes | — |
| `/health/metrics` | GET | yes | — |
| `/health/readiness` | GET | yes | — |
| `/health/liveness` | GET | yes | — |
| `/audit/timeline` | GET | yes | — |
| `/audit/search` | GET | yes | — |
| `/audit/:revision` | GET | yes | — |
| `/audit/correlation/:correlationId` | GET | yes | — |
| `/audit/export` | GET | yes | — |
| `/test-connection` | POST | yes | — |

Deny-wins: a change is committed only if the pipeline's RBAC gate passes.

---

## Endpoints

### GET `/` — Catalog (metadata-driven)

Lists the Registry catalog grouped by category. UI fields are generated from
this response — never hardcoded.

- Query: `category?`, `search?`
- Response: `{ version, checksum, groups: [{ id, title, category, description?, fields: ConfigFieldMeta[] }] }`
- Pipeline stage: none (read from Registry)
- Side effect: none

### GET `/:key` — Single field

- Query: `workspaceId?`, `branchId?`, `executiveRole?`
- Response: `{ field: ConfigFieldMeta, resolved: ResolvedValue, trace: ResolvedValue[] }`
- Pipeline stage: none (read via Resolver `resolve` + `trace`)
- Side effect: none

### PUT `/:key` — Commit a field

- Body: `{ scope: ConfigScope, value: ConfigValue }`
- Pipeline stage: full chain `VALIDATE → PREVIEW → SIMULATION → IMPACT → POLICY →
  HEALTH → COMMIT → EVENT → AUDIT → ACTIVE → SNAPSHOT`
- Side effect: **creates a new revision**, publishes `configuration.changed`,
  records audit. Nothing is applied partially.

### POST `/preview` — Diff (never commits)

- Body: `{ scope, changes }`
- Pipeline stage: `VALIDATE → PREVIEW` (via `plan()`)
- Response: `{ ok, before, after }` — secret values scrubbed
- Side effect: **none**

### POST `/simulate` — Behavioral estimate (never commits)

- Body: `{ scope, changes }`
- Pipeline stage: `SIMULATION` (via `plan()`)
- Response: `{ items: [{ key, estimate, confidence, reason }] }`
- Side effect: none

### POST `/impact` — Affected subsystems (never commits)

- Body: `{ scope, changes }`
- Pipeline stage: `IMPACT` (Registry dependency edges + owner)
- Response: `{ impacted: string[] }`
- Side effect: none

### POST `/policy-check` — RBAC gate (never commits)

- Body: `{ scope, changes }`
- Pipeline stage: `POLICY` (via `plan()`)
- Response: `{ ok, reason?, scope, actor }`
- Side effect: none

### GET `/resolved` — Effective configuration

- Query: `workspaceId?`, `branchId?`, `executiveRole?`
- Returns every registered key merged via the Resolver; secrets scrubbed.
- Side effect: none

### GET `/trace` — Inheritance trace (Resolved Viewer)

- Query: `key` (required), `workspaceId?`, `branchId?`, `executiveRole?`
- Returns `ResolvedValue[]` **exactly as the Resolver computes it**. The UI never
  re-computes inheritance.
- Side effect: none

### GET `/snapshots` — List + search snapshots

- Query: `search?`
- Response: `{ items: ConfigSnapshot[] }`
- Side effect: read-only

### POST `/snapshots` — Capture (M3, persistent)

- Body: `{ name, scope, origin?, environment?, reason?, correlationId?, pipelineStage? }`
- `origin`: `manual | automatic | pre-deploy | scheduled | rollback | migration`
- Captures the **Resolver effective configuration** for the scope as an immutable
  `payload` + the Store override set as `changes`.
- Computes `fingerprint { checksum, registryChecksum, configVersion, revisionNo }`.
- Persisted via the injected `SnapshotPersistence` (SQL `settings_snapshot` table
  in the operational path; memory in test/dev — identical contract).
- Side effect: writes an immutable snapshot row.

### GET `/snapshots/:id` — One snapshot

- Response: full snapshot incl. `fingerprint`, `origin`, `triggerType`, `status`,
  `pinned`, `metadata { actor, correlationId, pipelineStage, reason, sourceRevision }`,
  `payload`, `changes`.
- Side effect: read-only.

### POST `/snapshots/:id/verify` — Restore verification (never commits)

Checks **before** any restore reaches the Governance Pipeline:
1. snapshot exists
2. checksum valid (payload integrity)
3. configVersion compatible with the current registry version
4. payload intact (well-formed object)
5. registry compatible (every payload key still declared)

- Response: `{ ok, reasons[], snapshotId }`
- Side effect: none — a failed verification blocks restore entirely.

### POST `/snapshots/:id/restore` — Restore via the Governance Pipeline

- Workflow: `Verify → (Pipeline: Preview → Diff → Impact → Policy → Health) → Commit new revision → ConfigurationChanged → Subscriber reconcile`
- Restore produces a **new revision** (linear history) — it never reactivates an
  old revision and never touches the Store directly.
- Source snapshot is marked `RESTORED` (status is metadata only).
- Response: `{ ok, revision, correlationId, snapshotId }`

### POST `/snapshots/:id/pin` / `/unpin` — Manual pin (retention-safe)

- Pinned snapshots are **never** collected by retention or GC.
- Side effect: metadata-only (`pinned=true`, status=`PINNED`).

### GET `/snapshots/:id/compare/:otherId` — Field-level diff

- Diff of two snapshots' effective payloads. Pure read.

### POST `/snapshots/retention` — Retention policy + candidates (M3)

- Body: `{ keepLatest: number, keepYoungerThanDays: number }`
- `keepLatest`: keep the newest N snapshots per `environment|scope` bucket.
- `keepYoungerThanDays`: keep snapshots younger than X days.
- Pinned and referenced (`RESTORED`/`ARCHIVED`) snapshots are always excluded.
- Response: `{ policy, candidates[] }` — candidates are what GC would collect.

### POST `/snapshots/gc` — Garbage collection (M3)

- Deletes snapshots that pass the retention policy AND are not pinned AND not
  referenced.
- **Always emits a GC audit event** (`snapshot.gc`) with collected ids, policy,
  skipped-pinned/referenced counts.
- Response: the `snapshot.gc` event.

### GET `/snapshots` legacy shape unchanged — the M2 contract is preserved.

### GET `/packages` — List configuration packages

- Response: `{ items: ConfigPackage[] }`
- Side effect: read-only

### POST `/packages/install` — Install a package via the Pipeline

- Body: `{ packageId, scope?, dryRun? }`
- Whitelist: package keys are validated against the Registry before apply.
- Side effect: **new revision + audit** (unless `dryRun`).

### GET `/health` — ConfigCenter health report

- Response: registry / store / resolver / eventBus status + capabilities.
- Side effect: none

### GET `/health/summary` — Live health overview (M3 Phase 2, additive)

- Richer read-only aggregate: registry consistency, store revision, resolver
  cache, event bus delivery (delivered vs store revision, subscribers,
  published events), snapshot counts + retention policy + last restore,
  capabilities, `updatedAt`.
- Side effect: none. Does not change the locked `/health` contract.

### GET `/health/diagnostics` — Live diagnostic checks (additive)

- Response: `{ status, checks: [{ id, title, status, detail }] }`.
- Checks: registry.consistency, resolver.warmed, store.revision,
  eventbus.delivery, snapshots.integrity, metrics.sanity.
- Side effect: none.

### GET `/health/metrics` — Live metrics snapshot (additive)

- Response: `{ counters, latencies }` — same shape as the internal
  `ConfigMetrics.snapshot()` (cache hits, published events, resolver/commit
  latency). Side effect: none.

### GET `/health/readiness` — Operational readiness (additive)

- Response: `{ ready, status, checks }`. `ready` is false when any critical
  check (registry.consistency, store.revision, snapshots.integrity) is not ok.
- Side effect: none.

### GET `/health/liveness` — Process liveness (additive)

- Response: `{ alive, status, stamp }`. Cheap probe that the registry responds.
- Side effect: none.

### GET `/audit/timeline` — Audit timeline (M3 Phase 3, additive)

- Query: `origin?`, `from?`, `to?`, `limit?`
- Response: `{ total, events: [{ id, origin, timestamp, revision?, correlationId?, actor?, scope?, changedKeys, triggerType?, status?, message?, metadata? }] }`
- Indexes the authoritative Store revision log + snapshot lifecycle events + GC
  audit events. Read-only. Side effect: none.

### GET `/audit/search` — Audit explorer (additive)

- Query: `actor?`, `scopeType?`, `revision?`, `correlationId?`, `triggerType?`, `status?`, `from?`, `to?`, `configVersion?`
- Response: same timeline shape. Filters are additive; no writes.

### GET `/audit/:revision` — Change details (additive)

- Response: revision metadata + scope, changedKeys, before/after/diff (replayed
  from the Store log), pipeline gates, linked snapshots, restore origin,
  configVersion, correlated health snapshot. Read-only.

### GET `/audit/correlation/:correlationId` — Correlation graph (additive)

- Response: `{ correlationId, nodes: [{kind,label,data}], edges: [{from,to,relation}] }`
- Chains: Configuration Change → Revision → Snapshot → Audit → ConfigurationChanged
  Event → Health state → Restore. Read-only, no mutation.

### GET `/audit/export` — Audit export (additive)

- Response: CSV attachment with the revision timeline. Read-only.

### POST `/test-connection` — Resolve a key in a context

- Body: `{ key, context? }`
- Reports whether the value is configured, secret, and its resolving source.
- No live probe (M1 health is dry-run); this is a resolver reachability check.

---

## Error Shape

```
{ "error": string, "correlationId"?: string, "detail"?: unknown }
```

| Status | Meaning |
|---|---|
| 400 | invalid body / missing query param |
| 401 | unauthenticated (`requireAuth`) |
| 403 | policy / RBAC denies the change |
| 404 | unknown configuration key |
| 422 | validation failed (shape/scope/immutable/allowed-scope) |
| 500 | internal error |

---

## Non-Negotiable Rules (enforced)

1. **No new config logic** — every endpoint delegates to Registry/Resolver/
   Pipeline/SDK. Nothing recomputes inheritance.
2. **No Store bypass** — commits, restores and installs go **only** through
   `ConfigurationPipeline.run()`; the `/preview`/`simulate`/`impact`/`policy` use
   `ConfigurationPipeline.plan()` (read-only, same gates).
3. **No hardcode** — catalog responses are generated from the Registry; the UI
   renders via `ConfigFieldFactory`.
4. **Resolved Viewer uses `trace()`** — never computes inheritance in the UI.