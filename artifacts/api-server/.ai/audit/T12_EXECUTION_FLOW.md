# T12.0 — Execution Flow Analysis

## 1. Primary Production Flow (REST Chat)

### Full Sequence Diagram

```
User
  │
  │ POST /api/ai/chat { message: "...", mode: "bisnis" | "<exec>", onProgress, onTool }
  ▼
routes/ai.ts:19
  │
  │ requireRole('owner')
  │ Extract @mentions → resolveTargetExecutives()
  │
  ├── [if mode === "bisnis"] → routes/ai-business.ts business handler
  │     (separate business-only flow, bypasses executives entirely)
  │
  └── [else]
        │
        ▼
      applicationRuntime.executeMessage({
        message: req.body.message,
        userId: req.user.id,
        mode: req.body.mode,
        branchId: req.user.branchId,
        onProgress: (msg) => writeSSE(res, { type: "thinking", message: msg }),
        onTool: (event) => writeSSE(res, { type: "tool", ...event }),
        onState: (state) => writeSSE(res, { type: "state", state }),
        onExecutionEvent: (snapshot) => writeSSE(res, { type: "execution", ...snapshot }),
      })
        │
        ▼
      application-runtime-adapter.ts:182
        │
        │ ExecuteMessageParams:
        │   message: string
        │   userId: number
        │   mode?: string
        │   branchId?: number
        │   callbacks: onProgress, onTool, onState, onExecutionEvent
        │
        ├── Resolve target from mode or @mention
        │     "CEO" | "CTO" | "COO" | "CFO" | "CMO" | "CAIO" | "CHRO" | "CKO"
        │
        └── Lookup in local registry → call wrapped function
              │
              ▼
            CEO/CTO/COO/etc. execute({
              message,
              userId,
              onProgress, onTool, onState, onExecutionEvent
            })
              │
              ▼
            CEOProgram.ts:77
              │
              │ 1. Build CEOContext:
              │    { message, conversationHistory, userId, userRole,
              │      branchId, mode, tools, repoContext, memoryContext,
              │      operationalContext, onProgress, onTool, onState,
              │      onExecutionEvent }
              │
              │ 2. Build system prompt:
              │    CEO_SYSTEM_PROMPT + userMessage
              │    (includes inline tools list, repo context, memory)
              │
              │ 3. callDeepSeek(systemPrompt, messages, tools)
              │     → http POST to DeepSeek /chat/completions
              │     → Stream response via onProgress
              │     → Execute tool calls via executeToolCall()
              │     → Return CEOResult { content, confidence, ... }
              │
              ▼
            Return ExecuteMessageResult:
              { success, text, runtime, pipeline, toolsUsed,
                filesRead, metrics }
              │
              ▼
            routes/ai.ts
              │
              └── Write SSE: { type: "result", data: result }
                    │
                    ▼
                  User receives response
```

### Key Observation
Every executive (CEO, CTO, CFO, COO, CMO, CAIO, CHRO, CKO) independently:
1. **Builds its own context** — no shared context object
2. **Builds its own prompt** — each has a unique system prompt file
3. **Selects its own tools** — each executive knows which tools it can use
4. **Selects its own memory** — some query memory, some don't
5. **Selects its own repository files** — each has its own repo context builder
6. **Calls the LLM directly** — no middleware, no verification, no grounding layer
7. **Returns raw text** — no structured contract, no confidence scoring

This means **7 independent reasoning pipelines** exist, each duplicating the same work:
- Intent understanding (implicit, in prompt)
- Planning (implicit, in prompt)
- Tool selection (hardcoded per executive)
- Grounding (inline, unstructured)
- Verification (NONE — CTO has a commented-out CEO approval)
- Context building (each executive has its own context type)

## 2. EIOS Pipeline Flow

```
TriggerEngine.fire(triggerId)
  │
  ├── PipelineResolver.resolve(intent, ctx) → profileId
  │     PipelineProfileRegistry.getByIntent(intent) → profile
  │
  └── PipelineEngine.execute(profileId, ctx)
        │
        ├── PipelineGraphRegistry.getExecutionOrderForIds(profile.intents)
        │     → Topological sort of stages
        │
        ├── FOR each stage IN order:
        │     │
        │     ├── CircuitBreaker.call(`stage:${stageName}`, () =>
        │     │     BulkheadManager.execute("PipelineEngine", () =>
        │     │       withTimeout(stage.execute(ctx), stage.timeout)
        │     │     )
        │     │   )
        │     │
        │     ├── ctx.apply(delta)  // apply stage patches
        │     │
        │     ├── PipelineAudit.record()
        │     │
        │     └── ObserverEngine.dispatch(stage.completed/event)
        │
        └── Return ExecutionResult { success, durationMs, stages, failures }
```

## 3. Executive Collaboration Flow

```
executiveMission(mission, targets)
  │
  ├── Create CollaborationSession
  │
  ├── FOR each target executive:
  │     │
  │     ├── Create ExecutiveTask from mission objective
  │     │
  │     └── ExecutiveDispatchRegistry.dispatch(role, brief, {})
  │           │
  │           └── handler.decide(brief, {})
  │
  ├── Collect all decisions
  ├── Sort by confidence (descending)
  │
  ├── learningEngine.cycle()
  ├── organizationIntelligence.onLearningComplete()
  ├── governanceEngine.health()
  ├── ArtifactBuilder.build()
  │
  └── CEO synthesis → return synthesisContext
```

## 4. Dead Flow — RIC Pipeline (Mapped but NEVER Executed)

```
RICAdapter.assemble(input)                 ← NO CALLER
  │
  └── RuntimeIntelligenceCore.assemble(input)
        │
        ├── 1. UnderstandingEngine.analyze(input)
        │       → LLM determines: intent, domain, entities, confidence
        │       → Returns: UnderstandingResult
        │
        ├── 2. RetrievalPlanner.plan(understanding, metadata, tools)
        │       → PastPlanMemory.findSimilar() for few-shot
        │       → LLM generates: tasks, capabilities, dependencies
        │       → Returns: RetrievalPlan
        │
        ├── 3. GroundingLayer.execute(plan)
        │       → Resolve dependency levels
        │       → Per task: CircuitBreaker → health → execute with backoff
        │       → 5 providers: operational, memory, knowledge, metadata, repository
        │       → Returns: GroundingResult
        │
        ├── 4. VerificationEngine.verify(understanding, plan, grounding)
        │       → 6 rules: domain, entity, file, tool, memory, operational
        │       → Returns: VerificationResult
        │
        ├── 5. ConfidenceAggregator.aggregate(...)
        │       → overall = reasoning * groundingScore * verification
        │       → Returns: OverallConfidence
        │
        ├── 6. REPLAN LOOP (if confidence < 0.75)
        │       → RetrievalPlanner.replan() → re-ground → re-verify
        │       → Track RefinementEntry
        │
        ├── 7. RuntimeContextBuilder.build(...)
        │       → awareness from UnifiedAwarenessEngine
        │       → refinementHistory from replan loop
        │       → Returns: RuntimeContext
        │
        ├── 8. ExecutiveContextAdapter.mapToExecutive(context)
        │       → Extracts: intent, domain, confidence, knowledge,
        │                    memory, operational, repository,
        │                    awareness, refinement
        │       → Returns: ExecutiveContext
        │
        ├── 9. MetricsStore.recordRequest(...)
        │       ReflectionEngine.reflect(...)
        │
        └── 10. freezeContract(context)
                  diagnostics.recordContract(frozen)
                  → Returns frozen RuntimeContext
```

## 5. Parallel Execution Paths — Duplication Analysis

| Function | Production (5 paths) | RIC (1 path) | Duplication |
|----------|---------------------|--------------|-------------|
| Intent Understanding | Each executive prompt implies it | UnderstandingEngine does it explicitly | 8x duplicate implicit understanding |
| Domain Selection | Implicit in which executive is chosen | Explicit domain resolution | None — different approaches |
| Tool Selection | Hardcoded per executive | CapabilityRouter negotiates | 8x hardcoded tool lists |
| Memory Retrieval | Each executive queries independently | GroundingLayer fetches once | 8x duplicate memory queries |
| Repository Retrieval | Each executive scans independently | GroundingLayer fetches once | 8x duplicate file reads |
| LLM Call | Each executive calls LLM directly | Only Understanding + Planning call LLM | 8x LLM calls vs 2-4 |
| Verification | NONE | VerificationEngine + replan loop | Production has zero verification |
| Context Building | Each executive has custom context type | Single RuntimeContext | 7 different context types |
| Confidence Scoring | Per-executive confidence (subjective) | OverallConfidence (structured) | No production confidence |
| Cross-request Learning | NONE | MetricsStore + ReflectionEngine | No learning in production |
