# Future Modules — Lumé CMN v1.0

## Intentional (Reserved for Phase II)

These modules exist but are not yet wired into active dispatch. They are **not** orphans — they are scaffolding for planned features.

| Module | Location | Status | Planned Use |
|--------|----------|--------|-------------|
| `mission-runtime.ts` | `src/ai/programs/` | RESERVED | Phase II multi-agent mission management |
| `proposal-executor.ts` | `src/ai/programs/` | RESERVED | Phase II proposal workflow execution |
| `executive-runtime.ts` | `src/ai/programs/` | RESERVED | Phase II CFO/CMO/CHRO/CIO instantiation |

## Intentional (ECP-043 Integration Pending)

The Intelligence Layer (`src/execution/`) modules are self-contained and ready. They will be wired into the Governor when ECP-043 activation sprint runs.

| Module | Location | Status | Integration Point |
|--------|----------|--------|-------------------|
| `mission-analyzer.ts` | `src/execution/` | PLANNED | Governor.planExecution() → reads MissionProfile |
| `strategy-selector.ts` | `src/execution/` | PLANNED | Governor → reads StrategyPlan |
| `elastic-budget.ts` | `src/execution/` | PLANNED | Governor → reads ElasticBudget |
| `tool-strategy.ts` | `src/execution/` | PLANNED | Governor → reads ToolStrategy |
| `verification-profile.ts` | `src/execution/` | PLANNED | Governor → reads VerificationProfile |
| `exit-strategy.ts` | `src/execution/` | PLANNED | Governor → reads ExitStrategy |
| `mission-profile.ts` | `src/execution/` | PLANNED | Shared types for above |

## Compatibility Barrel Migration

| Module | Current | Target | When |
|--------|---------|--------|------|
| `ai-helpers.ts` | `src/routes/` compatibility barrel | `src/ai/index.ts` AI Facade | All `src/ai/` consumers migrated to direct imports |

## Audit Note

These modules are **excluded** from orphan detection. Any audit that flags them should reference this document.
