# T.0.1 — Phase 5: Memory Read Pipeline Architecture

## Pipeline Flow

```
MemoryProvider.read(query)
  │
  ├─ 1. PARSE query → detect executive, domain, temporal refs
  │      use hasTemporalReference() → sets includeSemantic (boolean)
  │      use executive → sets memoryScope filter
  │
  ├─ 2. ESTIMATE token cost
  │      MemoryProvider.estimate(query) → returns { tokens, sources }
  │      if tokens > maxTokens → activate priority ranking
  │
  ├─ 3. READ IN PARALLEL (all stores concurrently)
  │      ├── WorkingMemory:   ContextManager.buildMemoryPrompt(executive)     ~100ms
  │      ├── Decisions:       ExecutiveMemoryProvider.recallForExecutive(executive, 5)  ~150ms
  │      ├── SemanticMemory:  semanticMemory.recall(query, topK=3)           ~200ms  (if temporal)
  │      ├── EpisodicMemory:  orgMemory.searchMemory(query, topK=3)          ~250ms
  │      ├── Knowledge:       knowledgeGraph.query(domain)                   ~100ms
  │      └── OrgKnowledge:    organizationalMemory.search(query, limit=3)    ~300ms  (if scope=org)
  │
  ├─ 4. RANK & MERGE
  │      └── merge all results into MemoryContext
  │          prioritize by: working > decisions > episodic > knowledge > semantic > org
  │          truncate by token budget
  │
  └─ 5. FORMAT into single context string
         └── return MemoryContext { recentDecisions, workingMemory, semanticMemory, ... }
```

## Parallel Reading Strategy

### Go-style concurrency pattern:

```
┌─ WorkingMemory ───┐
├─ Decisions ───────┤  ALL SIX fire simultaneously
├─ SemanticMemory ──┤  WaitGroup pattern
├─ EpisodicMemory ──┤  Fastest respond first → partial results at 100ms
├─ Knowledge ───────┤  Slowest (org knowledge) → full results at 300ms
└─ OrgKnowledge ────┘
```

### Time Budget

| Step | Max Time | Notes |
|:----:|:--------:|-------|
| Parse + Estimate | 5ms | Synchronous, no I/O |
| Parallel Reads | 500ms | Aggressive timeout per store |
| Merge + Rank | 5ms | String concatenation + token counting |
| **Total** | **510ms** | Below 1s threshold — acceptable latency |

### Timeout Strategy

| Store | Timeout | If Timeout |
|-------|:-------:|------------|
| WorkingMemory | 200ms | Return empty working memory |
| Decisions | 300ms | Return empty decision history |
| SemanticMemory | 400ms | Skip semantic memory |
| EpisodicMemory | 500ms | Skip episodic memory |
| Knowledge | 200ms | Return empty knowledge context |
| OrgKnowledge | 500ms | Skip organizational knowledge |

## Pipeline Integration Per Executive

```
CEO Pipeline:
  Load Knowledge → Memory Read → Cognitive → Prompt → LLM → Decision
                        │
                        ├─ scope: "organization"
                        ├─ decisions: 10 (more strategic history needed)
                        ├─ semantic: YES (temporal refs in strategy)
                        └─ org: YES (needs organizational knowledge)

CTO Pipeline:
  Load Knowledge → Memory Read → Cognitive → Prompt → LLM → Decision
                        │
                        ├─ scope: "project"
                        ├─ decisions: 5 (recent technical decisions)
                        ├─ semantic: YES (temporal refs in discussions)
                        └─ org: NO (project-scoped, no need org knowledge)

COO/CFO/CMO/CHRO Pipeline:
  Load Knowledge → Memory Read → Cognitive → Prompt → LLM → Decision
                        │
                        ├─ scope: "project"
                        ├─ decisions: 3 (minimal decision history needed)
                        ├─ semantic: conditional (based on temporal refs)
                        └─ org: NO

CAIO Pipeline:
  Load Knowledge → Memory Read → Cognitive → Prompt → LLM → Decision
                        │
                        ├─ scope: "project"
                        ├─ decisions: 5 (system health decisions)
                        ├─ semantic: YES (past incidents)
                        └─ learning: YES (failure patterns)

CKO Pipeline:
  Load Knowledge → Memory Read → Cognitive → Prompt → LLM → Decision
                        │
                        ├─ scope: "organization"
                        ├─ decisions: 10 (knowledge validation history)
                        ├─ semantic: YES (knowledge references)
                        └─ org: YES (needs full organizational memory)
```

## Read vs Write Separation

```
Memory Read (new — CognitiveEngine stage):
  → MemoryProvider.read()
  → Populates CognitiveContext.history
  → Influences evidence, confidence, decisions
  → READS from memory stores (no side effects)

Memory Write (existing — EIOS Observer):
  → EIOS Observer listens to "decision.made" event
  → Records to DecisionRecorder, ExecutiveMemoryProvider
  → Updates memory stores
  → WRITES to memory stores (no read interference)
```

This separation ensures the Memory Read Pipeline has no write path (no side effects during reasoning), and the Memory Write path has no read path (no query during recording). The two paths are fully independent.
