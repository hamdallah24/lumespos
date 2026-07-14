# T.0.1.5 — Phase 6: Data Ownership Lock

## Source
T.0.1 Memory Provider Design (T01_MEMORY_PROVIDER_DESIGN.md:100-111) — Proposed ownership

## Ownership Table (LOCKED)

| Memory Store | Owner | Rationale | Existing Implementation |
|-------------|-------|-----------|------------------------|
| **MemoryProvider** (interface + implementation) | **Executive Runtime** | Interface is contract between executive and memory. Implementation is orchestrator — owned by runtime, not by any single memory store. | `memory-provider/` (NEW) |
| **Working Memory** | **CEO / CKO** | Current task context. CEO owns strategic context (delegations, plans). CKO owns knowledge curation context. | `memory/ContextManager` (existing) |
| **Semantic Memory** | **CEO** | Temporal reference resolution ("seperti yang kita bahas kemarin"). CEO drives strategic conversations that span sessions. | `ai/runtime/semantic-memory.ts` (existing, orphaned) |
| **Conversation Memory** | **CEO** | Multi-session conversation history with founder. CEO is primary interface for founder interaction. | `services/ai-memory-service.ts` (existing) |
| **Decision Memory** | **CEO** | Past decisions by all executives. CEO needs cross-executive decision history for strategic oversight. | `executive-memory/DecisionRecorder`, `ExecutiveMemoryProvider` (existing) |
| **Episodic Memory** | **CKO** | Past mission episodes. CKO manages knowledge lifecycle — episodes are knowledge artifacts. | `ai/runtime/organizational-memory.ts` (existing) |
| **Organizational Memory** | **CKO** | Validated organizational knowledge. CKO is knowledge governor. | `intelligence/organizational-memory.ts` (existing) |
| **Knowledge Graph** | **CKO** | Domain knowledge, entity relationships. CKO governs knowledge quality. KG#1 (learning), KG#2 (domain), KG#3 (knowledge platform). | `learning/knowledge-graph.ts`, `ai/runtime/knowledge/` (existing) |
| **Learning Engine** | **CKO** | Retrieval, reflection, pattern detection. CKO manages learning outcomes. | `learning/LearningEngine`, `RetrievalEngine`, `ReflectionEngine` (existing) |
| **Redis Cache** | **Infrastructure** | Caching infrastructure. No executive owns cache — it's a shared infra service. | `lib/redis/RedisCache` (existing) |
| **Reflection** | **CKO** | Past reflections on mission outcomes. CKO owns knowledge evolution. | `learning/reflection-engine.ts` (existing) |

## Ownership Diagram

```
EXECUTIVE RUNTIME ─── owns ─── MemoryProvider (interface + implementation)
                                     │
                                     ▼
                      ┌──────────────────────────┐
                      │     MEMORY PROVIDER       │  ← owned by Executive Runtime
                      │  (orchestration only)     │
                      └──────────────────────────┘
                           │         │        │
              ┌────────────┘         │        └────────────┐
              ▼                     ▼                     ▼
     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
     │   CEO DOMAIN  │    │  CKO DOMAIN  │    │INFRASTRUCTURE│
     │  Working Mem  │    │ Episodic Mem │    │ Redis Cache  │
     │  Semantic Mem │    │ Org Memory   │    └──────────────┘
     │  Conv Memory  │    │ Knowledge G  │
     │  Decision Mem │    │ Learning Eng │
     └──────────────┘    │ Reflection   │
                         └──────────────┘
```

## Ownership Responsibilities

### Executive Runtime (MemoryProvider Owner)

| Responsibility | Description |
|---------------|-------------|
| Interface definition | `MemoryProvider`, `MemoryQuery`, `MemoryContext` |
| Implementation | `read()`, `estimate()` orchestration |
| Testing | Unit tests, integration tests, E2E tests |
| Performance | Latency, throughput, cache hit rate |
| Error handling | Timeout, circuit breaker, graceful degradation |
| Monitoring | Metrics, logging, alerting |

### CEO (CEO Domain Stores Owner)

| Responsibility | Description |
|---------------|-------------|
| Working Memory quality | ContextManager accuracy, freshness |
| Semantic Memory recall | Temporal reference resolution accuracy |
| Conversation Memory | Session continuity, history retention |
| Decision Memory | Decision completeness, executive attribution |

### CKO (CKO Domain Stores Owner)

| Responsibility | Description |
|---------------|-------------|
| Episodic Memory quality | Episode completeness, search relevance |
| Organizational Memory | Knowledge validation, deduplication |
| Knowledge Graph | Entity accuracy, relationship completeness |
| Learning Engine | Reflection quality, pattern detection |
| Reflection | Reflection depth, actionability |

### Infrastructure (Redis Cache Owner)

| Responsibility | Description |
|---------------|-------------|
| Cache availability | Redis uptime, connection pool |
| Cache performance | Hit rate, latency, eviction |
| Cache capacity | Memory limits, TTL enforcement |

## Summary

| Owner | Stores | Count |
|-------|--------|:-----:|
| **Executive Runtime** | MemoryProvider (interface + implementation) | 1 |
| **CEO** | Working Memory, Semantic Memory, Conversation Memory, Decision Memory | 4 |
| **CKO** | Episodic Memory, Organizational Memory, Knowledge Graph, Learning Engine, Reflection | 5 |
| **Infrastructure** | Redis Cache | 1 |
| **Total** | — | 11 |
