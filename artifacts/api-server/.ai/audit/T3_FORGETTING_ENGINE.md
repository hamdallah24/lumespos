# T.3 Phase 7 — Forgetting Engine

## Objective
Simulate aged memories. Validate archival, forgetting, retention policy, executive multipliers.

## Forgetting Conditions
| Condition | Action | Policy |
|-----------|--------|--------|
| importance.total < 10 | FORGET | minImportanceToKeep |
| WORKING state > 7 days, access < 1, access > 90 days | FORGET | working age + low access |
| WORKING/CONSOLIDATED/LONG_TERM state > max age | ARCHIVE | state max age |
| ARCHIVED state > 365 days | FORGET | archive max age |

## Executive Multipliers
| Executive | Multiplier | Effective WORKING max age |
|-----------|------------|--------------------------|
| CEO | 1.5× | 10.5 days |
| CKO | 2.0× | 14 days |
| CTO | 1.2× | 8.4 days |
| COO | 1.0× | 7 days |

## Test Results

### P7.1 — Low-importance triggers forgetting
- **Result**: ✅ PASS
- **Evidence**: Record with importance total 5 → `ForgettingEngine.evaluate()` → `forgotten[0].lifecycleState === "FORGOTTEN"`. Record with importance 50 → kept.

### P7.2 — Aged working memory is archived, not directly forgotten
- **Result**: ✅ PASS
- **Evidence**: WORKING record with past `updatedAt` (30 days ago) + sufficient accessCount → `archived[0].lifecycleState === "ARCHIVED"`.

### P7.3 — Executive multiplier verified
- **Result**: ✅ PASS
- **Evidence**: CEO max age > COO max age (1.5× vs 1.0× multiplier).

## Verdict
**PASS** — Forgetting engine correctly archives aged memories, forgets low-importance records, and respects executive multipliers.
