# Dependency Rules — Lumé CMN v1.0

## Allowed Dependencies

```
Route (ai.ts)
    ↓
AI Barrel (ai-helpers.ts)
    ↓
Runtime (CEO / CTO / COO)
    ↓
Gateway (llm-gateway.ts)
    ↓
Adapter (llm-adapter.ts)
    ↓
Service (ai-memory-service.ts)
    ↓
Database
```

## Allowed by Layer

| From | May Import From |
|------|----------------|
| Governance | Collective, Learning, Organization, Execution, AI/runtime |
| Intelligence (Collective) | Learning, Execution, AI/runtime |
| Learning | AI/runtime |
| Organization | AI/runtime |
| Execution | AI/runtime, LLM, Tools |
| LLM | runtime, tools, services |
| Tools | Node.js stdlib only |
| Services | @workspace/db only |
| Routes | AI barrel, services |

## Forbidden Dependencies

| Pattern | Reason |
|---------|--------|
| `src/ai/` → `src/routes/` (DB functions) | Layer violation — routes cannot host business services |
| `src/execution/` → `src/governance/` | Reverse layer dependency |
| `src/learning/` → `src/governance/` | Reverse layer dependency |
| Runtime → `ExecutionGovernor` import | Governor SSOT violation |
| LLM adapter → `ExecutionGovernor` import | Lifecycle violation |
| Tool adapter → any upper layer import | Tool adapter must remain stateless |
| Services → any business logic layer | Services are data-only |
| Routes → business logic | Routes are HTTP transport only |

## Runtime → LLM Chain

```
Runtime
    ↓
Gateway (llm-gateway.ts)    ← abstraction layer
    ↓
Adapter (llm-adapter.ts)    ← stateless communication
    ↓
Provider (DeepSeek API)     ← HTTP fetch
```

**Rule**: Runtime MUST NOT import llm-adapter directly. Use Gateway or barrel.

## Runtime → Tool Chain

```
Runtime
    ↓
Tool Executor (tool-executor.ts)  ← abstraction layer
    ↓
Tool Adapter (tool-adapter.ts)    ← stateless execution
```

**Rule**: Runtime MUST NOT import tool-adapter directly. Use Tool Executor or barrel.

## Verification

```bash
# Check: no DB function imports from ai/ to routes/
rg "from.*routes/ai-helpers" src/ai/ --files-with-matches

# Check: governor only in execution-driver
rg "new ExecutionGovernor" src/ | grep -v execution-driver

# Check: no lifecycle in llm/
rg "while|shouldContinue|beforeCycle|afterCycle" src/ai/llm/
```
