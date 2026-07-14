# T.0 — Phase 8: Dependency Audit

## Executive → Memory Dependency Graph

```
USES (source → target):
  CEO Program
    → CognitiveEngine
    → KnowledgeBackbone → ContextManager (src/memory/)
    → KnowledgeProvider (src/knowledge-platform/)

  CTO Program
    → CognitiveEngine
    → loadKnowledgeWithContent → KnowledgeGraph#2 (src/ai/runtime/knowledge-graph.ts)
    → reflect() → ReflectionEngine (src/ai/runtime/reflection-engine.ts)
    → KnowledgeProvider

  COO Program → CognitiveEngine → KnowledgeProvider
  CFO Program → CognitiveEngine → KnowledgeProvider
  CMO Program → CognitiveEngine → KnowledgeProvider
  CAIO Program → CognitiveEngine → KnowledgeProvider
  CKO Program → CognitiveEngine → ConsultantRuntime → KnowledgeGovernor → KG#3
  CHRO Program → CognitiveEngine → KnowledgeProvider
```

## Memory Subsystem Internal Dependencies

```
LEARNING (src/learning/):
  LearningEngine
    → ExperienceEngine.record()
    → ReflectionEngine.reflect()
    → KnowledgeEngine.synthesize()
    → KnowledgeGraph#1.addNode()
    → MemoryIndex.add()
    → ExecutiveMemoryStore.get()
    → KnowledgeGovernor.register()  [bridge to KG#3]

INTELLIGENCE (src/intelligence/):
  OrganizationIntelligence
    → OrganizationalMemory.propose()
    → KnowledgeFusion.fuse() → KnowledgeGraph#1, LearningEngine
    → CrossExecutiveLearning.transfer()
    → ExecutiveReputationTracker
    → DecisionHistoryStore

KNOWLEDGE OFFICE (src/ai/runtime/knowledge/):
  KnowledgeGovernor
    → KnowledgeGraph#3.addCard()
    → LifecycleManager
    → KnowledgeConfidenceEngine
    → KnowledgeDeduplicator
    → ContradictionDetector
    → KnowledgeRanker
    → ArchiveManager
  KnowledgeQueue
    → RedisService (optional)

REDIS:
  RedisService
    → RedisConnection → ioredis
    → RedisCache
    → RedisQueue
    → RedisPubSub
    → RedisLock

FOUNDATION (src/ai/runtime/):
  KnowledgeGraph#2.buildGraph()
    → FoundationLoader.load()
  KnowledgeLoader
    → KnowledgeGraph#2
    → KnowledgeRepository (LRU cache)
```

## Orphan Components

| Component | File | Status |
|-----------|------|--------|
| `RetrievalEngine` | `src/learning/retrieval-engine.ts` | **ORPHAN** — no caller imports or invokes it |
| `RedisPubSub` | `src/lib/redis/redis-pubsub.ts` | **ORPHAN** — no subscriber in production code |
| `knowledge-repository.ts` | `src/ai/runtime/knowledge-repository.ts` | **ORPHAN** — comment says "Reusable by Memory Runtime (Sprint 14)" |
| `learning/reflection-engine.ts` | `src/learning/reflection-engine.ts` | ⚠ Partial — only called within `learningEngine.cycle()`, no external caller |
| `learning/experience-engine.ts` | `src/learning/experience-engine.ts` | ⚠ Partial — only called within `learningEngine.cycle()` |
| `learning/knowledge-engine.ts` | `src/learning/knowledge-engine.ts` | ⚠ Partial — only called within `learningEngine.cycle()` |
| `ai/memory/` | `src/ai/memory/` | **EMPTY DIRECTORY** — placeholder only |

## Dead Imports (Unused)

| File | Line | Import | Status |
|------|------|--------|--------|
| `executive-auditor.ts` | 6 | `import { learningEngine }` | **UNUSED** — imported but never called |
| `knowledge-fusion.ts` | 7 | `import { learningEngine }` | **UNUSED** — imported but never called |

## Circular Dependencies

| Pattern | Risk |
|---------|------|
| `LearningEngine → KnowledgeGovernor → KG#3` + `KG#3 → LearningEngine` | **Potential** — LearningEngine pushes to KnowledgeGovernor (`.register()`), and KnowledgeGovernor's lifecycle could theoretically trigger learning. No evidence of actual cycle. |
| `KnowledgeFusion → LearningEngine → KnowledgeGovernor → KnowledgeFusion` | **Potential indirect** — fusion reads from KG#1, learning pushes to KG#3, governance reads from KG#3. Long chain but no immediate cycle. |

## Broken Dependencies

| File | Line | Dependency | Status |
|------|------|-----------|--------|
| `src/index.ts` | 128 | `"./ai/runtime/learning/learning-engine"` | **BROKEN** — directory does not exist |

## Dependency Health Summary

| Metric | Value |
|--------|-------|
| Total memory files audited | 105 |
| Orphan components | 4 (RetrievalEngine, RedisPubSub, knowledge-repository, ai/memory/) |
| Partial orphans | 3 (ExperienceEngine, ReflectionEngine, KnowledgeEngine — only called within LearningEngine cycle) |
| Dead imports | 2 (executive-auditor, knowledge-fusion) |
| Broken imports | 1 (index.ts:128 — scheduled learning cycle) |
| Circular dependencies | 0 proven (2 potential long chains) |
