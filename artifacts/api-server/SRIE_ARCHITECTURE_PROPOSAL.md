# Semantic Runtime Intelligence Engine (SRIE) — Architecture Proposal

**Directive**: T8.2 — Architect the Runtime Intelligence v2 as a semantic reasoning engine

**Status**: Proposal — pending Founder approval for implementation

**Date**: 2026-07-16

---

## 1. Executive Summary

The current Runtime Intelligence Engine (RIE) uses 10 separate heuristic modules — 52 regex patterns, 25-entry hardcoded file index, 37 domain rules, 9 static plan templates — to produce a `RuntimeContext`. The T8.1 audit confirmed it is a rule-based classifier with no semantic understanding, no embeddings, no LLM reasoning.

We propose replacing this with the **Semantic Runtime Intelligence Engine (SRIE)** built around a single **Runtime Reasoner** — an LLM call that produces a structured `RuntimeContext` in one pass. All remaining modules (Repository, Tool, Planning, Memory, Metadata, Operational) become pure **retrieval and resolution services** that execute the Reasoner's decisions rather than making their own.

**Impact**:
- **Removes**: IntentIntelligence, DomainIntelligence (classification modules)
- **Simplifies**: RepositoryIntelligence, ToolIntelligence, PlanningIntelligence, MemoryIntelligence, MetadataIntelligence (now retrieval/resolution only)
- **Unchanged**: KnowledgeIntelligence (already LLM-based), OperationalIntelligence (external provider), ConfidenceEngine (restructured)
- **Added**: Runtime Reasoner (single LLM reasoning pass)
- **Trade-off**: Latency increases (~10ms → ~500-3000ms), but semantic understanding replaces brittle heuristics

---

## 2. Current vs Proposed Architecture

### Current (deprecated)

```
Message
  │
  ├─▶ IntentIntelligence     15 regex patterns .test()
  ├─▶ DomainIntelligence     37 regex rules, weight-scored
  ├─▶ KnowledgeIntelligence  LLM-based (kept)
  ├─▶ MetadataIntelligence   String.startsWith() on 6 paths
  ├─▶ RepositoryIntelligence 25-entry hardcoded index, keyword scoring
  ├─▶ OperationalIntelligence External provider (kept)
  ├─▶ PlanningIntelligence   9 plan templates, keyword match
  ├─▶ MemoryIntelligence     8 patterns, keyword match
  ├─▶ ToolIntelligence       Domain lookup table + keyword
  └─▶ ConfidenceEngine       Weighted average of heuristic scores
       │
       ▼
    RuntimeContext (heuristic, brittle, no semantics)
```

### Proposed

```
Message
  │
  ▼
Runtime Reasoner ─────────────────── (single LLM reasoning pass)
  │  • Intent + Goal + Domain       (was IntentIntelligence + DomainIntelligence)
  │  • Entities + Constraints       (new capability)
  │  • Confidence score             (LLM's own confidence)
  │  • Thinking mode                (fast/balanced/deep)
  │  • Memory strategy              (was MemoryIntelligence)
  │  • Repository targets           (was RepositoryIntelligence)
  │  • Metadata targets             (was MetadataIntelligence)
  │  • Tool candidates              (was ToolIntelligence)
  │  • Planning strategy            (was PlanningIntelligence)
  │  • Reasoning trace              (new — explainability)
  │
  ▼
RuntimeContext v2 (semantic, structured, single source of truth)
  │
  ├─▶ RepositoryIntelligence v2    Retrieval service (filesystem + vector search)
  ├─▶ MemoryIntelligence v2        Retrieval service (stores + strategies)
  ├─▶ MetadataIntelligence v2      Resolution service (EIOS graph)
  ├─▶ OperationalIntelligence      Unchanged (external provider)
  ├─▶ ToolIntelligence v2          Resolution service (capability → implementation)
  ├─▶ PlanningIntelligence v2      Execution graph builder (deterministic DAG)
  └─▶ ConfidenceEngine v2          Aggregator (reasoner + retrieval + tool)
       │
       ▼
    Unified RuntimeContext (semantic, retrievable, explainable)
       │
       ▼
    Executive Runtime (CEO, CTO, COO, CFO, CMO, CAIO, CHRO)
```

### What changes

| Aspect | Current RIE | Proposed SRIE |
|---|---|---|
| **Reasoning** | Distributed across 10 heuristic modules | Centralized in one LLM Reasoner |
| **Intent** | 15 regex patterns | LLM classifies intent semantically |
| **Domain** | 37 weighted regex rules | LLM determines domain from context |
| **Repository** | 25 hardcoded entries + keyword scoring | Semantic retrieval via vector search |
| **Tool Selection** | Domain lookup table + keyword match | LLM identifies capability → resolver maps to implementation |
| **Planning** | 9 keyword-matched templates | LLM determines strategy → builder generates DAG |
| **Memory** | 8 keyword-triggered patterns | LLM selects strategy → retriever fetches |
| **Metadata** | 6 path prefix matches | LLM identifies targets → resolver fetches |
| **Confidence** | Weighted average (magic numbers) | LLM certainty * retrieval * tool confidence |
| **Explainability** | None | `reasoningTrace` array in RuntimeContext |

---

## 3. Runtime Reasoner Specification

### 3.1 Purpose

The Runtime Reasoner is the **single semantic reasoning entry point** for the entire SRIE. It receives the raw user message (and any available conversation context) and produces a structured `RuntimeContext` via a single LLM call.

### 3.2 Contract

```typescript
interface RuntimeReasoner {
  reason(input: ReasonerInput): Promise<RuntimeContext>;
}

interface ReasonerInput {
  message: string;
  conversationHistory?: MessageRecord[];
  availableDomains: string[];
  availableTools: ToolDescriptor[];
  availableMemoryStores: MemoryStoreDescriptor[];
  repositoryIndex: RepositoryIndexSummary;
  userRole?: string;
  tenantContext?: TenantContext;
  thinkingMode?: 'fast' | 'balanced' | 'deep';
}
```

### 3.3 System Prompt Design

The system prompt instructs the LLM to:

1. Analyze the user message for intent, goal, domain, entities, and constraints
2. Select a thinking mode based on complexity
3. Choose a memory strategy appropriate to the query
4. Identify repository targets (which files/directories are relevant)
5. Identify metadata targets (which EIOS graph nodes are relevant)
6. Suggest tool capabilities needed
7. Determine planning strategy (simple, moderate, complex)
8. Output **validated JSON only** — no prose, no markdown, no explanations
9. Include a `reasoningTrace` explaining each decision

### 3.4 Output Format Enforcement

The Reasoner uses **structured output / JSON mode** of the LLM provider (e.g., OpenAI `response_format: { type: "json_object" }`, Anthropic tool-use for structured output). A Zod schema validates the output at runtime. If validation fails, a retry with stricter instructions occurs (max 2 retries).

### 3.5 Thinking Modes

| Mode | Model | Latency | Use Case |
|---|---|---|---|
| `fast` | Fast/cheap model (e.g., GPT-4o-mini, Claude Haiku) | ~200-500ms | Simple queries: greetings, status checks, single-domain |
| `balanced` | Medium model (e.g., GPT-4o, Claude Sonnet) | ~500-1500ms | Most queries: typical business operations |
| `deep` | Full model (e.g., GPT-4o, Claude Opus) with chain-of-thought | ~1500-5000ms | Complex queries: multi-domain, ambiguous, high-stakes |

The thinking mode can be:
- Explicitly set in the input
- Auto-determined by the Reasoner based on message complexity (using a fast pre-check)
- Default: `balanced`

### 3.6 Error Handling

| Scenario | Behavior |
|---|---|
| LLM unavailable | Return cached fallback RuntimeContext (last-known-good for similar query) |
| JSON parse failure | Retry with stricter prompt (max 2), then fallback to safe defaults |
| Invalid schema | Map valid fields, fill missing fields with defaults, flag in reasoningTrace |
| Low confidence (< 0.3) | Return response asking for clarification instead of executing |

---

## 4. RuntimeContext v2 Schema

```typescript
// ===== Core Schema =====

interface RuntimeContext {
  // === REASONER OUTPUT (semantic) ===
  intent: string;
  goal: string;
  domain: BusinessDomain;
  entities: ExtractedEntity[];
  constraints: string[];
  confidence: number;                  // 0.0 - 1.0, LLM's self-assessed certainty

  // === STRATEGY SELECTION (reasoner decides, services execute) ===
  thinkingMode: 'fast' | 'balanced' | 'deep';
  memoryStrategy: MemoryStrategy;
  repositoryTargets: RepositoryTarget[];
  metadataTargets: MetadataTarget[];
  toolCandidates: ToolCandidate[];
  operationalNeeds: string[];
  planningStrategy: PlanningStrategy;

  // === EXPLAINABILITY ===
  reasoningTrace: ReasoningTraceEntry[];

  // === ENRICHED BY RETRIEVAL SERVICES (reasoner does NOT fill these) ===
  knowledgeBlocks?: KnowledgeBlock[];
  memoryContext?: MemoryContext;
  relevantFiles?: FileResult[];
  operationalData?: OperationalData;
  suggestedTools?: ToolResult[];
  executionPlan?: ExecutionPlan;
  metadataGraph?: MetadataGraph;
  moduleConfidences?: ModuleConfidences;
}

// ===== Sub-types =====

interface ExtractedEntity {
  name: string;
  type: 'person' | 'organization' | 'product' | 'location' | 'date' | 'amount' | 'identifier' | 'other';
  value?: string;
}

type BusinessDomain =
  | 'sales' | 'inventory' | 'hr' | 'finance' | 'operations'
  | 'marketing' | 'legal' | 'customer' | 'product' | 'strategy'
  | 'engineering' | 'executive' | 'general';

type MemoryStrategy = {
  primaryType: 'episodic' | 'working' | 'decision' | 'learning' | 'knowledge' | 'longTerm';
  scope: 'current_session' | 'recent' | 'broad' | 'all';
  maxResults: number;
};

interface RepositoryTarget {
  type: 'file' | 'directory' | 'pattern' | 'semantic';
  target: string;                      // path, glob pattern, or semantic query
  reason: string;                      // why this target is relevant
  priority: 'high' | 'medium' | 'low';
}

interface MetadataTarget {
  nodeType: string;
  filters?: Record<string, string>;
  properties?: string[];
}

interface ToolCandidate {
  requiredCapability: string;          // what capability is needed
  priority: 'required' | 'optional' | 'fallback';
  context: string;                     // how this capability should be used
}

type PlanningStrategy = {
  type: 'direct' | 'sequential' | 'branching' | 'parallel' | 'exploratory';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSteps: number;
  requiresApproval: boolean;
};

interface ReasoningTraceEntry {
  step: string;                        // e.g., "intent_classification", "domain_detection"
  input: string;                       // what was considered
  output: string;                      // what was decided
  confidence: number;                  // confidence in this sub-decision
  alternatives?: string[];             // other options considered
}

// ===== Enriched types (populated by retrieval services) =====

interface FileResult {
  path: string;
  content: string;
  score: number;
  matchReason: string;
}

interface MemoryContext {
  type: string;
  entries: MemoryEntry[];
  retrievalTime: number;
}

interface ToolResult {
  toolId: string;
  toolName: string;
  capability: string;
  confidence: number;
}

interface ExecutionPlan {
  steps: ExecutionStep[];
  totalSteps: number;
  strategy: string;
}

interface ExecutionStep {
  id: string;
  type: 'retrieve' | 'analyze' | 'transform' | 'execute' | 'decide' | 'present';
  description: string;
  dependsOn: string[];
  assignedTool?: string;
  timeout?: number;
}

interface ModuleConfidences {
  reasonerConfidence: number;
  retrievalConfidence: number;
  toolConfidence: number;
  operationalConfidence: number;
  overall: number;
}
```

### Schema Evolution from v1

| v1 Field | v2 Field | Change |
|---|---|---|
| `intent` | `intent` | Same (now semantic) |
| `domain` | `domain` | Same (now semantic) |
| `confidence` | `confidence` | Same (now from LLM, not weighted average) |
| `entities` | `entities` | Enhanced with type system |
| `constraints` | `constraints` | Unchanged |
| `memoryContext` | `memoryContext` | Populated by MemoryIntelligence v2 |
| `relevantFiles` | `relevantFiles` | Populated by RepositoryIntelligence v2 |
| `operationalData` | `operationalData` | Unchanged |
| `suggestedTools` | `suggestedTools` | Populated by ToolIntelligence v2 |
| `executionPlan` | `executionPlan` | Populated by PlanningIntelligence v2 |
| `metadataGraph` | `metadataGraph` | Populated by MetadataIntelligence v2 |
| `knowledgeBlocks` | `knowledgeBlocks` | Unchanged |
| `moduleConfidences` | `moduleConfidences` | Restructured |
| *(none)* | `goal` | **New** — business objective |
| *(none)* | `entities` | **New** — structured entity extraction |
| *(none)* | `thinkingMode` | **New** — performance tier |
| *(none)* | `memoryStrategy` | **New** — strategy before retrieval |
| *(none)* | `repositoryTargets` | **New** — targets before retrieval |
| *(none)* | `metadataTargets` | **New** — targets before resolution |
| *(none)* | `toolCandidates` | **New** — capabilities before resolution |
| *(none)* | `planningStrategy` | **New** — strategy before graph |
| *(none)* | `reasoningTrace` | **New** — explainability |
| *(none)* | `operationalNeeds` | **New** — operational truth requirements |

The v2 schema is a **superset** of v1. All v1 consumers continue to work without modification.

---

## 5. Repository Intelligence v2

### 5.1 Current (to be removed)

- `repository/RepositoryIntelligence.ts`: 25-entry hardcoded file index, keyword scoring with `.includes()`, no actual filesystem access, no semantic search.

### 5.2 Proposed Architecture

Repository Intelligence becomes a **retrieval service** — it never classifies, never scores keywords, never maintains a static index.

```
RuntimeContext.repositoryTargets
  │
  ▼
RepositoryIntelligence.v2.retrieve(targets)
  │
  ├── FileSystemRetriever     (glob + read for file/directory/pattern targets)
  ├── SemanticRetriever       (vector search for semantic targets)
  │
  ▼
RuntimeContext.relevantFiles (enriched)
```

### 5.3 Components

| Component | Responsibility |
|---|---|
| `FileSystemRetriever` | Resolves file/directory/pattern targets via actual glob and read operations against the real filesystem |
| `SemanticRetriever` | Performs vector similarity search against a pre-indexed codebase embedding index (e.g., Qdrant, local embeddings) for semantic targets |
| `RepositoryIndex` | Lightweight index of file paths + their embeddings (built at startup, updated on file changes) — **not** a hardcoded list |

### 5.4 Algorithm

```typescript
async function retrieve(targets: RepositoryTarget[]): Promise<FileResult[]> {
  const results: FileResult[] = [];

  for (const target of targets) {
    switch (target.type) {
      case 'file':
        const content = await readFile(target.target);
        results.push({ path: target.target, content, score: 1.0, matchReason: target.reason });
        break;
      case 'directory':
        const files = await glob(`${target.target}/**/*.{ts,tsx,js,jsx,json,md}`);
        for (const f of files) {
          results.push({ path: f, content: await readFile(f), score: 0.8, matchReason: target.reason });
        }
        break;
      case 'pattern':
        const matched = await glob(target.target);
        for (const f of matched) {
          results.push({ path: f, content: await readFile(f), score: 0.9, matchReason: target.reason });
        }
        break;
      case 'semantic':
        const semantic = await semanticSearch(target.target, 5);
        results.push(...semantic);
        break;
    }
  }

  return deduplicateAndRank(results);
}
```

### 5.5 Filesystem Safety

- All file reads scoped to project root (no `../` traversal)
- Max file size per read: 100KB
- Max total files retrieved per request: 20
- Binary files excluded

---

## 6. Tool Intelligence v2

### 6.1 Current (to be removed)

- `tool/ToolIntelligence.ts`: Domain lookup table (`DOMAIN_TOOL_MAP`) + keyword matching (`TOOL_KEYWORDS`).

### 6.2 Proposed Architecture

Tool Intelligence becomes a **capability resolver** — it never selects tools based on keywords or domains.

```
RuntimeContext.toolCandidates
  │
  ▼
ToolIntelligence.v2.resolve(candidates)
  │
  ├── ToolRegistry           (dynamic tool registry with capability annotations)
  ├── CapabilityMatcher      (matches requiredCapability → tool capability)
  │
  ▼
RuntimeContext.suggestedTools (enriched: tool IDs, names, confidences)
```

### 6.3 Algorithm

```typescript
async function resolve(candidates: ToolCandidate[]): Promise<ToolResult[]> {
  const availableTools = await ToolRegistry.getAll();
  const results: ToolResult[] = [];

  for (const candidate of candidates) {
    const matches = availableTools
      .filter(tool => tool.capabilities.includes(candidate.requiredCapability))
      .map(tool => ({
        toolId: tool.id,
        toolName: tool.name,
        capability: candidate.requiredCapability,
        confidence: candidate.priority === 'required' ? 1.0 : 0.7,
      }));
    results.push(...matches);
  }

  return deduplicate(results);
}
```

### 6.4 Tool Registry

A `ToolRegistry` class maintains the dynamic set of available tools. Tools self-register with their capabilities:

```typescript
interface ToolRegistration {
  id: string;
  name: string;
  capabilities: string[];        // e.g., ["code_review", "file_search", "database_query"]
  executionModule: string;       // path to implementation
  parameters: ToolParameter[];
}
```

This replaces the static `DOMAIN_TOOL_MAP` with a dependency-injected registry.

---

## 7. Planning Intelligence v2

### 7.1 Current (to be removed)

- `planning/PlanningIntelligence.ts`: 9 hardcoded plan templates selected by keyword matching.

### 7.2 Proposed Architecture

Planning Intelligence becomes an **execution graph builder** — deterministic transformation of the Reasoner's planning strategy into a DAG of execution steps.

```
RuntimeContext.planningStrategy + goal
  │
  ▼
PlanningIntelligence.v2.buildGraph(strategy, goal, toolCandidates)
  │
  ▼
ExecutionPlan (DAG of steps)
```

### 7.3 Algorithm

```typescript
function buildGraph(strategy: PlanningStrategy, goal: string, tools: ToolCandidate[]): ExecutionPlan {
  const graph = new ExecutionGraph();

  // Step 1: Add retrieval nodes for any fetch operations
  if (needsData(tools)) {
    graph.addNode({ id: 'retrieve', type: 'retrieve', description: 'Gather required data' });
  }

  // Step 2: Add analysis/transform nodes based on strategy type
  switch (strategy.type) {
    case 'direct':
      graph.addNode({ id: 'execute', type: 'execute', description: goal, dependsOn: ['retrieve'] });
      break;
    case 'sequential':
      for (let i = 0; i < strategy.estimatedSteps; i++) {
        graph.addNode({ id: `step_${i}`, type: 'transform', description: `Step ${i + 1}`, dependsOn: i > 0 ? [`step_${i - 1}`] : ['retrieve'] });
      }
      break;
    case 'branching':
      // Parallel branches with decision gate
      break;
    case 'parallel':
      // Independent parallel steps
      break;
    case 'exploratory':
      // Explore → Analyze → Decide loop
      break;
  }

  // Step 3: Add presentation node
  graph.addNode({ id: 'present', type: 'present', description: 'Format and present results', dependsOn: [...graph.leafNodes()] });

  return graph.toPlan();
}
```

### 7.4 Deterministic Guarantee

Same `planningStrategy` + `goal` + `toolCandidates` always produces the same `ExecutionPlan`. No randomness, no LLM calls in Planning Intelligence.

---

## 8. Memory Intelligence v2

### 8.1 Current (to be removed)

- `memory/MemoryIntelligence.ts`: 8 `MEMORY_TYPE_PATTERNS` entries selected by keyword/intent match.

### 8.2 Proposed Architecture

Memory Intelligence becomes a **memory retrieval service** — it never selects strategies based on keywords.

```
RuntimeContext.memoryStrategy
  │
  ▼
MemoryIntelligence.v2.retrieve(strategy, sessionContext)
  │
  ├── EpisodicStore    (session-based conversation history)
  ├── WorkingStore     (active context, short-term)
  ├── DecisionStore    (past decisions and rationale)
  ├── LearningStore    (patterns learned over time)
  ├── KnowledgeStore   (persistent knowledge base)
  └── LongTermStore    (archived, summarized history)
       │
       ▼
RuntimeContext.memoryContext (enriched)
```

### 8.3 Algorithm

```typescript
async function retrieve(strategy: MemoryStrategy, session: SessionContext): Promise<MemoryContext> {
  const store = MemoryStoreFactory.create(strategy.primaryType);
  const entries = await store.query({
    scope: strategy.scope,
    maxResults: strategy.maxResults,
    sessionId: session.sessionId,
    userId: session.userId,
  });

  return {
    type: strategy.primaryType,
    entries,
    retrievalTime: Date.now(),
  };
}
```

### 8.4 Store Interface

```typescript
interface MemoryStore {
  type: string;
  query(params: MemoryQuery): Promise<MemoryEntry[]>;
  store(entry: MemoryEntry): Promise<void>;
  forget(filter: MemoryFilter): Promise<void>;
}

interface MemoryQuery {
  scope: 'current_session' | 'recent' | 'broad' | 'all';
  maxResults: number;
  sessionId?: string;
  userId?: string;
  semanticQuery?: string;  // optional, for knowledge/longTerm stores
}
```

---

## 9. Metadata Intelligence v2

### 9.1 Current (to be removed)

- `metadata/MetadataIntelligence.ts`: `String.startsWith()` matching on 6 EIOS path prefixes.

### 9.2 Proposed Architecture

Metadata Intelligence becomes a **metadata resolution service** — it receives explicit targets from the Runtime Reasoner and resolves them against the EIOS graph.

```
RuntimeContext.metadataTargets
  │
  ▼
MetadataIntelligence.v2.resolve(targets)
  │
  ├── EIOSGraphResolver    (graph query by nodeType + filters)
  │
  ▼
RuntimeContext.metadataGraph (enriched)
```

### 9.3 Algorithm

```typescript
async function resolve(targets: MetadataTarget[]): Promise<MetadataGraph> {
  const nodes: MetadataNode[] = [];

  for (const target of targets) {
    const resolved = await EIOSGraph.query({
      nodeType: target.nodeType,
      filters: target.filters,
      properties: target.properties,
    });
    nodes.push(...resolved);
  }

  return { nodes, relationships: buildRelationships(nodes) };
}
```

---

## 10. Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                    Runtime Reasoner                      │
│  (single LLM call → RuntimeContext with strategies)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   RuntimeContext v2                      │
│  (intent, domain, entities, targets, strategies, trace)  │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬───────────┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐
│ Rep │ │ Mem │ │ Meta│ │ Oper│ │ Tool│ │ Plan│ │Confidence│
│ v2  │ │ v2  │ │ v2  │ │  (s)│ │ v2  │ │ v2  │ │ Engine  │
└──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └────┬────┘
   │       │       │       │       │       │         │
   ▼       ▼       ▼       ▼       ▼       ▼         ▼
┌─────────────────────────────────────────────────────────┐
│               Enriched RuntimeContext                    │
│  (all fields populated, ready for Executive Runtime)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Executive Runtime                       │
│  (CEO, CTO, COO, CFO, CMO, CAIO, CHRO)                  │
└─────────────────────────────────────────────────────────┘
```

### Dependency Rules

| Module | Depends On | Depended On By |
|---|---|---|
| Runtime Reasoner | LLM provider, system prompt, schema | All modules (via RuntimeContext) |
| RepositoryIntelligence v2 | RuntimeContext.repositoryTargets, Filesystem, Vector index | ConfidenceEngine |
| MemoryIntelligence v2 | RuntimeContext.memoryStrategy, Memory stores | ConfidenceEngine |
| MetadataIntelligence v2 | RuntimeContext.metadataTargets, EIOS graph | ConfidenceEngine |
| OperationalIntelligence | RuntimeContext.operationalNeeds, OperationalTruthProvider | ConfidenceEngine |
| ToolIntelligence v2 | RuntimeContext.toolCandidates, ToolRegistry | PlanningIntelligence v2, ConfidenceEngine |
| PlanningIntelligence v2 | RuntimeContext.planningStrategy, toolCandidates | Executive Runtime |
| ConfidenceEngine v2 | All module confidences | Executive Runtime |

### Removed Dependencies

| Removed Module | Was Depended On By | Now Replaced By |
|---|---|---|
| IntentIntelligence | MemoryIntelligence, ConfidenceEngine | Runtime Reasoner |
| DomainIntelligence | ToolIntelligence, PlanningIntelligence, ConfidenceEngine | Runtime Reasoner |

---

## 11. Migration Strategy

### Phase 0 — Design Approval

- [ ] Present this proposal to Founder
- [ ] Approve architecture and schema
- [ ] Confirm performance/cost tradeoffs
- [ ] **Gate: Founder sign-off before any implementation**

### Phase 1 — Runtime Reasoner (build new, no deletions)

**Files affected**: New file only
**Risk**: Low (additive, changes no existing code)

- [ ] Create `src/runtime-intelligence/reasoner/RuntimeReasoner.ts`
- [ ] Create `src/runtime-intelligence/reasoner/prompts/system-prompt.ts`
- [ ] Create `src/runtime-intelligence/reasoner/schemas/runtime-context-schema.ts`
- [ ] Create `src/runtime-intelligence/reasoner/reasoner-config.ts` (model selection, retry logic, fallback)
- [ ] Add `RuntimeReasoner` to `src/runtime-intelligence/index.ts` exports
- [ ] Unit test: verify structured JSON output for 10 representative messages

### Phase 2 — Repository Intelligence v2 (parallel replacement)

**Files affected**: `src/runtime-intelligence/repository/RepositoryIntelligence.ts`
**Risk**: Medium (filesystem access, vector search dependency)

- [ ] Rewrite `RepositoryIntelligence.ts` — replace hardcoded index with `FileSystemRetriever` + `SemanticRetriever`
- [ ] Create `src/runtime-intelligence/repository/retrievers/file-system-retriever.ts`
- [ ] Create `src/runtime-intelligence/repository/retrievers/semantic-retriever.ts` (if vector search available)
- [ ] Create `src/runtime-intelligence/repository/repository-index.ts` (startup-based file index)
- [ ] Unit test: verify file retrieval for each target type
- [ ] Integration test: verify with real filesystem

### Phase 3 — Tool, Planning, Memory, Metadata v2 (parallel replacements)

**Files affected**:
- `src/runtime-intelligence/tool/ToolIntelligence.ts`
- `src/runtime-intelligence/planning/PlanningIntelligence.ts`
- `src/runtime-intelligence/memory/MemoryIntelligence.ts`
- `src/runtime-intelligence/metadata/MetadataIntelligence.ts`
**Risk**: Medium

- [ ] Rewrite `ToolIntelligence.ts` — domain lookup table → capability resolver + ToolRegistry
- [ ] Create `src/runtime-intelligence/tool/ToolRegistry.ts`
- [ ] Rewrite `PlanningIntelligence.ts` — 9 templates → execution graph builder
- [ ] Create `src/runtime-intelligence/planning/ExecutionGraph.ts`
- [ ] Rewrite `MemoryIntelligence.ts` — 8 patterns → memory store retrieval
- [ ] Create `src/runtime-intelligence/memory/stores/episodic-store.ts`
- [ ] Create `src/runtime-intelligence/memory/stores/working-store.ts`
- [ ] Create `src/runtime-intelligence/memory/stores/decision-store.ts`
- [ ] Rewrite `MetadataIntelligence.ts` — 6 path prefixes → EIOS graph resolution
- [ ] Unit test each module independently

### Phase 4 — Intent & Domain Removal

**Files affected**:
- `src/runtime-intelligence/intent/IntentIntelligence.ts` — DELETE
- `src/runtime-intelligence/domain/DomainIntelligence.ts` — DELETE
**Risk**: High (removes code depended on by ConfidenceEngine)

- [ ] Remove `IntentIntelligence.execute()` call from orchestrator
- [ ] Remove `DomainIntelligence.execute()` call from orchestrator
- [ ] Update ConfidenceEngine to read intent/domain from RuntimeContext (not from module results)
- [ ] Delete `intent/` directory
- [ ] Delete `domain/` directory
- [ ] Remove from barrel exports
- [ ] Full build test

### Phase 5 — ConfidenceEngine v2

**Files affected**: `src/runtime-intelligence/confidence/ConfidenceEngine.ts`
**Risk**: Low (isolated change)

- [ ] Rewrite `ConfidenceEngine.ts` — weighted average → combined confidence from Reasoner + retrieval + tool + operational
- [ ] Verify executive confidence thresholds still work correctly
- [ ] Unit test: verify confidence values for various scenarios

### Phase 6 — Orchestrator Update

**Files affected**: `src/runtime-intelligence/RuntimeIntelligence.ts`
**Risk**: High (orchestrates all modules)

- [ ] Update `assemble()` to call Runtime Reasoner first
- [ ] Update `assemble()` to pass RuntimeContext through retrieval services
- [ ] Remove IntentIntelligence and DomainIntelligence calls
- [ ] Update dependency ordering
- [ ] Full integration test

### Phase 7 — Integration & Testing

- [ ] `npm run build` — must pass
- [ ] Test all 7 executives with SRIE mode
- [ ] Verify backward compatibility with existing executive implementations
- [ ] Performance benchmark (baseline vs. SRIE)
- [ ] Add caching layer for frequent queries

### Phase 8 — Cleanup

- [ ] Remove legacy fallback paths in executives (no longer needed once SRIE is stable)
- [ ] Remove old type definitions no longer referenced
- [ ] Update documentation

---

## 12. Risk Analysis

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **LLM unavailable** | Low | Critical — entire system down | Cached RuntimeContext for common queries, graceful degradation with last-known-good context, offline mode with reduced capabilities |
| **LLM hallucination** | Medium | High — wrong intent, wrong targets | Strict JSON schema validation, retrieval validation (files must exist, tools must be registered), confidence threshold (< 0.3 → ask clarification), reasoningTrace audit trail |
| **Latency increase** | High | Medium — 10ms → 500-3000ms | Thinking modes (fast/balanced/deep), caching for repeated queries, streaming support for progressive UI updates, background pre-fetching |
| **Cost increase** | Medium | Medium — API costs per request | Caching (identical queries skip LLM), batching, fast mode for simple queries, model tier selection per complexity |
| **JSON parse failure** | Low | Medium — retry overhead | Structured output mode (JSON mode, tool-use), max 2 retries with escalating prompt strictness, safe fallback defaults |
| **Vector search dependency** | Medium | Medium — additional infrastructure | Works without vector search (file/pattern targets still work); semantic search is additive, not required |
| **File system access errors** | Low | Low — partial retrieval failure | Try-catch per file, continue on error, log failures, return partial results |
| **Executive incompatibility** | Low | High — executives break | RuntimeContext v2 is superset of v1, all existing fields retained; run executive test suite before/after migration |
| **Memory store migration** | Medium | Medium — data loss if not migrated | Phased rollout: old memory patterns still work while new stores populate; dual-write during transition |

---

## 13. Performance Impact

### Latency Budget

| Component | Current | Proposed (fast) | Proposed (balanced) | Proposed (deep) |
|---|---|---|---|---|
| Runtime Reasoner | N/A | 200-500ms | 500-1500ms | 1500-5000ms |
| Repository Retrieval | ~2ms | ~5-50ms | ~5-50ms | ~5-50ms |
| Memory Retrieval | ~1ms | ~5-20ms | ~5-20ms | ~5-20ms |
| Metadata Resolution | ~1ms | ~2-10ms | ~2-10ms | ~2-10ms |
| Tool Resolution | ~1ms | ~2-5ms | ~2-5ms | ~2-5ms |
| Planning Graph | ~1ms | ~2-10ms | ~2-10ms | ~2-10ms |
| Confidence Calculation | ~1ms | ~1ms | ~1ms | ~1ms |
| **Total** | **~7ms** | **~250-600ms** | **~550-1600ms** | **~1550-5100ms** |

### Cache Strategy

| Cache Level | Key | TTL | Hit Rate (est.) |
|---|---|---|---|
| Identical query | `message_hash` | 5 min | ~10% |
| Similar intent | `normalized_intent_hash` | 2 min | ~20% |
| Repository index | `file_paths` | File change | ~100% (static between changes) |
| Tool registry | N/A | Process lifetime | ~100% (tools don't change at runtime) |

### Optimization Opportunities

1. **Pre-warm**: Run Reasoner on common queries at startup
2. **Batch**: Multiple tool resolutions in one call
3. **Stream**: Return `RuntimeContext` skeleton immediately, enrich progressively
4. **Debounce**: Cache recent identical messages within short window
5. **Model cascade**: Try fast model first; if confidence < threshold, escalate to balanced

---

## 14. Backward Compatibility

### Consumer Compatibility

| Consumer | Uses RuntimeContext | Expected Behavior |
|---|---|---|
| `CEOProgram.ts` | Yes (RIE mode) | Fully compatible — reads `intent`, `domain`, `confidence`, `relevantFiles`, `executionPlan`, `memoryContext`, `operationalData`, `metadataGraph`; all fields preserved in v2 |
| `CTOProgram.ts` | Yes | Same — reads same fields |
| `COOProgram.ts` | Yes | Same |
| `CFOProgram.ts` | Yes | Same |
| `CMOProgram.ts` | Yes | Same |
| `CAIOProgram.ts` | Yes | Same |
| `CHROProgram.ts` | Yes | Same |
| `application-runtime-adapter.ts` | Yes (orchestrator) | Same interface — `RuntimeIntelligence.assemble()` returns `RuntimeContext`; internal architecture changes are invisible |
| Legacy (non-RIE) mode | No | Unchanged — executives fall back to old behavior if `runtimeContext` is not provided |

### Schema Compatibility

- RuntimeContext v2 adds fields, **never removes or renames** existing v1 fields
- All existing type imports (`RuntimeContext`, `BusinessDomain`, etc.) remain compatible
- `IntelligenceModule` interface unchanged (still has `execute(input)`)
- Only internal module implementations change

### API Compatibility

- `RuntimeIntelligence.assemble()` signature unchanged
- `application-runtime-adapter.ts` unchanged (continues to call `assemble()`)
- Executive RIE mode unchanged (continues to receive `RuntimeContext`)

---

## 15. Phased Implementation Plan

```
Phase 0: Design Approval
  Duration: 1 day (review + sign-off)
  Gate:    Founder approval of this document

Phase 1: Runtime Reasoner
  Duration: 2-3 days
  Output:  RuntimeReasoner.ts, system prompt, schema, config
  Gate:    Unit tests pass (10 test messages → valid JSON)

Phase 2: Repository Intelligence v2
  Duration: 1-2 days
  Output:  Rewritten RepositoryIntelligence.ts, retrievers
  Gate:    File retrieval works for all target types

Phase 3: Tool, Planning, Memory, Metadata v2
  Duration: 3-4 days
  Output:  Rewritten modules, ToolRegistry, ExecutionGraph, MemoryStores
  Gate:    Each module unit-tested independently

Phase 4: Intent & Domain Removal
  Duration: 0.5 days
  Output:  Deleted intents/ and domains/ directories
  Gate:    Build passes

Phase 5: ConfidenceEngine v2
  Duration: 0.5 days
  Output:  Rewritten ConfidenceEngine
  Gate:    Confidence values are reasonable (0.0-1.0)

Phase 6: Orchestrator Update
  Duration: 0.5 days
  Output:  Updated RuntimeIntelligence.ts
  Gate:    Full integration test passes

Phase 7: Integration & Testing
  Duration: 1-2 days
  Output:  Build passes, all 7 executives tested, benchmark results
  Gate:    All tests pass, performance baseline documented

Phase 8: Cleanup
  Duration: 0.5 days
  Output:  Removed legacy fallbacks, updated docs
  Gate:    Final review
```

**Total estimated duration**: 9-14 days (with 1 person full-time)

### Quick Win: Phase 1 alone can be deployed first

The Runtime Reasoner can be built and tested independently. It can run alongside the existing heuristic RIE in parallel mode (both produce RuntimeContext, compare results for observability) before switching over. This de-risks the migration significantly.

---

*Proposal prepared for Directive T8.2 — awaiting Founder approval before implementation.*
