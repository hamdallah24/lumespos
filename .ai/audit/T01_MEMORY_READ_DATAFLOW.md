# T.0.1 — Phase 6: Memory Read Data Flow

## Data Flow Diagram

```
  EXECUTIVE PROGRAM                    MEMORY PROVIDER                          MEMORY STORES
  ┌─────────────────┐                ┌──────────────────────┐                ┌──────────────────┐
  │                  │               │                       │               │                  │
  │ query: string    │───read()────► │ 1. Parse & Classify   │───query─────► │ ContextManager    │
  │ executive: role  │               │    → executive        │   (working)   │ (working memory)  │
  │ domain: string   │               │    → domain           │               │                  │
  │ memoryScope: str │               │    → temporal refs    │               └──────────────────┘
  │ maxTokens: int   │               │    → priority plan    │               ┌──────────────────┐
  │                  │               │                       │───query─────► │ ExecutiveMemory   │
  └─────────────────┘               │ 2. Parallel Read      │   (decisions) │ (past decisions)  │
                                    │    ├── WorkingMemory  │               └──────────────────┘
          RESULT                     │    ├── Decisions      │               ┌──────────────────┐
  ┌─────────────────┐               │    ├── SemanticMemory │───query─────► │ SemanticMemory    │
  │                  │               │    ├── EpisodicMemory │   (semantic)  │ (temporal refs)   │
  │ MemoryContext    │◄──return──── │    ├── Knowledge      │               └──────────────────┘
  │ {                │               │    └── OrgKnowledge  │               ┌──────────────────┐
  │  recentDecisions│               │                       │───query─────► │ Organizational    │
  │  workingMemory  │               │ 3. Merge & Rank       │   (episodic)  │ Memory (episodes) │
  │  semanticMemory │               │    → sort by priority │               └──────────────────┘
  │  episodicMemory │               │    → truncate by max  │               ┌──────────────────┐
  │  knowledgeCtx   │               │    → format to string │───query─────► │ KnowledgeGraph#2  │
  │  totalTokens    │               │                       │   (domain)    │ (domain context)  │
  │ }               │               └──────────────────────┘               └──────────────────┘
  └─────────────────┘                                                      ┌──────────────────┐
                                                                            │ Organizational   │
         COGNITIVE ENGINE                                                   │ Memory (policy)  │
  ┌────────────────────────────────────┐                                   └──────────────────┘
  │                                     │
  │ CognitiveContext = {                 │
  │   history: recentDecisions, ←───────┘── MemoryProvider result injected
  │   sessionId,                         │          here
  │   role,                              │
  │   ...                                │
  │ }                                    │
  │                                      │
  │ EvidenceBuilder.build()              │
  │   → includes "memory" source         │
  │   → evidence has { source, fact }    │
  │                                      │
  │ → evidence set includes memory facts │
  └──────────────────────────────────────┘
```

## Data Transformation Stages

### Stage 1: Raw Memory Read

Each memory store returns structured but store-specific format:

| Store | Input | Output Format | Size |
|-------|-------|---------------|:----:|
| WorkingMemory | `executive: string` | `"Working Memory:\n- Task: X\n- Status: Y"` | ~200 tokens |
| Decisions | `executive: string, limit: number` | `"Past Decisions:\n1. [timestamp] decision: ..."` | ~500 tokens |
| SemanticMemory | `query: string, topK: number` | `"Semantic Memory:\n- Related: ..."` | ~200 tokens |
| EpisodicMemory | `query: string, limit: number` | `"Episodic Memory:\n- Episode: ..."` | ~500 tokens |
| Knowledge | `domain: string` | `"Knowledge Context:\n- Domain: X\n- Facts: ..."` | ~500 tokens |
| OrgKnowledge | `query: string, limit: number` | `"Organizational Knowledge:\n- Policy: ..."` | ~500 tokens |

### Stage 2: Token Budget Allocation

```
maxTokens = 2000  (default)

Priority 1: WorkingMemory          (200 tokens) — always included
Priority 2: Decisions              (500 tokens) — always included
Priority 3: EpisodicMemory         (500 tokens) — included if budget > 700
Priority 4: KnowledgeContext       (500 tokens) — included if budget > 1200
Priority 5: SemanticMemory         (200 tokens) — included if temporal refs
Priority 6: OrganizationalKnowledge (500 tokens) — included if scope=org AND budget > 1700

If budget exhausted, truncate lower-priority items at token boundary.
Always reserve 10% of maxTokens for formatting overhead.
```

### Stage 3: Format to MemoryContext

```typescript
// PROPOSED format (no implementation)
interface MemoryContext {
  recentDecisions: string;    // "## Past Decisions\n1. ..."
  workingMemory: string;      // "## Working Memory\n- ..."
  semanticMemory: string;     // "## Semantic Memory\n- ..."
  episodicMemory: string;     // "## Episodic Memory\n- ..."
  knowledgeContext: string;   // "## Knowledge Context\n- ..."
  organizationalMemory: string; // "## Organizational Knowledge\n- ..."
  totalTokens: number;        // Actual tokens consumed
}
```

### Stage 4: Inject into CognitiveEngine

```typescript
// BEFORE CognitiveEngine.think() — cognitiveContext.history is populated
cognitiveContext.history = [
  ...formatDecisions(memoryContext.recentDecisions),
];
// Alternatively, if EvidenceBuilder reads memoryContext directly:
cognitiveContext.additionalContext = memoryContext;
```

## Data Flow Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| All stores timeout | Return MemoryContext with all empty strings, totalTokens = 0 |
| Token budget = 0 | Return MemoryContext with only totalTokens = 0, empty strings |
| No temporal refs detected | SemanticMemory section omitted (not empty — not present) |
| Domain empty | KnowledgeContext includes general knowledge, not domain-specific |
| Executive has no history | Decisions section = "No past decisions found" |
| MemoryScope = "session" | Only conversation memory included, skip org/episodic |
| Cache hit | Return cached result, skip store query |
| Cache miss | Query store, cache result with TTL |
