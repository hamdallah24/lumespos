# T.0.1 — Phase 1: Memory Read Discovery

## Who Currently Reads Memory?

### Direct Memory Reads (Verified by Code)

| Reader | What They Read | Source | Lines | When |
|--------|---------------|--------|-------|------|
| **CEO Program** | Executive memory (ContextManager) | `knowledgeBackbone.summarizeMemory("CEO")` | `CEOProgram.ts:100` | Before CognitiveEngine |
| **CEO Program** | Mission episodes (KnowledgeProvider) | `KnowledgeProvider.getLatestEpisodes(5)` | `CEOProgram.ts:251-261` | After LLM (refusal recovery) |
| **CEO Program** | Plan context (PlanProvider) | `PlanProvider.getAll()` | `CEOProgram.ts:120` | Before CognitiveEngine |
| **CTO Program** | File content (MissionContextRegistry) | `missionContextRegistry.getRelevant()` | `CTOProgram.ts:104-116` | Before CognitiveEngine |
| **CTO Program** | Knowledge (FoundationLoader) | `loadKnowledgeWithContent()` | `CTOProgram.ts:238` | Before CognitiveEngine |
| **CTO Program** | CKO analysis (ConsultantRuntime) | `consultantRuntime.analyze()` | `CTOProgram.ts:162` | Before CognitiveEngine |
| **EIOS Observers** | Decisions (ExecutiveMemoryProvider) | `ExecutiveMemoryProvider.recordDecision()` | `observers/index.ts:34` | After decision.made event |
| **Governance** | Learning stats (LearningEngine) | `learningEngine.stats()` | `quality-engine.ts:16` | On audit |
| **Executive-collaboration** | Learning cycle | `learningEngine.cycle()` | `executive-collaboration.ts:200` | Post-session |

### What No One Reads

| Memory Store | Read By? | Status |
|-------------|:--------:|--------|
| **SemanticMemory** (ai/runtime) | **NONE** | ORPHAN — zero callers |
| **RetrievalEngine** (learning) | **NONE** | ORPHAN — zero callers |
| **MemoryIndex** (learning) | **NONE directly** | Only used by LearningEngine internally |
| **OrganizationalMemory** (intelligence) | **KnowledgeBackbone only** | Used by CEO via aggregation |
| **DecisionHistory** (intelligence) | **KnowledgeBackbone only** | Used by CEO via aggregation |
| **MissionHistory** (mission) | **NONE** | ORPHAN — zero callers |
| **CognitiveTraceStore** | **Verification tests only** | Traces stored, not consumed by executives |
| **OutcomeTracker** | **ExecutiveMemoryProvider only** | Never queried by executives |
| **MemoryRecallEngine** | **ExecutiveMemoryProvider only** | Never queried by executives |

### Is Any Executive Reading Memory?

**NO.** No executive reads from a memory store during reasoning:

| Executive | Memory Read? | What It Reads Instead |
|-----------|:----------:|-----------------------|
| CEO | ✗ | FoundationLoader, KnowledgeBackbone (aggregator of memory), PlanProvider |
| CTO | ✗ | FoundationLoader, MissionContextRegistry (file content), ConsultantRuntime |
| COO | ✗ | KnowledgeProvider (Knowledge Platform — not memory) |
| CFO | ✗ | KnowledgeProvider |
| CMO | ✗ | KnowledgeProvider |
| CAIO | ✗ | KnowledgeProvider |
| CKO | ✗ | ConsultantRuntime, KnowledgeGovernor |
| CHRO | ✗ | KnowledgeProvider |

### Where Memory SHOULD Be Read

The `CognitiveEngine` pipeline has a `CognitiveContext.history: ExecutiveDecision[]` field that is always `[]`. The `EvidenceBuilder` already lists `"memory"` as a valid `EvidenceSource` with a relevance score of 0.8. The contract is ready — the implementation is missing.

### Summary

| Question | Answer |
|----------|--------|
| Who reads Memory? | No one reads ExecutiveMemory, SemanticMemory, OrganizationalMemory, or DecisionHistory during runtime reasoning |
| Is Executive included? | **NO** — not a single executive reads from memory |
| Who does? | Only post-hoc subsystems: EIOS observers (write-only), governance (stats), KnowledgeBackbone (aggregation) |
