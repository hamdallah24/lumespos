# T12.0 — Dependency Graph

## 1. Current Production Architecture (AS-IS)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                                 │
│                    POST /api/ai/chat                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  routes/ai.ts                                                        │
│  • Router: POST /chat → SSE streaming                               │
│  • Resolves target executive from @mention                          │
│  • Calls applicationRuntime.executeMessage()                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  application-runtime-adapter.ts                                      │
│  • Local registry Map<string, (params) => Promise<RawExecResult>>    │
│  • 8 registered wrappers (CEO, CTO, COO, CFO, CMO, CAIO, CHRO, CKO) │
│  • Each wrapper calls executive.execute() with raw UserMessage      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  CEO.execute(ctx)        │  │  CTO.execute(task)        │
│  CFO.execute(task)       │  │  COO.execute(task)        │
│  CMO.execute(task)       │  │  CAIO.execute(task)       │
│  CHRO.execute(task)      │  │  CKO.execute(task)        │
│                          │  │  (8 individual runtimes)  │
│  Each executive:         │  │                           │
│  1. Builds own context   │  │  • Build own prompt       │
│  2. Calls callDeepSeek() │  │  • Call LLM directly      │
│  3. Returns text result  │  │  • No shared context      │
└──────────────────────────┘  └──────────────────────────┘
          │                            │
          └──────────────┬─────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  llm-adapter.ts / tool-adapter.ts                                    │
│  • callDeepSeek() → DeepSeek HTTP API                                │
│  • executeToolCall() → Filesystem/GitHub/SSH/DB                      │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Secondary Production Architecture — EIOS Pipeline

```
┌──────────────────────────────────────────────────────────────────────┐
│  TriggerEngine.fire(triggerId)                                      │
│  PipelineResolver.resolve(intent) → PipelineProfileRegistry         │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PipelineEngine.execute(profileId, ctx)                              │
│  Sequential execution of 11 stages in topological order             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ event_validation│  │ business_intell │  │ decision_context │
│ (STUB)          │  │ (STUB)          │  │ ContextProv.gen  │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ decision_engine │  │ north_star      │  │ strategy_simul  │
│ (STUB)          │  │ NorthStarProv.  │  │ (STUB)          │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ strategy_engine │  │ execution_plnr  │  │ workflow_runtime│
│ (STUB)          │  │ (STUB)          │  │ WorkflowRuntime │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                   ▼
┌──────────────────────────────────────────────────┐
│ brief_generator                                   │
│ • Resolves executive role from profileId          │
│ • Generates ExecutiveBrief                        │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│ executive_runtime                                 │
│ • ExecutiveDispatchRegistry.dispatch(role, brief, │
│   {} )                                           │
│ • Returns ExecutiveDecision                       │
└──────────────────────────────────────────────────┘
```

## 3. Dead Architecture — RIC Pipeline (NEVER EXECUTED)

```
┌──────────────────────────────────────────────────────────────────────┐
│  RICAdapter.assemble(input)                                         │
│  • Not called by any code path                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  RuntimeIntelligenceCore.assemble(reasonerInput)                     │
│  • Never called from production flow                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Understanding   │  │ AwarenessEngine │  │ RetrievalPlan   │
│ Engine          │  │ 7 sources       │  │ + PastPlanMemory │
│ LLM+fallback    │  │ collectBrief()  │  │ LLM+few-shot    │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ GroundingLayer  │  │ CircuitBreaker  │  │ Verification    │
│ 5 providers     │  │ CLOSED/OPEN     │  │ Engine          │
│ CapabilityRoute │  │ backoff         │  │ 6 rules         │
└─────────────────┘  └─────────────────┘  └────────┬────────┘
                                                   ▼
┌──────────────────────────────────────────────────┐
│ ConfidenceAggregator + ContextBuilder             │
│ • OverallConfidence                               │
│ • RuntimeContext with awareness + refinement      │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│ REPLAN LOOP (if confidence < 0.75, max 2x)       │
│ • replan() → re-ground → re-verify               │
│ • RefinementEntry tracking                       │
│ • PastPlanMemory.store (if >= 0.8)               │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│ ExecutiveContextAdapter.mapToExecutive()          │
│ • RuntimeContext → ExecutiveContext               │
│ • Includes awareness + refinement data            │
└──────────────────────┬───────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────┐
│ MetricsStore.recordRequest()                      │
│ ReflectionEngine.reflect()                        │
│ • Cross-request learning                          │
└──────────────────────────────────────────────────┘
```

## 4. Gap Analysis — Connection Points

| ID | Connection | Current | Target | Gap |
|----|-----------|---------|--------|-----|
| G1 | HTTP Route → RIC | Route → `applicationRuntime.executeMessage()` | Route → `RICGateway.assemble()` | RIC not in call path |
| G2 | RIC → Executive | No connection | `RICAdapter.mapToExecutive()` → `Executive.decide(executiveContext)` | RIC output never consumed |
| G3 | EIOS Pipeline → RIC | Pipeline → `ExecutiveDispatchRegistry.dispatch()` | Pipeline → `RICGateway.assemble()` then → `Executive.decide()` | RIC not in pipeline |
| G4 | Awareness → Executive | `{}` empty context | `AwarenessBrief` → `ExecutiveContext.awareness` | No awareness data flows |
| G5 | Executive Input Type | `UserMessage` or `ExecutiveBrief` | `RuntimeContext` (via `ExecutiveContext`) | Interface mismatch |
| G6 | Grounding in Production | Each executive does own retrieval in LLM prompt | RIC GroundingLayer does structured retrieval | No centralized grounding |
| G7 | Verification in Production | None | RIC VerificationEngine checks facts | No verification at all |
| G8 | Cross-request Learning | None | RIC MetricsStore + ReflectionEngine | No learning loop |

## 5. Import Boundary Map

```
src/
  routes/ai.ts                      ───→ application-runtime-adapter.ts
                                            │
  ai/llm/llm-adapter.ts             ◄──────┘  (called by ALL 8 executives)
  ai/tools/tool-adapter.ts          ◄──────┘  (called by CTO, CHRO, CAIO)
                                            │
  eios-runtime/public/              ───→ ExecutiveDispatchRegistry.dispatch()
    ExecutiveDispatchRegistry.ts           │
        │                                  │
        ◄──── organization/executive-collaboration.ts
        ◄──── eios-runtime/stages/index.ts (executive_runtime stage)
                                            │
  runtime-intelligence-core/         ───→ RICAdapter / RuntimeIntelligenceCore
    (ENTIRE MODULE TREE)                  │
                                          │
  runtime-intelligence/              ───→ RuntimeIntelligenceCompat.ts
    (COMPAT LAYER)                        │
                                          │
  (NO CROSS-BOUNDARY IMPORTS FROM         │
   runtime-intelligence-core/)            ▼
                                     DEAD — NO CONSUMERS
```

## 6. Executive Invocation Summary — ALL Paths

| Path | Executive | Method | Input | RIC? |
|------|-----------|--------|-------|------|
| REST /api/ai/chat | CEO/CTO/COO/CFO/CMO/CAIO/CHRO/CKO | `.execute()` | `{message, userId, ...}` | ❌ |
| EIOS `executive_runtime` stage | Resolved from profile (default COO) | `.decide()` | `ExecutiveBrief` | ❌ |
| Executive Collaboration | All 8 | `.decide()` | `ExecutiveBrief` | ❌ |
| Proposal Executor | CTO | `.execute()` | `{message, userId, ...}` | ❌ |
| Mission Background Engine | CTO, CEO | `.execute()` | `{message, userId, ...}` | ❌ |
