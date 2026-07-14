# T15 — Memory Engine Feature Adoption

## Feature Adoption Matrix

| Feature | Engine | Instantiated In | Called From | Production Invocations | Status |
|---------|--------|-----------------|-------------|----------------------|--------|
| Importance Engine | `ImportanceEngine` | `MemoryEngine.ts:37` | `MemoryEngine.write()` | **0** | ❌ Dead code |
| Lifecycle Engine | `MemoryLifecycleEngine` | `MemoryEngine.ts:36` | `MemoryEngine.write()`, `MemoryEngine.validateMemory()` | **0** | ❌ Dead code |
| Validation Engine | `ValidationEngine` | `MemoryEngine.ts:43` | `MemoryEngine.write()` | **0** | ❌ Dead code |
| Duplicate Detection | `DuplicateDetector` | `MemoryEngine.ts:38`, `ConsolidationEngine.ts:13` | `MemoryEngine.findSimilarCount()`, `ConsolidationEngine` | **0** | ❌ Dead code |
| Conflict Resolution | `ConflictResolver` | `MemoryEngine.ts:39`, `ConsolidationEngine.ts:14` | `ConsolidationEngine` | **0** | ❌ Dead code |
| Consolidation Engine | `ConsolidationEngine` | `MemoryEngine.ts:40` | `MemoryEngine.consolidateAll()` → `runMaintenanceCycle()` | **0** | ❌ Dead code |
| Forgetting Engine | `ForgettingEngine` | `MemoryEngine.ts:41` | `MemoryEngine.forgetAll()` → `runMaintenanceCycle()` | **0** | ❌ Dead code |
| Promotion Engine | `PromotionEngine` | `MemoryEngine.ts:42` | `MemoryEngine.promoteAll()` → `runMaintenanceCycle()` | **0** | ❌ Dead code |
| Memory Engine | `MemoryEngine` | `MemoryProvider.ts:300` | `MemoryProvider.write()` | **0** | ❌ Dead code |
| Memory Certification | `MemoryCertification` | _(not instantiated)_ | _(not imported)_ | **0** | ❌ Dead code |

## Call Chain Trace

```
Production flow:
  Executive → memoryProvider.read() → [Legacy stores only] → MemoryContext
                                       ↑
                                NEVER reaches MemoryEngine

Dead code path:
  memoryProvider.write() [never called]
    → MemoryEngine.write()
      → ValidationEngine.validate()
      → ImportanceEngine.score()
      → DuplicateDetector.findSimilarCount()
      → MemoryEngine.write() stores record

  MemoryEngine.runMaintenanceCycle() [never called]
    → MemoryEngine.promoteAll()  → PromotionEngine.evaluate()
    → MemoryEngine.consolidateAll() → ConsolidationEngine.consolidate()
      → DuplicateDetector.checkPair()
      → ConflictResolver.resolve()
    → MemoryEngine.forgetAll()  → ForgettingEngine.evaluate()
```

## Conclusion
**8 of 8 engine features are implemented but have zero production invocations.** The Memory Engine subsystem is structurally complete but entirely disconnected from the runtime flow.
