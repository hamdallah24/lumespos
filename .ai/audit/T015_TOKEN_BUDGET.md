# T.0.1.5 — Phase 7: Token Budget Lock

## Source
T.0.1 Memory Token Budget (T01_MEMORY_TOKEN_BUDGET.md)

## LOCKED Token Budgets

### Per Memory Source

| Memory Source | Budget (tokens) | Truncation Priority | Always Included? |
|--------------|:---------------:|:-------------------:|:----------------:|
| Working Memory | 200 | 1 (highest) | YES |
| Recent Decisions | 500 | 2 | YES |
| Episodic Memory | 300 | 3 | YES |
| Knowledge Context | 300 | 4 | Conditional (if domain known) |
| Semantic Memory | 150 | 5 | Only if temporal refs detected |
| Organizational Knowledge | 300 | 6 (lowest) | Only if scope=organization |

### Per Executive

| Executive | Max Budget | Worst Case | Average | Minimum |
|:---------:|:----------:|:----------:|:-------:|:-------:|
| CEO | 2500 | 1750 | 1200 | 200 |
| CTO | 2000 | 1450 | 1000 | 200 |
| COO | 1500 | 1000 | 700 | 200 |
| CFO | 1500 | 1000 | 700 | 200 |
| CMO | 1500 | 1000 | 700 | 200 |
| CAIO | 2000 | 1450 | 1000 | 200 |
| CKO | 3000 | 2050 | 1500 | 200 |
| CHRO | 1500 | 1000 | 700 | 200 |

### Prompt + Memory Total (Worst Case)

| Executive | Prompt (no memory) | Memory (worst) | Total (worst) | % of 8K Window |
|:---------:|:------------------:|:--------------:|:-------------:|:--------------:|
| CEO | ~4200 | 1750 | 5950 | 73% |
| CTO | ~3500 | 1450 | 4950 | 60% |
| COO | ~3500 | 1000 | 4500 | 55% |
| CFO | ~3500 | 1000 | 4500 | 55% |
| CMO | ~3500 | 1000 | 4500 | 55% |
| CAIO | ~3500 | 1450 | 4950 | 60% |
| CKO | ~4000 | 2050 | 6050 | 74% |
| CHRO | ~3500 | 1000 | 4500 | 55% |

## Budget Calculation Rules (LOCKED)

### Rule 1: Base Calculation

```
memoryBudget = min(
  query.maxTokens,                              // Per-executive max
  Math.floor((LLM_WINDOW - promptTokens) * 0.3) // Dynamic: 30% of remaining window
)
```

### Rule 2: Priority Truncation (Hard Guard)

When memory budget is exceeded, truncation follows this exact order:

```
Priority 1: Working Memory (200) — ALWAYS kept
Priority 2: Recent Decisions — truncate to 300 tokens (from 500)
Priority 3: Episodic Memory — truncate to 150 tokens (from 300)
Priority 4: Knowledge Context — remove completely
Priority 5: Semantic Memory — remove completely (only if temporal refs)
Priority 6: Organizational Knowledge — remove completely
```

### Rule 3: Absolute Minimum

If budget < 200 tokens after all truncation, return ONLY Working Memory.
If budget < 200 tokens AND working memory exceeds budget, return empty MemoryContext (totalTokens = 0).

### Rule 4: Formatting Overhead

Reserve 10% of memoryBudget for formatting overhead (heading markers, separators, whitespace).

## LOCKED Values

| Parameter | Value | Notes |
|-----------|:-----:|-------|
| Default maxTokens | 2000 | Used when query.maxTokens not specified |
| CEO maxTokens | 2500 | Strategic context |
| CKO maxTokens | 3000 | Full memory context |
| CTO/CAIO maxTokens | 2000 | Technical context |
| COO/CFO/CMO/CHRO maxTokens | 1500 | Operational context |
| Formatting overhead | 10% | Reserved within budget |
| Hard lower bound | 200 tokens | Minimum working memory |
| Dynamic cap | 30% of remaining context | Never exceed 30% of LLM window |
| LLM window (assumed) | 8192 tokens | 8K model. Scales for larger models |
| Total cost increase | ~60% | From ~$0.08 to ~$0.13 per CEO call |

## Verification

| Check | Status |
|-------|:------:|
| All budgets numeric? | **PASS** |
| Worst case defined? | **PASS** — per executive |
| Average case defined? | **PASS** — per executive |
| Minimum case defined? | **PASS** — 200 tokens working memory |
| Truncation order locked? | **PASS** — 6 levels |
| Dynamic cap locked? | **PASS** — 30% of remaining context |
| No budget exceeds LLM window? | **PASS** — max 74% for CKO, within 8K limit |
