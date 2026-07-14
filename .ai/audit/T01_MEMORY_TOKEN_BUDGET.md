# T.0.1 — Phase 8: Memory Read Token Budget

## Context Window Allocation

Modern LLMs (GPT-4, Claude) have 8K-200K token context windows. LLM price scales with total tokens.

### Current Prompt Assembly Budget (Estimated)

| Prompt Block | Token Estimate | % of Window |
|-------------|:-------------:|:-----------:|
| Identity + Directive | 200 | 2% |
| Foundation Assets | 1000 | 10% |
| Mission Context | 500 | 5% |
| Knowledge Context | 1000 | 10% |
| Output Schema | 300 | 3% |
| Tool Rules | 500 | 5% |
| System Prompts | 200 | 2% |
| User Message | ~500 | 5% |
| **Total** | **~4200** | **42%** |

Memory would be added to this budget. Target: keep total under 70% of 8K window (reserve 30% for LLM reasoning).

## Memory Budget Allocation

| Memory Source | Token Budget | Priority | Always? |
|--------------|:-----------:|:--------:|:-------:|
| Working Memory | 200 | 1 | YES |
| Recent Decisions (3-10) | 300-500 | 2 | YES |
| Episodic Memory (2-3 episodes) | 300-500 | 3 | Conditional |
| Knowledge Context | 200-500 | 4 | Conditional |
| Semantic Memory | 100-200 | 5 | Only if temporal |
| Organizational Knowledge | 200-500 | 6 | Only if scope=org |

### Token Budget per Executive

| Executive | Budget | Rationale |
|-----------|:------:|-----------|
| CEO | 2500 | Strategic decisions need full context |
| CTO | 2000 | Technical decisions need moderate context |
| COO | 1500 | Operational decisions need working memory + decisions |
| CFO | 1500 | Financial decisions need knowledge + decisions |
| CMO | 1500 | Marketing decisions need episodic memory |
| CAIO | 2000 | AI operations need incident history |
| CKO | 3000 | Knowledge management needs ALL memory |
| CHRO | 1500 | HR decisions need minimal memory |

### Token Calculation by Allocation

```
Case Study: CEO (2500 token budget)

Step 1: Working Memory (200) → 200/2500 = 8%
Step 2: Recent Decisions (500) → 700/2500 = 28%
Step 3: Episodic Memory (500) → 1200/2500 = 48%
Step 4: Knowledge Context (500) → 1700/2500 = 68%
Step 5: Semantic Memory (200) → 1900/2500 = 76%  → if temporal refs
Step 6: Org Knowledge (500) → 2400/2500 = 96%  → if scope=org
         Reserve (100) → 2500/2500 = 100% ✓

Case Study: COO (1500 token budget)

Step 1: Working Memory (200) → 200/1500 = 13%
Step 2: Recent Decisions (300) → 500/1500 = 33%
Step 3: Episodic Memory (500) → 1000/1500 = 67%  → STOP if budget tight
         Reserve (500) → 1500/1500 = 100% ✓
```

## Dynamic Budget Adjustment

### Scenario: LLM Context Window Shrinking

If LLM model changes (e.g., 4K window), Memory Budget scales down proportionally:

```typescript
// PROPOSED — dynamic budget calculation
const memoryBudget = Math.min(
  query.maxTokens,
  Math.floor((llmContextWindow - currentPromptTokens) * 0.3)
);
```

### Scenario: Already at Token Limit

If prompt is already near context limit, Memory Read returns:

1. Working Memory only (200 tokens) — always the highest priority
2. If even 200 tokens overflows → return empty MemoryContext
3. Log warning: "Memory read skipped — prompt at token capacity"

## Impact Analysis

| Metric | Current | With Memory Read | Delta |
|--------|:-------:|:----------------:|:-----:|
| CEO prompt tokens | ~4200 | ~6700 (+2500) | +60% |
| CEO cost per call | ~$0.08 | ~$0.13 (8K model) | +63% |
| CEO cost per call | ~$0.16 | ~$0.26 (16K model) | +63% |
| Latency per call | ~3-5s (LLM) | ~4-6s (+500ms + memory tokens) | ~+20% |
| Non-CEO prompt tokens | ~3500 | ~5500 (+2000) | +57% |
| Total cost for 1000 calls | ~$80 | ~$130 | +63% |

### Cost-Benefit Tradeoffs

| Sacrifice | Benefit |
|-----------|---------|
| +60% token cost | Executive decisions reference past context |
| +500ms latency | Decisions grounded in history, not hallucinated |
| +need MemoryProvider implementation | No more orphaned memory stores |
| +parallel read infra | Graceful degradation per store |

## Optimization Strategies

### Strategy 1: Cache Hot Memory

| Memory Type | Cache Strategy | Hit Rate Expectation |
|-------------|---------------|:--------------------:|
| Recent Decisions | Cache per executive, TTL 300s | ~80% (decisions don't change rapidly) |
| Working Memory | No cache (always fresh) | N/A |
| Episodic Memory | Cache per domain, TTL 600s | ~60% (episodes are stable) |
| Org Knowledge | Cache per query, TTL 3600s | ~40% (org knowledge changes slowly) |

With caching, actual token consumption drops ~40% because executives within the same session share memory context.

### Strategy 2: Contextual Truncation

If token budget is exceeded, truncate by removing less relevant items:

```
Truncation Order:
1. Remove org knowledge (least time-sensitive)
2. Remove semantic memory (only relevant if temporal refs exist)
3. Truncate episodic memory to 1 episode (from 3)
4. Remove knowledge context (domain knowledge already in Knowledge Stage)
5. Truncate decisions to 3 most recent (from 10)
6. Keep working memory intact (always most critical)
```

### Strategy 3: Lazy Semantic Memory

Semantic memory is only queried if `hasTemporalReference()` returns true. This heuristic uses lightweight string matching (100ms, no LLM call) and avoids 90% of semantic memory reads (most queries don't contain temporal references).

## Summary

| Metric | Value |
|--------|-------|
| Default memory budget | 2000 tokens |
| CEO/CKO high budget | 2500-3000 tokens |
| Price increase per call | ~63% |
| Latency increase per call | ~1s (500ms read + 500ms token processing) |
| Cache hit rate (expected) | 40-80% |
| Actual token increase (with cache) | ~25-35% |
| Graceful degradation level | 6 levels (working → decisions → episodic → knowledge → semantic → org) |
| Hard guard | Budget never exceeds 30% of remaining context window |
| Empty response | All fields empty string, totalTokens = 0 |
