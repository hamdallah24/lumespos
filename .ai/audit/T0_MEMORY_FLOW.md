# T.0 — Phase 7: Memory Flow Reconstruction

## Actual Flow (Verified by Code)

### CEO Flow

```
User → CEO Runtime
  → CognitiveEngine.think()          [executive-runtime/cognition/CognitiveEngine.ts]
    → thinking_mode_selection
    → mental_model_selection
    → framework_selection
    → reasoning_plan
    → evidence_building
    → confidence_calculation
    → decision_generation
    → recommendation_building
  → PromptAssembler.assemble()        [ai/runtime/prompt-assembler.ts]
    → Identity (CEO)
    → Directive (from registry)
    → Foundation Context
  → LLM (DEEPSEEK)
  → Decision
  → KnowledgeProvider.ingestEpisode() [knowledge-platform/]
  → return result

MEMORY: ✗ NOT USED during reasoning
```

### CTO Flow

```
User → CTO Runtime
  → CognitiveEngine.think()
  → loadKnowledgeWithContent()         [ai/runtime/knowledge-loader.ts]
    → buildGraph()                    [ai/runtime/knowledge-graph.ts - KG#2]
      → FoundationLoader.load()
  → PromptAssembler.assemble()
  → LLM
  → Reflect()                         [ai/runtime/reflection-engine.ts]
    → ExecutionReport
  → KnowledgeProvider.ingestEpisode()
  → return result

MEMORY: ⚠ INDIRECT — loads static knowledge graph, CTO reflects on execution
```

### COO / CFO / CMO / CAIO / CHRO Flow

```
User → Executive Runtime
  → CognitiveEngine.think()
  → PromptAssembler.assemble()
  → LLM
  → Decision
  → KnowledgeProvider.ingestEpisode()
  → return result

MEMORY: ✗ NOT USED
```

### CKO Flow

```
User → CKO Runtime
  → CognitiveEngine.think()
  → ConsultantRuntime.advisor()
    → ConsultantCacheBuilder.build()      [knowledge/consultant-cache.ts]
    → KnowledgeGovernor.getContext()      [knowledge/knowledge-governor.ts]
      → KnowledgeGraph.traverse()         [knowledge/knowledge-graph.ts - KG#3]
      → KnowledgeRanker.rank()
  → PromptAssembler.assemble()
  → return result

MEMORY: ⚠ INDIRECT — uses Knowledge Office pipeline which has a graph
```

## Post-Mission Flows (Happen AFTER executive finishes)

### Executive Collaboration Learning Flow

```
Executive Collaboration ([organization/executive-collaboration.ts])
  (after multi-executor session completes)
  → learningEngine.cycle()                [learning/learning-engine.ts]
    → experienceEngine.record()           → Experience
    → reflectionEngine.reflect()          → Reflection
    → knowledgeEngine.synthesize()        → KnowledgeNode
    → knowledgeGraph.addNode()            → Graph (KG#1)
    → knowledgeGraph.autoLink()
    → memoryIndex.add()                   → Index
    → executiveMemoryStore.get(exec)      → Per-executive memory
    → executiveMemoryStore.addKnowledge()
    → executiveMemoryStore.recordOutcome()
  → knowledgeGovernor.register()          → Knowledge Office (KG#3)
  → organizationIntelligence.onLearningComplete()
    → crossExecutiveLearning.shareBestPractices()
    → knowledgeFusion.fuse()
    → organizationalMemory.propose()
```

### Daily Scheduled Learning Flow (BROKEN)

```
index.ts scheduler (24h)
  → import("./ai/runtime/learning/learning-engine")  ← BROKEN PATH
  → fails silently (try/catch logs warning)
```

## What SHOULD Happen (Design Intent)

The ECP documents describe this ideal flow:
```
Executive Reasoning
  → Memory Recall (past decisions, patterns)
  → Knowledge (from graph)
  → Reasoning
  → Decision
  → Memory Record
```

## What ACTUALLY Happens

```
Executive Reasoning
  → Knowledge (from loader/backbone)
  → Reasoning (CognitiveEngine — stateless, no memory)
  → Decision
  → Memory Record (KnowledgeProvider.ingestEpisode — write-only)
```

**Memory is WRITE-ONLY from executive perspective.** Executives record episodes, decisions, and outcomes but NEVER READ from any memory store during reasoning. The CognitiveEngine has no memory recall step.

---

## Evidence Summary

| What | Does it happen? | Proof |
|------|:--------------:|-------|
| Executive reads past decisions | ✗ NO | DecisionRecorder never imported by any executive |
| Executive reads past experiences | ✗ NO | LearningEngine is post-mission only |
| Executive reads organizational memory | ✗ NO | OrganizationalMemory used by governance, not executives |
| Executive reads semantic memory | ✗ NO | semantic-memory.ts is standalone, unused by CognitiveEngine |
| Executive records episodes | ✓ YES | KnowledgeProvider.ingestEpisode() called by all executives |
| Executive records decisions | ✓ YES | ExecutiveMemoryProvider called by EIOS observers |
| Executive reflects on outcomes | ⚠ CTO only | reflect() called only in CTOProgram.ts:343 |
| Post-mission learning runs | ⚠ Partial | Called from executive-collaboration; BROKEN scheduled cycle |
| Redis caches memory | ✓ YES | ai-memory-service uses Redis cache |
| Redis queues knowledge | ✓ YES | knowledge-queue uses Redis list |
