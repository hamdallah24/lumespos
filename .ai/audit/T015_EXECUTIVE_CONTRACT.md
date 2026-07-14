# T.0.1.5 — Phase 3: Executive Contract Lock

## Audit Requirements

| Requirement | Verification |
|-------------|:------------:|
| Executives only know `MemoryProvider` | See below — per-executive dependency audit |
| Executives do NOT know Redis | Verified — no executive imports Redis |
| Executives do NOT know Working Memory | Verified — only CEO accesses ContextManager via `summarizeMemory()` which will be replaced |
| Executives do NOT know Semantic Memory | Verified — semantic-memory.ts has zero callers (orphan) |
| Executives do NOT know Knowledge Graph | Verified — KnowledgeGraph used by FoundationLoader/KnowledgeGovernor, not directly by executives |
| Executives do NOT know Conversation Memory | Verified — ai-memory-service.ts is called by AI-chat, not by executives |

## Per-Executive Contract Audit

### CEO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK — Foundation layer, not memory |
| `KnowledgeBackbone` | **EXCEPTION** — `summarizeMemory("CEO")` reads ContextManager directly. **LOCKED: Will be replaced by MemoryProvider in T.0.2.** |
| `KnowledgeProvider` | OK — Knowledge Platform, not memory |
| `PlanProvider` | OK — plan/context, not memory |
| **MemoryProvider** | **LOCKED: Will depend on MemoryProvider ONLY for memory reads** |

### CTO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK — Foundation layer |
| `MissionContextRegistry` | OK — file content context, not memory |
| `ConsultantRuntime` | OK — CKO analysis, not memory |
| `KnowledgeProvider` | OK — Knowledge Platform |
| **MemoryProvider** | **LOCKED: Will depend on MemoryProvider ONLY for memory reads** |

### COO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK |
| `KnowledgeProvider` | OK |
| **MemoryProvider** | **LOCKED** |

### CFO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK |
| `KnowledgeProvider` | OK |
| **MemoryProvider** | **LOCKED** |

### CMO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK |
| `KnowledgeProvider` | OK |
| **MemoryProvider** | **LOCKED** |

### CAIO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK |
| `KnowledgeProvider` | OK |
| **MemoryProvider** | **LOCKED** |

### CKO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK |
| `KnowledgeGovernor` | OK — Knowledge governance, not memory |
| `ConsultantRuntime` | OK — CKO analysis |
| **MemoryProvider** | **LOCKED** |

### CHRO

| Current Direct Dependencies | Status |
|----------------------------|:------:|
| `FoundationLoader` | OK |
| `KnowledgeProvider` | OK |
| **MemoryProvider** | **LOCKED** |

## Summary

| Executive | Memory Read Dependency | LOCKED? |
|:---------:|-----------------------|:-------:|
| CEO | `MemoryProvider` (replacing `KnowledgeBackbone.summarizeMemory()`) | **LOCKED** |
| CTO | `MemoryProvider` | **LOCKED** |
| COO | `MemoryProvider` | **LOCKED** |
| CFO | `MemoryProvider` | **LOCKED** |
| CMO | `MemoryProvider` | **LOCKED** |
| CAIO | `MemoryProvider` | **LOCKED** |
| CKO | `MemoryProvider` | **LOCKED** |
| CHRO | `MemoryProvider` | **LOCKED** |

## EXCEPTION: CEO — KnowledgeBackbone Migration

CEO currently reads memory via `KnowledgeBackbone.summarizeMemory("CEO")` which accesses ContextManager directly. This is the **only** case where an executive directly accesses a memory subsystem.

**LOCKED Decision**: In T.0.2, `KnowledgeBackbone.summarizeMemory()` is replaced by MemoryProvider for CEO. The KnowledgeBackbone dependency is removed from CEO's memory read path.

## What Executives ARE ALLOWED to Know

| Component | Allowed? | Reason |
|-----------|:--------:|--------|
| `MemoryProvider` interface | **YES** | Primary contract |
| `MemoryQuery` | **YES** | Query parameters |
| `MemoryContext` | **YES** | Return type |
| `ExecutiveRole` | **YES** | From CognitiveContracts (already known) |

## What Executives ARE NOT ALLOWED to Know

| Component | Reason for Prohibition |
|-----------|----------------------|
| `RedisService` / `RedisCache` | Infrastructure detail — memory should work without Redis |
| `ContextManager` | Working memory implementation detail |
| `semantic-memory.ts` | Semantic memory is a query detail handled by MemoryProvider |
| `ai-memory-service.ts` | Conversation memory is a subsystem |
| `DecisionRecorder` / `ExecutiveMemoryProvider` | Decision recording is write-path only |
| `knowledge-graph.ts` | Knowledge graph traversal is internal to MemoryProvider |
| `organizational-memory.ts` | Organizational memory is a subsystem |
| `MemoryRecallEngine` | Memory search is internal |
| Cache internals (L1, L2) | Caching is implementation detail |
| Circuit breaker state | Error handling is internal |
