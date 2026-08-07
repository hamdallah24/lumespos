# Milestone 5 — Phase 1: Approval Workflow & Multi-level Policy — Acceptance Report

**Status:** COMPLETE · **Date:** 2026-08-06
**Scope:** Introduced the **Governance & Approval layer** as a **consumer-only
orchestration** on top of the locked Configuration Center. Phase 1 delivers the
**Approval Workflow**, **Multi-level Policy**, and the **Approval REST API**.
Approval is **policy-driven and DIRECT by default** — existing behavior and all
prior contracts remain unchanged.

---

## Constraint Compliance

- **Consumer-only**: the new `src/settings/governance/` module imports only
  *locked public surfaces* — `ConfigurationRegistry`, `ConfigurationPipeline`,
  `WriteActor`, `ConfigScope`. It never touches Store, Resolver internals, SDK,
  Event Bus, Audit, or Automation internals.
- **Pipeline ownership unchanged**: `propose()` **orchestrates existing
  `pipeline.plan()` + `pipeline.run()`** — validation, RBAC, preview, impact,
  health are all performed by the locked pipeline. **No governance logic is
  duplicated** and no pipeline code was modified.
- **DIRECT by default**: the policy engine returns `direct` unless a tier
  declares otherwise. All 129 pre-existing configuration tests still pass
  unchanged (now 142/142 with the 13 new governance tests).
- **No approval logic leaked into subsystems**: subsystems still read through
  the Configuration SDK; governance lives only at the controller boundary.
- **Golden contract intact** — checksum `-277bfa6c205e0594`, configVersion 1,
  44 fields identical (verified by `config-registry-golden.test.ts`).

## Deliverables (M5 Phase 1)

### 1. `PolicyEngine` (`governance/policy.ts`)
- Declarative multi-level matrix keyed by field criticality:
  - `low`/`medium` → **DIRECT** (0 approvals)
  - `high` → **1 approval** · `critical` → **2 approvals**
  - `secret` → at least **1 approval**
  - `executive` scope → at least **2 approvals** (raises the floor)
- `decision(changes, scope)` uses the **worst tier** across the change set.
- `policies()` exposes the matrix read-only for the dashboard.

### 2. `ApprovalRegistry` (`governance/approval.ts`)
- Full lifecycle: `PENDING → APPROVED / REJECTED / CANCELLED`.
- **Two-person rule**: `requiredApprovals` quorum from the policy tier.
- **Self-approval ban**: the requester can never approve their own request.
- **No-double-vote**: one actor, one vote.
- **Single-rejection veto**: any reject immediately rejects the request.
- **Cancel** by requester or owner/admin only.
- Every request records requester, scope, changes, policy reasons, votes
  (actor + role + timestamp), and — once committed — revision + correlationId.

### 3. `ConfigGovernance` (`governance/governance.ts`)
- `propose(actor, scope, changes)` →
  1. `pipeline.plan()` for validation + RBAC (blocked/invalid short-circuit)
  2. `PolicyEngine.decision()`
  3. DIRECT → `pipeline.run()` (commit) · otherwise → opens an `ApprovalRequest`
- `approve(id, approver)` — on quorum, **commits through `pipeline.run()`**
  (approval never grants new RBAC; the requester remains the actor).
- `reject` / `cancel` / `listRequests` / `getRequest` / `counts` / `policies`.

### 4. Approval REST API (additive)
- `POST /api/v1/settings/governance/propose` — DIRECT commits (200) or opens a
  PENDING request (202).
- `GET  /governance/requests` · `GET /governance/requests/:id`
- `POST /governance/requests/:id/approve` · `/reject` · `/cancel`
- `GET  /governance/policies` (matrix) · `GET /governance/status` (counts)
- Zod schemas added for proposal, request, vote, matrix, counts.
- **Backward compatible**: `PUT /:key` still returns the identical commit
  response for all DIRECT changes (all existing tests); only policy-gated
  writes now return `202 { status: "pending", request }`.

## Quality Gates

- Configuration suite: **142 / 142 PASS** (129 prior + 13 new governance).
- Golden Contract: checksum `-277bfa6c205e0594` unchanged, v1, 44 fields.
- `tsc` for `src/settings`: clean (no new errors).
- The only architecture-test failures (`TriggerEngine.ts`,
  `executives/CTO`) are **pre-existing and unrelated** to governance/settings.
- Locked modules: **zero modifications** to Registry, Store, Resolver, SDK,
  Event Bus, Snapshot, Audit, Automation, Governance Pipeline.

## Note on two-person semantics

Two-person approval is enforced *structurally*: `requiredApprovals: 2` (from
critical/secret-critical/executive tiers) requires two **distinct** approvers,
neither of whom may be the requester; any rejection vetoes. A single actor
cannot satisfy quorum alone.