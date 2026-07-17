# T12.0 — Runtime Gateway Discovery

## 1. Canonical Runtime Entry Point

### Current State: NO SINGLE GATEWAY EXISTS

There are exactly **three distinct entry points** into the AI Executive Runtime system, plus **two indirect dispatch mechanisms**. None of them pass through the Runtime Intelligence Core (RIC).

### Entry Point A: HTTP REST — `/api/ai/chat` (PRIMARY)

| Property | Value |
|----------|-------|
| File | `src/routes/ai.ts:19` |
| Method | POST |
| Streaming | SSE (Server-Sent Events) |
| Auth | `requireRole('owner')` |
| Target Selection | Resolved from `@mention` in user message (e.g., `@CTO`) |

**Execution Trace:**
```
routes/ai.ts:116/155/165
  → applicationRuntime.executeMessage({ message, userId, mode, branchId, onProgress, onTool, onState, onExecutionEvent })
    → application-runtime-adapter.ts:182
      → ceoRuntime.execute({ message, userId, ... })   // or ctoProgram, cooRuntime, etc.
        → callDeepSeek() or callDeepSeekWithTools()
          → http POST to DeepSeek API
```

### Entry Point B: EIOS Pipeline Stage — `executive_runtime`

| Property | Value |
|----------|-------|
| File | `src/eios-runtime/stages/index.ts:157` |
| Stage ID | `executive_runtime` |
| Dependencies | `[brief_generator]` |
| Trigger | Via `PipelineEngine.execute(profileId, ctx)` |
| Orchestrator | `EIOSOrchestrator` → `PipelineController` → `PipelineEngine` |

**Execution Trace:**
```
TriggerEngine.fire(triggerId)
  → PipelineResolver.resolve(intent, ctx) → profileId
    → PipelineEngine.execute(profileId, ctx)
      → [11 sequential stages]
        → stage: "brief_generator"
          → BriefGenerator.generate(situations, strategies, plans, knowledge)
          → resolveExecutiveRole(profileId) → "COO" | "CEO" | etc.
        → stage: "executive_runtime"
          → ExecutiveDispatchRegistry.dispatch(role, brief, {})
            → handler.decide(brief, {})   // {} = empty context
              → CEO.decide() / CTO.decide() / etc.
```

### Entry Point C: Executive Collaboration

| Property | Value |
|----------|-------|
| File | `src/organization/executive-collaboration.ts:166` |
| Trigger | Mission execution via `executiveMission()` |
| Scope | Multi-executive parallel dispatch |

**Execution Trace:**
```
executiveMission(mission, targets)
  → CollaborationSession created
  → FOR each target executive:
    → ExecutiveDispatchRegistry.dispatch(role, brief, context)
      → handler.decide(brief, {})   // {} = empty context
  → Collect results, sort by confidence
  → CEO synthesis
  → Record to MissionHistory
```

### Entry Point D: Proposal Executor (Automated)

| Property | Value |
|----------|-------|
| File | `src/ai/programs/proposal-executor.ts:56` |
| Trigger | Approved proposal/evolution |
| Target | Always `"CTO"` |

**Execution Trace:**
```
executeApprovedProposal()
  → applicationRuntime.executeMessage({ target: "CTO", ... })
    → ctoProgram.execute({ message, userId, ... })
```

### Entry Point E: Mission Background Engine (Scheduled)

| Property | Value |
|----------|-------|
| File | `src/ai/runtime/mission-background-engine.ts:137/204/245` |
| Trigger | Periodic mission progress check |
| Targets | CTO (analysis), CEO (review), CEO (summary) |

**Execution Trace:**
```
missionEngine.executeMission()
  → dailyAnalysis() → applicationRuntime.executeMessage({ target: "CTO" })
  → ceoReview()    → applicationRuntime.executeMessage({ target: "CEO" })
  → ceoSummary()   → applicationRuntime.executeMessage({ target: "CEO" })
```

## 2. All Adapter Files Identified

| # | File | Type | Active? | Connects |
|---|------|------|---------|----------|
| 1 | `ai/llm/llm-adapter.ts` | LLM Adapter | YES (14 imports) | Code → DeepSeek API |
| 2 | `ai/tools/tool-adapter.ts` | Tool Adapter | YES (7 imports) | AI → Filesystem/GitHub/SSH/DB |
| 3 | `ai/runtime/application-runtime-adapter.ts` | App → Executive Bridge | YES (3 imports) | Routes → Executive `.execute()` |
| 4 | `ai/runtime/llm-gateway.ts` | LLM Gateway | YES | Registry → DeepSeek API |
| 5 | `ai/runtime/tool-executor.ts` | Tool Wrapper | YES | Registry → Tool execution |
| 6 | `learning-integration/adapters/org-learning-adapter.ts` | Learning Adapter | YES | Learning → Org engine |
| 7 | `learning-integration/adapters/kp-learning-adapter.ts` | Learning Adapter | YES | Learning → Knowledge Platform |
| 8 | `learning-integration/adapters/council-learning-adapter.ts` | Learning Adapter | YES | Learning → Council |
| 9 | `runtime-intelligence-core/RICAdapter.ts` | **RIC Adapter** | **NO (DEAD)** | Not connected to any entry point |
| 10 | `runtime-intelligence/RuntimeIntelligenceCompat.ts` | Compat Wrapper | **NO (DEAD)** | No consumers |
| 11 | `eios-runtime/public/ExecutiveDispatchRegistry.ts` | Dispatch Registry | YES | Pipeline/Collaboration → Executive `.decide()` |
| 12 | `runtime-intelligence-core/ExecutiveContextAdapter.ts` | Context Adapter | **NO (DEAD)** | Only called by dead RICAdapter |

## 3. All Registry Files Identified

| # | File | Type | Content |
|---|------|------|---------|
| 1 | `eios-runtime/public/ExecutiveDispatchRegistry.ts` | Executive Handler Registry | 8 registered executives (CEO, CTO, CFO, COO, CMO, CAIO, CHRO, CKO) |
| 2 | `eios-runtime/internal/runtime-metadata/PipelineStageRegistry.ts` | Pipeline Stage Registry | 11 registered stages |
| 3 | `eios-runtime/internal/runtime-metadata/PipelineGraphRegistry.ts` | Pipeline DAG Registry | 9 edges defining stage order |
| 4 | `eios-runtime/internal/runtime-metadata/PipelineProfileRegistry.ts` | Pipeline Profile Registry | Intent-to-profile mappings |
| 5 | `knowledge/CapabilityRegistry.ts` | Executive Capability Registry | 8 roles with capabilities |
| 6 | `runtime-intelligence-core/capability/CapabilityGraph.ts` | RIC Capability Graph | **DEAD** — only used within dead RIC |
| 7 | `ai/runtime/registry.ts` | AI Runtime Component Registry | Dynamic component registration |
| 8 | `organization/executive-board.ts` | Executive Board Registry | Role → OrganizationEngine mapping |

## 4. Critical Discovery Summary

| Component | Status |
|-----------|--------|
| **Single Runtime Gateway** | ❌ NONE — 5 distinct entry points exist |
| **RIC used in production** | ❌ NEVER — 0 files outside core import it |
| **Executive invoked via RIC** | ❌ NEVER — all executive calls bypass RIC |
| **RuntimeContext reaches Executive** | ❌ NEVER — executives receive UserMessage or ExecutiveBrief |
| **Awareness reaches Executive** | ❌ NEVER — `{}` empty context passed to `.decide()` |
| **ExecutiveContextAdapter wired** | ❌ NO — dead code within dead RIC |
| **PastPlanMemory in production** | ❌ NO — dead code within dead RIC |
| **CircuitBreaker in production** | ❌ NO — dead code within dead RIC |
| **MetricsStore in production** | ❌ NO — dead code within dead RIC |
| **ReflectionEngine in production** | ❌ NO — dead code within dead RIC |
