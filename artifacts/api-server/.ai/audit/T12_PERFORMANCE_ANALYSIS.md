# T12.0 — Performance Analysis

## 1. Current Architecture Latency Profile

### REST Chat Flow (Route → Executive → LLM)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Stage                    │  Avg Duration │  LLM Calls │  Notes    │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Route parsing          │      <5ms     │    0       │ Express   │
│ 2. Auth + role check      │     <10ms     │    0       │ Passport   │
│ 3. Target resolution      │      <1ms     │    0       │ @mention   │
│ 4. Adapter lookup         │      <1ms     │    0       │ Map.get()  │
│ 5. Executive context      │    50-200ms   │    0       │ Build ctx  │
│ 6. LLM call               │  2,000-15,000ms│   1       │ DeepSeek   │
│ 7. Tool execution (if any)│ 500-5,000ms   │    0-3     │ Per tool   │
│ 8. Response streaming     │   100-500ms   │    0       │ SSE        │
├─────────────────────────────────────────────────────────────────────┤
│ TOTAL                     │ 2,500-20,000ms│    1-4     │            │
└─────────────────────────────────────────────────────────────────────┘
```

**Current Key Metrics:**
- **Average response time:** ~5,000ms (simple query), ~15,000ms (with tool execution)
- **LLM calls per request:** 1 (main) + 0-3 (tool subtasks via recursion)
- **Memory allocations:** 1 CEOContext (~2KB) + prompt (~8KB) + response (~4KB) = ~14KB
- **Executive-specific:** Each executive builds own context from scratch — duplicated effort

### EIOS Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Stage                    │  Avg Duration │  Notes                  │
├─────────────────────────────────────────────────────────────────────┤
│ 1. event_validation       │      <1ms     │ Stub                    │
│ 2. business_intelligence  │      <1ms     │ Stub                    │
│ 3. decision_context        │    50-100ms   │ ContextProvider.generate│
│ 4. decision_engine        │      <1ms     │ Stub                    │
│ 5. north_star             │ 1,000-5,000ms │ LLM per strategy        │
│ 6. strategy_simulator     │      <1ms     │ Stub                    │
│ 7. strategy_engine        │      <1ms     │ Stub                    │
│ 8. execution_planner      │      <1ms     │ Stub                    │
│ 9. workflow_runtime       │   200-500ms   │ WorkflowRuntimeProvider │
│10. brief_generator        │   100-200ms   │ BriefGenerator.generate │
│11. executive_runtime      │ 2,000-15,000ms │ LLM via dispatch       │
├─────────────────────────────────────────────────────────────────────┤
│ TOTAL                     │ 3,500-21,000ms│ 9 STUB stages (75% dead)│
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** 9 of 11 EIOS pipeline stages are STUBS — they return empty patches. Only stages 3, 5, 9, 10, and 11 do real work. The pipeline overhead adds ~500ms of orchestration/compliance for no value.

## 2. Target Architecture Latency Estimate

### RuntimeGateway Flow (Route → RIC → Executive)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Stage                    │  Est Duration │  LLM Calls │  Notes    │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Route parsing          │      <5ms     │    0       │ No change  │
│ 2. Auth + role check      │     <10ms     │    0       │ No change  │
│ 3. RuntimeGateway dispatch│      <1ms     │    0       │ New, fast   │
│ 4. Awareness collection   │    10-50ms    │    0       │ 7 sources   │
│ 5. Understanding (LLM)    │ 1,000-3,000ms │    1       │ RIC stage   │
│ 6. Planning (LLM)         │   500-2,000ms │    1       │ RIC stage   │
│ 7. Grounding (5 providers)│    50-500ms   │    0       │ Parallel    │
│ 8. Verification           │    10-100ms   │    0       │ 6 rules     │
│ 9. Confidence + Context   │      <5ms     │    0       │ Aggregation │
│10. Replan (if < 0.75)     │     0-5,000ms │    0-2     │ Optional    │
│11. Executive decision     │   500-2,000ms │    1       │ Compact LLM │
│12. Response               │   100-500ms   │    0       │ SSE         │
├─────────────────────────────────────────────────────────────────────┤
│ TOTAL (no replan)         │ 2,200-8,200ms │    3       │             │
│ TOTAL (with replan)       │ 3,200-16,200ms│    3-5     │             │
└─────────────────────────────────────────────────────────────────────┘
```

### Comparison: Current vs Target

| Metric | Current | Target (no replan) | Target (with replan) | Delta |
|--------|---------|-------------------|----------------------|-------|
| **Avg latency** | ~5,000ms | ~4,000ms | ~7,000ms | -20% / +40% |
| **LLM calls** | 1-4 | 3 | 3-5 | +2-4 calls |
| **Response quality** | No verification | Verified | Verified + refined | **IMPROVED** |
| **Awareness** | NONE | Full awareness | Full awareness | **IMPROVED** |
| **Memory usage** | ~14KB/ctx | ~25KB/RuntimeContext | ~30KB | +80% |
| **Object allocations** | 3-5 objects | 15-20 objects | 20-30 | +300% |

## 3. Detailed Performance Impact

### LLM Call Analysis

```
Current:  1 LLM call (executive prompt + understanding combined)
          Prompt size: ~8KB (includes understanding + planning + tools inline)
          Response: ~4KB (includes reasoning + action + content)

Target:   3 LLM calls (understanding + planning + executive decision)
          Understanding prompt: ~3KB (focus: intent, domain, entities)
          Planning prompt: ~4KB (focus: capability selection, tasks)
          Executive prompt: ~2KB (focus: domain-specific decision)
          Total tokens: similar or LESS due to separation of concerns
```

**Token Usage Comparison:**
```
Current CEO prompt:     system(2KB) + context(2KB) + tools(2KB) + memory(1KB) + user(0.5KB) = ~7.5KB
                        → might hit context window limits with large repo/memory

Target Understanding:   system(1KB) + awareness(1KB) + user(0.5KB) = ~2.5KB
Target Planning:        system(1.5KB) + pastPlans(1KB) + understanding(0.5KB) = ~3KB
Target Executive:       system(1KB) + runtimeContext(2KB) = ~3KB
Total Target:           ~8.5KB (comparable, but more focused)
```

**Advantage:** Separation of concerns allows smaller, more focused prompts that stay within context window limits. Current CEOs prompt can easily exceed 32K context with large repositories.

### Memory Allocation Impact

```
Current per-request:    ~14KB (ExecutiveTask + CEOContext + prompt + response)
Target per-request:     ~25KB (RuntimeContext with full awareness + evidence + refinement)

RuntimeContext breakdown:
  intelligence:           ~0.5KB (UnderstandingResult)
  planning:               ~1KB (RetrievalPlan)
  grounding:              ~2-10KB (Operational data, memory, knowledge, files)
  verification:           ~0.5KB (VerificationResult)
  awareness:              ~1KB (AwarenessBrief subset)
  refinementHistory:      ~0.5KB (per replan iteration)
  runtime:                ~1KB (trace, evidence, budget, confidence)
  TOTAL:                  ~6.5-15KB
```

**Impact:** Higher memory per request, but eliminates 8x duplicate context building. Net memory savings when multiple executives are involved.

### Parallelism Gains

| Aspect | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Grounding providers | Sequential per executive | Parallel per dependency level | 3-5x faster |
| Multi-executive dispatch | Sequential (executeMessage) or parallel (executeForTargets) | Sequential via single executive | No change |
| Awareness collection | Not done | Parallel across 7 sources | Marginal cost |
| Verification rules | Not done | Parallel execution | Minimal cost |

### Caching Benefits

| Cache | Current | Target | Hit Rate Est. |
|-------|---------|--------|---------------|
| Provider health | NOT cached | 10s TTL cache | 90% |
| Provider circuit state | NOT tracked | CircuitBreaker | 99% |
| Past plans | NOT stored | PastPlanMemory (50 slots) | 40-60% (repeated queries) |
| Grounding results | NOT cached | (future: result caching) | 0% initially |
| Awareness signals | NOT collected | Collected per request | Fresh each time |

## 4. Performance Trade-off Summary

### Areas Where Target is FASTER

| Area | Reason | Est. Improvement |
|------|--------|------------------|
| Grounding parallelism | Providers run in parallel by dependency | 3-5x per grounding |
| Reduced prompt size | Focused prompts, no inline context building | 20-30% faster LLM |
| Understanding reuse | Once per request, not per executive | Eliminates 7x duplicate |
| Grounding reuse | Once per request, not per executive | Eliminates 7x duplicate |
| Circuit breaker | Skips unhealthy providers immediately | 100-500ms saved per failure |

### Areas Where Target is SLOWER

| Area | Reason | Est. Penalty |
|------|--------|--------------|
| Awareness collection | 7 sources queried | +10-50ms |
| Additional LLM calls | Understanding + Planning separate | +1,500-5,000ms |
| Verification | 6 rules executed | +10-100ms |
| Replan loop | Optional second pass | +2,000-5,000ms |
| Larger RuntimeContext | More data to serialize/transfer | +1-5ms |

### Net Effect

| Scenario | Current | Target | Delta |
|----------|---------|--------|-------|
| Simple query (no tools, high confidence) | ~3,000ms | ~4,000ms | +33% |
| Complex query (tools, low confidence) | ~15,000ms | ~12,000ms | -20% |
| Multi-executive (3 execs) | ~30,000ms (sequential) | ~21,000ms (RIC shared) | -30% |
| Degraded (all fallbacks) | ~10,000ms | ~6,000ms | -40% |

**Conclusion:** Simple queries are slightly slower (+1s due to extra LLM calls) but complex and multi-executive queries are significantly faster and more reliable. The trade-off is justified by the **elimination of dead architecture, introduction of verification, and cross-request learning**.
