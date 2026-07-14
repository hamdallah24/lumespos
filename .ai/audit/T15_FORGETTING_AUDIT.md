# T15 — Forgetting Audit

## What Was Checked
Whether `ForgettingEngine.evaluate()`, `MemoryEngine.forgetAll()`, or `MemoryEngine.runMaintenanceCycle()` is ever called to archive or forget old memories.

## Finding: ❌ NOT ADOPTED

### Evidence

**1. ForgettingEngine instantiated but never reached**
- `MemoryEngine.ts:41` — `private forgetter = new ForgettingEngine()`
- `forgetAll()` at `MemoryEngine.ts:181` is called only from `runMaintenanceCycle()` at `MemoryEngine.ts:202`
- `runMaintenanceCycle()` has **zero callers** outside test files

**2. No scheduled forgetting occurs**
- No cleanup interval, no kernel task, no GC hook triggers `forgetAll()` or `runMaintenanceCycle()`
- Memory records, if they were ever created, would accumulate indefinitely

### Dead Method Chain
```
runMaintenanceCycle() [0 calls]
  → forgetAll() [0 external calls]
    → ForgettingEngine.evaluate() [0 calls]
      → ForgettingEngine.evaluateOne() [0 calls]
        → ForgettingPolicy.getMaxAgeForState()
        → returns ForgettingCandidate { archive | forget }
```

### Policy (Unused)
```typescript
// Defined in ForgettingPolicy.ts — never applied:
workingMemoryMaxAgeMs: 7 days
consolidatedMaxAgeMs: 30 days
longTermMaxAgeMs: 365 days
minImportanceToKeep: 10
```

## Verdict
**Forgetting: IMPLEMENTED BUT NOT ADOPTED.** The forgetting engine and its policy are fully configured but never executed.
