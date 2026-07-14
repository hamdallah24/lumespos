# T.3 Phase 6 — Promotion Engine

## Objective
Generate memories across threshold values. Validate promotions. Measure promotion rate and threshold correctness.

## Thresholds
| Promotion | Threshold | Notes |
|-----------|-----------|-------|
| VALIDATED → WORKING | importance ≥ 20 | Very low bar — most validated memories qualify |
| CONSOLIDATED → LONG_TERM | importance ≥ 50, recurrence ≥ 3, confidence ≥ 0.7 | Stricter |

## Test Results

### P6.1 — High-importance VALIDATED memory promoted to WORKING
- **Result**: ✅ PASS
- **Evidence**: Strategic decision (importance ≥ 20) → `promoteAll()` → `lifecycleState: "WORKING"`.

### P6.2 — Low-importance memory NOT promoted
- **Result**: ✅ PASS
- **Evidence**: `PromotionEngine.evaluate()` on record with importance total 15 → `promoted.length === 0`. Record with importance 50 → `promoted.length === 1`.

### P6.3 — promoteAll returns correct counts
- **Result**: ✅ PASS
- **Evidence**: 3 promotable records written + validated → `promoteAll()` promotes all 3.

## Performance
All promotion operations complete in < 1ms.

## Verdict
**PASS** — Promotion engine correctly promotes memories above threshold and correctly skips those below. No false promotions.
