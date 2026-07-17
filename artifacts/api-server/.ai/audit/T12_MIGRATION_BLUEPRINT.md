# T12.0 — Migration Blueprint

## 1. Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                                 │
│                    POST /api/ai/chat                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      RUNTIME GATEWAY                                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  RuntimeGateway.assemble(input)                                │  │
│  │  • THE single entry point                                      │  │
│  │  • Owns RIC + awareness lifecycle                              │  │
│  │  • Replaces application-runtime-adapter.ts entirely             │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│              RUNTIME INTELLIGENCE CORE (KERNEL)                      │
│                                                                      │
│  1. UnifiedAwarenessEngine.collect()                                 │
│     • Business state, digital twin, mission, runtime, health        │
│     • Contradiction detection, signal prioritization                │
│     • Produces: AwarenessBrief                                       │
│                                                                      │
│  2. UnderstandingEngine.analyze(message, awarenessBrief)             │
│     • LLM determines: intent, domain, entities, risk, confidence    │
│     • Fallback: UnderstandingFallback (regex)                       │
│     • Produces: UnderstandingResult                                  │
│                                                                      │
│  3. RetrievalPlanner.plan(understanding, pastPlans, tools)          │
│     • PastPlanMemory.findSimilar() → few-shot examples              │
│     • LLM generates capability-based tasks                          │
│     • Produces: RetrievalPlan (with requiredCapability)             │
│                                                                      │
│  4. GroundingLayer.execute(plan)                                     │
│     • CircuitBreaker → health check → execute with backoff          │
│     • CapabilityRouter resolves provider per task                   │
│     • 5 providers: operational, memory, knowledge, metadata, repo   │
│     • Produces: GroundingResult                                      │
│                                                                      │
│  5. VerificationEngine.verify(understanding, plan, grounding)       │
│     • 6 rules: domain, entity, file, tool, memory, operational      │
│     • Produces: VerificationResult                                   │
│                                                                      │
│  6. REPLAN LOOP (if overall < 0.75, max 2 iterations)              │
│     • replan() → re-ground → re-verify                              │
│     • Track RefinementEntry                                          │
│                                                                      │
│  7. ConfidenceAggregator.aggregate(...)                              │
│     • overall = reasoning * grounding * verification                │
│     • Produces: OverallConfidence                                    │
│                                                                      │
│  8. RuntimeContextBuilder.build(ALL STAGE OUTPUTS)                  │
│     • Single immutable contract                                     │
│     • Includes: awareness, refinementHistory, evidence, trace       │
│     • Produces: RuntimeContext (immutable via freezeContract)       │
│                                                                      │
│  9. ExecutiveContextAdapter.mapToExecutive(context)                 │
│     • Transforms RuntimeContext → ExecutiveContext                  │
│     • Includes: awareness, refinement, all grounding data           │
│                                                                      │
│  10. MetricsStore.recordRequest() + ReflectionEngine.reflect()      │
│      • Cross-request learning                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  RuntimeContext   │
                    │  (Immutable)     │
                    └────────┬─────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     EXECUTIVE DECISION LAYER                         │
│                                                                      │
│  Interface:                                                          │
│    execute(runtimeContext: RuntimeContext): Promise<ExecutiveResponse>│
│    decide(executiveContext: ExecutiveContext): Promise<Decision>     │
│                                                                      │
│  Executive NO LONGER:                                                │
│    • Understands user message                                        │
│    • Determines intent                                               │
│    • Selects tools                                                   │
│    • Selects repository                                              │
│    • Selects memory                                                  │
│    • Does retrieval                                                  │
│                                                                      │
│  Executive ONLY:                                                     │
│    • Reads RuntimeContext (already populated with all data)          │
│    • Makes domain-specific decision                                  │
│    • Returns ExecutiveResponse { content, confidence, disclaimer }  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     TOOL EXECUTION                                   │
│  • Tools are executed AFTER executive decision                      │
│  • Results are grounded back into context                           │
│  • VerificationEngine re-verifies tool results                      │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     VERIFICATION + REFLECTION                        │
│  • Final verification pass                                          │
│  • ReflectionEngine.extract() → patterns                            │
│  • MetricsStore.record() → learning                                 │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     RESPONSE                                        │
│  • Unified response with confidence score                           │
│  • Includes: content, confidence, evidence, awareness               │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Migration Phases

### Phase 1 — Runtime Gateway (Week 1-2)

**Objective:** Create the single gateway that replaces `application-runtime-adapter.ts`

**Actions:**
1. Create `RuntimeGateway` class that wraps `RICAdapter` + executive dispatch
2. `RuntimeGateway.assemble(input)` calls RIC → returns RuntimeContext → dispatches to correct executive
3. Routes call `RuntimeGateway.assemble()` instead of `applicationRuntime.executeMessage()`
4. No changes to executive implementations yet

**Success Criteria:**
- Only one adapter call in routes/ai.ts
- `applicationRuntime.executeMessage()` no longer called
- Executive still receives current input format + new RuntimeContext as additional parameter

### Phase 2 — Executive Context Migration (Week 3-4)

**Objective:** Executives accept RuntimeContext as primary input

**Actions:**
1. Add `runtimeContext?: RuntimeContext` parameter to all `execute()` signatures
2. Executives read from RuntimeContext instead of building own context
3. Gradually migrate each executive: CEO → CTO → CFO → COO → CMO → CAIO → CHRO → CKO
4. Old parameters deprecated but still supported during transition

**Success Criteria:**
- All 8 executives can optionally receive RuntimeContext
- At least 2 executives fully migrated (no longer build own context)

### Phase 3 — EIOS Pipeline Integration (Week 5-6)

**Objective:** RIC becomes a stage in the EIOS pipeline

**Actions:**
1. Add `ric_assemble` stage to EIOS pipeline
2. Stage calls `RuntimeGateway.assemble()`
3. Produces RuntimeContext in pipeline context
4. `executive_runtime` stage reads RuntimeContext instead of generating new brief
5. Pipeline gets full awareness + verification + refinement

**Success Criteria:**
- EIOS pipeline produces RuntimeContext
- `executive_runtime` stage receives RuntimeContext
- Pipeline no longer produces `ExecutiveBrief` (or produces it FROM RuntimeContext)

### Phase 4 — Remove Legacy Code (Week 7-8)

**Objective:** Clean up dead code paths

**Actions:**
1. Remove `application-runtime-adapter.ts`
2. Remove `ExecutiveContextAdapter.ts` (logic merged into RuntimeGateway)
3. Remove `runtime-intelligence/RuntimeIntelligenceCompat.ts`
4. Remove RIC internal dead code (empty directories)
5. Remove SSE streaming from routes/ai.ts (or adapt to new flow)

**Success Criteria:**
- No dual execution paths
- No dead adapter files
- No dead RIC code
- Clean dependency graph

## 3. RuntimeGateway Interface (Target)

```typescript
interface RuntimeGateway {
  assemble(input: GatewayInput): Promise<GatewayResult>;
}

interface GatewayInput {
  message: string;
  userId: string | number;
  branchId?: string;
  tenantId?: string;
  targetExecutive?: ExecutiveRole;     // e.g., "CEO" | "CTO"
  mode?: 'fast' | 'balanced' | 'deep';
  onProgress?: (event: ProgressEvent) => void;
}

interface GatewayResult {
  runtimeContext: RuntimeContext;       // Full immutable context
  executiveResponse: ExecutiveResponse; // Executive decision
  confidence: number;
  executionTimeMs: number;
  stages: string[];                     // Pipeline stages executed
}
```

## 4. Key Architectural Decisions

| Decision | Current | Target | Rationale |
|----------|---------|--------|-----------|
| Entry Point | 5 paths | 1 RuntimeGateway | Eliminate dead architecture |
| Executive Input | UserMessage / ExecutiveBrief | RuntimeContext | Single contract, no duplicate reasoning |
| Understanding | Per-executive (implicit) | UnderstandingEngine (explicit) | Once, not 8x |
| Planning | Per-executive (implicit) | RetrievalPlanner (explicit) | Capability-based, not hardcoded |
| Grounding | Per-executive (inline) | GroundingLayer (centralized) | Single source of truth |
| Verification | NONE | VerificationEngine | Quality gate before executive |
| Awareness | NONE | UnifiedAwarenessEngine | Context for every decision |
| Learning | NONE | MetricsStore + Reflection | Continuous improvement |
| SSE Streaming | In routes/ai.ts | In RuntimeGateway | Separation of concerns |
