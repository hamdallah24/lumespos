# ADR-004: Runtime Purity

**Status:** ACCEPTED
**Date:** ECP-039–ECP-041
**Supersedes:** Runtime-embedded policy decisions

## Context

Runtimes (CEO, CTO, COO) previously contained hardcoded policy: tool lists, budget numbers, exit conditions. This violated the Governor SSOT principle.

## Decision

All Runtimes are **pure executors**. They only receive `ExecutionContract` and execute through the pipeline.

| Runtime | Mode | Tools Source | LLM Call |
|---------|------|--------------|----------|
| CEO | REASONING | None (empty) | `callDeepSeek` (single call) |
| CTO | EXECUTION | `execContract.allowedTools` | `callDeepSeekWithTools` → Pipeline |
| COO | REASONING | None (empty) | `ExecutionPipeline.execute()` |

## Rules

Runtime **MUST NOT**:
- Create `ExecutionGovernor`
- Set budget (`maxTokens`, `maxCycles`)
- Choose tools (`READ_TOOLS`, `DEVOPS_TOOLS`, `isDevOps ? ...`)
- Determine exit policy (`IMMEDIATE`, `OBJECTIVE_COMPLETED`)
- Determine verification policy (`LIGHT`, `STRICT`)
- Run lifecycle loops (`while`, `beforeCycle`, `afterCycle`)

Runtime **MUST**:
- Accept `ExecutionContract` parameter
- Read `contract.allowedTools` for tool list
- Delegate to `ExecutionPipeline` or `callDeepSeek`/`callDeepSeekWithTools`

## Violations

Any policy decision (budget, tools, exit, verification) in `src/ai/programs/` or `src/programs/` = Architecture Compliance FAIL.
