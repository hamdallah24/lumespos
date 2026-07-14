# T15 — End-to-End Verification

## Scenario
User input: *"Buat strategi ekspansi Lumé menjadi 20 cabang dalam 3 tahun."*

## Expected Trace
```
Memory READ → Importance → Selection → Executive → Decision → Memory WRITE → Promotion → Trace
```

## Actual Trace (CEO Execution)

### Step 1: Memory READ ✅
`CEOProgram.ts:207-213` calls:
```typescript
memoryProvider.read({
  executive: "CEO",
  query: "Buat strategi ekspansi Lumé menjadi 20 cabang dalam 3 tahun.",
  domain: spec.domain,
  memoryScope: "organization",
  maxTokens: 2500,
});
```
Result: `MemoryContext` with up to 6 blocks from legacy stores.

### Step 2: Importance ❌
No importance scoring occurs. The `buildMemoryContext()` function uses a hardcoded priority order (1-6), not importance-based ranking.

### Step 3: Selection ❌
Memory blocks are selected by fixed priority, not by importance. Token budget enforcement applies but does not rank by importance.

### Step 4: Executive Reasoning ✅
`CognitiveEngine.think()` called with memory context in `context.memoryContext`.

### Step 5: Decision ✅
LLM generates a decision via `callDeepSeek()`. Decision recorded via:
- `KnowledgeProvider.ingestEpisode()` at `CEOProgram.ts:267`
- Observer `"decision.made"` → `ExecutiveMemoryProvider.recordDecision()`

### Step 6: Memory WRITE ❌
`memoryProvider.write()` is **NOT CALLED**. The decision is written to:
- `ExecutiveMemoryProvider` (legacy decision store) — via observer event
- `KnowledgeProvider` (knowledge store) — via direct call
- But NEVER to `MemoryEngine` via `memoryProvider.write()`

### Step 7: Promotion ❌
`MemoryEngine.promoteAll()` is **NOT CALLED**. No lifecycle transition occurs.

### Step 8: Trace ❌
`CognitiveTraceStore.recordTrace()` stores a trace, but:
- `MemoryTrace` and `MemoryHistory` are never involved
- Stored traces are never read back into the pipeline

### Flow Diagram (Actual vs Expected)
```
EXPECTED:
  Read → Importance → Selection → Think → Decision → Write → Promote → Trace
                                                                         ↓
                                                                   Lifecycle

ACTUAL:
  Read → [fixed priority] → Think → Decision → [legacy stores] → [nothing]
                                                                         ↓
                                                                   No lifecycle
```

## Bottleneck Analysis
| Step | Expected | Actual | Gap |
|------|----------|--------|-----|
| Memory Read | ✅ | ✅ via 6 legacy stores | — |
| Importance Ranking | ✅ | ❌ Fixed priority only | No `ImportanceEngine` integration in read path |
| Importance-Based Selection | ✅ | ❌ Token-budget only, no importance filter | `classifyImportance()` never called |
| Cognitive Reasoning | ✅ | ✅ with `context.memoryContext` | Memory passed but not consumed by pipeline |
| Decision | ✅ | ✅ LLM output | — |
| Memory Write (to Engine) | ✅ | ❌ Never called | `memoryProvider.write()` has 0 callers |
| Lifecycle Transition | ✅ | ❌ Never triggered | `validateMemory()` / `promoteAll()` has 0 callers |
| Promotion | ✅ | ❌ Never triggered | `runMaintenanceCycle()` has 0 callers |
| Forgetting | ✅ | ❌ Never triggered | `runMaintenanceCycle()` has 0 callers |
| Duplicate Detection | ✅ | ❌ Never triggered | `ConsolidationEngine` has 0 callers |
| Conflict Resolution | ✅ | ❌ Never triggered | `ConflictResolver` has 0 callers |
| Trace Events | ✅ | ❌ Only CognitiveTraceStore, no MemoryTrace | `MemoryTrace` never instantiated |

## Verdict
**E2E: FAIL.** The expected pipeline trace is broken at 9 of 12 checkpoints. The Memory Engine subsystem is completely bypassed in the production flow. All decision data flows through legacy stores (ExecutiveMemoryProvider, KnowledgeProvider) instead.
