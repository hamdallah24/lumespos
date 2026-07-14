# T.0.1 — Phase 10: Memory Read Error Handling

## Design Principle

**Graceful degradation, never fail the executive.** Memory read is advisory — an executive must be able to make a decision even if ALL memory stores are unavailable.

## Error Hierarchy

```
MemoryProviderError
  ├── StoreUnavailableError    (store connection lost)
  ├── StoreTimeoutError        (store took too long)
  ├── CacheError               (cache layer failed)
  ├── TokenBudgetExceededError (budget exhausted after read)
  ├── ParseError               (unable to parse query)
  └── FormatError              (unable to format memory context)
```

## Error Handling by Store

### Store-Level Errors

| Store | Error | Behavior | Fallback |
|-------|-------|----------|----------|
| WorkingMemory | Timeout (>200ms) | Log warning, return empty working memory | "No working memory available" |
| WorkingMemory | Unavailable | Log error, return empty | "Working memory unavailable" |
| Decisions | Timeout (>300ms) | Log warning, return empty decisions | "No past decisions available" |
| Decisions | Unavailable | Log error, return empty | "Past decisions unavailable" |
| SemanticMemory | Timeout (>400ms) | Skip semantic section | Omit from context |
| SemanticMemory | Unavailable | Skip semantic section | Omit from context |
| EpisodicMemory | Timeout (>500ms) | Log warning, return empty episodes | "No relevant episodes found" |
| EpisodicMemory | Unavailable | Log error, return empty | "Episodic memory unavailable" |
| Knowledge | Timeout (>200ms) | Log warning, return empty knowledge | "No domain context available" |
| Knowledge | Unavailable | Log error, return empty | "Knowledge unavailable" |
| OrganizationalMemory | Timeout (>500ms) | Skip org section | Omit from context |
| OrganizationalMemory | Unavailable | Skip org section | Omit from context |

## Cache-Layer Errors

| Cache Layer | Error | Behavior | Fallback |
|:-----------:|-------|----------|----------|
| L1 (in-memory) | Entry corrupt | Evict entry, treat as miss | L2 or direct query |
| L1 (in-memory) | OOM | Disable L1 cache, log critical | L2 or direct query |
| L2 (Redis) | Connection timeout | Log warning, skip L2 | Direct query |
| L2 (Redis) | Connection refused | Log warning, skip L2 | Direct query |
| L2 (Redis) | Serialization error | Evict entry, treat as miss | Direct query |
| L2 (Redis) | OOM (Redis side) | Log warning, skip L2 | Direct query |

## Global Error Responses

### When ALL stores fail

```typescript
// PROPOSED — fallback response
const fallbackResponse: MemoryContext = {
  recentDecisions: "Memory read unavailable — proceeding without past context.",
  workingMemory: "",
  semanticMemory: "",
  episodicMemory: "",
  knowledgeContext: "",
  organizationalMemory: "",
  totalTokens: 10, // minimal tokens for fallback message
};
```

### When token budget exceeded during read

```typescript
// PROPOSED — budget exceeded handling
if (estimatedTokens > query.maxTokens) {
  // Activate truncation (see Phase 8)
  const truncated = truncateByPriority(result, query.maxTokens);
  if (truncated.totalTokens <= query.maxTokens) {
    return truncated;
  }
  // Even after truncation — return what we have
  return {
    ...truncated,
    recentDecisions: truncated.workingMemory  // Keep working memory only
      || "Memory context too large — included only working memory.",
  };
}
```

## Logging and Monitoring

### Log Levels by Error

| Error Type | Log Level | Action |
|-----------|:---------:|--------|
| Store timeout | WARN | Increment store metric |
| Store unavailable | ERROR | Alert (P1) |
| Cache corruption | WARN | Increment corruption metric |
| Token budget exceeded | INFO | Increment budget metric |
| Memory read skipped completely | INFO | Increment skip metric |
| Parse error | WARN | Return empty context |
| Format error | WARN | Return raw (unformatted) context |

### Error Metrics

```typescript
// PROPOSED metrics keys
metrics.increment("memory.read.total")
metrics.increment(`memory.read.error.${storeName}`)
metrics.increment(`memory.read.timeout.${storeName}`)
metrics.increment("memory.read.cache.l1.hit")
metrics.increment("memory.read.cache.l1.miss")
metrics.increment("memory.read.cache.l2.hit")
metrics.increment("memory.read.cache.l2.miss")
metrics.increment("memory.read.budget.exceeded")
metrics.increment("memory.read.skipped")
```

## Circuit Breaker Behavior

Per-store circuit breaker to prevent cascading failures:

| State | Store Behavior | Recovery |
|-------|----------------|----------|
| **CLOSED** | Normal queries | — |
| **OPEN** (5 errors in 30s) | Skip store, return empty | Retry after 60s |
| **HALF_OPEN** | Test query | If success → CLOSED; if fail → OPEN |

Circuit breaker applies only to individual memory stores, not the entire MemoryProvider. If all 6 stores are OPEN, MemoryProvider returns fallback response.

## Recovery Strategy

| Failure Mode | Immediate Recovery | Long-term Recovery |
|-------------|-------------------|-------------------|
| Store timeout | Return partial results | Investigate store performance |
| Store unavailable | Return partial results | Alert store owner, restart |
| Cache corruption | Evict and re-query | Investigate cache consistency |
| OOM (L1 cache full) | Flush oldest 20% entries | Rate-limit cache writes |
| Redis down | Skip L2, use L1 only | Alert infra, restart Redis |
| All stores down | Return fallback response | P0 incident |

## Summary

| Principle | Detail |
|-----------|--------|
| Never fail the executive | Memory is advisory, not mandatory |
| Per-store timeout isolation | Each store has independent timeout |
| Graceful degradation | Partial results > no results |
| Circuit breaker per store | Prevent cascading failures |
| Fallback response | "Memory unavailable — proceeding without past context" |
| All stores down | Return fallback response, increment critical metric |
| Zero LLM calls on error | Error handling uses NO LLM calls |
| Error metrics | Every error type has dedicated metric |
| Recovery | Self-healing: circuit breaker auto-closes after 60s |
