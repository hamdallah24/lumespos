# Layer Rules — Lumé CMN v1.0

## Layer Stack (bottom to top)

```
Layer 1 — Foundation       Execution, Pipeline, Governor, Driver
Layer 2 — Intelligence     Adaptive Planning, Elastic Budget
Layer 3 — Organization     Multi-Executive, Collaboration, Board
Layer 4 — Learning         Experience → Reflection → Knowledge → Retrieval
Layer 5 — Collective       Consensus, Fusion, Reputation, Decisions
Layer 6 — Governance       Audit, Quality, Policy, Risk, Improvement
```

## Dependency Direction

**ONLY downward.** Lower layer MUST NOT import from upper layer.

```
✅ Allowed:         Learning → Execution
✅ Allowed:         Governance → Collective → Learning
❌ Forbidden:       Execution → Learning
❌ Forbidden:       Learning → Governance
```

## Layer-Specific Rules

### Foundation (Layer 1)
- FROZEN. No changes without ADR.
- `ExecutionGovernor` instantiated ONLY in `ExecutionDriver`
- `ExecutionContract` is IMMUTABLE

### Intelligence (Layer 2)
- Reads from Foundation, never modifies
- All modules: extension only, above frozen layer
- MissionAnalyzer, StrategySelector, ElasticBudget, etc.

### Organization (Layer 3)
- `OrganizationEngine.delegate()` is SSOT dispatcher
- `ExecutiveBoard` is SSOT registry
- No Runtime-to-Runtime direct calls

### Learning (Layer 4)
- `LearningEngine.cycle()` is single orchestrator
- Knowledge is graph, not text
- Executive memory is isolated

### Collective (Layer 5)
- Consensus weighted by reputation
- Knowledge fusion requires 2+ sources for validation
- All org decisions recorded

### Governance (Layer 6)
- `PolicyEngine` is single policy source — no magic numbers
- `GovernanceEngine.audit()` is single orchestrator
- All improvements flow through Governance

## Cross-Cutting Rules

| Rule | Applies To |
|------|-----------|
| No `new ExecutionGovernor` outside ExecutionDriver | ALL |
| No lifecycle loop outside ExecutionDriver | ALL |
| No DB operation outside services/ | ALL |
| No business logic in routes/ | ALL |
| No magic numbers — all from PolicyEngine | ALL |
| Public interfaces are stable | ALL |

## Verification

Run before every merge:

```bash
# Governor SSOT
rg "new ExecutionGovernor" src/ | wc -l  # must be 1 (execution-driver.ts)

# Reverse deps
rg "routes/ai-helpers" src/ai/ --files-with-matches  # must be 0 for DB functions

# TypeScript
pnpm --filter ./artifacts/api-server run typecheck  # must be 0 new errors
```
