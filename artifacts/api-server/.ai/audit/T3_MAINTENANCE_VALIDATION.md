# T.3 Phase 8 — Maintenance Scheduler

## Objective
Verify kernelScheduler → runMaintenanceCycle() → Promotion → Consolidation → Forgetting. Measure execution, verify no skipped stages.

## Pipeline
```
kernelScheduler (every 6h)
  ↓
runMaintenanceCycle()
  ├── promoteAll()     ──→ VALIDATED/WORKING → WORKING/LONG_TERM
  ├── consolidateAll()  ──→ Merge duplicates
  └── forgetAll()       ──→ Archive/forget aged records
```

## Test Results

### P8.1 — runMaintenanceCycle executes all 3 stages
- **Result**: ✅ PASS
- **Evidence**: Result contains `{ promoted, consolidated, forgotten }`. `promoted.promoted.length ≥ 1`. `forgotten.forgotten` exists.

### P8.2 — Maintenance is idempotent
- **Result**: ✅ PASS
- **Evidence**: Running `runMaintenanceCycle()` multiple times does not throw or corrupt state. Second run produces fewer promotions (already promoted).

### P8.3 — Consolidation handles empty state
- **Result**: ✅ PASS
- **Evidence**: `consolidateAll()` on empty engine returns `{ consolidated: [], removedIds: [] }` — no crash.

## Code Path (index.ts)
```typescript
kernelScheduler.schedule("memory-maintenance", 21600000, async () => {
  const { memoryEngine } = await import("./executive-runtime/memory-provider");
  const result = memoryEngine.runMaintenanceCycle();
  logger.info({ promoted: ..., consolidated: ..., forgotten: ... }, "Memory maintenance complete");
});
```

## Verdict
**PASS** — Maintenance cycle executes all 3 stages. Idempotent. No skipped stages. Scheduled every 6 hours in production.
