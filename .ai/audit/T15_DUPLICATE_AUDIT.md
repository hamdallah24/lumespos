# T15 — Duplicate Detection Audit

## What Was Checked
Whether `DuplicateDetector.check()` or `DuplicateDetector.checkPair()` is ever called in the runtime to detect identical, similar, conflicting, or complementary memories.

## Finding: ❌ NOT ADOPTED

### Evidence

**1. DuplicateDetector instantiated but never reached**
- `MemoryEngine.ts:38` — `private detector = new DuplicateDetector()`
- `MemoryEngine.findSimilarCount()` calls `this.tokenize()` manually, not `DuplicateDetector`
- `ConsolidationEngine.ts:13` — `private detector: DuplicateDetector = new DuplicateDetector()`
- `ConsolidationEngine.consolidate()` calls `this.detector.checkPair()` but `consolidate()` is never called

**2. Only non-DuplicateDetector similarity check used**
- `MemoryEngine.findSimilarCount()` at `MemoryEngine.ts:230-243` implements its own token overlap check
- This is used during `MemoryEngine.write()` for novelty scoring — but `write()` is never called

**3. No runtime duplicate prevention**
- `memoryProvider.read()` does not check for duplicates
- Executive programs do not check for duplicates before storing information

### Dead Method Chain
```
ConsolidationEngine.consolidate() [0 calls]
  → DuplicateDetector.checkPair() [0 calls]
    → calculateSimilarity() [Jaccard + length ratio]
    → classifyRelation() [identical/similar/conflicting/complementary]
    → detect numeric conflicts

MemoryEngine.write() [0 calls]
  → MemoryEngine.findSimilarCount() [token overlap, 0 calls]
```

### Relation Types (Never Classified)
| Relation | Threshold | Purpose |
|----------|-----------|---------|
| identical | similarity ≥ 0.95 | Exact or near-exact duplicates |
| similar | similarity ≥ 0.60 | Topically related |
| conflicting | similarity ≥ 0.30 | Numeric value disagreements |
| complementary | _(category differs, same scope)_ | Related but different angles |

## Verdict
**Duplicate detection: IMPLEMENTED BUT NOT ADOPTED.** The detector and its 4-tier relation classification are never used in production.
