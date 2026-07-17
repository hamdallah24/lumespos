# T12.0 — Breaking Changes Analysis

## 1. Executive Interface Changes

### Current Signatures

```typescript
// CEO
execute(ctx: CEOContext, execContract?: ExecutionContract): Promise<CEOResult>
// CEOContext = { message, conversationHistory, userId, userRole, branchId,
//                mode, tools, repoContext, memoryContext, operationalContext, ... }

// CTO
execute(task: CTOTask, execContract?: ExecutionContract): Promise<CTOResult>
// CTOTask = { message, userId, onProgress, ... }

// CFO, COO, CMO, CAIO, CHRO, CKO
execute(task: ExecutiveTask, execContract?: ExecutionContract): Promise<ExecutiveResult>
// ExecutiveTask = { message, userId, ... }
```

### Target Signatures

```typescript
// ALL executives — unified interface
execute(runtimeContext: RuntimeContext): Promise<ExecutiveResponse>

// Fast decision path (non-LLM)
decide(executiveContext: ExecutiveContext): Promise<ExecutiveDecision>
```

### Breaking Changes

| # | Change | Impact | Severity |
|---|--------|--------|----------|
| B1 | `execute(ctx)` → `execute(runtimeContext)` | ALL 8 executives rewrite their execute method | HIGH |
| B2 | 7 different context types → 1 RuntimeContext | Each executive must learn to read from RuntimeContext | HIGH |
| B3 | Per-executive system prompts → single Understanding prompt | Each executive loses its unique system prompt | HIGH |
| B4 | Per-executive tool selection → CapabilityRouter | Executives no longer control which tools they use | MEDIUM |
| B5 | Per-executive memory queries → GroundingLayer | Executives no longer query memory directly | MEDIUM |
| B6 | Per-executive repo scanning → GroundingLayer | Executives no longer scan repo directly | MEDIUM |
| B7 | No return type contract → ExecutiveResponse | All executives must return structured response | MEDIUM |
| B8 | `decide(brief, {})` → `decide(executiveContext)` | All executives update their decide method | LOW |
| B9 | `CTOResult`, `CEOResult`, `ExecutiveResult` → unified | Return type consolidation | MEDIUM |
| B10 | Callbacks (onProgress, onTool, onState) removed | Streaming must be handled by RuntimeGateway | HIGH |

## 2. Route Layer Changes

| # | Change | Impact | Severity |
|---|--------|--------|----------|
| B11 | `routes/ai.ts` calls `applicationRuntime.executeMessage()` → `RuntimeGateway.assemble()` | Route handler rewrite | MEDIUM |
| B12 | SSE streaming ownership moves from route to RuntimeGateway | SSE pipe management changes | MEDIUM |
| B13 | Target resolution (@mention → executive) moves from route to RuntimeGateway | Route logic simplification | LOW |

## 3. Adapter Changes

| # | Change | Impact | Severity |
|---|--------|--------|----------|
| B14 | `application-runtime-adapter.ts` removed entirely | All callers must use RuntimeGateway | HIGH |
| B15 | `ExecutiveContextAdapter.ts` merged into RuntimeGateway | Remove import from all consumers | LOW |
| B16 | `runtime-intelligence/RuntimeIntelligenceCompat.ts` removed | No backward compat for old imports | LOW |

## 4. EIOS Pipeline Changes

| # | Change | Impact | Severity |
|---|--------|--------|----------|
| B17 | New `ric_assemble` stage added before `executive_runtime` | Pipeline reordering | MEDIUM |
| B18 | `executive_runtime` stage no longer generates `ExecutiveBrief` | Brief generation disabled or moved | MEDIUM |
| B19 | Pipeline context now includes `RuntimeContext` | All downstream stages must handle new context shape | MEDIUM |
| B20 | `ExecutiveDispatchRegistry.dispatch(role, brief, {})` → `dispatch(role, runtimeContext)` | Dispatch mechanism changes | MEDIUM |

## 5. Consumer Changes

| # | Consumer | File | Change Required | Severity |
|---|----------|------|----------------|----------|
| B21 | Mission Background Engine | `ai/runtime/mission-background-engine.ts` | `applicationRuntime.executeMessage()` → `RuntimeGateway.assemble()` | HIGH |
| B22 | Proposal Executor | `ai/programs/proposal-executor.ts` | Same as B21 | HIGH |
| B23 | Executive Collaboration | `organization/executive-collaboration.ts` | `ExecutiveDispatchRegistry.dispatch(role, brief)` → `dispatch(role, runtimeContext)` | MEDIUM |
| B24 | EIOS Stage `executive_runtime` | `eios-runtime/stages/index.ts:157` | Update to read RuntimeContext from pipeline context | MEDIUM |

## 6. Impact Matrix

| Component | Files Affected | Lines Changed | Complexity |
|-----------|---------------|---------------|------------|
| CEO | 3 (index.ts, CEOProgram.ts, CEO.config.ts) | ~300 | HIGH |
| CTO | 3 (index.ts, CTOProgram.ts, CTO.config.ts) | ~350 | HIGH |
| CFO | 3 (index.ts, CFOProgram.ts, CFO.config.ts) | ~150 | MEDIUM |
| COO | 3 (index.ts, COOProgram.ts, COO.config.ts) | ~350 | HIGH |
| CMO | 3 (index.ts, CMOProgram.ts, CMO.config.ts) | ~150 | MEDIUM |
| CAIO | 3 (index.ts, CAIOProgram.ts, CAIO.config.ts) | ~150 | MEDIUM |
| CHRO | 3 (index.ts, CHROProgram.ts, CHRO.config.ts) | ~150 | MEDIUM |
| CKO | 3 (index.ts, CKOProgram.ts, CKO.config.ts) | ~150 | MEDIUM |
| routes/ai.ts | 1 | ~100 | MEDIUM |
| application-runtime-adapter | 1 | ~200 | HIGH (delete) |
| ExecutiveDispatchRegistry | 1 | ~30 | LOW |
| EIOS stages | 1 | ~50 | MEDIUM |
| Executive Collaboration | 1 | ~80 | MEDIUM |
| Mission Background Engine | 1 | ~60 | MEDIUM |
| Proposal Executor | 1 | ~20 | LOW |
| RuntimeGateway (NEW) | 1 | ~200 | NEW |
| **TOTAL** | **~25 files** | **~2,500 lines** | **HIGH** |

## 7. Backward Compatibility Strategy

| Phase | Approach |
|-------|----------|
| Phase 1 | Executives receive BOTH old format AND new RuntimeContext |
| Phase 2 | Executives prefer RuntimeContext, fall back to old format |
| Phase 3 | Old format removed. All executives read only RuntimeContext |
| Phase 4 | Legacy code paths removed entirely |

### Compatibility Layer Pattern (Phase 1-2 only)

```typescript
// Temporary dual support during migration
async execute(task: ExecutiveTask | RuntimeContext): Promise<ExecutiveResult> {
  if (this.isRuntimeContext(task)) {
    // NEW: Read from RuntimeContext
    const intent = task.intelligence.intent;
    const knowledge = task.grounding.knowledge;
    // ...
  } else {
    // OLD: Build context as before
    const ctx = this.buildContext(task as ExecutiveTask);
    // ...
  }
}
```
