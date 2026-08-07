# Milestone 5 — Phase 2: Approval Hardening & Approval Data Layer — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Hardening of the Phase 1 governance layer without changing its
contracts: **durability**, **immutable audit**, **detail/timeline API**,
**pending queue** (pagination/sort/filter/search), **TTL expiration**, an
**escalation/reminder hook**, and **concurrency protection** (optimistic
locking + duplicate-vote prevention). Approval remains **authorization only** —
the Store, Revision, and `ConfigurationChanged` event remain the sole source of
truth for configuration.

---

## Invariant Compliance (all maintained)

1. **Single pipeline** — every commit still goes through `pipeline.plan()`
   (validation + RBAC) → `pipeline.run()` (commit). No second pipeline exists.
2. **Approval is not a source of truth** — approval state lives in its own
   append-only journal, fully separated from the Settings Store. Approval
   **never creates a revision by itself**; a revision is created only when the
   pipeline commits an approved request.
3. **DIRECT stays default** — unchanged (`PolicyEngine` returns DIRECT unless a
   tier declares `APPROVAL_REQUIRED`).
4. **Policy determines workflow** — endpoints/UI/callers do not.
5. **Subsystems never see approval** — they still use `ConfigReader` /
   `ConfigResolver` / SDK only.
6. **Consumer-only** — no locked M1–M4 contract was modified.

## Deliverables (M5 Phase 2)

### 1. Durable, append-only Approval Journal (`governance/journal.ts`)
- Every transition (`created | approved | rejected | cancelled | committed |
  expired`) is an **immutable, frozen record** with a **global `seq`** and a
  **per-request monotonic `version`**.
- Request state is **derived by replay** — a fresh registry over the same
  journal rebuilds identical state (verified by test). This is the durability
  model: the journal can be flushed to SQL later with zero behavior change.

### 2. Event-sourced ApprovalRegistry (`governance/approval.ts`)
- `ApprovalRequest` now carries `version`, `expiresAt`, and a full `history`
  (immutable step list).
- All P1 invariants preserved: two-person quorum, self-approval ban,
  no-double-vote, single-reject veto, requester/owner cancel.
- **Optimistic locking**: `approve/reject/cancel` accept `expectedVersion`;
  stale writes fail with **409 conflict** (version check).
- **Duplicate-vote prevention** persists across journal replays.

### 3. Governance Service extensions (`governance/governance.ts`)
- `detail(id)` → request + full immutable timeline.
- `expirePending(now)` → **TTL auto-expire** (pending → `expired`).
- `dueAttention({sinceMs, warnMs})` → **escalation/reminder hook surface**
  (returns overdue / expiring-soon requests for a scheduler to act on).
- `listRequests` → paginated (`limit`/`offset`), sortable, filterable
  (`status`, `requesterId`), searchable (`search` over id/role/reason/keys).
- `counts()` now includes the `expired` bucket.

### 4. REST API (additive)
- `GET  /governance/requests` — queue with `status`, `requesterId`, `search`,
  `sort`, `order`, `limit`, `offset`.
- `GET  /governance/requests/:id/detail` — full timeline.
- `POST /governance/requests/:id/approve|reject|cancel` — optional
  `expectedVersion` (optimistic lock).
- `POST /governance/expire` — trigger TTL auto-expire.
- `GET  /governance/attention` — escalation/reminder data.
- Zod schemas updated (added `expired`, `version`, `expiresAt`, `history`,
  page shape, detail, attention).

## Quality Gates

- Configuration suite: **151 / 151 PASS** (142 prior + 9 new hardening).
- Golden Contract: checksum `-277bfa6c205e0594` unchanged, v1, 44 fields.
- `tsc` for `src/settings`: clean.
- Locked modules: **zero modifications** to Foundation, Store, Resolver, SDK,
  Event Bus, Snapshot, Audit, Automation, Pipeline.
- Only architecture-test failures remain the **pre-existing unrelated** ones
  (`TriggerEngine.ts`, `executives/CTO`).

## Architecture Notes

- **Durability without coupling**: the journal is governance's own append-only
  log — it does **not** reuse or write into the Settings Store, so governance
  state and configuration state remain cleanly separated (per the operator's
  Phase 1 requirement).
- **Approval ≠ truth**: the `committed` journal record only *links* the
  revision + correlationId produced by the pipeline; it does not create it.
- **Concurrency-safe**: two approvers racing on the same request are serialized
  by the per-request version; a stale client gets a 409 and must re-fetch.