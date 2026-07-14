# T.0.1 — Phase 2: Executive Memory Requirements

## Per-Executive Memory Needs

### CEO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Past decisions, current findings, pending tasks — needs to know what's been delegated | `ContextManager` (already reads via KnowledgeBackbone) |
| **Semantic Memory** | ✓ YES | Resolve references like "seperti yang kita bahas kemarin" in strategic conversations | `semantic-memory.ts` (currently orphaned) |
| **Conversation Memory** | ✓ YES | Recall recent founder conversations to maintain context | `ai-memory-service.ts` (already available via getHistory) |
| **Knowledge** | ✓ YES | Foundation assets, architecture, ADR — strategic decisions need reliable facts | `FoundationLoader` (already loaded) |
| **Learning** | ⚠ Medium | Past reflections and patterns from similar strategic decisions | `learning/` (currently post-mission only) |
| **MemoryScope** | `"organization"` | CEO needs organization-wide memory, including CTO/COO past decisions |

### CTO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Current task context, pending code changes, active architecture decisions | `ContextManager` |
| **Semantic Memory** | ✓ YES | "Seperti yang kita bahas sebelumnya" — resolve temporal references in technical discussions | `semantic-memory.ts` |
| **Conversation Memory** | ✓ YES | Technical discussion history across multiple sessions | `ai-memory-service.ts` |
| **Knowledge** | ✓ YES | Architecture ADRs, specs, foundation documents (already loaded) | `FoundationLoader` |
| **Learning** | ✓ YES | Past reflections, detected patterns, knowledge evolution proposals | `reflection-engine.ts` (already calls reflect()) |
| **MemoryScope** | `"project"` | Project-scoped memory — sees technical decisions within current project |

### COO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Active operations, resource allocations, shift schedules | `ContextManager` |
| **Semantic Memory** | ✓ YES | "Operasi seperti minggu lalu" — resolve past operational references | `semantic-memory.ts` |
| **Conversation Memory** | ⚠ Low | Operational discussions are usually stateless | — |
| **Knowledge** | ✓ YES | Business policies, SOPs, delegation rules | `FoundationLoader` |
| **Learning** | ⚠ Medium | Past operational outcomes, process improvements | `learning/` |
| **MemoryScope** | `"project"` | Project-scoped — operations within the current business context |

### CFO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Active financial analysis, budget calculations in progress | `ContextManager` |
| **Semantic Memory** | ⚠ Low | Financial references are usually numeric, not temporal | — |
| **Conversation Memory** | ⚠ Low | Financial discussions are session-contained | — |
| **Knowledge** | ✓ YES | Budget policies, expense rules, governance | `FoundationLoader` |
| **Learning** | ⚠ Medium | Past financial decisions, budgeting outcomes | `learning/` |
| **MemoryScope** | `"project"` | Project-scoped |

### CMO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Active campaigns, market analysis in progress | `ContextManager` |
| **Semantic Memory** | ✓ YES | "Seperti kampanye sebelumnya" — temporal campaign references | `semantic-memory.ts` |
| **Conversation Memory** | ⚠ Low | Marketing briefs are usually self-contained | — |
| **Knowledge** | ✓ YES | Market data, brand guidelines, customer segments | `FoundationLoader` |
| **Learning** | ⚠ Medium | Past campaign outcomes, market response patterns | `learning/` |
| **MemoryScope** | `"project"` | Project-scoped |

### CAIO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Active AI system monitoring, health checks in progress | `ContextManager` |
| **Semantic Memory** | ✓ YES | "Seperti error sebelumnya" — reference past system events | `semantic-memory.ts` |
| **Conversation Memory** | ⚠ Low | AI health discussions are timestamp-driven | — |
| **Knowledge** | ✓ YES | AI runtime architecture, system policies, runtime health | `FoundationLoader` |
| **Learning** | ✓ YES | Past incidents, failure patterns, recovery procedures | `learning/` |
| **MemoryScope** | `"project"` | Project-scoped |

### CKO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Active curation tasks, knowledge audits in progress | `ContextManager` |
| **Semantic Memory** | ✓ YES | "Pengetahuan yang sudah divalidasi" — reference validated knowledge | `semantic-memory.ts` |
| **Conversation Memory** | ⚠ Low | Knowledge discussions are artifact-driven | — |
| **Knowledge** | ✓ YES | Full knowledge graph, organizational memory (already loads via KnowledgeGovernor) | `KG#3`, `OrganizationalMemory` |
| **Learning** | ✓ YES | Knowledge evolution, pattern detection, cross-executive patterns | `learning/` |
| **MemoryScope** | `"organization"` | Organization-wide — CKO manages all knowledge |

### CHRO

| Memory Type | Needed? | Why | Source |
|:-----------:|:-------:|-----|--------|
| **Working Memory** | ✓ YES | Active HR tasks, personnel assignments in progress | `ContextManager` |
| **Semantic Memory** | ⚠ Low | HR tasks are usually current-state driven | — |
| **Conversation Memory** | ⚠ Low | HR discussions are session-contained | — |
| **Knowledge** | ✓ YES | Organizational policies, role definitions, capability registry | `FoundationLoader` |
| **Learning** | ⚠ Medium | Past delegation outcomes, team performance patterns | `learning/` |
| **MemoryScope** | `"project"` | Project-scoped |

---

## Consolidated Requirements

| Memory Type | Primary Consumers | Priority | Existing Store |
|:-----------:|------------------|:--------:|---------------|
| **Working Memory** | ALL 8 executives | P0 | `ContextManager` |
| **Semantic Memory** | CEO, CTO, CMO, CAIO, CKO | P1 | `semantic-memory.ts` |
| **Conversation Memory** | CEO, CTO | P1 | `ai-memory-service.ts` |
| **Knowledge** | ALL 8 executives | P0 | `FoundationLoader`, `KnowledgeGraph#2` |
| **Learning** | CEO, CTO, CKO, CAIO | P2 | `learning/` |
| **Past Decisions** | CEO, CTO, COO | P1 | `DecisionRecorder` |
| **Organizational Memory** | CEO, CKO | P2 | `OrganizationalMemory` |
| **Episodic Memory** | CEO, CKO | P2 | `organizational-memory.ts` (ai/runtime) |

## Gap Analysis

1. **Working Memory** is needed by ALL 8 executives but only read by CEO (via KnowledgeBackbone) — 7 executives don't read working memory
2. **Semantic Memory** is orphaned — needed by 5 executives but zero consumers
3. **Past Decisions** are recorded but never recalled — all 8 executives need `recallForExecutive()` during reasoning
4. **Conversation Memory** is AI-chat only — no executive reads conversation history
5. **Learning** runs post-mission — no executive reads past learnings during reasoning
