# T.0.1 — Phase 3: Memory Provider Design

## Design Principle

Executive hanya mengenal `MemoryProvider`. Executive tidak tahu Redis, Vector Store, Knowledge Graph, atau Embedding.

```
Executive
  ↓
MemoryProvider     ← SATU-SATUNYA antarmuka yang dikenal Executive
  ↓
  ├── WorkingMemory      (ContextManager)
  ├── SemanticMemory     (semantic-memory.ts)
  ├── ConversationMemory (ai-memory-service.ts)
  ├── DecisionMemory     (DecisionRecorder + MemoryRecallEngine)
  ├── EpisodicMemory     (organizational-memory.ts)
  ├── OrganizationalMemory (intelligence/organizational-memory.ts)
  └── Redis              (optional caching layer)
```

## Interface Proposal — MemoryProvider

```typescript
// File: memory-provider.ts (PROPOSED — NOT IMPLEMENTED)

import type { ExecutiveRole } from "../executive-runtime/cognition/CognitiveContracts";

export interface MemoryContext {
  /** Past decisions relevant to this executive */
  recentDecisions: string;
  /** Working memory (current tasks, findings, confidence) */
  workingMemory: string;
  /** Semantic memory (temporal reference resolution) */
  semanticMemory: string;
  /** Relevant episodic knowledge from past missions */
  episodicMemory: string;
  /** Organizational knowledge validated across executives */
  organizationalMemory: string;
  /** Knowledge graph traversal results */
  knowledgeContext: string;
  /** Token budget consumed */
  totalTokens: number;
}

export interface MemoryQuery {
  executive: ExecutiveRole;
  query: string;
  domain?: string;
  memoryScope: "session" | "project" | "organization";
  maxTokens?: number;        // default 2000
  includeDecisions?: boolean;  // default true
  includeWorking?: boolean;    // default true
  includeSemantic?: boolean;   // default false (only when temporal refs detected)
  includeEpisodic?: boolean;   // default true
  includeOrgKnowledge?: boolean; // default false (expensive)
}

export interface MemoryProvider {
  /** Read relevant memory context for an executive query */
  read(query: MemoryQuery): Promise<MemoryContext>;

  /** Check if query contains temporal references needing semantic memory */
  hasTemporalReference(query: string): boolean;

  /** Estimate token cost without executing */
  estimate(query: MemoryQuery): { tokens: number; sources: string[] };
}
```

## Implementation Design

### Responsibility

| Method | Responsibility |
|--------|---------------|
| `read()` | Query ALL relevant memory stores, rank by relevance, merge into single context string, respect token budget |
| `hasTemporalReference()` | Check for Indonesian temporal keywords ("kemarin", "sebelumnya", "tadi", "seperti yang lalu") |
| `estimate()` | Return estimated token cost without actual memory reads |

### Memory Store Mappings

| Memory Query Field | Reads From | Filtering | Token Budget |
|-------------------|-----------|-----------|:------------:|
| `includeDecisions` | `ExecutiveMemoryProvider.recallForExecutive(executive, 5)` | By executive | ~500 |
| `includeWorking` | `ContextManager.buildMemoryPrompt(executive)` | By executive | ~300 |
| `includeSemantic` | `semantic-memory.recall(query)` | Temporal keywords | ~200 |
| `includeEpisodic` | `orgMemory.searchMemory(query)` | By query | ~500 |
| `includeOrgKnowledge` | `organizationalMemory.search(query)` | By query | ~500 |
| (always) | `KnowledgeGraph#2` query domain | By domain | ~500 |

### Priority Order (When Token Budget Exceeded)

1. Working Memory (most time-sensitive — current task context)
2. Recent Decisions (most relevant — executive's own past decisions)
3. Episodic Memory (similar past missions)
4. Knowledge Context (domain knowledge)
5. Semantic Memory (only if temporal refs detected)
6. Organizational Knowledge (least time-sensitive — validated knowledge)

### Ownership

| Component | Owner |
|-----------|-------|
| `MemoryProvider` interface | Executive Runtime |
| `MemoryProvider` implementation | CKO (Knowledge Office) |
| Working Memory | CEO / CKO |
| Semantic Memory | CEO |
| Decision Memory | CEO |
| Episodic Memory | CKO |
| Organizational Memory | CKO |
| Redis caching | Infrastructure |

### Dependency Rule

```
MemoryProvider.ts depends on:
  → executive-memory/ExecutiveMemoryProvider  (decisions)
  → memory/ContextManager                       (working memory)
  → ai/runtime/semantic-memory                 (semantic)
  → ai/runtime/organizational-memory           (episodic)
  → intelligence/organizational-memory         (org knowledge)
  → learning/knowledge-graph                   (KG#1 traversal)
  → lib/redis                                   (optional cache)

Executive Program depends on:
  → memory-provider/MemoryProvider  ← ONLY dependency
```

### Caching Strategy

| Memory Source | Cache Strategy | TTL |
|--------------|---------------|:---:|
| Decisions | `RedisCache.remember()` | 300s (5 min) |
| Working Memory | Direct (always fresh) | None |
| Semantic Memory | Direct (always fresh) | None |
| Episodic Memory | `RedisCache.remember()` | 600s (10 min) |
| Org Knowledge | `RedisCache.remember()` | 3600s (1 hour) |

### Existing Contract Alignment

The proposed `MemoryProvider` aligns with these existing contracts:

| Existing Contract | How MemoryProvider Maps |
|------------------|------------------------|
| `EvidenceSource: "memory"` | MemoryProvider.read() returns items with `source: "memory"` |
| `CognitiveContext.history: ExecutiveDecision[]` | MemoryProvider populates this from DecisionRecorder |
| `AgentIdentity.memoryScope` | MemoryProvider gates memory tier: `"session"` → conversation only, `"project"` → project memory, `"organization"` → all |
| `AgentIdentity.knowledgeDomains` | MemoryProvider filters knowledge by domain |
| `PromptAssemblyInput.context: string` | MemoryProvider output formatted as string, fed into context field |
| `RetrievalEngine.buildContextPrompt()` | MemoryProvider reuses this formatting pattern |

### Why This Design

1. **Executive tidak tahu storage layer** — MemoryProvider abstracts all 7 memory stores behind one interface
2. **Token budget control** — MemoryQuery.maxTokens prevents prompt explosion
3. **Progressive loading** — priority order ensures most critical memory fits within budget
4. **Existing contract reuse** — EvidenceSource "memory" already exists in CognitiveContracts
5. **Per-executive isolation** — filtered by executive via ExecutiveMemoryProvider and ContextManager
6. **Scope gating** — AgentIdentity.memoryScope gates which tier of memory is accessible
