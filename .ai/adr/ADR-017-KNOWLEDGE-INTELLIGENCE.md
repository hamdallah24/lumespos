---
id: adr-017-knowledge-intelligence-v1
title: ADR-017 — Knowledge Intelligence Runtime (Sprint 8, ECP-008)
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
review_trigger: OnArchitectureChange
knowledge_level: reference
tags: [adr, sprint-8, ecp-008, knowledge]
purpose: |
  Sprint 8: 4 new knowledge components. GraphV1, Repository, Loader, Metrics.
  ECP-008 3 conditions met: Graph as single source, versioned, Metrics standalone.
---

# ADR-017: Knowledge Intelligence Runtime

## Context

ECP-008 approved with 3 conditions. Pipeline must evolve from file-based loading to graph-based semantic understanding.

## Decisions

4 components built — all 3 conditions satisfied:

1. **KnowledgeGraphV1** (`schema: "1.0"`) — nodes + edges from Foundation Loader metadata. Query by domain, level, strategy, consumer. DFS cycle detection. Topological sort. Single source of knowledge after Foundation Loader. **(Condition 1 + 2)**

2. **Knowledge Repository** — LRU cache (50 entries). TTL: 5min Foundation, 1min non-Foundation. Invalidation by prefix. Hit/miss tracking. Reusable by Memory Runtime. **(Condition 3 — standalone)**

3. **Knowledge Loader** — single entry for all downstream components. `loadKnowledge()` from graph + cache. `loadKnowledgeWithContent()` for Context Builder. Strategy filtering: always → conditional → on-demand. **(Condition 1 — single source)**

4. **Knowledge Metrics** — standalone file. Coverage %, freshness (stale detection), connection density, cache hit rate, validation errors count. `collect()` + `report()`. **(Condition 3)**

## Pipeline Now

```
Knowledge Loader (single entry, cached, graph-backed)
    ↓
Context Builder (no filesystem, no Loader)
    ↓
Prompt Assembler
```

## Status

ECP-008 complete. 4 new files, 621 lines. 30 components registered.
