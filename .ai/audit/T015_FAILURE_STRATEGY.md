# T.0.1.5 — Phase 9: Failure Strategy Lock

## Source
T.0.1 Memory Error Handling (T01_MEMORY_ERROR_HANDLING.md), Memory Read Pipeline (T01_MEMORY_READ_PIPELINE.md)

## Core Principle (LOCKED)

**Never fail the executive. Memory is advisory.** An executive must always be able to complete reasoning even if ALL memory stores are unavailable.

## Store-Level Failure Strategy (LOCKED)

| Store | Failure Mode | Behavior | Executive Impact | Recovery |
|-------|:------------:|----------|:----------------:|----------|
| **Working Memory** | Timeout (>200ms) | Return empty string | Working memory section empty — executive proceeds | Next call retries |
| **Working Memory** | Unavailable | Return empty string | Working memory section empty | Circuit breaker after 5 errors |
| **Decisions** | Timeout (>300ms) | Return empty string | Decision history empty | Next call retries |
| **Decisions** | Unavailable | Return empty string | Decision history empty | Circuit breaker after 5 errors |
| **Semantic Memory** | Timeout (>400ms) | Skip section (omit from context) | No semantic context — unaffected | Next call retries |
| **Semantic Memory** | Unavailable | Skip section | No semantic context — unaffected | Circuit breaker after 5 errors |
| **Episodic Memory** | Timeout (>500ms) | Return empty string | Episodic section empty | Next call retries |
| **Episodic Memory** | Unavailable | Return empty string | Episodic section empty | Circuit breaker after 5 errors |
| **Knowledge** | Timeout (>200ms) | Return empty string | Knowledge section empty | Next call retries |
| **Knowledge** | Unavailable | Return empty string | Knowledge section empty | Circuit breaker after 5 errors |
| **Organizational Memory** | Timeout (>500ms) | Skip section | Org section omitted | Next call retries |
| **Organizational Memory** | Unavailable | Skip section | Org section omitted | Circuit breaker after 5 errors |

## Cache-Layer Failure Strategy (LOCKED)

| Component | Failure Mode | Behavior | Executive Impact |
|:---------:|:------------:|----------|:----------------:|
| L1 (In-Memory) | Entry corrupt | Evict entry, treat as miss | Slight latency increase (now queries L2 or stores) |
| L1 (In-Memory) | OOM | Disable L1, log critical | Latency increases (L2 or direct queries) |
| L2 (Redis) | Connection timeout | Skip L2, query stores directly | Latency increases (direct store queries) |
| L2 (Redis) | Connection refused | Skip L2, log warning | Latency increases (direct store queries) |
| L2 (Redis) | Serialization error | Evict entry, query stores | Single entry latency impact |
| L2 (Redis) | OOM (Redis side) | Skip L2, log warning | Latency increases, stores handle load |

## Circuit Breaker Strategy (LOCKED)

| Parameter | Value |
|-----------|:-----:|
| Error threshold | 5 errors in 30s |
| Open state duration | 60s |
| Half-open test | 1 request (if success → CLOSED, if fail → OPEN) |
| Scope | Per-store (independent breakers) |
| All stores OPEN | Return fallback response |
| Metrics | `circuit_breaker_open.{store}` gauge |

### State Machine

```
CLOSED ──(5 errors in 30s)──→ OPEN ──(60s elapsed)──→ HALF_OPEN
  ↑                              │                        │
  └────(test request success)────┘                        │
        OPEN ←──(test request failure)────────────────────┘
```

## Global Failure Strategy (LOCKED)

### Scenario: All Stores Unavailable

```typescript
// LOCKED — fallback response when ALL stores fail
const fallbackResponse: MemoryContext = {
  recentDecisions: "",  // Empty — executive proceeds without memory
  workingMemory: "",
  semanticMemory: "",
  episodicMemory: "",
  knowledgeContext: "",
  organizationalMemory: "",
  totalTokens: 0,
};
```

### Scenario: Token Budget Exhausted

| Condition | Behavior |
|-----------|----------|
| Estimated > Budget | Apply truncation (6 levels) |
| Truncated still > Budget | Return only working memory |
| Working memory > Budget | Return empty MemoryContext (totalTokens = 0) |

### Scenario: Memory Read Skipped

| Condition | Behavior |
|-----------|----------|
| Feature flag `memoryRead.enabled = false` | Skip MemoryProvider entirely |
| LLM context < 20% remaining | Skip MemoryProvider entirely |
| MemoryProvider throws unexpected error | Return fallback response (empty) |

## Error Response Format (LOCKED)

```typescript
// All error responses follow this contract:
{
  recentDecisions: string;      // Empty string or fallback message
  workingMemory: string;        // Empty string or minimal context
  semanticMemory: string;       // Empty string
  episodicMemory: string;       // Empty string
  knowledgeContext: string;     // Empty string
  organizationalMemory: string; // Empty string
  totalTokens: number;          // 0 for complete failure
}
```

## Monitoring & Alerting (LOCKED)

| Alert | Condition | Severity | Action |
|-------|-----------|:--------:|--------|
| MemoryReadDegraded | p95 latency > 1000ms for 5min | P2 | Investigate store performance |
| MemoryReadFailing | Error rate > 5/min for 1min | P1 | Page on-call |
| MemoryReadAllDown | All stores unavailable | P0 | Page on-call immediately |
| MemoryReadCircuitBreakerOpen | Any circuit breaker open | P1 | Page on-call |
| MemoryReadNotUsed | Memory used in decisions < 20% for 1 day | P3 | Review integration health |

## Verification

| Check | Status |
|-------|:------:|
| Executive never fails due to memory? | **PASS** — All stores can fail independently |
| Per-store timeout defined? | **PASS** — 200ms-500ms per store |
| Circuit breaker defined? | **PASS** — 5 errors / 30s → OPEN, 60s retry |
| Cache failure handled? | **PASS** — L1 corrupt → evict, L2 down → query stores |
| All stores down scenario? | **PASS** — Fallback response with empty strings |
| Token budget exhausted? | **PASS** — 6-level truncation, minimum working memory |
| Feature flag toggle? | **PASS** — memoryRead.enabled skips entirely |
