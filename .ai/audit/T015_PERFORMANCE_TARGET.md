# T.0.1.5 — Phase 8: Performance Lock

## Source
T.0.1 Memory Read Pipeline (T01_MEMORY_READ_PIPELINE.md), Memory Caching (T01_MEMORY_CACHING.md), Memory Monitoring (T01_MEMORY_MONITORING.md)

## LOCKED Performance Targets

### MemoryProvider Latency

| Scenario | p50 | p95 | p99 | Worst Case |
|----------|:---:|:---:|:---:|:----------:|
| **L1 Cache Hit** | 1μs | 5μs | 10μs | 50μs |
| **L2 Cache Hit (Redis)** | 5ms | 15ms | 30ms | 100ms |
| **Full Query (all stores)** | 200ms | 500ms | 800ms | 1000ms |
| **Partial Query (stores timeout)** | 200ms | 500ms | 800ms | 1000ms |
| **Fallback (all stores down)** | 5ms | 10ms | 20ms | 50ms |

### Per-Store Latency

| Store | p50 | p95 | Timeout | If Timeout |
|-------|:---:|:---:|:-------:|------------|
| Working Memory | 30ms | 100ms | 200ms | Return empty |
| Decisions | 50ms | 150ms | 300ms | Return empty |
| Semantic Memory | 50ms | 200ms | 400ms | Skip section |
| Episodic Memory | 80ms | 250ms | 500ms | Return empty |
| Knowledge | 30ms | 100ms | 200ms | Return empty |
| Organizational Memory | 100ms | 300ms | 500ms | Skip section |

### Cache Performance

| Cache Layer | Read | Write | Invalidation |
|:-----------:|:----:|:-----:|:------------:|
| L1 (In-Memory) | 1μs | 5μs | 10μs |
| L2 (Redis) | 5ms | 10ms | 20ms |

### End-to-End Executive Latency Impact

| Executive | Without Memory | With Memory (p95) | Delta |
|:---------:|:-------------:|:-----------------:|:-----:|
| CEO | ~4s (LLM) | ~4.5s (+500ms) | +12.5% |
| CTO | ~3.5s (LLM) | ~4.0s (+500ms) | +14.3% |
| COO | ~3s (LLM) | ~3.5s (+500ms) | +16.7% |
| CFO | ~3s (LLM) | ~3.5s (+500ms) | +16.7% |
| CMO | ~3s (LLM) | ~3.5s (+500ms) | +16.7% |
| CAIO | ~3.5s (LLM) | ~4.0s (+500ms) | +14.3% |
| CKO | ~3.5s (LLM) | ~4.0s (+500ms) | +14.3% |
| CHRO | ~3s (LLM) | ~3.5s (+500ms) | +16.7% |

### Throughput

| Metric | Target |
|--------|:------:|
| MemoryProvider calls per second | > 50 |
| Concurrent executive sessions | > 10 |
| Cache L1 eviction rate | < 5% per minute |
| Cache L2 failure rate | < 0.1% per hour |
| Circuit breaker trips per day | < 1 (per store) |

## LOCKED Budgets

### Time Budget

| Stage | Max Time | Allocation |
|:-----:|:--------:|:----------:|
| Parse + Classify | 5ms | 1% |
| Parallel Store Reads | 500ms | 98% |
| Merge + Rank + Format | 5ms | 1% |
| **Total** | **510ms** | **100%** |

### Token Budget

| Executive | maxTokens | Effective Average (with cache) |
|:---------:|:---------:|:------------------------------:|
| CEO | 2500 | ~1200 |
| CTO | 2000 | ~1000 |
| COO | 1500 | ~700 |
| CFO | 1500 | ~700 |
| CMO | 1500 | ~700 |
| CAIO | 2000 | ~1000 |
| CKO | 3000 | ~1500 |
| CHRO | 1500 | ~700 |

## Out-of-Scope Performance Targets

| Target | Scope | Reason |
|--------|:-----:|--------|
| Memory Subsystem optimization (ContextManager, SemanticMemory, etc.) | **OUT** | Each subsystem has its own performance budget. MemoryProvider only reads them — optimization is subsystem owner's responsibility. |
| Redis cluster optimization | **OUT** | Infrastructure concern. MemoryProvider uses Redis via `RedisCache` — cluster tuning is infra responsibility. |
| LLM latency optimization | **OUT** | MemoryProvider adds 500ms max to LLM's 3-4s — LLM latency is separate. |

## Verification

| Check | Status |
|-------|:------:|
| All latency targets numeric? | **PASS** |
| p50, p95, p99, worst case defined? | **PASS** |
| Per-store latency with timeout? | **PASS** |
| Cache performance defined? | **PASS** |
| End-to-end executive impact defined? | **PASS** |
| Throughput targets defined? | **PASS** |
| Time budget broken down? | **PASS** |
| Out-of-scope items documented? | **PASS** |
