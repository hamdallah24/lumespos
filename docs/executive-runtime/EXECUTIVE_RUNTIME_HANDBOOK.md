# Executive Runtime Handbook

**Version:** 1.0.0  
**Status:** Architecture v4.1 — Runtime Core Frozen  
**Last Updated:** 2026-07-13

---

## 1. Executive Runtime Overview

The Executive Runtime is the operational layer above the frozen EIOS v4.1 Runtime Core. It hosts 7 AI Executives (CEO, CTO, CFO, CMO, CAIO, CKO, COO) that perform business reasoning, technical analysis, financial oversight, marketing strategy, AI system health, knowledge curation, and operational execution.

Executives are **pure consumers** of the Runtime Core. They never access internal runtime implementation. All interactions flow through three public channels:

| Channel | Purpose |
|---------|---------|
| `ExecutiveDispatchRegistry` | Executive-to-executive dispatch (`decide()` → `ExecutiveDecision`) |
| `RuntimeFacade` | Runtime services (execute, subscribe, metrics, health, trace, shutdown) |
| `PipelineContracts` | Type contracts (`ExecutiveBrief`, `ExecutiveDecision`, `ExecutiveHandler`, `ExecutionContract`) |

---

## 2. Runtime Position

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│  routes, services, missions, business logic              │
├─────────────────────────────────────────────────────────┤
│              EXECUTIVE RUNTIME (EROS)                    │
│  CEO │ CTO │ CFO │ CMO │ CAIO │ CKO │ COO               │
│  Only: ExecutiveDispatchRegistry, RuntimeFacade,         │
│        PipelineContracts                                 │
├─────────────────────────────────────────────────────────┤
│                 EIOS RUNTIME CORE (FROZEN)               │
│  PipelineEngine, RuntimeGovernance, MetricsEngine,       │
│  TraceManager, ObserverEngine, TriggerEngine, etc.       │
├─────────────────────────────────────────────────────────┤
│                    FOUNDATION LAYER                      │
│  Kernel, Identity, Directives, Event Schema              │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Layer Architecture

### Layer 3 — Application Layer (THAWED)
Routes, HTTP handlers, services, mission engine, background jobs. Accesses EIOS only through `RuntimeFacade`, `ExecutiveDispatchRegistry`, `PipelineResolver`.

### Layer 2 — Executive Runtime (THAWED) ← YOU ARE HERE
7 executives with `execute()` and `decide()` methods. Each executive is a **Program** with a defined pipeline, capabilities, dependencies, and health check. Cross-executive calls go through `ExecutiveDispatchRegistry.dispatch()`.

### Layer 1 — Runtime Core (FROZEN)
12 components: PipelineEngine, ExecutiveDispatchRegistry, RuntimeFacade, RegistryLifecycle, RuntimeGovernance, MetricsEngine, TraceManager, PipelineScheduler, RuntimeHealth, ObserverEngine, TriggerEngine, RuntimeState. No new features. No API changes.

### Layer 0 — Foundation (THAWED)
Kernel, identity providers, directive providers, event schema.

---

## 4. Executive Lifecycle

```
User Message
    │
    ▼
[1] Route → Adapter → ExecutiveDispatchRegistry
    │
    ▼
[2] Executive.execute() — Business Logic Pipeline
    │  Identity → Directive → Auth → Scope → Semantic → Spec
    │  → Verify → Plan → Context → Knowledge → Prompt → LLM → Result
    │
    ▼
[3] ExecutiveDecision — decide() called by DispatchRegistry
    │  action, reasoning, confidence, delegateTo
    │
    ▼
[4] Response → User
```

Each executive runs an internal pipeline of stages. Stages are sequential, each producing context for the next. The pipeline is defined per executive in its config (e.g., `CEO_CONFIG`, `CTO_CONFIG`).

---

## 5. Dispatch Flow

```
User Request
    │
    ▼
Route Handler
    │
    ▼
ApplicationRuntimeAdapter → identifies intent → selects executive
    │
    ▼
ExecutiveRuntime.execute(task) → run pipeline → return result
    │
    ▼
(Optional) ExecutiveDispatchRegistry.dispatch("CEO", brief, ctx)
    │  → CEO.decide(brief) → ExecutiveDecision
    │  → decision.delegateTo → another executive
    │
    ▼
Response
```

The `ExecutiveDispatchRegistry` is the **sole dispatch mechanism** for cross-executive communication. No executive calls another executive's `execute()` directly.

---

## 6. Decision Flow

```
ExecutiveBrief received by decide()
    │
    ▼
[1] Analyze brief sections and action items
    │
    ▼
[2] Determine action type
    │  - review_approvals (CEO)
    │  - technical_review (CTO)
    │  - financial_review (CFO)
    │  - market_analysis (CMO)
    │  - system_review (CAIO)
    │  - curate_knowledge (CKO)
    │  - approve/monitor (COO)
    │
    ▼
[3] Calculate confidence score (75-95)
    │
    ▼
[4] Optionally delegate to another executive
    │
    ▼
[5] Return ExecutiveDecision
```

---

## 7. Collaboration Flow

```
Executive A identifies task outside scope
    │
    ▼
ExecutiveDispatchRegistry.dispatch("ExecutiveB", brief, ctx)
    │
    ▼
ExecutiveB.decide(brief) → ExecutiveDecision
    │
    ▼
Decision returned to Executive A
    │
    ▼
Executive A incorporates decision into response
```

No direct imports between executives. No shared internal state. All collaboration is mediated by `ExecutiveDispatchRegistry`.

---

## 8. Memory Flow

```
Executive.execute() completes
    │
    ▼
KnowledgeProvider.ingestEpisode({
    eventType, eventId, context, outcome,
    domain, topic, summary, tags
})
    │
    ▼
Knowledge Platform stores episode
    │
    ▼
Future sessions can query: KnowledgeProvider.searchAll()
```

Each executive records its decisions as knowledge episodes. This enables organizational learning and historical context.

---

## 9. Audit Flow

```
Every executive action goes through:
    │
    ▼
auditEngine.log({
    actor, action, resource, result,
    reason, metadata
})
    │
    ▼
Governance Core stores audit entry
    │
    ▼
Runtime: PipelineAudit.recordAudit() for pipeline-level audit
```

There are two audit mechanisms:
- **PipelineAudit** — EIOS Runtime pipeline-level audit trail
- **Governance auditEngine** — Executive-level business audit trail

---

## 10. Capability Flow

```
Executive declares capabilities in its export object:
    │
    ▼
CEO: mission-planning, delegation, proposal-review, ...
CTO: code-analysis, implementation, architecture-review, ...
CFO: financial-analysis, budget-review, cost-optimization, ...
CMO: market-analysis, campaign-strategy, customer-insight, ...
CAIO: ai-health-monitoring, system-architecture, knowledge-management, ...
CKO: knowledge-curation, council-secretary, best-practices, ...
COO: inventory-management, sales-tracking, product-management, ...
    │
    ▼
GovernanceProvider.canExecute(role, action, domain) → allow/reason
    │
    ▼
If denied → action blocked, audit logged, user notified
```

Capabilities are checked at runtime by `GovernanceProvider`. Each executive has a fixed set of capabilities defined in its program file.

---

## 11. Runtime Boundaries

| Boundary | Includes | Status |
|----------|----------|--------|
| Foundation | Kernel, Identity, Directives | THAWED |
| Runtime Core | PipelineEngine, RuntimeFacade, DispatchRegistry, etc. | FROZEN |
| Executive Runtime | 7 Executive Programs + core utilities | THAWED |
| Application | Routes, Services, Missions, AI Execution | THAWED |
| Governance | PolicyEngine, ComplianceChecker, Audit | THAWED |
| Knowledge | KnowledgePlatform, Memory, Episodes | THAWED |

---

## 12. Dependency Rules

| Component | May Import | Must NOT Import |
|-----------|-----------|----------------|
| Executive Program | `eios-runtime/contracts`, `eios-runtime/public`, AI runtime, governance, knowledge, programs | `eios-runtime/internal/*` |
| Executive Core | `eios-runtime/contracts` | `eios-runtime/internal/*` |
| Application | `RuntimeFacade`, `ExecutiveDispatchRegistry`, `PipelineContracts` | `eios-runtime/internal/*` |
| Route | Only adapter, never executive directly | Any EIOS internal |

---

## 13. Public APIs

### ExecutiveDispatchRegistry (4 methods)
| Method | Signature |
|--------|-----------|
| `register` | `(handler: ExecutiveHandler): void` |
| `get` | `(role: string): ExecutiveHandler \| undefined` |
| `getAll` | `(): ExecutiveHandler[]` |
| `dispatch` | `(role, brief, context?) => Promise<ExecutiveDecision \| null>` |

### ExecutiveHandler Interface
```typescript
interface ExecutiveHandler {
  role: string;
  decide(brief: ExecutiveBrief, context?: Record<string, unknown>): Promise<ExecutiveDecision>;
}
```

### ExecutiveDecision
```typescript
interface ExecutiveDecision {
  role: string;
  action: string;
  reasoning: string;
  confidence: number;
  delegateTo?: string;
  payload?: Record<string, unknown>;
}
```

### RuntimeFacade (13 methods)
`execute`, `subscribe`, `capability`, `emit`, `context`, `schedule`, `unschedule`, `registry`, `health`, `metrics`, `trace`, `snapshot`, `shutdown`

---

## 14. Forbidden Dependencies

- ❌ Direct `PipelineEngine` import from any executive
- ❌ Direct import of `eios-runtime/internal/*`
- ❌ Cross-executive `execute()` calls (use `dispatch()`)
- ❌ Bypassing `GovernanceProvider.canExecute()` for sensitive actions
- ❌ Direct database access from executives (use KnowledgeProvider/PlanProvider)

---

## 15. Runtime Constraints

- Executive Runtime starts AFTER Runtime Core is fully bootstrapped
- All 7 executives must be registered before dispatch is available
- Each executive `decide()` must return within time budget
- Decisions must include `confidence` score (0-100)
- Delegate chains must not create cycles (A→B→A)
- Maximum one delegation level per decision

---

## 16. Future Evolution

- EPIC Q — Business Scheduler Evolution
- EPIC R — AI Execution Optimization
- EPIC S — Multi-Agent Collaboration
- EPIC T — Distributed Runtime
- EPIC U — Horizontal Scaling
- EPIC V — Cloud Native Runtime
- EPIC W — Runtime SDK
- EPIC X — Developer Tools

All evolution must respect the frozen Runtime Core boundary. No changes to `contracts/`, `RuntimeFacade`, or `ExecutiveDispatchRegistry`.
