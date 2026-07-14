<!--
  EPIC R — Phase 14: ADR-009
  Title: Knowledge System Unification
  Status: PROPOSED (NOT IMPLEMENTED)
-->

# ADR-009: Knowledge System Unification

**Status:** PROPOSED  
**Date:** 2026-07-13  
**Author:** Principal Knowledge Architect  

---

## Context

The audit (EPIC R Phase 1) found 5 overlapping knowledge systems:

1. `knowledge-platform/` — Block-based (semantic/episode/procedural)
2. `ai/runtime/knowledge/` — Card-based (RAW→VALIDATED→ACTIVE→BEST_PRACTICE→FOUNDATION_CANDIDATE→ARCHIVED)
3. `learning/` — Node-based (Experience→Reflection→Knowledge→Graph→Index→Memory)
4. `intelligence/` — Organizational (2+ source validation, fusion, consensus)
5. `knowledge/KnowledgeBackbone` — Unified access layer (wraps mission, context, decision, memory)

These systems have:
- Different atomic units (Blocks vs Cards vs Nodes)
- Different lifecycles (5-stage vs 7-stage vs implicit)
- Different query interfaces (KnowledgeProvider vs KnowledgeBackbone vs RetrievalEngine)
- Overlapping responsibilities (historical knowledge in both platform.episode AND learning.executive-memory)
- No central documentation mapping their relationships

## Decision

**Do NOT merge the 5 systems into one.** The cost of merging would:
- Require modifying all 5 systems simultaneously (high risk, Runtime Core is FROZEN)
- Break all existing interfaces that executives depend on
- Require changes to 50+ files across 5 directories
- Create a single point of failure for all knowledge operations

**Instead, create a Knowledge Unification Layer** — a new facade that:
1. Sits ABOVE all 5 systems (does not modify them)
2. Provides a single query interface: `EKSKnowledge.query()`
3. Maps queries to the appropriate underlying system
4. Merges and deduplicates results
5. Handles lifecycle coordination (a promotion in one system triggers corresponding update in others)

## Consequences

### Positive
- Zero changes to existing runtime code (Runtime Core remains FROZEN)
- Zero changes to existing knowledge system implementations
- All 5 systems continue to work independently
- New unified interface is additive, not breaking
- Results are deduplicated and ranked at the unification layer
- Gradual migration possible: systems can be deprecated one by one

### Negative
- Adds another layer of abstraction (6th knowledge system)
- Query latency increases slightly (multi-system fan-out)
- Requires maintaining the unification layer when underlying systems change
- Does not eliminate the underlying duplication

### Neutral
- Documentation must be updated to reflect the unification layer as the primary interface
- Old direct interfaces (KnowledgeProvider, KnowledgeBackbone, etc.) remain available for direct use

## Implementation

### New File
`src/eks/EKSKnowledge.ts` (or `src/ai/runtime/eks/EKSKnowledge.ts`)

### Interface
```typescript
interface EKSKnowledge {
  query(request: EKSQuery): EKSResult;
  ingest(event: EKSKnowledgeEvent): void;
  maintain(): EKSMaintenanceResult;
}

interface EKSQuery {
  executive?: string;
  domain?: string;
  intent?: string;
  keywords?: string[];
  maxResults?: number;
  minConfidence?: number;
  includeTypes?: KnowledgeType[];
}

interface EKSResult {
  items: EKSKnowledgeItem[];
  sources: string[];       // Which systems returned results
  totalCount: number;
  confidence: number;
  executionTimeMs: number;
}
```

### Query Routing Logic
```
EKSQuery → Route to ALL 5 systems in parallel
  → knowledge-platform.searchAll(query)
  → knowledge-governor.getConsultantCache(tokenBudget)
  → learning/retrieval-engine.getContext()
  → intelligence/organizational-memory.search()
  → knowledge/KnowledgeBackbone.getScoped()
→ Merge results (deduplicate by content hash)
→ Rank by confidence × freshness × relevance
→ Return top N results
```

## Alternatives Considered

1. **Full merge into one system** — Rejected (too risky, breaks Runtime Core freeze)
2. **Deprecate all but one** — Rejected (each system serves a unique purpose)
3. **Status quo** — Rejected (duplication causes confusion, inconsistent behavior)
4. **ADR for each system separately** — Rejected (the issue is cross-system, not per-system)

## Related Documents
- EPIC R Phase 1: EXECUTIVE_KNOWLEDGE_AUDIT.md (Finding 2)
- EPIC R Phase 2: KNOWLEDGE_OWNERSHIP_MATRIX.md
- EPIC R Phase 12: KNOWLEDGE_DEPENDENCY_DIAGRAM.md
- ADR-001 through ADR-008 (all sets) — no conflicts with this ADR
