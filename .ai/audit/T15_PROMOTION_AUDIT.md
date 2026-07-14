# T15 — Promotion Audit

## What Was Checked
Whether `PromotionEngine.evaluate()` or `MemoryEngine.promoteAll()` is ever called to promote memories from VALIDATED→WORKING or CONSOLIDATED→LONG_TERM.

## Finding: ❌ NOT ADOPTED

### Evidence

**1. PromotionEngine instantiated but never reached**
- `MemoryEngine.ts:42` — `private promoter = new PromotionEngine()`
- `promoteAll()` at `MemoryEngine.ts:150` is called only from `runMaintenanceCycle()` at `MemoryEngine.ts:200`
- `runMaintenanceCycle()` has **zero callers** outside test files

**2. No cron/scheduler triggers promotion**
- No `setInterval`, no kernel schedule, no observer hook calls `promoteAll()` or `runMaintenanceCycle()`
- The existing maintenance cycle in `src/index.ts` (Learning Engine) does not reference Memory Engine

### Dead Method Chain
```
runMaintenanceCycle() [0 calls]
  → promoteAll() [0 external calls]
    → PromotionEngine.evaluate() [0 external calls]
      → shouldPromoteToWorking() / shouldPromoteToLongTerm()
```

## Verdict
**Promotion: IMPLEMENTED BUT NOT ADOPTED.** No memory has ever been promoted between lifecycle states in production.
