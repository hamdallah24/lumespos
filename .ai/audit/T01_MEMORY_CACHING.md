# T.0.1 — Phase 9: Memory Read Caching Strategy

## Caching Layers

```
  MemoryProvider.read()
       │
       ▼
  ┌───────────────────────────────────────┐
  │  Layer 1: In-Memory Cache             │ ← Map<string, { result, expiry }>
  │  (per-executive, per-process)         │ ← TTL: 60s
  │  Fastest: ~1μs                        │
  └──────────────────┬────────────────────┘
                     │ cache miss?
                     ▼
  ┌───────────────────────────────────────┐
  │  Layer 2: Redis Cache                 │ ← RedisCache.remember<T>()
  │  (shared across processes)            │ ← TTL: 300s-3600s
  │  Fast: ~5ms                           │
  └──────────────────┬────────────────────┘
                     │ cache miss?
                     ▼
  ┌───────────────────────────────────────┐
  │  Layer 3: Memory Store Query          │ ← Actual query to memory store
  │  (slow: ~100-500ms)                   │
  └───────────────────────────────────────┘
```

## Cache Key Design

```typescript
// PROPOSED cache key structure
interface CacheKey {
  prefix: "memory";
  executive: string;      // "CEO" | "CTO" | ...
  domain: string;         // "architecture" | "operations" | ...
  memoryScope: string;    // "session" | "project" | "organization"
  queryHash: string;      // SHA256 truncated to 16 chars
  cacheTier: "l1" | "l2";
}
```

### Example Cache Keys

```
In-Memory:
  key: "memory::CEO::architecture::project::a1b2c3d4"
  value: MemoryContext (serialized)
  TTL: 60s

Redis:
  key: "memory:CEO:architecture:project:a1b2c3d4"
  value: MemoryContext (JSON-serialized)
  TTL: 300s
```

## TTL Strategy

| Memory Source | TTL (In-Memory) | TTL (Redis) | Rationale |
|-------------|:--------------:|:-----------:|-----------|
| Working Memory | No cache | No cache | Too dynamic — must always be fresh |
| Recent Decisions | 30s | 120s | Decisions change per session |
| Episodic Memory | 60s | 300s | Episodes are stable within session |
| Semantic Memory | No cache | No cache | Query-dependent — hard to cache effectively |
| Knowledge Context | 60s | 600s | Domain knowledge changes slowly |
| Organizational Memory | 120s | 3600s | Org knowledge is relatively static |

## Invalidation Strategy

### Invalidation Events

| Event | Action | Tiers Invalidated |
|-------|--------|:-----------------:|
| Decision recorded (`decision.made`) | Invalidate "decisions" cache for that executive | L1 + L2 |
| Working memory updated (`memory.updated`) | Invalidate "working" cache for that executive | L1 + L2 |
| New episode stored (`episode.stored`) | Invalidate "episodic" cache for that domain | L1 + L2 |
| Knowledge graph updated | Invalidate "knowledge" cache for that domain | L1 + L2 |
| Organizational memory updated | Invalidate "org" cache | L1 + L2 |
| Cache TTL expired | Auto-evict | L1 / L2 individually |
| Memory provider restart | Clear all L1 cache | L1 only |

### Invalidation Implementation

```typescript
// PROPOSED invalidation hook — called by EIOS observer when decision.made
function onDecisionRecorded(event: { executive: string }) {
  const pattern = `memory::${event.executive}::*`;
  // Clear L1 cache for this executive
  inMemoryCache.deletePattern(pattern);
  // Clear L2 cache for this executive
  redisCache.deletePattern(`memory:${event.executive}:*`);
}
```

## Cache Behavior Scenarios

### Scenario 1: Sequential Same-Executive Calls

```
Call 1: CEO asks "What's our architecture?"
  → L1 miss → L2 miss → query stores → cache in L1(60s) + L2(300s)
  → Return context (cost: ~500ms)

Call 2 (within 30s): CEO asks "What was our previous decision on this?"
  → L1 hit → Return cached context (cost: ~1μs)
  → Decisions are from same session — valid

Call 3 (within 300s, different process): CEO asks same query
  → L1 miss (different process) → L2 hit → Return cached context (cost: ~5ms)
```

### Scenario 2: Cross-Executive Cache Sharing

```
Call 1: CEO queries "What's our architecture?"
  → cached in L2 with key `memory:CEO:architecture:project:hash`

Call 2: CTO queries "What's our architecture?"
  → L1 miss (different executive) → L2 miss (different key prefix)
  → Must query stores freshly

Cross-executive cache not shared because decisions are executive-scoped.
Knowledge and episodic domains could be shared, but executive-scoped cache keys prevent it.
```

### Scenario 3: Zero-Cache Cold Start

```
First call after restart:
  → L1 empty → L2 empty → all 6 stores queried in parallel
  → Full 500ms latency
  → All subsequent calls benefit from cache
```

## Cache Size Estimates

| Tier | Max Entries | Est. Size per Entry | Total Memory |
|:----:|:-----------:|:-------------------:|:-----------:|
| L1 (In-Memory) | 100 | 2KB | 200KB |
| L2 (Redis) | 1000 | 2KB | 2MB |

### Eviction Policy

| Tier | Policy | Detail |
|:----:|--------|--------|
| L1 | LRU | Evict least recently used when > 100 entries |
| L2 | TTL + LRU | Redis evicts expired keys; manual LRU on > 1000 entries |

## Cache Hit Rate Targets

| Phase | Target Hit Rate | Timeframe |
|:-----:|:--------------:|:---------:|
| Week 1 | > 30% | Cold start |
| Week 2 | > 50% | Warm cache for common queries |
| Month 1 | > 70% | Steady state, all domains cached |
| Steady state | > 80% | Cache covering common executive queries |

## Summary

| Aspect | Design Decision |
|--------|----------------|
| Two-tier cache | L1 (in-memory) + L2 (Redis) |
| Cache granularity | Per (executive, domain, queryHash) |
| TTL range | 30s (decisions) to 3600s (org memory) |
| Invalidation | Event-driven via EIOS observer hooks |
| Max memory | L1: 200KB, L2: 2MB |
| Hit rate target | >80% at steady state |
| Cold start latency | ~500ms (full query) |
| Warm latency | ~1μs (L1) / ~5ms (L2) |
