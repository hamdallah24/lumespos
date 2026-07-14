# T.0.1 — Phase 11: Memory Read Monitoring

## Key Metrics

### Performance Metrics

| Metric | Type | Source | Target | Alert |
|--------|:----:|--------|:------:|:-----:|
| `memory.read.latency_ms` | Histogram | MemoryProvider.read() | p50 < 200ms, p95 < 500ms | p95 > 1000ms → P2 |
| `memory.read.store.latency.{store}` | Histogram | Per-store query | p50 < 100ms, p95 < 300ms | p95 > 500ms → P2 |
| `memory.read.cache.l1.hit_rate` | Gauge | L1 cache | > 50% | < 20% → P3 |
| `memory.read.cache.l2.hit_rate` | Gauge | L2 cache | > 30% | < 10% → P3 |
| `memory.read.total_tokens` | Histogram | MemoryContext.totalTokens | ~1500 avg | > 2500 → P3 |
| `memory.read.executive.tokens.{executive}` | Histogram | Per-executive token usage | CEO: ~2000, others: ~1200 | > 3000 → P3 |

### Error Metrics

| Metric | Type | Source | Target | Alert |
|--------|:----:|--------|:------:|:-----:|
| `memory.read.errors.total` | Counter | All errors | 0 | > 1/min → P1 |
| `memory.read.errors.{store}` | Counter | Per-store errors | 0 | > 5/min → P2 |
| `memory.read.timeouts.{store}` | Counter | Per-store timeouts | 0 | > 3/min → P2 |
| `memory.read.skipped` | Counter | Memory read skipped completely | 0 | > 0 → P2 |
| `memory.read.budget_exceeded` | Counter | Token budget exceeded | 0 | > 5/min → P3 |
| `memory.read.circuit_breaker_open.{store}` | Gauge | Per-store circuit breaker | 0 | > 0 → P1 |

### Business Metrics

| Metric | Type | Source | Target | Alert |
|--------|:----:|--------|:------:|:-----:|
| `memory.read.used_in_decision` | Counter | Decision includes memory evidence | > 50% of decisions | < 20% → P3 |
| `memory.read.avg_sources_per_call` | Histogram | Number of sources used | ~4 sources | < 2 → P3 |

### Size Metrics

| Metric | Type | Source | Target | Alert |
|--------|:----:|--------|:------:|:-----:|
| `memory.read.cache.l1.size` | Gauge | L1 entries | < 100 | > 100 → P3 |
| `memory.read.cache.l2.size` | Gauge | L2 entries | < 1000 | > 1000 → P3 |
| `memory.read.context_size_bytes` | Histogram | MemoryContext serialized size | < 10KB | > 20KB → P3 |

## Logging Schema

### Successful Read Log

```json
{
  "event": "memory.read.success",
  "executive": "CEO",
  "domain": "architecture",
  "scope": "project",
  "queryHash": "a1b2c3d4",
  "sourcesUsed": ["working", "decisions", "episodic"],
  "totalTokens": 1850,
  "latencyMs": 245,
  "cacheTier": "l2",
  "tokenBudget": 2500,
  "truncated": false
}
```

### Partial Failure Log

```json
{
  "event": "memory.read.partial",
  "executive": "CTO",
  "domain": "operations",
  "scope": "project",
  "sourcesUsed": ["working", "decisions"],
  "sourcesFailed": ["episodic"],
  "failureReasons": {
    "episodic": "timeout (512ms > 500ms timeout)"
  },
  "totalTokens": 800,
  "latencyMs": 310,
  "cacheTier": "none",
  "tokenBudget": 2000,
  "truncated": false
}
```

### Complete Failure Log

```json
{
  "event": "memory.read.failed",
  "executive": "COO",
  "domain": "hr",
  "scope": "project",
  "error": "All stores unavailable",
  "sourcesFailed": ["working", "decisions", "semantic", "episodic", "knowledge", "org"],
  "latencyMs": 505,
  "fallback": true,
  "criticalAlert": true
}
```

## Dashboard

### Real-time Dashboard Columns

| Panel | Metric | Refresh |
|-------|--------|:-------:|
| Memory Read Rate | `rate(memory.read.total[1m])` | 10s |
| Memory Read Latency (p95) | `histogram_quantile(0.95, memory.read.latency_ms)` | 10s |
| Error Rate | `rate(memory.read.errors.total[1m])` | 10s |
| Cache Hit Rate | `memory.read.cache.l1.hit_rate` | 30s |
| Token Budget Usage | `avg(memory.read.total_tokens)` | 30s |
| Circuit Breaker Status | `memory.read.circuit_breaker_open.*` | 10s |
| Memory Used in Decisions | `rate(memory.read.used_in_decision[1h])` | 5m |

### Weekly Report Metrics

| Metric | Format | Aggregation |
|--------|--------|:-----------:|
| Total Memory Reads | Count | Sum |
| Avg Latency | Duration | Mean |
| P95 Latency | Duration | Quantile |
| Error Rate | % | (Errors / Total) × 100 |
| Cache Hit Rate | % | (Hits / (Hits + Misses)) × 100 |
| Avg Token Usage | Count | Mean |
| Most Errored Store | Store name | Mode |
| Most Skipped Executive | Executive name | Mode |
| Memory Used in Decisions | % | (Reads with evidence / Total reads) × 100 |

## Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|:--------:|--------|
| **MemoryReadDegraded** | p95 latency > 1000ms for 5min | P2 | Investigate store performance |
| **MemoryReadFailing** | Error rate > 5/min for 1min | P1 | Page on-call |
| **MemoryReadAllDown** | All stores unavailable | P0 | Page on-call immediately |
| **MemoryReadCacheStale** | L1 hit rate < 20% for 10min | P3 | Investigate cache configuration |
| **MemoryReadBudgetExceeded** | Token budget exceeded > 10/min | P3 | Review token budget config |
| **MemoryReadCircuitBreakerOpen** | Any circuit breaker open | P1 | Page on-call |
| **MemoryReadNotUsed** | Memory used in decisions < 20% for 1 day | P3 | Review integration health |

## Attribution

Every `MemoryContext` is attributed with performance data:

```typescript
// PROPOSED — attribution metadata
interface MemoryReadAttribution {
  timestamp: string;
  executive: string;
  domain: string;
  sourcesUsed: string[];
  sourcesFailed: string[];
  latencyMs: number;
  cacheTier: "l1" | "l2" | "none" | "mixed";
  tokenBudget: number;
  totalTokens: number;
  truncated: boolean;
  circuitBreakersOpen: string[];
  decisionId?: string;  // Linked to the decision that used this memory
}
```

This attribution is logged and available via the TraceManager for debugging executive decisions that used memory context.

## Summary

| Monitoring Aspect | Approach |
|------------------|----------|
| Performance | p50/p95 latency histograms per store and overall |
| Errors | Per-store error/timeout counters with P1/P2 alerting |
| Caching | Hit rate gauges for L1 and L2 |
| Business impact | "Memory used in decision" rate metric |
| Circuit breaker | Per-store open/closed gauge with P1 alert |
| Logging | Structured JSON logs with success/partial/failure events |
| Dashboard | Real-time panels + weekly report |
| Alerting | 7 alert rules from P0-P3 |
| Attribution | Every memory context tagged with performance metadata |
