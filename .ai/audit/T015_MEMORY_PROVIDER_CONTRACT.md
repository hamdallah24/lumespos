# T.0.1.5 — Phase 2: MemoryProvider Contract Lock

## Source
T.0.1 Memory Provider Design (T01_MEMORY_PROVIDER_DESIGN.md)

## Single Public Contract

```typescript
// LOCKED — MemoryProvider is the SOLE public contract between Executive and Memory

import type { ExecutiveRole } from "../executive-runtime/cognition/CognitiveContracts";

/** Query parameters for memory read */
export interface MemoryQuery {
  executive: ExecutiveRole;
  query: string;
  domain?: string;
  memoryScope: "session" | "project" | "organization";
  maxTokens?: number;       // default 2000
  includeDecisions?: boolean; // default true
  includeWorking?: boolean;   // default true
  includeSemantic?: boolean;  // default false
  includeEpisodic?: boolean;  // default true
  includeOrgKnowledge?: boolean; // default false
}

/** Memory context returned to executive */
export interface MemoryContext {
  recentDecisions: string;
  workingMemory: string;
  semanticMemory: string;
  episodicMemory: string;
  knowledgeContext: string;
  organizationalMemory: string;
  totalTokens: number;
}

/** MemoryProvider — SATU-SATUNYA contract */
export interface MemoryProvider {
  /** Primary: read memory relevant to an executive query */
  read(query: MemoryQuery): Promise<MemoryContext>;

  /** Advisory: estimate token cost without executing reads */
  estimate(query: MemoryQuery): { tokens: number; sources: string[] };
}
```

## Method Justification

| Method | Public? | Reason |
|--------|:-------:|--------|
| `read()` | **YES** | Primary method. Single entry point for all memory reads. All 8 executives call this. |
| `estimate()` | **YES** | Advisory method. Allows executive (or middleware) to estimate token cost before calling `read()`. Prevents budget overflow. Optional — `read()` can be called directly without `estimate()`. |
| `hasTemporalReference()` | **NO** | Moved to internal implementation. Only needed internally by `read()` to decide whether to query semantic memory. No executive needs this directly. Encapsulation. |

## What Changed from T.0.1

| Aspect | T.0.1 (Proposed) | T.0.1.5 (Locked) | Reason |
|--------|:-----------------:|:-----------------:|--------|
| `hasTemporalReference()` | Public method | **Internal only** | No executive needs this — it's an implementation detail |
| `estimate()` | Public method | **Public** (kept) | Useful for token budget pre-check |
| `read()` | Public method | **Public** (kept) | Primary contract — unchanged |
| `MemoryQuery.includeSemantic` | Optional (default false) | **Optional (default false)** | Unchanged — temporal ref detection is internal |
| `MemoryQuery.includeEpisodic` | Optional (default true) | **Optional (default true)** | Unchanged |

## Contract Alignment

| Existing Contract | LOCKED Mapping |
|------------------|----------------|
| `EvidenceSource: "memory"` (CognitiveContracts) | `MemoryProvider.read()` populates evidence with `source: "memory"` |
| `CognitiveContext.history: ExecutiveDecision[]` | `MemoryProvider.read()` returns `recentDecisions` injected into `history` |
| `AgentIdentity.memoryScope` | Gates memory tier: `"session"` → conversation only, `"project"` → project memory, `"organization"` → all |
| `AgentIdentity.knowledgeDomains` | Filters KnowledgeGraph queries within MemoryProvider |

## Contract Boundaries

```
EXECUTIVE KNOWS:
  MemoryProvider
  MemoryQuery
  MemoryContext

EXECUTIVE DOES NOT KNOW:
  Redis
  WorkingMemory (ContextManager)
  SemanticMemory (ai/runtime/semantic-memory.ts)
  KnowledgeGraph (learning/, ai/runtime/knowledge/)
  ConversationMemory (ai-memory-service.ts)
  DecisionRecorder
  MemoryRecallEngine
  OrganizationalMemory
  Cache internals
  Circuit breaker state
```

## Verification

| Check | Status |
|-------|:------:|
| Only ONE public interface (`MemoryProvider`)? | **PASS** |
| All methods justified? | **PASS** — 2 methods, both necessary |
| No unnecessary public methods? | **PASS** — `hasTemporalReference()` moved to internal |
| Executive knows MemoryProvider only? | **PASS** — no leak of sub-system types |
| Contract aligns with existing CognitiveContracts? | **PASS** — EvidenceSource, CognitiveContext.history |
| All types defined? | **PASS** — MemoryQuery, MemoryContext, MemoryProvider |
