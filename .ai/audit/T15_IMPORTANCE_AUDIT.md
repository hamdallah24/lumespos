# T15 — Importance Audit

## What Was Checked
Whether `ImportanceEngine.score()` results are ever used to influence memory selection, ranking, or prompt content.

## Finding: ❌ NOT ADOPTED

### Evidence

**1. ImportanceEngine is instantiated but never reached**
- `MemoryEngine.ts:37` — `private importance = new ImportanceEngine()`
- Only called at `MemoryEngine.ts:75-83` inside `MemoryEngine.write()`
- `memoryProvider.write()` has **zero callers** across the entire codebase

**2. The read path does NOT use importance**
- `MemoryProvider.ts` — the `read()` function fetches from 6 legacy stores (ContextManager, ExecutiveMemoryProvider, semanticRecall, etc.)
- Results are sorted by hardcoded `priority` field (1-6), NOT by importance score
- `buildMemoryContext()` at `MemoryProvider.ts:145-180` uses priority order: workingMemory(1) > recentDecisions(2) > episodicMemory(3) > knowledgeContext(4) > semanticMemory(5) > organizationalMemory(6)

**3. No importance-based ranking exists**
- No call to `classifyImportance()` exists outside the engine module
- No executive sorts or filters memory by importance
- The `MemoryContext` type has no importance field

### Call Chain (dead)
```
memoryProvider.write() [0 calls]
  → MemoryEngine.write()
    → importance.score({...})
      → classifyImportance(score.total)  [0 production uses]
```

### Impact
Memory is returned to executives in a fixed priority order regardless of actual importance. A low-importance decision with priority=1 (workingMemory) always appears before a high-importance decision with priority=2 (recentDecisions).

## Verdict
**Importance scoring: IMPLEMENTED BUT NOT ADOPTED.** Score is calculated but never consumed.
