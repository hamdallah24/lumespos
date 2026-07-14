# T15 — Conflict Resolution Audit

## What Was Checked
Whether `ConflictResolver.resolve()` is ever called in the runtime to resolve conflicting memories.

## Finding: ❌ NOT ADOPTED

### Evidence

**1. ConflictResolver instantiated but never reached**
- `MemoryEngine.ts:39` — `private resolver = new ConflictResolver()`
- `ConsolidationEngine.ts:14` — `private resolver: ConflictResolver = new ConflictResolver()`
- `ConflictResolver.resolve()` is called only from `ConsolidationEngine.consolidate()`
- `ConsolidationEngine.consolidate()` has **zero callers** outside test files

**2. No conflict detection in the read path**
- When executives read memory, conflicting information from different stores is concatenated as-is
- No conflict resolution strategy is applied to the MemoryContext before it reaches the LLM
- The LLM must resolve contradictions on its own

### Available Strategies (Unused)
| Strategy | Selection Criterion |
|----------|-------------------|
| `keep_newer` | Most recent `updatedAt` |
| `keep_older` | Earliest `updatedAt` |
| `keep_higher_importance` | Highest `importance.total` |
| `keep_higher_confidence` | Highest `confidence` |
| `merge` | Combined importance + confidence score |

### Dead Method Chain
```
ConsolidationEngine.consolidate() [0 calls]
  → ConflictResolver.resolve() [0 calls]
    → compare() with selected strategy
    → returns survivingRecord + discardedIds
```

## Verdict
**Conflict resolution: IMPLEMENTED BUT NOT ADOPTED.** All 5 strategies are available but none are ever applied in production.
