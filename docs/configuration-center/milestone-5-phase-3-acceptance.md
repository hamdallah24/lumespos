# Milestone 5 — Phase 3: Change Freeze & Maintenance Window (ACCEPTANCE)

**Status:** ACCEPTED (pending operator review)
**Scope:** Operational governance — Change Freeze, Maintenance Window, Freeze+Window gate evaluation, Emergency Override, Governance Calendar, M4 scheduler integration.
**Contract:** additive, consumer-only. Golden config contract unchanged (see §5).

---

## 1. Objective

Phase 3 delivers the **operational governance** half of Milestone 5: the ability to
hold the system steady during defined windows and freeze periods, and to open an
audited emergency lane when a human operator decides the operational gate must be
temporarily bypassed.

It respects every M5 architectural constraint:

- **Consumer-only** — governance never modifies bypassed or locked M1–M4 contracts.
- **Governance orchestration only** — change commits always flow through the existing
  `pipeline.plan()` / `pipeline.run()`; there is still exactly one pipeline.
- **No new revision source** — approval/break-glass never creates a revision;
  Store → Revision → `ConfigurationChanged` remains the sole source of truth.
- **Single evaluation point** — freeze + window conditions are evaluated inside
  `PolicyEngine.gate()`.
- **Additive** — zero changes to locked files.

---

## 2. Delivered Surface

### 2.1 Change Freeze (`src/settings/governance/freeze.ts`)
`ChangeFreezeRegistry` with `FreezeScopeMatch` granularity:

| Granularity | Scope match |
|---|---|
| **Global** | blocks every workspace |
| **Workspace** | blocks one `workspaceId` |
| **Branch** | blocks one `branchId` |
| **Executive** | blocks one `executiveRole` |
| **Keys** | optional `keys[]` restricts the freeze to those config keys |

Every freeze may carry `from`/`until` (scheduled freeze — effective only within that
range). Methods: `create / revoke / list / get / effectiveAt(at) / matching(c/scope) / isFrozen`.

### 2.2 Maintenance Window (`src/settings/governance/window.ts`)
`MaintenanceWindowRegistry`:

- **Recurring** — `days` (Sun..Sat) + `startMinute`/`endMinute` from midnight, with
  midnight-crossing support (`endMinute < startMinute`).
- **One-off** — absolute `from`/`to` timestamps.

Evaluation: `activeAt(now)`, `within(now)`, `nextAt(now)` (null-safe), `create / remove / list / get`.

### 2.3 Gate evaluation in `PolicyEngine` (`policy.ts`)
`gate({ changes, scope })` returns an `OperationalGate`:
`{ ok, blocked, reasons, frozenBy, windowRequired, withinWindow, activeWindow }`.
This is the **single evaluation point** in which freeze + window conditions meet.

`canOverride(actor)` returns true only for **owner** and **admin**.

### 2.4 Emergency Override / Break Glass (`governance.ts`)
`ConfigGovernance.breakGlass({ actor, scope, changes, reason })`:

- Requires `owner`/`admin` (`canOverride`), else 403.
- Still performs `pipeline.plan()` — **validation + RBAC always apply**; only the
  operational (freeze/window) gate and approval tier are bypassed.
- Commits via `pipeline.run()` and returns `{ revision, correlationId }`.
- Appends a **`break-glass`** record to the immutable `GovernanceGateLog` with reason,
  correlationId, revision, and the overridden gate reasons.

### 2.5 Audit (`src/settings/governance/gates-log.ts`)
`GovernanceGateLog` — append-only, immutable frozen records, monotonic `seq`:
`freeze.created`, `freeze.revoked`, `window.created`, `window.removed`, `break-glass`.

### 2.6 Governance Calendar (`governance.ts: calendar()`)
Read-only projection of
`{ activeCount/active/all freezes, activeWindow/nextStartAt/withinWindow }`.

### 2.7 Scheduler integration (`governance.ts: registerScheduler()`)
Registers exactly **one generic job** `governance.ops.tick` on the locked M4
`BackgroundScheduler` — `tick()` auto-expires stalled approvals and reflects current
freeze/window state. No singleton, no auto-start (matches M4 contract).

---

## 3. REST endpoints added

| Method | Path | Purpose |
|---|---|---|
| POST | `/governance/freeze` | create a freeze (scope + optional keys/time) |
| GET | `/governance/freeze` | list freezes |
| POST | `/governance/freeze/:id/revoke` | lift a freeze |
| POST | `/governance/windows` | create a recurring/one-off window |
| GET | `/governance/windows` | list windows |
| DELETE | `/governance/windows/:id` | remove a window |
| GET | `/governance/calendar` | read-only calendar projection |
| POST | `/governance/break-glass` | audited emergency override |
| (job) | `governance.ops.tick` | scheduler-backed maintenance tick |

All routes validated via zod (`freezeCreateBodySchema`, `windowCreateBodySchema`,
`governanceCalendarSchema`, `breakGlassBodySchema`, …). Everything sits **before** the
`/:key` catch-all (additive, no route collisions).

---

## 4. Verification

**Typecheck:** `npx tsc -p tsconfig.json --noEmit` clean.

**Tests** — `tests/unit/settings/config-governance-gates.test.ts` (13 added):

- Global / workspace / branch / executive-granularity freeze blocking, including the
  **key-subset** freeze (only listed keys blocked).
- Scheduled freeze respected `from`/`until`; `revoke` lifts the freeze.
- One-off window gates a critical change outside the window (blocked, not
  manager-overridable) and is allowed inside (still requiring approval for the high tier).
- No windows configured → no window gate (backward-compatible).
- Recurring window active/next-start math.
- Break glass by owner commits a new revision, records a `break-glass` audit entry, and
  is denied to non-owner/admin; invalid change is still rejected (validation intact).
- Calendar is a read-only projection.
- `registerScheduler` puts one generic `governance.ops.tick` job on the M4 scheduler and
  runs it to success.

**Run:** `npx vitest run tests/unit/settings tests/architecture/config-registry-golden.test.ts tests/architecture/config-sdk-boundaries.test.ts`

```
Test Files  14 passed (14)
Tests      164 passed (164)
```

**Golden contract:** `tests/architecture/config-registry-golden.test.ts` — 4/4 passed;
checksum `-277bfa6c205e0594`, configVersion `1`, field count 44. Unchanged.

---

## 5. Locked / untouched contracts (must remain unchanged)

- `src/settings/{registry,store,resolver,sdk,pipeline,defaults,health,events,metrics,capabilities}.ts`
- `api/{snapshots,snapshot/*,audit/*,health/source}.ts`
- `automation/{scheduler,snapshot-maintenance,drift,maintenance-service}.ts`
- M5 P1/P2 acceptance contracts (procure DIRECT-by-default, journal, replay)

Unrelated pre-existing failures (not caused by this phase):
`tests/architecture/import-boundaries.test.ts` (`public/TriggerEngine.ts` internal
import; `executives/CTO` imports eios-runtime).

---

## 6. Acceptance

Phase 3 is complete and green. Freeze, window, the single-evaluation gate, audited break
glass, read-only calendar, and M4-scheduler tick are all delivered additively with full
type safety. Please review and declare **ACCEPTED** / **requested changes**.