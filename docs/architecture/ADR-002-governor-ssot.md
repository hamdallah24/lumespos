# ADR-002: Governor SSOT

**Status:** ACCEPTED
**Date:** ECP-039
**Supersedes:** Ad-hoc policy in Runtime/LLM adapter

## Context

Execution policy (tools, budget, exit strategy, verification) was scattered across Runtime, LLM adapter, and ai-helpers. No single source of truth.

## Decision

`ExecutionGovernor` is the **single source of truth** for all execution policy.

Governor owns:
- `planExecution()` — generates `ExecutionContract`
- `beginExecution()` — telemetry setup
- `observe()` — record facts, no decisions
- `evaluate()` — STOP / CONTINUE / CONCLUDE
- `finishExecution()` — journal + telemetry finalize

## Rules

1. **ONLY** `ExecutionDriver` may instantiate `ExecutionGovernor` (line 35)
2. Runtime **MUST NOT** create Governor, set budget, choose tools, determine exit/verification
3. Runtime **MUST** read `ExecutionContract` for all policy
4. `ExecutionContract` is **IMMUTABLE** once created by Governor

## Violations

```ts
// FORBIDDEN — Runtime must never create Governor
new ExecutionGovernor(...)  // ❌

// FORBIDDEN — Adapter must never run lifecycle
while (governor.shouldContinue()) { ... }  // ❌
```

Any `new ExecutionGovernor` or Governor lifecycle call outside `ExecutionDriver` = Architecture Compliance FAIL.
