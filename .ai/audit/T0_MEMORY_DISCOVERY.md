# T.0 — Phase 1: Memory Discovery

## Complete Inventory of Memory Components

Total: **105 files across 19 directories** (including Redis, Knowledge Graph, Learning)

### 1. `src/memory/` — Core Memory Infrastructure (5 files)

| File | Class/Module | Owner | Storage | Public API |
|------|-------------|-------|---------|------------|
| `memory/ContextManager.ts` | `ContextManager` | CKO | In-memory Map | `getMemory()`, `updateMemory()`, `buildMemoryPrompt()` |
| `memory/BudgetManager.ts` | `BudgetManager` | COO | Transient | Hierarchical token budget allocation |
| `memory/MissionIntelligence.ts` | `MissionIntelligence` | CEO | Stateless | Evidence negotiation, mission lifetime |
| `memory/MissionBudgetTracker.ts` | `MissionBudgetTracker` | COO | In-memory | `recordCycle()`, `snapshot()` |
| `memory/budget-config.ts` | `ModelDensity` (config) | — | Stateless | `getModelDensity()`, `charsToTokens()` |

Consumers: `execution-driver.ts`, `KnowledgeBackbone.ts`, `llm-adapter.ts`

---

### 2. `src/executive-memory/` — Decision Recording & Recall (7 files)

| File | Class/Module | Owner | Storage | Public API |
|------|-------------|-------|---------|------------|
| `executive-memory/types.ts` | Interfaces | CEO | — | Types only |
| `executive-memory/DecisionRecorder.ts` | Functions | CEO | In-memory array (500) | `recordDecision()`, `queryDecisions()` |
| `executive-memory/MemoryRecallEngine.ts` | Functions | CEO | Stateless | `recallDecisions()`, `recallForExecutive()` |
| `executive-memory/OutcomeTracker.ts` | Functions | CEO | In-memory array (500) | `recordOutcome()`, `getOutcomeStats()` |
| `executive-memory/PatternDetector.ts` | Functions | CEO | Stateless | `detectPatterns()` |
| `executive-memory/ExecutiveMemoryProvider.ts` | Facade object | CEO | Aggregates above | Unified API |
| `executive-memory/index.ts` | Barrel + `initializeExecutiveMemory()` | CEO | — | Module exports |

Consumer: `eios-runtime/observers/index.ts`

---

### 3. `src/learning/` — Organizational Learning (10 files)

| File | Class/Module | Owner | Storage | Public API |
|------|-------------|-------|---------|------------|
| `learning/learning-types.ts` | Interfaces | CTO | — | Types: Experience, Reflection, KnowledgeNode |
| `learning/experience-engine.ts` | `ExperienceEngine` | CTO | Stateless | `record()`, `score()` |
| `learning/reflection-engine.ts` | `ReflectionEngine` | CTO | Stateless | `reflect()` |
| `learning/knowledge-engine.ts` | `KnowledgeEngine` | CKO | Stateless | `synthesize()`, `merge()` |
| `learning/knowledge-graph.ts` | `KnowledgeGraph` | CKO | In-memory Map | `addNode()`, `traverse()`, `search()` |
| `learning/memory-index.ts` | `MemoryIndex` | CKO | In-memory Map | `add()`, `search()`, `findByExecutive()` |
| `learning/executive-memory.ts` | `ExecutiveMemoryStore` | CKO | In-memory Map | `init()`, `get()`, `addExperience()` |
| `learning/knowledge-queue.ts` | `KnowledgeQueue` | CKO | In-memory array | `push()`, `process()` |
| `learning/retrieval-engine.ts` | `RetrievalEngine` | CKO | Stateless | `retrieve()` |
| `learning/learning-engine.ts` | `LearningEngine` | CTO | Orchestrator | `cycle()`, `stats()` |

---

### 4. `src/intelligence/` — Organizational Intelligence (8 files)

| File | Class/Module | Owner | Storage | Public API |
|------|-------------|-------|---------|------------|
| `intelligence/organizational-memory.ts` | `OrganizationalMemory` | CKO | In-memory Map | `propose()`, `validate()`, `search()` |
| `intelligence/knowledge-fusion.ts` | `KnowledgeFusion` | CKO | Stateless | `fuse()`, `crossPollinate()` |
| `intelligence/executive-reputation.ts` | `ExecutiveReputationTracker` | CKO | In-memory | Track quality scores |
| `intelligence/consensus-engine.ts` | `ConsensusEngine` | CEO | Stateless | Conflict resolution |
| `intelligence/decision-history.ts` | `DecisionHistoryStore` | CEO | In-memory array | Past decision evaluation |
| `intelligence/cross-executive-learning.ts` | `CrossExecutiveLearning` | CKO | Stateless | `transfer()`, `learnFromBest()` |
| `intelligence/organization-intelligence.ts` | `OrganizationIntelligence` | CKO | Orchestrator | `onLearningComplete()`, `report()` |

---

### 5. `src/ai/runtime/` — Runtime Memory Systems (13 files)

| File | Class/Module | Owner | Storage | Public API |
|------|-------------|-------|---------|------------|
| `ai/runtime/semantic-memory.ts` | Functions | CEO | In-memory (20) | `remember()`, `recall()`, `augmentWithMemory()` |
| `ai/runtime/organizational-memory.ts` | Functions | CEO | In-memory (100) | `recordEpisode()`, `searchMemory()`, `orgStats()` |
| `ai/runtime/reflection-engine.ts` | Functions | CTO | Stateless | `reflect()`, `ExecutionReport` |
| `ai/runtime/knowledge-graph.ts` | Functions (KG#2) | CKO | Built from Foundation | `buildGraph()`, `validateGraph()` |
| `ai/runtime/knowledge-repository.ts` | `KnowledgeRepository` | CKO | LRU cache | Get/set knowledge nodes |
| `ai/runtime/knowledge-loader.ts` | Functions | All | Reads graph + cache | `loadKnowledge()`, `loadKnowledgeWithContent()` |
| `ai/runtime/knowledge-metrics.ts` | Functions | CKO | Stateless | Coverage, freshness metrics |
| `ai/runtime/knowledge-evolution.ts` | Functions | CKO | Stateless | Evidence-driven proposals |
| `ai/runtime/context/runtime-memory-manager.ts` | Functions | CEO | Reads ai-memory-service | `getRecentDecisions()`, `summarizeConversation()` |
| `ai/runtime/execution/execution-driver.ts` | Functions | CEO | Orchestrator | Uses contextManager + budgetManager |
| `ai/runtime/knowledge/` | 17 files (below) | CKO | Various | Complete Knowledge Office |

---

### 6. `src/ai/runtime/knowledge/` — Knowledge Office Pipeline (17 files)

| File | Class/Module | Public API |
|------|-------------|------------|
| `knowledge-card.ts` | `createCard`, `promoteCard` | KnowledgeCard lifecycle |
| `knowledge-manager.ts` | `KnowledgeManager` | Mission event processing |
| `knowledge-governor.ts` | `KnowledgeGovernor` | Chief Knowledge Office orchestrator |
| `knowledge-graph.ts` | `KnowledgeGraph` (KG#3) | Card relationship graph |
| `knowledge-queue.ts` | `KnowledgeQueue` | Redis-backed queue |
| `knowledge-lifecycle.ts` | `LifecycleManager` | RAW→ARCHIVED state machine |
| `knowledge-confidence.ts` | `KnowledgeConfidenceEngine` | Confidence scoring |
| `knowledge-deduplicator.ts` | `KnowledgeDeduplicator` | Duplicate detection |
| `knowledge-contradiction.ts` | `ContradictionDetector` | Contradiction detection |
| `knowledge-ranker.ts` | `KnowledgeRanker` | Ranking |
| `knowledge-promoter.ts` | `KnowledgePromoter` | Auto-promotion |
| `knowledge-archive.ts` | `ArchiveManager` | Auto-archiving |
| `knowledge-summarizer.ts` | `generateSummary` | Summaries |
| `knowledge-index.ts` | `generateIndex` | Context index |
| `consultant-cache.ts` | `ConsultantCacheBuilder` | L1-L4 cache |
| `foundation-proposal.ts` | `proposalGenerator` | Foundation proposals |
| `mission-event.ts` | Types | Mission event types |

---

### 7. `src/services/` — Conversation Memory (1 file)

| File | Class/Module | Storage | Public API |
|------|-------------|---------|------------|
| `services/ai-memory-service.ts` | Functions | PostgreSQL + Redis cache | `getOrCreateConversation()`, `getHistory()`, `remember()`, `clearMemory()` |

---

### 8. `src/knowledge-platform/` — Knowledge Platform (18 files)

| File | Class/Module | Public API |
|------|-------------|------------|
| `core/KnowledgeBase.ts` | `KnowledgeBase` | Central in-memory store |
| `semantic/SemanticStore.ts` | `SemanticStore` | Fact storage |
| `semantic/SemanticQuery.ts` | `SemanticQuery` | Fact queries |
| `episode/EpisodeStore.ts` | `EpisodeStore` | Episode storage |
| `procedural/ProceduralStore.ts` | `ProceduralStore` | How-to storage |
| `learning/LearningEngine.ts` | `LearningEngine` (KP) | Confidence, promotion, deprecation |
| `providers/KnowledgeProvider.ts` | `KnowledgeProvider` | Unified API |

---

### 9. `src/lib/redis/` — Redis Infrastructure (8 files)

| File | Class/Module | Public API |
|------|-------------|------------|
| `redis/index.ts` | `RedisService` (singleton) | `init()`, `shutdown()` |
| `redis/redis-connection.ts` | `RedisConnection` | `connect()`, `ping()` |
| `redis/redis-cache.ts` | `RedisCache` | `get()`, `set()`, `del()`, `remember()` |
| `redis/redis-queue.ts` | `RedisQueue` | `push()`, `pop()`, `subscribe()` |
| `redis/redis-pubsub.ts` | `RedisPubSub` | `publish()`, `subscribe()` |
| `redis/redis-lock.ts` | `RedisLock` | `acquire()`, `release()`, `withLock()` |
| `redis/redis-health.ts` | Health functions | `getRedisHealthReport()` |
| `redis/redis-config.ts` | Config | `isRedisEnabled()` |

---

### 10. Other Memory-Related Components (8 files)

| File | Class/Module | Description |
|------|-------------|-------------|
| `event-bus/EventStore.ts` | `EventStore` | PostgreSQL event sourcing |
| `business-intelligence/core/MetricStore.ts` | `MetricStore` | TTL-based metric store |
| `mission/MissionHistory.ts` | `MissionHistory` | Append-only mission history |
| `executive-council/learning/` | 6 files | Council session learning |
| `governance/improvement-engine.ts` | `ImprovementEngine` | Improvement plan generation |
| `governance/quality-engine.ts` | `QualityEngine` | Org quality scoring |
| `executive-runtime/cognition/CognitiveEngine.ts` | `CognitiveEngine` | Executive reasoning engine |
| `executive-runtime/cognition/CognitiveTraceStore.ts` | Functions | In-memory trace storage (100) |

---

### Orphan Files / Empty Directories

| Path | Status |
|------|--------|
| `src/ai/memory/` | **EMPTY — placeholder only** |
| `src/learning/retrieval-engine.ts` | Instantiated — **NO callers found** |
| `src/ai/runtime/knowledge-repository.ts` | Comment: "Reusable by Memory Runtime (Sprint 14)" — **future use** |

### Summary Statistics

- **Memory files**: 105 across 19 directories
- **Direct memory stores**: 7 (ContextManager map, DecisionRecorder array, OrganizationalMemory map, etc.)
- **Persistent memory** (DB-backed): 2 (ai-memory-service → PostgreSQL, EventStore → PostgreSQL)
- **Cache layer**: Redis (optional, 8 files)
- **Knowledge Graph implementations**: 3 (Learning, Foundation, Knowledge Office)
- **Learning Engine implementations**: 2 (Learning, Knowledge Platform)
- **Reflection Engine implementations**: 3 (Learning, AI Runtime, Council)
- **Embedding/Vector**: **NONE**
