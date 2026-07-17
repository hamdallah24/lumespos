# RIC Runtime Contract — Specification v1

**Directive**: T9.2 — Architecture Hardening

**Status**: Proposed

**Date**: 2026-07-16

---

## 1. Purpose

The Runtime Contract is the **only interface** between Runtime Intelligence Core (RIC) and Executive Runtime.

Executives never depend on RIC modules directly. Executives only depend on `RuntimeContract`.

```
Executive Runtime
       │
       ▼
RuntimeContract    ← ONLY dependency
       │
       ▼
   RIC Modules     ← NEVER accessed directly
```

## 2. Architectural Law

```
Executives never depend
on Runtime Intelligence modules.

Executives only depend
on RuntimeContract.
```

This law guarantees:
- **Low coupling** — RIC internals can change without affecting executives
- **Testability** — executives can be tested with mock contracts
- **Evolvability** — new RIC features don't require executive changes

## 3. RuntimeContract Interface

```typescript
interface RuntimeContract {
  // === Contract Metadata ===
  version: string;
  contractId: string;
  createdAt: number;
  degraded: boolean;
  degradedReason?: string;

  // === Intelligence ===
  intelligence: {
    goal: string;
    intent: string;
    subIntent: string;
    domain: { primary: string; secondary: string[] };
    entities: EntityResult[];
    thinkingMode: 'fast' | 'balanced' | 'deep';
    urgency: 'low' | 'medium' | 'high';
    risk: RiskAssessment;
  };

  // === Planning ===
  planning: {
    executionPlan: ExecutionStep[];
    suggestedTools: ToolSuggestion[];
  };

  // === Grounding ===
  grounding: {
    operational: OperationalData[];
    memory: MemoryContext;
    knowledge: KnowledgeBlock[];
    repository: FileContent[];
    metadata: MetadataNode[];
  };

  // === Verification ===
  verification: VerificationResult;

  // === Confidence ===
  confidence: OverallConfidence;

  // === Runtime ===
  runtime: {
    trace: RuntimeTrace;
    evidence: Evidence[];
    budget: RuntimeBudget;
  };
}
```

## 4. Immutability

```
RuntimeContext
is immutable.

No executive
may mutate
RuntimeContext.

Every modification
creates
a new RuntimeContext version.
```

### Why Immutable

If executives could mutate RuntimeContext:

```
CEO
  │
  ├── mutate confidence → 0.95
  │
  └── CTO reads confidence → 0.95 (CEO's version)
       │
       └── CFO reads confidence → 0.82 (original)
            │
            └── Dual truth → inconsistency
```

Immutability eliminates dual truth. Every executive reads the same contract. If an executive needs a modified context, it creates a derived contract (new version).

### Deep Freeze

At the assembly boundary, `RuntimeContext` is deep-frozen:

```typescript
class RuntimeContextBuilder {
  build(...): RuntimeContract {
    const context = this.assemble(understanding, planning, grounding, verification);
    return Object.freeze(context); // shallow freeze
    // Or use deep-freeze library for nested immutability
  }
}
```

## 5. Versioning

Every RuntimeContract carries a semantic version:

```typescript
interface RuntimeContract {
  version: string;  // e.g., "1.0", "1.1", "2.0"
}
```

### Version Rules

| Change | Version Bump | Example |
|---|---|---|
| New optional field added | Minor (1.0 → 1.1) | Add `context.experimentalFeature` |
| New evidence type added | Minor (1.0 → 1.1) | Add `evidence.type = "audit_log"` |
| Existing field type changes | Major (1.0 → 2.0) | Change `confidence` from number to struct |
| Existing field removed | Major (1.0 → 2.0) | Remove `recommendedStrategy` |
| Existing field semantics change | Major (1.0 → 2.0) | Change `confidence` range from 0-1 to A-F |

### Backward Compatibility

Executives declare which contract versions they support:

```typescript
interface ExecutiveCapability {
  supportedContractVersions: string[];  // e.g., ["1.0", "1.1"]
  minConfidence: number;
  requiredFields: string[];
}
```

RIC routes the appropriate contract version to each executive. If no compatible version exists, the executive is marked unavailable.

### Version Migration

When a major version is released:
1. Old executives continue receiving old version
2. New executives receive new version
3. Migration window: executives are updated one by one
4. After all executives migrated: old version deprecated

## 6. RuntimeTrace

Every RuntimeContract contains a trace of how it was produced:

```typescript
interface RuntimeTrace {
  stages: TraceStage[];
  totalDurationMs: number;
}

interface TraceStage {
  name: 'understand' | 'reason' | 'plan' | 'ground' | 'verify' | 'assemble';
  durationMs: number;
  confidence: number;
  provider: string;         // e.g., "DeepSeek V4", "GPT-4o", "RegexFallback"
  model?: string;           // e.g., "deepseek-chat", "gpt-4o-2024-08"
  inputTokens?: number;
  outputTokens?: number;
  status: 'success' | 'degraded' | 'fallback' | 'failed';
  error?: string;
}
```

Example:

```json
{
  "stages": [
    { "name": "understand", "durationMs": 132, "confidence": 0.92, "provider": "DeepSeek V4", "status": "success" },
    { "name": "reason", "durationMs": 95, "confidence": 0.94, "provider": "DeepSeek V4", "status": "success" },
    { "name": "plan", "durationMs": 210, "confidence": 0.88, "provider": "DeepSeek V4", "status": "success" },
    { "name": "ground", "durationMs": 180, "confidence": 0.98, "provider": "PostgreSQL", "status": "success" },
    { "name": "verify", "durationMs": 12, "confidence": 0.95, "provider": "VerificationEngine", "status": "success" },
    { "name": "assemble", "durationMs": 5, "confidence": 1.0, "provider": "ContextBuilder", "status": "success" }
  ],
  "totalDurationMs": 634
}
```

## 7. Confidence Provenance

Confidence includes a detailed breakdown:

```typescript
interface OverallConfidence {
  overall: number;           // Combined score
  reasoning: number;         // LLM certainty
  grounding: number;         // Data completeness
  verification: number;      // Evidence match rate

  // === PROVENANCE (NEW) ===
  provenance: ConfidenceProvenance;
  safeToExecute: boolean;
  weakAreas: string[];
}

interface ConfidenceProvenance {
  intentConfidence: number;
  entityConfidence: number;
  groundingCompleteness: number;
  verificationStatus: 'verified' | 'partially_verified' | 'unverified' | 'contradicted';
  planningConfidence: number;
  toolResolutionConfidence: number;
}

// Executive presentation
"confidence": 0.91,
"because": {
  "intent": 0.96,
  "entity": 0.93,
  "grounding": 0.98,
  "verification": "verified",
  "planning": 0.88
}
```

## 8. Runtime Evidence

Every piece of grounded data includes its provenance:

```typescript
interface Evidence {
  id: string;
  type: 'operational_truth' | 'knowledge' | 'repository' | 'metadata' | 'memory';
  source: string;             // e.g., "PostgreSQL", "OperationalTruthProvider", "FileSystem"
  query: string;              // What was requested
  result: unknown;            // What was returned
  rowCount?: number;
  timestamp: number;
  durationMs: number;
  confidence: number;         // Data source confidence (0.0-1.0)
  error?: string;
}
```

Example:

```json
{
  "evidence": [
    {
      "id": "evt_001",
      "type": "operational_truth",
      "source": "PostgreSQL",
      "query": "get_sales_summary(branch: 'Antapani', period: 'this_week')",
      "result": { "total": 125000000, "transactions": 342 },
      "rowCount": 15,
      "timestamp": 1721123456789,
      "durationMs": 45,
      "confidence": 0.99
    }
  ]
}
```

Executives can reference evidence in their output:

> "Menurut data penjualan hari ini (sumber: PostgreSQL, 342 transaksi), total penjualan mencapai Rp125.000.000."

## 9. RuntimeBudget

Every RIC pipeline has a time budget:

```typescript
interface RuntimeBudget {
  limits: {
    understanding: number;    // ms (default: 2000)
    reasoning: number;        // ms (default: 2000)
    planning: number;         // ms (default: 3000)
    grounding: number;        // ms (default: 2000)
    verification: number;     // ms (default: 500)
    assembly: number;         // ms (default: 300)
    total: number;            // ms (default: 8000)
  };
  exceeded: boolean;
  exceededStages: string[];
}
```

### Budget Enforcement

```typescript
class BudgetEnforcer {
  private budgets: Map<string, number>;

  async executeWithBudget<T>(stage: string, fn: () => Promise<T>, budgetMs: number): Promise<BudgetResult<T>> {
    const start = Date.now();
    try {
      const result = await Promise.race([
        fn(),
        this.timeout(budgetMs),
      ]);
      return { result, durationMs: Date.now() - start, timedOut: false };
    } catch (e) {
      return { result: null, durationMs: Date.now() - start, timedOut: true };
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Budget exceeded: ${ms}ms`)), ms)
    );
  }
}
```

### Budget Configuration

Budgets are configurable per thinking mode:

| Stage | Fast (ms) | Balanced (ms) | Deep (ms) |
|---|---|---|---|
| Understanding | 500 | 1500 | 4000 |
| Reasoning | 300 | 1500 | 4000 |
| Planning | 500 | 2000 | 5000 |
| Grounding | 500 | 1000 | 2000 |
| Verification | 200 | 500 | 500 |
| Assembly | 100 | 300 | 300 |
| **Total** | **2100** | **6800** | **15800** |

## 10. Degraded Mode

When budgets are exceeded or critical failures occur, RuntimeContract enters degraded mode:

```typescript
interface RuntimeContract {
  degraded: boolean;
  degradedReason?: string;
}
```

### Degradation Triggers

| Trigger | Degraded Reason |
|---|---|
| LLM timeout → regex fallback used | `"understanding_fallback"` |
| Grounding provider timeout | `"grounding_timeout: MemoryProvider"` |
| Verification confidence < 0.3 | `"verification_failed: domain mismatch"` |
| Budget exceeded | `"budget_exceeded: planning"` |
| Missing critical truth | `"missing_truth: operational_data"` |
| Multiple providers failed | `"multi_provider_failure: 2/6 providers"` |

### Executive Behavior in Degraded Mode

```typescript
if (contract.degraded) {
  // Executive adds disclaimer to output
  response.disclaimer = `Some information sources were unavailable during processing. ` +
    `Response confidence may be reduced. Reason: ${contract.degradedReason}`;
}
```

### Degradation Levels

| Level | Meaning | Example |
|---|---|---|
| `degraded` | System still responded but with limitations | Regex fallback used, data partially available |
| `degraded:critical` | Missing data required for response | Operational truth unavailable for a query that needs it |

## 11. Runtime Diagnostics API

Internal endpoint for debugging RIC pipeline:

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
        { "name": "understand", "durationMs": 132, "confidence": 0.92, "provider": "DeepSeek V4", "status": "success" },
        { "name": "reason", "durationMs": 95, "confidence": 0.94, "provider": "DeepSeek V4", "status": "success" },
        { "name": "plan", "durationMs": 210, "confidence": 0.88, "provider": "DeepSeek V4", "status": "success" },
        { "name": "ground", "durationMs": 180, "confidence": 0.98, "provider": "PostgreSQL", "status": "success" },
        { "name": "verify", "durationMs": 12, "confidence": 0.95, "provider": "VerificationEngine", "status": "success" },
        { "name": "assemble", "durationMs": 5, "confidence": 1.0, "provider": "ContextBuilder", "status": "success" }
      ],
      "totalDurationMs": 634
    },
    "confidence": {
      "overall": 0.91,
      "provenance": { "intent": 0.96, "entity": 0.93, "grounding": 0.98, "verification": "verified", "planning": 0.88 }
    },
    "degraded": false
  },
  "budget": {
    "limits": { "understanding": 2000, "reasoning": 2000, "planning": 3000, "grounding": 2000, "verification": 500, "assembly": 300, "total": 8000 },
    "exceeded": false
  },
  "providers": {
    "reasoning": { "provider": "DeepSeek V4", "status": "ok", "latencyMs": 45 },
    "grounding": {
      "operational": { "status": "ok" },
      "memory": { "status": "ok" },
      "knowledge": { "status": "ok" },
      "metadata": { "status": "ok" },
      "repository": { "status": "degraded", "error": "File not found: src/unknown.ts" }
    }
  },
  "capabilities": {
    "supportedDomains": ["sales", "inventory", "finance", "hr", "marketing", "operations", "engineering", "executive"],
    "supportedTools": 24,
    "registeredExecutives": ["CEO", "CTO", "CFO", "COO", "CMO", "CHRO", "CAIO"],
    "activeReasoningProvider": "DeepSeek V4"
  }
}
```

## 12. Architectural Summary

```
User
  │
  ▼
RIC Pipeline
  │
  ├── Understanding + Reasoning (LLM)
  ├── Planning (LLM)
  ├── Grounding (Deterministic Providers)
  ├── Verification (Deterministic Rules)
  └── Assembly (Immutable Freeze)
       │
       ▼
  RuntimeContract  ─── frozen, versioned, traced, evidenced
       │
       ▼
  Executive Runtime  ─── reads only, never mutates
       │
       ├── CEO    ← only personality differs
       ├── CTO    ← only personality differs
       ├── CFO    ← only personality differs
       ├── COO    ← only personality differs
       ├── CMO    ← only personality differs
       ├── CHRO   ← only personality differs
       └── CAIO   ← only personality differs
```

## 13. Design Commitment

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

All expansion is achieved through plugins, providers, and configuration — never by modifying the RIC core.
