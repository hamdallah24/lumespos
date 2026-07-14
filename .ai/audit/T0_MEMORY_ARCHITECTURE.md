# T.0 — Phase 2: Memory Architecture Mapping

## As-Is Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     EXECUTIVE RUNTIME                       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │ CEO │ │ CTO │ │ COO │ │ CFO │ │ CMO │ │CAIO │ │ CKO │  │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘  │
│     │       │       │       │       │       │       │       │
│     └───────┴───────┴───────┴───────┴───────┴───────┴───────┘
│                             │                                 │
│                    ┌────────▼────────┐                        │
│                    │  CognitiveEngine │                        │
│                    │  (thinking_mode, │                        │
│                    │   mental_model,  │                        │
│                    │   framework,     │                        │
│                    │   reasoning,     │                        │
│                    │   decision)      │                        │
│                    └────────┬────────┘                        │
│                             │                                 │
│              ┌──────────────┼──────────────┐                  │
│              ▼              ▼              ▼                  │
│    ┌─────────────────┐ ┌──────────┐ ┌──────────────┐         │
│    │  KnowledgeLoader │ │ Knowledge│ │   Prompt     │         │
│    │  (loadKnowledge) │ │ Provider │ │  Assembler   │         │
│    └────────┬────────┘ └────┬─────┘ └──────┬───────┘         │
│             │               │              │                  │
└─────────────┼───────────────┼──────────────┼──────────────────┘
              │               │              │
    ┌─────────▼───┐   ┌──────▼──────┐   ┌───▼──────────┐
    │KnowledgeGraph│   │KnowledgeBase│   │FoundationCache│
    │ (KG#2:       │   │ (Platform)  │   │ (Redis-backed)│
    │  Foundation)  │   │             │   │              │
    └──────┬───────┘   └──────┬──────┘   └──────────────┘
           │                  │
           ▼                  ▼
    ┌──────────────┐   ┌──────────────┐
    │Foundation    │   │  ai-memory-  │
    │Loader        │   │  service.ts  │
    │(DGPs assets)  │   │ (PostgreSQL) │
    └──────────────┘   └──────┬───────┘
                              │
                         ┌────▼────┐
                         │  Redis  │
                         │ (cache) │
                         └─────────┘

┌─────────────────────────────────────────────────────────────┐
│                  MEMORY SUBSYSTEMS (UNUSED)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/memory/ (ContextManager, BudgetManager, etc.)    │   │
│  │  → Used by execution-driver (mission pipeline)        │   │
│  │  → NOT called by any executive directly              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/executive-memory/ (DecisionRecorder, Recall)     │   │
│  │  → Used by eios-runtime/observers                     │   │
│  │  → NOT called by any executive or CognitiveEngine     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/learning/ (LearningEngine, Experience, Graph)    │   │
│  │  → Used by executive-collaboration (post-mission)     │   │
│  │  → Scheduled daily cycle has BROKEN IMPORT             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  src/intelligence/ (OrgMemory, Fusion, Consensus)     │   │
│  │  → Used by governance/ and organization/              │   │
│  │  → NOT called by any executive                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Gap

The DESIGN is:
```
Executive → Memory Provider → Redis → Vector Store → Knowledge Graph
```

The REALITY is:
```
Executive → CognitiveEngine → KnowledgeLoader → KnowledgeGraph(KG#2)
                                              ↘ KnowledgeBase(Platform)
```

**Memory is bypassed entirely.** The chain `Executive → Memory → Redis → Vector Store → Knowledge Graph` does NOT exist.

## Why

1. **No Memory abstraction layer**: There is no `MemoryProvider` that executives call. Each memory subsystem (executive-memory, learning, intelligence, runtime-memory) is standalone with no unified interface.

2. **Redis is infrastructure, not runtime**: Redis is used for caching/persistence (conversation history, knowledge queue, foundation cache), but NOT as a runtime memory store that executives read from.

3. **No Vector Store**: The codebase has zero embedding or vector search code. `knowledge-graph.ts` explicitly states "Not a vector DB."

4. **Knowledge Graph is knowledge, not memory**: The three KG implementations store structured knowledge, not executive experience/memory. They are not integrated with the Memory subsystems.

5. **Learning Engine is post-mission, not real-time**: The learning cycle runs after missions complete (or daily), not during executive reasoning. The CTO is the only executive that calls `reflect()` as part of its pipeline.
