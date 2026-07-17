# Runtime Intelligence Core (RIC) — Architecture v1

**Status**: Proposed

**Date**: 2026-07-16

---

## 1. Philosophy

Runtime Intelligence Core is the **Prefrontal Cortex** of the AI Operating System.

This philosophy is permanently locked by Directive T9.1A. All RIC components must conform.

### 1.1 Five Responsibilities of RIC

RIC has exactly five responsibilities, in strict order:

```
1. UNDERSTAND — Understand the user's intention
2. REASON     — Produce semantic reasoning about the request
3. PLAN       — Decide what information is required and specify what must
                be retrieved (never retrieve directly)
4. VERIFY     — Validate reasoning against grounded facts
5. BUILD      — Produce one verified RuntimeContext for Executive Runtime
```

Step 3 (Plan) includes specifying WHAT, WHY, WHEN, and HOW MUCH must be retrieved. The actual retrieval is performed by the Grounding Layer — RIC never retrieves directly.

### 1.2 Simultaneous Understanding

RIC simultaneously understands **three dimensions** before the Executive Runtime begins reasoning:

| Dimension | What it captures | Example |
|---|---|---|
| **User Intent** | What does the user want? | "Check sales of Matcha Latte" |
| **Business State** | Current operational condition. Current mission. Current branch. Current KPI. Current operational truth. | Branch: Antapani, Mission: Q3 Revenue, KPI: 1.2B, Sales module online |
| **System State** | What is the system capable of? | Tool catalog loaded, repository indexed, memory stores online |

Executive Runtime never starts reasoning without these three dimensions.

### 1.3 Non-Responsibilities (Abstracted)

RIC may **REQUEST** information.

RIC never **RETRIEVES** information.

Retrieval is exclusively owned by the Grounding Layer.

RIC only decides:

| Decision | Question |
|---|---|
| **WHAT** | What information is needed? |
| **WHY** | Why is this information needed? |
| **WHEN** | When should it be retrieved? |
| **HOW MUCH** | How much information is needed? |

The Grounding Layer performs retrieval.
The Executive Runtime performs reasoning.
The Execution Layer performs actions.

This separation prevents intelligence from becoming coupled with infrastructure.

### 1.4 Truth Ownership

**RIC never owns truth.**

Grounding Layer owns truth.
Executives consume truth.
Only Grounding Layer may create Runtime Truth Objects.

RIC only reasons about truth — it never creates it. This is a constitutional rule:

- If truth exists in Grounding Layer → RIC can reason about it
- If truth does not exist in Grounding Layer → RIC cannot create it
- If RIC needs truth that does not exist → RuntimeContext flags `missingTruth`

#### Concrete Restrictions

- **No cache inside RIC.** RIC must not maintain any local cache of business data.
- **No repository state.** RIC must not track file system state.
- **No inventory state.** RIC must not track product availability.
- **No product catalog.** RIC must not store product information.
- **No financial values.** RIC must not retain sales figures.
- **No operational metrics.** RIC must not store KPIs or performance data.

These belong exclusively to Grounding Layer.

### 1.5 Verification Principle

Verification is a mandatory reasoning stage. Every reasoning result produced by RIC must be verified against grounded information before being exposed to Executive Runtime.

Verification compares:
- **Inferred intent** — does the intent match available system capabilities?
- **Inferred domain** — does the domain have available data and providers?
- **Inferred entities** — do the extracted entities exist in grounded data?
- **Grounding availability** — are the required grounding providers online?
- **Repository availability** — do the requested files exist on the filesystem?
- **Operational truth availability** — is the requested operational data accessible?

The verification result contributes directly to the final confidence score. Reasoning without verification is considered incomplete.

```
Reasoner Output (domain: "finance")
       │
       ▼
Grounding Layer (checks: is finance data available?)
       │
       ▼
Verification (domain matches available data?)
       │
       ├── Yes → confidence preserved → RuntimeContext
       └── No  → confidence reduced → flagged → RuntimeContext
```

### 1.6 RuntimeContext Principle

RuntimeContext is a **verified intelligence object**. It is not generated directly from user input. Instead it is produced after:

```
Reasoning
    ↓
Grounding
    ↓
Verification
    ↓
Context Assembly
```

Only verified RuntimeContext may enter Executive Runtime. Raw user input, raw LLM output, and raw grounding data never reach Executive Runtime directly.

### 1.7 Architectural Law

Every reasoning produced by RIC must be **explainable**.
Every grounded information must be **traceable**.
Every RuntimeContext must be **reproducible**.

If one of these properties cannot be satisfied, the RuntimeContext must be marked as **degraded**.

**Explainable**: Each decision must answer why (domain, tool, file, memory, confidence, planning strategy).
**Traceable**: Each grounded datum must link back to its source provider with query parameters and timestamp.
**Reproducible**: Same input + same system state must produce same RuntimeContext (deterministic grounding + verification + assembly; only LLM variance at temperature=0).

### 1.8 Runtime Contract

Every RuntimeContext must satisfy:

| Property | Meaning | Failure Mode |
|---|---|---|
| **Grounded** | All fields supported by retrieved data | Missing truth flagged |
| **Verified** | Reasoning validated against evidence | Contradictions detected |
| **Traceable** | Every decision has a recorded origin | Audit trail missing |
| **Explainable** | Why-decisions exposed in reasoningTrace | Black box output |
| **Composable** | Can be consumed by any Executive Runtime | Executive-specific fields leak |

### 1.9 Confidence Philosophy

Confidence does not represent model certainty. **Confidence represents architecture confidence.**

Confidence increases only when: reasoning agrees, grounding succeeds, verification passes, retrieval completes. Confidence decreases when one of those layers disagrees.

Multi-factor formula: `overall = reasoning × grounding × verification`

Confidence is an **architectural metric**, not an LLM metric.

### 1.10 Executive Independence

**Executive Runtime does not perform intelligence. Executive Runtime consumes intelligence.**

All executives receive the same verified RuntimeContext. Only the following differ per executive: personality, authority, decision style, communication style, governance.

Intelligence is shared. Personality is isolated.

### 1.11 Brain Analogy (Complete)

```
User
  │
  ▼
SENSORY CORTEX      →  Grounding Layer (receives raw input, deterministic)
  │
  ▼
PREFRONTAL CORTEX   →  Runtime Intelligence Core (understands, reasons, plans, verifies)
  │
  ▼
PERSONALITY LAYER   →  Executive Runtime (persona-specific reasoning)
  │
  ▼
MOTOR CORTEX        →  Execution Layer (performs actions, produces output)
  │
  ▼
System
```

### 1.12 Truth Contract Immutability

| Component | Can Evolve? |
|---|---|
| Reasoning (LLM models, prompts) | Yes |
| Grounding (providers, data sources) | Yes |
| Executives (personae, strategies) | Yes |
| Execution (tools, APIs) | Yes |
| **RuntimeContext Contract** | **No — immutable** |

The RuntimeContext is the permanent API of the AI Operating System. It can be extended (new optional fields) but never modified (existing fields cannot change type, name, or semantics).

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER MESSAGE                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                  RUNTIME INTELLIGENCE CORE                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              UNDERSTANDING + REASONING                  │  │
│  │              (Cognitive Block 1 — LLM)                  │  │
│  │                                                        │  │
│  │  1. UNDERSTAND — user intention, business state,       │  │
│  │                  system state (3 dimensions)            │  │
│  │  2. REASON — semantic reasoning about the request      │  │
│  │                                                        │  │
│  │  Output: Intent, Domain, Entities, Reasoning, Risk     │  │
│  │  Fallback: Regex if confidence < 0.60                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              RETRIEVAL PLANNER                          │  │
│  │              (Cognitive Block 2 — LLM)                  │  │
│  │                                                        │  │
│  │  3. PLAN — decide what information is required         │  │
│  │  4. GROUND — specify what must be retrieved            │  │
│  │                                                        │  │
│  │  Output: RetrievalPlan (what, why, when, how much)     │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              GROUNDING LAYER                            │  │
│  │              (Zero AI — Fully Deterministic)            │  │
│  │                                                        │  │
│  │  Operational Truth  │  Memory Provider                  │  │
│  │  Knowledge Provider │  Metadata Provider                │  │
│  │  Repository Provider│  Filesystem / GitHub / SQL        │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              VERIFICATION ENGINE                        │  │
│  │              (Deterministic — No AI)                    │  │
│  │                                                        │  │
│  │  5. VERIFY — validate reasoning against grounded facts │  │
│  │                                                        │  │
│  │  Input:  UnderstandingResult + RetrievalPlan +          │  │
│  │          GroundingResult                                │  │
│  │  Output: VerifiedContext (confidence adjusted)          │  │
│  └────────────────────────────────────────────────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │           RUNTIME CONTEXT BUILDER                       │  │
│  │                                                        │  │
│  │  6. BUILD — produce verified RuntimeContext            │  │
│  │                                                        │  │
│  │  Contract: Grounded, Verified, Traceable,              │  │
│  │           Explainable, Composable                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXECUTIVE RUNTIME                          │
│  (Personality Layer — persona-specific reasoning only)        │
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──┐│
│  │ CEO  │ │ CTO  │ │ CFO  │ │ COO  │ │ CMO  │ │ CHRO │ │AI││
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──┘│
│                                                              │
│  Receives RuntimeContext — never searches, never classifies  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                   EXECUTION LAYER                             │
│  (Motor Cortex — performs actions, produces output)          │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 Understanding + Reasoning Engine

**Cognitive Block 1** — Single LLM call. Covers steps 1 (Understand) and 2 (Reason) from the five responsibilities.

This component simultaneously analyzes **three dimensions**:

| Dimension | What is captured | Why it matters |
|---|---|---|
| **User Intent** | What does the user want? | Determines the goal |
| **Business State** | What business reality applies? | Determines domain context |
| **System State** | What is the system capable of? | Determines feasibility |

#### Input

```typescript
interface UnderstandingInput {
  message: string;
  conversationHistory?: MessageRecord[];
  activeExecutive?: string;
  tenantId?: string;
  userId?: string;
  systemCapabilities?: {
    availableDomains: string[];
    availableTools: string[];
    repositoryIndexed: boolean;
    memoryStoresOnline: string[];
  };
}
```

#### System Prompt

```
You are the Understanding + Reasoning Engine of an AI Operating System.

Your responsibilities:
1. UNDERSTAND — Analyze the user message across three dimensions:
   a) User Intent: What does the user want to achieve?
   b) Business State: Which business domains are relevant and what is the current operational reality?
   c) System State: What capabilities will be needed?

2. REASON — Produce semantic reasoning about the request.

Determine:

1. GOAL — What is the user trying to achieve? (one sentence)

2. INTENT — Primary intent classification
   inquiry | analysis | report | action | decision | learning | troubleshooting

3. SUB-INTENT — More specific classification
   Examples: sales_inquiry, inventory_check, employee_onboarding, financial_report

4. DOMAIN — Which business domains are involved?
   Primary domain and secondary domains
   Examples: sales, inventory, finance, hr, marketing, operations, engineering, executive

5. ENTITIES — Extract all named entities
   Types: branch, product, employee, date, amount, project, outlet, menu, recipe,
          mission, organization, executive, workflow, repository, component,
          person, location, identifier

6. THINKING MODE — How complex is this request?
   fast: simple inquiry, single domain, concrete question
   balanced: moderate complexity, analysis required
   deep: complex reasoning, multi-domain, strategic decision

7. URGENCY — How time-sensitive is this?
   low: informational, no deadline
   medium: needs attention today
   high: critical, immediate action required

8. RISK — What is the risk level of acting on this request?
   low: informational, no consequence
   medium: moderate business impact
   high: significant financial/operational/legal impact

9. REASONING — Explain your semantic reasoning for each decision
   Why this intent? Why this domain? Why these entities?

10. CONFIDENCE — How confident are you in your understanding?
    0.0 - 1.0
    Only high confidence (>0.85) if the intent is unambiguous

Output ONLY valid JSON. No prose, no markdown, no explanations.
```

#### Output Schema

```typescript
interface UnderstandingResult {
  // === UNDERSTANDING (Step 1) ===
  goal: string;
  intent: string;
  subIntent: string;
  domain: {
    primary: string;
    secondary: string[];
  };
  entities: Entity[];

  // === REASONING (Step 2) ===
  reasoning: {
    intentRationale: string;
    domainRationale: string;
    entityRationale: string;
    alternativesConsidered: string[];
  };

  // === CONFIGURATION ===
  thinkingMode: 'fast' | 'balanced' | 'deep';
  urgency: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';

  // === CONFIDENCE (pre-verification) ===
  confidence: number;
  needClarification: boolean;
  clarificationQuestion?: string;
}

interface Entity {
  type: 'branch' | 'product' | 'employee' | 'date' | 'amount'
      | 'project' | 'outlet' | 'menu' | 'recipe' | 'organization'
      | 'executive' | 'workflow' | 'repository' | 'component'
      | 'person' | 'location' | 'identifier';
  name: string;
  value?: string;
  confidence: number;
}

#### Fallback

If LLM confidence < 0.60 OR LLM call fails:

```typescript
// Intent fallback using regex (simplified, 5-10 patterns only)
// Domain fallback using regex (10-15 rules only)
// No entity extraction in fallback mode
const fallback = new UnderstandingFallback();
return fallback.analyze(message);
```

The fallback is intentionally limited — enough to keep the system operational, but degraded.

---

### 3.2 Retrieval Planner

**Cognitive Block 2** — Single LLM call. Covers step 3 (Plan) from the five responsibilities.

This component determines what information is required and specifies what must be retrieved. It never retrieves data directly — it only produces specifications for the Grounding Layer.

#### Input

```typescript
interface PlanningInput {
  understanding: UnderstandingResult;
  repositoryMetadata: RepositoryMetadata[];  // auto-generated at startup
  toolCatalog: ToolDescriptor[];
  availableMemoryTypes: string[];
  operationalCapabilities: string[];
}
```

#### System Prompt

```
You are the Retrieval Planner of an AI Operating System.

Your responsibilities:
1. PLAN — Decide what information is required to fulfill the request
2. GROUND — Specify what must be retrieved (never retrieve directly)

For each category, determine:
- WHAT exactly is needed
- WHY it is needed
- WHEN should it be retrieved (immediate, deferred, on-demand)
- HOW MUCH is needed (summarized, detailed, exhaustive)
- PRIORITY (required, optional, fallback)
- FILTERS or PARAMETERS for retrieval

Categories:
1. KNOWLEDGE — Business knowledge, policies, SOPs, product info
2. REPOSITORY — Source code files, configurations, documentation
3. METADATA — EIOS graph nodes, relationships, properties
4. MEMORY — Past decisions, conversations, learned patterns
5. OPERATIONAL — Real-time business data (sales, inventory, etc.)
6. TOOLS — Capabilities needed to execute (from Tool Catalog)
7. EXECUTION PLAN — Step-by-step graph of what needs to happen

Repository Metadata (file index) will be provided.
Tool Catalog will be provided.

Output ONLY valid JSON. No prose.
```

#### Output Schema

```typescript
interface RetrievalPlan {
  knowledgeNeeds: RetrievalRequest[];
  repositoryNeeds: RepositoryRequest[];
  metadataNeeds: MetadataRequest[];
  memoryNeeds: MemoryRequest[];
  operationalNeeds: OperationalRequest[];
  toolNeeds: ToolRequest[];
  executionGraph: ExecutionGraph;
}

interface RetrievalRequest {
  type: 'knowledge' | 'metadata' | 'operational';
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  groundingPriority: 'critical' | 'high' | 'medium' | 'low';
  timing: 'immediate' | 'deferred' | 'on_demand';
  detail: 'summarized' | 'detailed' | 'exhaustive';
  filters?: Record<string, string>;
  maxResults?: number;
}

interface RepositoryRequest {
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  groundingPriority: 'critical' | 'high' | 'medium' | 'low';
  timing: 'immediate' | 'deferred' | 'on_demand';
  detail: 'summarized' | 'detailed' | 'exhaustive';
  suggestedPaths?: string[];
  suggestedTags?: string[];
  maxFiles?: number;
}

interface MemoryRequest {
  type: 'working' | 'decision' | 'knowledge' | 'episodic' | 'mission' | 'conversation';
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  maxResults?: number;
}

interface OperationalRequest {
  dataType: string;
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  parameters?: Record<string, string>;
}

interface ToolRequest {
  capability: string;
  description: string;
  priority: 'required' | 'optional' | 'fallback';
}

interface ExecutionGraph {
  steps: ExecutionStep[];
  parallel: string[][];
  estimatedCost: 'low' | 'medium' | 'high';
  estimatedDuration: string;
  riskNotes: string[];
}

interface ExecutionStep {
  id: string;
  type: 'retrieve' | 'analyze' | 'transform' | 'execute' | 'decide' | 'present';
  description: string;
  dependsOn: string[];
  assignedTool?: string;
}
```

---

### 3.3 Grounding Layer

**Zero AI**. Fully deterministic.

#### Architecture

```
GroundingLayer
  │
  ├── OperationalTruthProvider
  │     read(needs[]) → OperationalData[]
  │
  ├── MemoryProvider
  │     read(needs[]) → MemoryEntry[]
  │
  ├── KnowledgeProvider
  │     read(needs[]) → KnowledgeBlock[]
  │
  ├── MetadataProvider
  │     read(needs[]) → MetadataNode[]
  │
  ├── RepositoryProvider
  │     read(needs[]) → FileContent[]
  │
  ├── FileSystemProvider
  │     read(path) → string
  │
  ├── GitHubProvider
  │     read(org, repo, path) → string
  │
  └── SQLProvider
        query(sql, params) → Record[]
```

#### Provider Interface

```typescript
interface GroundingProvider<TNeed, TResult> {
  read(needs: TNeed[]): Promise<TResult[]>;
  health(): Promise<HealthStatus>;
}

interface GroundingResult {
  operationalData: OperationalData[];
  memoryEntries: MemoryEntry[];
  knowledgeBlocks: KnowledgeBlock[];
  metadataNodes: MetadataNode[];
  fileContents: FileContent[];
  errors: GroundingError[];
  executionTimeMs: number;
}
```

#### Priority-Based Execution

Grounding Layer executes requests by priority:

```typescript
class GroundingLayer {
  async execute(plan: RetrievalPlan): Promise<GroundingResult> {
    const prioritized = this.prioritizeRequests(plan);
    const highPriority = [...prioritized.critical, ...prioritized.high];
    const highResults = await Promise.all(highPriority.map(req => this.executeRequest(req)));
    const mediumResults = await this.executeWithConcurrency(prioritized.medium, 2);
    const lowResults = this.budgetRemaining()
      ? await this.executeWithConcurrency(prioritized.low, 1)
      : [];
    return this.assembleResults([...highResults, ...mediumResults, ...lowResults]);
  }
}
```

#### Guarantees

- Deterministic: same input → same output (excluding real-time data changes)
- Priority-based execution: critical > high > medium > low
- Parallel execution: same-priority providers run simultaneously
- Error isolation: one provider failure does not affect others
- No AI: zero LLM calls, zero regex, zero classification
- Audit trail: execution time and errors recorded

---

### 3.4 Verification Engine

**Step 5** — Deterministic (zero AI). Validates reasoning against grounded evidence.

#### Purpose

The Verification Engine ensures that every reasoning output from Cognitive Blocks 1 and 2 is validated against the factual data retrieved by the Grounding Layer before it enters the RuntimeContext.

This is not optional — it is a constitutional requirement (T9.1A - Verification Principle).

#### Input

```typescript
interface VerificationInput {
  understanding: UnderstandingResult;
  retrievalPlan: RetrievalPlan;
  grounding: GroundingResult;
}
```

#### Verification Rules

```typescript
class VerificationEngine {
  verify(input: VerificationInput): VerificationResult {
    return {
      checks: [
        this.verifyDomainAvailable(input),
        this.verifyEntitiesExist(input),
        this.verifyFilesExist(input),
        this.verifyToolsAvailable(input),
        this.verifyMemoryStoresAvailable(input),
        this.verifyOperationalDataRetrieved(input),
      ],
    };
  }

  private verifyDomainAvailable(input: VerificationInput): CheckResult {
    const domain = input.understanding.domain.primary;
    const hasData = input.grounding.errors.every(e => e.provider !== domain);
    return {
      check: 'domain_availability',
      passed: hasData,
      expected: domain,
      actual: hasData ? domain : 'unavailable',
      confidence: hasData ? input.understanding.confidence : input.understanding.confidence * 0.5,
    };
  }

  private verifyEntitiesExist(input: VerificationInput): CheckResult {
    // Verify extracted entities can be found in retrieved data
    const foundEntities = input.understanding.entities.filter(entity =>
      this.entityExistsInGrounding(entity, input.grounding)
    );
    return {
      check: 'entity_verification',
      passed: foundEntities.length === input.understanding.entities.length,
      expected: `${input.understanding.entities.length} entities`,
      actual: `${foundEntities.length} entities found`,
      confidence: foundEntities.length / Math.max(input.understanding.entities.length, 1),
    };
  }

  private verifyFilesExist(input: VerificationInput): CheckResult {
    const needed = input.retrievalPlan.repositoryNeeds || [];
    const retrieved = input.grounding.fileContents || [];
    return {
      check: 'file_availability',
      passed: retrieved.length >= needed.length,
      expected: `${needed.length} files requested`,
      actual: `${retrieved.length} files retrieved`,
      confidence: retrieved.length / Math.max(needed.length, 1),
    };
  }

  private verifyToolsAvailable(input: VerificationInput): CheckResult {
    const needed = input.retrievalPlan.toolNeeds || [];
    const hasTools = needed.every(need =>
      ToolCatalog.searchByCapability(need.capability).length > 0
    );
    return {
      check: 'tool_availability',
      passed: hasTools,
      expected: `${needed.length} capabilities needed`,
      actual: hasTools ? 'all available' : 'some unavailable',
      confidence: hasTools ? 1.0 : 0.5,
    };
  }

  private verifyMemoryStoresAvailable(input: VerificationInput): CheckResult {
    const needed = input.retrievalPlan.memoryNeeds || [];
    const hasMemory = needed.every(need =>
      MemoryProvider.isStoreAvailable(need.type)
    );
    return {
      check: 'memory_availability',
      passed: hasMemory,
      expected: `${needed.length} memory types requested`,
      actual: hasMemory ? 'all available' : 'some unavailable',
      confidence: hasMemory ? 1.0 : 0.5,
    };
  }

  private verifyOperationalDataRetrieved(input: VerificationInput): CheckResult {
    const needed = input.retrievalPlan.operationalNeeds || [];
    const retrieved = input.grounding.operationalData || [];
    return {
      check: 'operational_data',
      passed: retrieved.length >= needed.length,
      expected: `${needed.length} data requests`,
      actual: `${retrieved.length} data received`,
      confidence: retrieved.length / Math.max(needed.length, 1),
    };
  }
}
```

#### Output

```typescript
type VerificationState = 'verified' | 'partially_verified' | 'unverified' | 'contradicted';

interface VerificationResult {
  state: VerificationState;
  checks: CheckResult[];
  verificationConfidence: number;
  contradictions: Contradiction[];
}

interface CheckResult {
  check: string;
  state: VerificationState;
  expected: string;
  actual: string;
  confidence: number;
}

interface Contradiction {
  reasoningOutput: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high';
}
```

#### Verification States

| State | Meaning | Example |
|---|---|---|
| **verified** | All checks pass, reasoning matches evidence | Intent "finance" → finance data available |
| **partially_verified** | Some checks pass, some missing | Intent "finance" → finance data partial |
| **unverified** | No checks could be performed | All providers offline |
| **contradicted** | Reasoning directly conflicts with evidence | Intent "finance" → no finance data exists |

#### Confidence Impact

| Verification State | Confidence Adjustment |
|---|---|
| **verified** | Preserved (multiply by 1.0) |
| **partially_verified** | Reduced proportionally by check ratio |
| **unverified** | Halved, context degraded |
| **contradicted** | Confidence → 0, re-plan required |

---

### 3.5 Runtime Context Builder

Assembles all results into a single `RuntimeContext` that satisfies the **Runtime Contract** (Section 1.6).

```typescript
class RuntimeContextBuilder {
  build(
    understanding: UnderstandingResult,
    planning: RetrievalPlan,
    grounding: GroundingResult,
    verification: VerificationResult
  ): RuntimeContext;
}
```

#### RuntimeContext v2 Schema

```typescript
interface RuntimeContext {
  // === CONTRACT METADATA ===
  version: string;
  contractId: string;
  createdAt: number;
  degraded: boolean;
  degradedReason?: string;

  // === INTELLIGENCE ===
  intelligence: {
    goal: string;
    intent: string;
    subIntent: string;
    domain: {
      primary: string;
      secondary: string[];
    };
    entities: Entity[];
    reasoning: {
      intentRationale: string;
      domainRationale: string;
      entityRationale: string;
      alternativesConsidered: string[];
    };
    thinkingMode: 'fast' | 'balanced' | 'deep';
    urgency: 'low' | 'medium' | 'high';
    risk: RiskAssessment;
  };

  // === PLANNING ===
  planning: {
    executionPlan: ExecutionStep[];
    suggestedTools: ToolSuggestion[];
    recommendedStrategy: string;
    expectedOutput: string;
  };

  // === GROUNDING ===
  grounding: {
    operational: OperationalData[];
    memory: MemoryContext;
    knowledge: KnowledgeBlock[];
    repository: FileContent[];
    metadata: MetadataNode[];
    requiredTruth: RetrievalRequest[];
    retrievedTruth: GroundingResult[];
    missingTruth: string[];
  };

  // === VERIFICATION ===
  verification: {
    results: VerificationResult;
    explainability: {
      whyDomain: string;
      whyTool: string;
      whyRepository: string;
      whyMemory: string;
      whyConfidence: string;
      whyPlanning: string;
    };
  };

  // === RUNTIME ===
  runtime: {
    trace: RuntimeTrace;
    evidence: Evidence[];
    budget: RuntimeBudget;
    confidence: OverallConfidence;
    reasoningTrace: TraceEntry[];
  };
}

interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  requiresApproval: boolean;
}

interface OverallConfidence {
  reasoning: number;           // LLM certainty (from Understanding + Reasoning)
  grounding: number;           // Data completeness (from Grounding Layer)
  verification: number;        // Evidence match rate (from Verification Engine)
  overall: number;             // combined = reasoning * grounding * verification
  provenance: ConfidenceProvenance;
  weakAreas: string[];
  safeToExecute: boolean;      // overall > 0.5 threshold
}

interface ConfidenceProvenance {
  intentConfidence: number;
  entityConfidence: number;
  groundingCompleteness: number;
  verificationStatus: 'verified' | 'partially_verified' | 'unverified' | 'contradicted';
  planningConfidence: number;
  toolResolutionConfidence: number;
}

interface RuntimeTrace {
  stages: TraceStage[];
  totalDurationMs: number;
}

interface TraceStage {
  name: 'understand' | 'reason' | 'plan' | 'ground' | 'verify' | 'assemble';
  durationMs: number;
  confidence: number;
  provider: string;
  model?: string;
  status: 'success' | 'degraded' | 'fallback' | 'failed';
  error?: string;
}

interface Evidence {
  id: string;
  type: 'operational_truth' | 'knowledge' | 'repository' | 'metadata' | 'memory';
  source: string;
  query: string;
  result: unknown;
  rowCount?: number;
  timestamp: number;
  durationMs: number;
  confidence: number;
  error?: string;
}

interface RuntimeBudget {
  limits: Record<string, number>;
  exceeded: boolean;
  exceededStages: string[];
}

interface TraceEntry {
  component: string;
  input: string;
  output: string;
  confidence: number;
  durationMs: number;
  timestamp: number;
}
```

#### Confidence Formula

```
overall = reasoning * grounding * verification

reasoning     = UnderstandingEngine.confidence        (0.0 - 1.0)
grounding     = retrievedCount / requestedCount        (0.0 - 1.0)
verification  = passedChecks / totalChecks             (0.0 - 1.0)

provenance = {
  intentConfidence,
  entityConfidence,
  groundingCompleteness,
  verificationStatus: passedChecks === totalChecks ? 'PASS' : 'PARTIAL',
  planningConfidence,
  toolResolutionConfidence
}

safeToExecute = overall > 0.5
```

Each factor is independent. A high reasoning confidence with low grounding or verification confidence will not produce a falsely high overall score.

---

## 4. Repository Metadata System

Auto-generated at system startup.

### Generator

```typescript
class RepositoryMetadataGenerator {
  async generate(): Promise<RepositoryMetadata[]> {
    const files = await glob('src/**/*.{ts,tsx,js,jsx,json,md}');
    const metadata: RepositoryMetadata[] = [];

    for (const file of files) {
      const content = await readFile(file);
      metadata.push({
        path: file,
        description: extractDescription(content),
        exports: extractExports(content),
        tags: inferTags(file, content),
        owner: inferOwner(file),
        importance: inferImportance(file),
        dependencies: extractImports(content),
        lastModified: await getLastModified(file),
      });
    }

    return metadata;
  }
}

interface RepositoryMetadata {
  path: string;
  description: string;
  exports: string[];
  tags: string[];
  owner: string;
  importance: 'high' | 'medium' | 'low';
  dependencies: string[];
  lastModified: Date;
}
```

The metadata is fed to the Retrieval Planner (Cognitive Block 2) to enable LLM-based file selection.

---

## 5. Tool Catalog

Replaces the old `DOMAIN_TOOL_MAP` lookup table.

```typescript
interface ToolDescriptor {
  id: string;
  name: string;
  description: string;         // What this tool does (semantic, for LLM)
  capabilities: string[];      // What capabilities it provides
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  cost: 'low' | 'medium' | 'high';
  latency: 'low' | 'medium' | 'high';
  permissions: string[];
  isEnabled: boolean;
}

class ToolCatalog {
  private tools: Map<string, ToolDescriptor>;

  register(tool: ToolDescriptor): void;
  getById(id: string): ToolDescriptor;
  searchByCapability(capability: string): ToolDescriptor[];
  searchByDescription(query: string): ToolDescriptor[];  // semantic match
  getAll(): ToolDescriptor[];
}
```

Tools are registered at startup via dependency injection, not hardcoded in domain maps.

---

## 6. Executive Runtime Contract

Every executive must adhere to this contract:

```typescript
interface ExecutiveRuntime {
  execute(context: RuntimeContext): Promise<ExecutiveResponse>;
}
```

Executives receive a **complete** RuntimeContext. They must not:

- ❌ Determine intent or subIntent
- ❌ Detect domain
- ❌ Extract entities
- ❌ Search for files
- ❌ Query metadata
- ❌ Select tools by keyword
- ❌ Build execution plans
- ❌ Determine confidence

Executives only:

- ✅ Read RuntimeContext fields
- ✅ Apply persona-specific reasoning
- ✅ Use `suggestedTools` (not select them)
- ✅ Follow `executionPlan` (not create it)
- ✅ Generate persona-appropriate response

---

## 7. RuntimeContract

The RuntimeContract is the **only interface** between RIC and Executive Runtime. See full specification in `RIC_RUNTIME_CONTRACT.md`.

### 7.1 Architectural Law

```
Executives never depend on Runtime Intelligence modules.
Executives only depend on RuntimeContract.
```

### 7.2 Immutability

RuntimeContext is immutable. No executive may mutate it. Every modification creates a new RuntimeContext version. This prevents dual truth when multiple executives read the same context.

At assembly boundary, the RuntimeContext is deep-frozen:

```typescript
class RuntimeContextBuilder {
  build(...): RuntimeContract {
    const context = this.assemble(understanding, planning, grounding, verification);
    return Object.freeze(context);
  }
}
```

### 7.3 Versioning

Every RuntimeContract carries a semantic version:

```typescript
interface RuntimeContract {
  version: string;       // e.g., "1.0", "1.1", "2.0"
  contractId: string;    // unique instance identifier
  createdAt: number;
  degraded: boolean;
  degradedReason?: string;
}
```

Version rules:
- New optional field → minor bump (1.0 → 1.1)
- Field type change / removal / semantic change → major bump (1.0 → 2.0)
- Executives declare supported versions via `ExecutiveCapability.supportedContractVersions`

### 7.4 RuntimeTrace

Every RuntimeContract contains a trace of pipeline execution:

```typescript
interface RuntimeTrace {
  stages: TraceStage[];
  totalDurationMs: number;
}

interface TraceStage {
  name: 'understand' | 'reason' | 'plan' | 'ground' | 'verify' | 'assemble';
  durationMs: number;
  confidence: number;
  provider: string;       // e.g., "DeepSeek V4", "PostgreSQL"
  model?: string;
  status: 'success' | 'degraded' | 'fallback' | 'failed';
  error?: string;
}
```

### 7.5 Confidence Provenance

Confidence always carries a breakdown of its factors:

```typescript
interface ConfidenceProvenance {
  intentConfidence: number;
  entityConfidence: number;
  groundingCompleteness: number;
  verificationStatus: 'verified' | 'partially_verified' | 'unverified' | 'contradicted';
  planningConfidence: number;
  toolResolutionConfidence: number;
}
```

### 7.6 Runtime Evidence

Every grounded fact includes provenance back to its source:

```typescript
interface Evidence {
  id: string;
  type: 'operational_truth' | 'knowledge' | 'repository' | 'metadata' | 'memory';
  source: string;           // provider name
  query: string;            // what was requested
  result: unknown;
  rowCount?: number;
  timestamp: number;
  durationMs: number;
  confidence: number;
  error?: string;
}
```

---

## 8. RuntimeBudget & Degraded Mode

### 8.1 Budget Limits

Every RIC pipeline stage has configurable time budgets:

| Stage | Fast (ms) | Balanced (ms) | Deep (ms) |
|---|---|---|---|
| Understanding | 500 | 1500 | 4000 |
| Reasoning | 300 | 1500 | 4000 |
| Planning | 500 | 2000 | 5000 |
| Grounding | 500 | 1000 | 2000 |
| Verification | 200 | 500 | 500 |
| Assembly | 100 | 300 | 300 |
| **Total** | **2100** | **6800** | **15800** |

```typescript
interface RuntimeBudget {
  limits: Record<string, number>;
  exceeded: boolean;
  exceededStages: string[];
}
```

### 8.2 Budget Enforcement

Each stage is wrapped with `Promise.race` against its budget:

```typescript
async function executeWithBudget<T>(
  stage: string,
  fn: () => Promise<T>,
  budgetMs: number
): Promise<{ result: T | null; timedOut: boolean; durationMs: number }>
```

If budget exceeded → result is null, stage marked as timed out.

### 8.3 Degraded Mode

When budgets are exceeded or critical failures occur, RuntimeContract enters degraded mode:

| Trigger | Degraded Reason |
|---|---|
| LLM timeout → regex fallback | `"understanding_fallback"` |
| Grounding provider timeout | `"grounding_timeout: MemoryProvider"` |
| Verification confidence < 0.3 | `"verification_failed"` |
| Budget exceeded | `"budget_exceeded: planning"` |
| Missing critical truth | `"missing_truth: operational_data"` |

Executives check `contract.degraded` and add appropriate disclaimers to output.

### 8.4 Degradation Levels

| Level | Meaning |
|---|---|
| `degraded` | System responded with limitations (fallback, partial data) |
| `degraded:critical` | Missing data required for response |

---

## 9. Multi-Model Architecture (ReasoningProvider)

The LLM dependency is abstracted behind `ReasoningProvider`, allowing RIC to use any model without executive awareness.

```typescript
interface ReasoningProvider {
  reason<T>(prompt: string, schema: ZodSchema<T>, options?: ReasoningOptions): Promise<ReasoningResult<T>>;
  health(): Promise<HealthStatus>;
}

interface ReasoningOptions {
  model?: string;             // specific model override
  temperature?: number;
  maxTokens?: number;
  thinkingMode?: 'fast' | 'balanced' | 'deep';
}

interface ReasoningResult<T> {
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  confidence: number;
}
```

### Built-in Providers

```typescript
class DeepSeekProvider implements ReasoningProvider { /* ... */ }
class OpenAIProvider implements ReasoningProvider { /* ... */ }
class AnthropicProvider implements ReasoningProvider { /* ... */ }
class GeminiProvider implements ReasoningProvider { /* ... */ }
class RegexFallbackProvider implements ReasoningProvider { /* ... */ }
```

### Provider Selection

Selection is based on thinking mode and availability:

| Thinking Mode | Preferred Provider | Fallback |
|---|---|---|
| `fast` | DeepSeek V4 / GPT-4o-mini | RegexFallbackProvider |
| `balanced` | GPT-4o / Claude Sonnet | DeepSeek V4 |
| `deep` | GPT-4o / Claude Opus | GPT-4o |

Executive Runtime never knows which provider was used.

---

## 10. Runtime Capability Graph

RIC maintains a capability graph of what the system can do:

```
Capability: Inventory Management
  ├── Grounding: InventoryProvider (PostgreSQL)
  ├── Tools: AdjustInventory, GetInventoryLevel, TransferStock
  └── Executive: COO, CFO

Capability: Sales Analytics
  ├── Grounding: SalesProvider (PostgreSQL)
  ├── Tools: GetSalesSummary, GetSalesTrend, CompareBranches
  └── Executive: CEO, CMO, CFO

Capability: Employee Management
  ├── Grounding: HRProvider (PostgreSQL)
  ├── Tools: GetEmployeeInfo, UpdateEmployee, OnboardEmployee
  └── Executive: CHRO, COO
```

### Capability Graph Interface

```typescript
interface CapabilityGraph {
  getCapability(name: string): CapabilityNode | null;
  findCapabilitiesByDomain(domain: string): CapabilityNode[];
  findCapabilitiesByExecutive(executive: string): CapabilityNode[];
  isCapabilitySupported(name: string): boolean;
}

interface CapabilityNode {
  name: string;
  domain: string;
  description: string;
  groundingProviders: string[];
  tools: string[];
  executives: string[];
  health: 'healthy' | 'degraded' | 'offline' | 'experimental' | 'deprecated';
}
```

### How RIC Uses the Capability Graph

1. After understanding user intent, RIC checks if the required capability is in the graph
2. If capability exists and health is `healthy` → RIC plans retrieval using its grounding providers and tools
3. If capability health is `degraded` → RIC proceeds with reduced confidence
4. If capability health is `offline` → RIC returns `"Temporarily Unavailable"` rather than hallucinating
5. If capability does not exist or health is `deprecated` → RIC returns `"Not Supported"`
6. If capability health is `experimental` → RIC proceeds but marks RuntimeContext as degraded

This prevents RIC from attempting to solve problems using capabilities that are offline, deprecated, or unavailable.

### Capability Health Propagation

Capability health is derived from the health of its grounding providers:

```typescript
function deriveCapabilityHealth(node: CapabilityNode): CapabilityHealth {
  const providerHealths = node.groundingProviders.map(p => ProviderRegistry.getHealth(p));

  if (providerHealths.every(h => h === 'healthy')) return 'healthy';
  if (providerHealths.some(h => h === 'healthy')) return 'degraded';
  if (providerHealths.every(h => h === 'offline')) return 'offline';
  return 'offline';
}
```

---

## 11. Runtime Diagnostics API

Internal endpoint for debugging the RIC pipeline:

```
GET /api/internal/ric/diagnostics
```

**Response**:

```json
{
  "status": "ok",
  "version": "1.0",
  "uptime": 3600,
  "lastContract": {
    "contractId": "ctr_abc123",
    "version": "1.0",
    "degraded": false,
    "trace": {
      "stages": [
        { "name": "understand", "durationMs": 132, "confidence": 0.92, "provider": "DeepSeek V4", "status": "success" }
      ],
      "totalDurationMs": 634
    },
    "confidence": {
      "overall": 0.91,
      "provenance": { "intent": 0.96, "entity": 0.93, "grounding": 0.98, "verification": "verified", "planning": 0.88 }
    }
  },
  "budget": {
    "limits": { "understanding": 2000, "reasoning": 2000, "planning": 3000, "grounding": 2000, "verification": 500, "assembly": 300 },
    "exceeded": false
  },
  "providers": {
    "reasoning": { "provider": "DeepSeek V4", "status": "ok" },
    "grounding": {
      "operational": { "status": "ok" },
      "memory": { "status": "ok" },
      "knowledge": { "status": "ok" },
      "metadata": { "status": "ok" },
      "repository": { "status": "degraded", "error": "File not found" }
    }
  },
  "capabilities": {
    "supportedDomains": ["sales", "inventory", "finance", "hr", "marketing", "operations"],
    "supportedTools": 24,
    "registeredExecutives": ["CEO", "CTO", "CFO", "COO", "CMO", "CHRO", "CAIO"],
    "activeReasoningProvider": "DeepSeek V4"
  }
}
```

---

## 12. Future Architecture

```
RIC
is designed
to support

20+ Executives

100+ Grounding Providers

Multiple Reasoning Models

without
architectural change.
```

### Expansion Vectors

| Vector | Mechanism | Example |
|---|---|---|
| New executive | Implement `ExecutiveRuntime` interface, register in registry | Add CPO (Chief Product Officer) |
| New grounding provider | Implement `GroundingProvider` interface, register | Add MongoDB provider |
| New reasoning model | Implement `ReasoningProvider` interface, configure | Add Claude Opus for deep mode |
| New tool | Register in `ToolCatalog` with capability descriptor | Add `ExportToPDF` tool |
| New domain | Add to `CapabilityGraph` with providers + tools + executives | Add `logistics` domain |
| New verification rule | Implement `VerificationRule` interface, register | Add `ComplianceVerificationRule` |

None of these expansions require changes to the RIC core pipeline (Understanding → Planning → Grounding → Verification → Assembly).

---

## 13. Data Flow (Complete Sequence)

```
1. User Message
       │
2. RIC.assemble(message)
       │
        ├─▶ 2a. Understanding + Reasoning Engine (LLM Call #1 — Cognitive Block 1)
       │        ├─▶ Step 1 (Understand): Analyze 3 dimensions — user intent, business state, system state
       │        ├─▶ Step 2 (Reason): Produce semantic reasoning for each decision
       │        ├─▶ Parse JSON response, validate schema
       │        ├─▶ If confidence < 0.60: run regex fallback
       │        └─▶ Return UnderstandingResult (intent, domain, entities, reasoning, confidence)
       │
        ├─▶ 2b. Retrieval Planner (LLM Call #2 — Cognitive Block 2)
       │        ├─▶ Step 3 (Plan): decide what information is required and specify
       │        │                 what must be retrieved (what/why/when/how much)
       │        ├─▶ Send UnderstandingResult + Repository Metadata + Tool Catalog
       │        ├─▶ Parse JSON response, validate schema
       │        └─▶ Return RetrievalPlan (knowledge, repo, metadata, memory, tool needs)
       │
       ├─▶ 2c. Grounding Layer (Zero AI — Deterministic)
       │        ├─▶ For each need: call appropriate provider (parallel)
       │        ├─▶ Collect results + errors
       │        └─▶ Return GroundingResult
       │
       ├─▶ 2d. Verification Engine (Zero AI — Deterministic)
       │        ├─▶ Validate reasoning against grounded evidence
       │        ├─▶ Check: domain availability, entity existence, file existence,
       │        │          tool availability, memory availability, data completeness
       │        ├─▶ Calculate verification confidence
       │        ├─▶ Flag contradictions
       │        └─▶ Return VerificationResult
       │
       ├─▶ 2e. Runtime Context Builder
       │        ├─▶ Merge understanding + planning + grounding + verification
       │        ├─▶ Calculate multi-factor confidence (reasoning × grounding × verification)
       │        ├─▶ Build explainability entries
       │        ├─▶ Build reasoning trace
       │        └─▶ Return RuntimeContext (satisfies Runtime Contract)
       │
3. Executive Runtime (Personality Layer)
       │
       ├─▶ Read RuntimeContext
       ├─▶ Apply persona reasoning (CEO, CTO, etc.)
       ├─▶ Generate response
       │
4. Execution Layer (Motor Cortex)
       │
       ├─▶ Perform actions
       ├─▶ Produce output
```

---

## 14. File Structure

```
src/runtime-intelligence-core/
├── index.ts                            # Barrel exports
├── RuntimeIntelligenceCore.ts          # Orchestrator (assemble method)
├── types.ts                            # All shared types
│
├── understanding/
│   ├── UnderstandingEngine.ts          # Cognitive Block 1
│   ├── UnderstandingFallback.ts        # Regex fallback (confidence < 0.60)
│   └── prompts/
│       └── understanding-prompt.ts     # System prompt
│
├── planning/
│   ├── RetrievalPlanner.ts             # Cognitive Block 2
│   └── prompts/
│       └── planning-prompt.ts          # System prompt
│
├── grounding/
│   ├── GroundingLayer.ts               # Orchestrates all providers
│   ├── providers/
│   │   ├── OperationalTruthProvider.ts
│   │   ├── MemoryProvider.ts
│   │   ├── KnowledgeProvider.ts
│   │   ├── MetadataProvider.ts
│   │   ├── RepositoryProvider.ts
│   │   ├── FileSystemProvider.ts
│   │   └── SQLProvider.ts
│   └── types.ts
│
├── verification/
│   ├── VerificationEngine.ts           # Validates reasoning against evidence
│   └── rules/
│       ├── DomainVerificationRule.ts
│       ├── EntityVerificationRule.ts
│       ├── FileVerificationRule.ts
│       ├── ToolVerificationRule.ts
│       ├── MemoryVerificationRule.ts
│       └── OperationalVerificationRule.ts
│
├── contract/
│   └── RuntimeContract.ts              # Contract assembly + immutability enforcement
│
├── registry/
│   ├── RepositoryMetadataGenerator.ts  # Startup file indexer
│   ├── ToolCatalog.ts                  # Tool descriptor registry
│   └── RepositoryMetadata.ts           # Metadata types
│
├── capability/
│   └── CapabilityGraph.ts              # System capability registry
│
├── providers/
│   ├── ReasoningProvider.ts            # Multi-model abstraction
│   ├── DeepSeekProvider.ts
│   ├── OpenAIProvider.ts
│   ├── AnthropicProvider.ts
│   ├── GeminiProvider.ts
│   └── RegexFallbackProvider.ts
│
├── confidence/
│   ├── ConfidenceAggregator.ts         # Multi-factor confidence + provenance
│   └── ConfidenceProvenance.ts
│
├── budget/
│   └── BudgetEnforcer.ts               # Stage time budget enforcement
│
├── diagnostics/
│   └── RuntimeDiagnosticsAPI.ts        # Internal diagnostics endpoint
│
└── fallback/
    └── RegexFallback.ts                # Shared regex fallback patterns
```

---

## 15. Key Design Principles

| # | Principle | Application |
|---|---|---|---|---|---|---|
| 1 | **Five Responsibilities** | U → R → P → V → B. Verification is first-class, not optional |
| 2 | **Simultaneous Understanding** | RIC understands user intent + business state (mission, branch, KPI) + system state |
| 3 | **Abstract Non-Responsibilities** | RIC may request, never retrieves. Only WHAT/WHY/WHEN/HOW MUCH |
| 4 | **Truth Ownership** | RIC never owns truth. Only Grounding Layer creates truth objects |
| 5 | **Verification** | All reasoning validated against grounded evidence before entering RuntimeContext |
| 6 | **Architecture Confidence** | confidence = reasoning × grounding × verification (architectural metric, not LLM) |
| 7 | **RuntimeContext Principle** | Only verified context enters Executive Runtime |
| 8 | **Contract Dependency** | Executives depend only on RuntimeContract, never on RIC modules |
| 9 | **Immutability** | RuntimeContext is immutable. No executive may mutate it |
| 10 | **RuntimeTrace** | Every pipeline stage records duration, confidence, provider for diagnostics |
| 11 | **Confidence Provenance** | Confidence always includes breakdown of contributing factors |
| 12 | **Evidence Provenance** | Every grounded fact links back to its source provider |
| 13 | **RuntimeBudget** | Every stage has a time budget; exceeding triggers degraded mode |
| 14 | **Degraded Mode** | When budgets exceeded or failures occur, context is marked degraded |
| 15 | **Multi-Model Abstraction** | ReasoningProvider interface allows any LLM without executive awareness |
| 16 | **Capability Graph** | RIC knows what the system can do; unsupported capabilities return "Not Supported" |
| 17 | **Architectural Law** | Explainable, traceable, reproducible, or degraded |
| 18 | **Runtime Contract** | Every RuntimeContext: Grounded, Verified, Traceable, Explainable, Composable |
| 19 | **Executive Independence** | Executives consume intelligence, never perform it |
| 20 | **Explainability** | Every decision exposes its why (domain, tool, file, memory, confidence, planning) |
| 21 | **Brain Analogy** | Sensory Cortex → Prefrontal Cortex → Personality → Motor Cortex |
| 22 | **Truth Contract Immutability** | RuntimeContext contract never changes (can be extended, never modified) |
| 23 | **Clean Architecture** | Inner layers depend on abstractions, not infrastructure |
| 24 | **Dependency Inversion** | Grounding Layer depends on provider interfaces, not implementations |
| 25 | **Separation of Concerns** | Reasoning (LLM) ≠ Retrieval (deterministic) ≠ Persona (executive) |
| 26 | **Semantic First** | Primary decisions by LLM understanding, regex is only degraded fallback |
| 27 | **Testability** | Each component testable independently (mock LLM, mock providers) |
