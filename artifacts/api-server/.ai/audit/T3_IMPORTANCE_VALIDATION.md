# T.3 Phase 3 — Importance Validation

## Objective
Generate memories of varying significance. Verify scores, ranking, retrieval ordering.

## Scoring Weights
| Factor | Weight | Description |
|--------|--------|-------------|
| businessImpact | 0.3 | Category-dependent base (decision=80, insight=60, fact=50, preference=30) |
| executivePriority | 0.2 | Incoming priority from executive |
| recurrence | 0.15 | How many times this pattern occurred |
| userExplicitness | 0.15 | User-specified vs inferred |
| novelty | 0.1 | How different from existing records |
| crossExecutiveRelevance | 0.1 | How many executives reference it |

## Test Results

### P3.1 — Strategic decision scores higher than trivial fact
- **Result**: ✅ PASS
- **Evidence**: Decision (95 priority, explicit, 8 execs) total > Preference (5 priority, implicit, 1 exec)
- **Raw**: strategic ~75, trivial ~24

### P3.2 — Category base impact respected
- **Result**: ✅ PASS
- **Evidence**: At same priority, `decision` (base 80) scores higher than `preference` (base 30).

### P3.3 — Executive priority drives score
- **Result**: ✅ PASS
- **Evidence**: priority=100 > priority=0 for the same category.

### P3.4 — User explicit scores higher than implicit
- **Result**: ✅ PASS
- **Evidence**: `isUserExplicit: true` (score 90) > `false` (score 20).

### P3.5 — Query returns records sorted by importance descending
- **Result**: ✅ PASS
- **Evidence**: 3 records written with descending importance; `query()` returns them in correct order. Each record's `importance.total` >= next record's.

## Ranking Verification
```
High importance (decision, priority=95, explicit)    → total: ~75
Medium importance (fact, priority=50, implicit)       → total: ~44
Low importance (preference, priority=10, implicit)    → total: ~21
```

## Verdict
**PASS** — Importance scoring is deterministic, weighted correctly, and query ordering respects descending importance ranking.
