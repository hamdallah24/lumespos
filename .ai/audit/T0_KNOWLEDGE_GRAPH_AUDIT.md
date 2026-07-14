# T.0 — Phase 5: Knowledge Graph Audit

## Three Distinct Knowledge Graph Implementations

### KG#1 — Learning Knowledge Graph (`src/learning/knowledge-graph.ts`)

| Attribute | Value |
|-----------|-------|
| Class | `KnowledgeGraph` |
| Storage | In-memory `Map<string, KnowledgeNode>` |
| Nodes | `KnowledgeNode` with `relatesTo[]` edges |
| Traversal | BFS via `traverse(startId, depth=2)` |
| Features | `addNode()`, `search()`, `autoLink()`, `findByDomain()`, `findByExecutive()` |
| Status | **ALIVE** — used by LearningEngine cycle |
| Executive consumption | **NONE** — only used by internal learning subsystems |

### KG#2 — Foundation KnowledgeGraphV1 (`src/ai/runtime/knowledge-graph.ts`)

| Attribute | Value |
|-----------|-------|
| Type | Module-level functions |
| Storage | Built from FoundationLoader assets |
| Nodes | `KnowledgeNode` with `dependsOn[]`, `referencedBy[]`, `consumers[]` |
| Edges | `KnowledgeEdge` with types: `depends_on`, `referenced_by`, `consumes` |
| Features | `buildGraph()`, `validateGraph()` (cycle detection, orphan detection, broken refs), `queryByDomain()` |
| Status | **ALIVE** — used by knowledge-loader, registered in runtime registry |
| Executive consumption | **CTO only** — loads via `loadKnowledgeWithContent()` |

### KG#3 — Knowledge Office Graph (`src/ai/runtime/knowledge/knowledge-graph.ts`)

| Attribute | Value |
|-----------|-------|
| Class | `KnowledgeGraph` |
| Storage | In-memory `Map<string, GraphNode>` |
| Nodes | `GraphNode` wrapping `KnowledgeCard` |
| Edges | Types: `depends_on`, `related_to`, `contradicts`, `supersedes` |
| Traversal | BFS via `traverse(startId, maxHops=3)` |
| Status | **ALIVE** — used by knowledge-governor, consultant-cache |
| Executive consumption | **CKO only** — indirectly via ConsultantRuntime → KnowledgeGovernor |

---

## Executive vs Knowledge Graph

| Executive | Uses KG#1? | Uses KG#2? | Uses KG#3? | How? |
|-----------|:----------:|:----------:|:----------:|------|
| CEO | ✗ | ✗ | ✗ | Uses KnowledgeProvider (separate system) |
| CTO | ✗ | ⚠ Indirect | ✗ | `loadKnowledgeWithContent()` → `knowledgeGraph` (KG#2) |
| COO | ✗ | ✗ | ✗ | Uses KnowledgeProvider |
| CFO | ✗ | ✗ | ✗ | Uses KnowledgeProvider |
| CMO | ✗ | ✗ | ✗ | Uses KnowledgeProvider |
| CAIO | ✗ | ✗ | ✗ | Uses KnowledgeProvider |
| CKO | ✗ | ✗ | ⚠ Indirect | ConsultantRuntime → KnowledgeGovernor → KG#3 |
| CHRO | ✗ | ✗ | ✗ | Uses KnowledgeProvider |

---

## Findings

1. **Three KGs exist but are not interconnected.** KG#1 (Learning) → KG#3 (Knowledge Office) has a one-way bridge via `LearningEngine` calling `knowledgeGovernor.register()`, but KG#2 (Foundation) is standalone.

2. **No executive directly imports any KnowledgeGraph.** All access is through intermediary layers (KnowledgeLoader, KnowledgeProvider, ConsultantRuntime).

3. **Only CTO and CKO indirectly touch a Knowledge Graph.** CEO/COO/CFO/CMO/CAIO/CHRO use KnowledgeProvider (Knowledge Platform), which is NOT a graph.

4. **No vector/embedding store exists.** All KGs use keyword/in-memory search. The codebase has zero embedding code, zero vector DB code.

5. **Graph traversal is never called by executive runtime.** Traversal exists in KG#1 and KG#3 but is only used internally by learning and consultant subsystems.

6. **KG#2 validation (cycle/orphan detection) is used only in production readiness tests**, not during normal operation.
