# RIC Migration Plan — Zero Downtime Strategy

**Status**: Proposed

**Date**: 2026-07-16

---

## Migration Philosophy

Migration from RIE to RIC must be:

- **Zero downtime** — the system remains operational throughout
- **Reversible** — every step can be rolled back
- **Observable** — performance and correctness are compared at every stage
- **Gradual** — no big-bang cutover

---

## Strategy: Parallel Run with Weighted Cutover

The migration uses a **parallel-run** pattern:

```
Phase A: Both systems run side by side
Phase B: RIC output is compared to RIE output (observability)
Phase C: Traffic gradually shifts from RIE to RIC
Phase D: RIE is decommissioned
```

---

## Detailed Migration Steps

### Step 0: Baseline

Before any changes, measure:

- **Latency**: p50, p95, p99 for each executive
- **Accuracy**: Manual review of 20 representative queries
- **Error rate**: Current failure modes
- **Cost**: Current LLM usage (if any)

### Step 1: Data Collection Gate

Deploy `RuntimeIntelligenceCore` alongside the existing `RuntimeIntelligence`:

```
application-runtime-adapter.ts
  │
  ├─▶ RIE.assemble()        → RuntimeContext (existing, used for execution)
  └─▶ RIC.assemble()        → RuntimeContext (new, logged but NOT used)
```

**Changes to `application-runtime-adapter.ts`**:

```typescript
async function executeWithRIE(event: ExecutionEvent): Promise<ExecutiveResponse> {
  // EXISTING PATH — used for actual execution
  const rieContext = await RuntimeIntelligence.assemble(event);

  // NEW PATH — observability only, runs in parallel
  const ricContext = await RuntimeIntelligenceCore.assemble(event);

  // Log comparison for analysis
  Logger.emit('ric_comparison', {
    message: event.message,
    rie: { intent: rieContext.intent, domain: rieContext.domain, confidence: rieContext.confidence },
    ric: { intent: ricContext.intent, domain: ricContext.domain, confidence: ricContext.confidence },
    match: isMatch(rieContext, ricContext),
    latency: { rie: rieLatency, ric: ricLatency },
  });

  // Existing executive path — unchanged
  return executive.execute(rieContext);
}
```

**Duration**: Run for 3-5 days.
**Success criteria**:
- RIC completes within acceptable time for 95%+ of requests
- RIC output matches RIE output for 80%+ of queries (adjust confidence thresholds)
- No RIC-related errors crash the system

### Step 2: Shadow Execution Gate

RIC output is used for execution, but RIE still runs in parallel as fallback:

```
application-runtime-adapter.ts
  │
  ├─▶ RIC.assemble()        → RuntimeContext (PRIMARY, used for execution)
  └─▶ RIE.assemble()        → RuntimeContext (SHADOW, used if RIC fails)
```

**Changes**:

```typescript
async function executeWithRIC(event: ExecutionEvent): Promise<ExecutiveResponse> {
  let context: RuntimeContext;

  try {
    context = await RuntimeIntelligenceCore.assemble(event);
  } catch (ricError) {
    // Fallback to RIE if RIC fails
    Logger.error('ric_fallback', { error: ricError, message: event.message });
    context = await RuntimeIntelligence.assemble(event);
  }

  // Always run RIE in parallel for comparison
  RuntimeIntelligence.assemble(event).then(rieContext => {
    Logger.emit('ric_quality', {
      message: event.message,
      ric: context,
      rie: rieContext,
    });
  }).catch(() => {});

  return executive.execute(context);
}
```

**Duration**: 5-7 days.
**Success criteria**:
- RIC fallback rate < 2% of requests
- RIC accuracy (measured against RIE) > 90%
- No degradation in executive response quality
- No regressions detected in monitoring

### Step 3: Cutover Gate

RIC is primary, RIE runs only for comparison (not as fallback):

```
application-runtime-adapter.ts
  │
  └─▶ RIC.assemble()        → RuntimeContext (PRIMARY)
       └─▶ If fails: return cached last-known-good context (NOT RIE)
```

**Changes**:

```typescript
async function executeWithRIC(event: ExecutionEvent): Promise<ExecutiveResponse> {
  try {
    context = await RuntimeIntelligenceCore.assemble(event);
    Cache.set(lastGoodKey(event.message), context, 300); // 5 min TTL
  } catch (ricError) {
    Logger.error('ric_failure', { error: ricError, message: event.message });
    const cached = Cache.get(lastGoodKey(event.message));
    if (cached) {
      Logger.warn('ric_cache_hit', { message: event.message });
      context = cached;
    } else {
      throw new Error('RIC unavailable and no cached context available');
    }
  }

  return executive.execute(context);
}
```

**Duration**: 3-5 days.
**Success criteria**:
- RIC cache hit rate > 80% for repeat queries
- RIC failure recovery via cache works correctly
- No user-facing impact during RIC failures

### Step 4: Decommission Gate

RIE code is removed:

- Delete `intent/`, `domain/` directories
- Overwrite old module implementations
- Remove RIE fallback code from `application-runtime-adapter.ts`
- Confirm no remaining imports from deleted modules
- Full build and test pass

**Changes**:

```typescript
// Final version — no RIE references
async function execute(event: ExecutionEvent): Promise<ExecutiveResponse> {
  const context = await RuntimeIntelligenceCore.assemble(event);
  return executive.execute(context);
}
```

---

## Rollback Plan

### Immediate Rollback (within 1 hour)

If critical issues are found during any gate:

```typescript
// Step 1 rollback: just remove the RIC call → system runs on RIE as before
// Step 2 rollback: swap RIC primary / RIE shadow back to RIE primary / RIC shadow
// Step 3 rollback: re-enable RIE fallback (revert to Step 2 config)
// Step 4 rollback: git revert the deletion commit
```

### Rollback triggers

| Trigger | Action |
|---|---|
| RIC error rate > 5% | Rollback to previous gate |
| Executive response quality degradation > 10% | Rollback to Step 1 |
| Latency increase > 300% | Rollback to Step 1 |
| User complaints about incorrect responses | Investigate, rollback to Step 1 if confirmed |
| RIC LLM provider outage | Rollback to Step 2 (RIE fallback) or Step 1 |

---

## Data Migration

### No data migration needed

RIC does not introduce new databases or schemas. All grounding providers read from existing data sources (OperationalTruth, Memory, Knowledge, Metadata). The only new data is:

1. **Repository metadata** — auto-generated at startup from filesystem. No migration needed.
2. **Tool Catalog** — defined in code, registered at startup. No migration needed.
3. **RuntimeContext v2** — superset of v1. All v1 consumers continue to work.

### Cache warming

Pre-warm the RIC cache before cutover:

```
# Run overnight before Step 3
for each common_query in QUERY_REGISTRY:
  RIC.assemble({ message: common_query })
  sleep(100ms)
```

---

## Monitoring & Observability

### Metrics to track

```
ric_latency_ms{component="understanding|planning|grounding|builder|total"}
ric_confidence{component="understanding|planning|retrieval|overall"}
ric_fallback_rate  (percentage of requests using regex fallback)
ric_cache_hit_rate
ric_error_rate{type="llm|parse|validation|timeout|provider"}
ric_comparison_match_rate  (RIC vs RIE for same input)
executive_latency_ms{executive="ceo|cto|cfo|coo|cmo|chro|caio"}
executive_error_rate{executive="..."}
```

### Logging

Every `RIC.assemble()` call logs:

```typescript
{
  timestamp,
  message_hash,
  user_id,
  thinking_mode,
  understanding: { intent, domain, confidence, latency },
  planning: { knowledge_needs, repo_needs, tool_needs, latency },
  grounding: { success_count, error_count, latency },
  builder: { missing_truth, overall_confidence, latency },
  total_latency,
  fallback_used,
  cached,
}
```

### Alerts

| Condition | Alert |
|---|---|
| ric_fallback_rate > 0.05 | Warning — high fallback usage |
| ric_error_rate > 0.02 | Critical — RIC failures |
| ric_latency_p95 > 5000ms | Warning — slow performance |
| ric_comparison_match_rate < 0.70 | Warning — RIC diverging from RIE baseline |

---

## Migration Gate Checklist

### Step 1 (Data Collection)

- [ ] RIC runs alongside RIE
- [ ] RIC output logged but not used for execution
- [ ] No new errors introduced
- [ ] Latency baseline recorded
- [ ] Accuracy baseline recorded
- [ ] Run for 3-5 days

### Step 2 (Shadow Execution)

- [ ] RIC is primary, RIE is fallback
- [ ] RIC failure rate < 2%
- [ ] RIC matches RIE > 90%
- [ ] Executive response quality maintained
- [ ] Run for 5-7 days

### Step 3 (Cutover)

- [ ] RIC is primary with cache fallback
- [ ] Cache hit rate > 80%
- [ ] No RIE fallback path active
- [ ] All executives working correctly
- [ ] Run for 3-5 days

### Step 4 (Decommission)

- [ ] All old RIE modules deleted
- [ ] All imports updated
- [ ] Build passes
- [ ] Test suite passes
- [ ] Final monitoring review

---

## Expected Timeline

| Step | Duration | Risk | Description |
|---|---|---|---|
| 0: Baseline | 1 day | None | Measure current system performance |
| 1: Data Collection | 3-5 days | Low | RIC runs in parallel, logged only |
| 2: Shadow Execution | 5-7 days | Medium | RIC primary, RIE fallback |
| 3: Cutover | 3-5 days | Medium | RIC primary, cache fallback |
| 4: Decommission | 1-2 days | High (reversible) | Delete old RIE code |

**Total migration duration**: 13-20 days

---

## Risk Register (Migration-Specific)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| RIC produces wrong RuntimeContext that causes executive error | Medium | High | Step 2 catches this before Step 3; logged comparison detects divergence |
| RIC LLM provider has extended outage | Low | Critical | Step 1 has no outage risk (RIE still primary); Step 2 has RIE fallback; Step 3 has cache fallback |
| Migration takes longer than expected | High | Low | System continues running on RIE; no deadline pressure |
| Engineers unfamiliar with new architecture cause bugs | Medium | Medium | Phased implementation with tests; code review required for each phase |
| Repository metadata generation misses critical files | Low | Medium | Retrieval Planner will miss those files → missing truth detection catches this |<｜end▁of▁thinking｜>

<｜｜DSML｜｜tool_calls>
<｜｜DSML｜｜invoke name="write">
<｜｜DSML｜｜parameter name="content" string="true"># RIC Risk Analysis — Assessment and Mitigation

**Status**: Proposed

**Date**: 2026-07-16

---

## Risk Register

### 0. Verification Gap (New — T9.1A)

| Attribute | Value |
|---|---|
| **Risk** | The Verification Engine does not catch a hallucination or contradiction between reasoning and grounded evidence |
| **Probability** | Low (verification is deterministic, rules are explicit) |
| **Impact** | High — incorrect RuntimeContext reaches executive, leading to wrong response |
| **Detection** | Each verification rule explicitly compares reasoning output vs. grounded data; any mismatch is caught |

#### Mitigations

| Mitigation | Layer | Effectiveness |
|---|---|---|
| 6 independent verification rules | Verification Engine | High — multiple checks catch different failure modes |
| Each rule produces a confidence score | Verification Engine | High — aggregate confidence exposes overall reliability |
| Contradiction reporting | Verification Engine | High — contradictions are surfaced, not hidden |
| Multi-factor confidence | Context Builder | High — verification is one of three confidence factors; a missed contradiction still affects grounding or reasoning confidence |
| Explainability requirement | RuntimeContext | Medium — humans can review why-decisions in the trace |

#### Verification Rule Coverage

| Rule | Catches | Blind Spot |
|---|---|---|
| DomainVerification | Domain selected without available data | Domain with partial data not caught |
| EntityVerification | Entity extracted but not found in data | Entity found but incorrect value not caught |
| FileVerification | File requested but not found | File found but wrong version not caught |
| ToolVerification | Tool capability requested but not in catalog | Tool found but wrong parameters not caught |
| MemoryVerification | Memory store unavailable | Memory store returns irrelevant data |
| OperationalVerification | Data request returned empty | Data returned but wrong context not caught |

### 1. LLM Availability (Critical)

| Attribute | Value |
|---|---|
| **Risk** | The LLM provider (DeepSeek/OpenAI/Anthropic) is unavailable, causing Understanding Engine and Retrieval Planner to fail |
| **Probability** | Low (provider uptime > 99.9%) |
| **Impact** | Critical — Cognitive Blocks 1 and 2 cannot function |
| **Detection** | HTTP timeout / 503 response from LLM API |
| **Recovery time** | 30 seconds to 1 hour (provider-dependent) |

#### Mitigations

| Mitigation | Layer | Effectiveness |
|---|---|---|
| **Regex fallback** (UnderstandingFallback.ts) | Understanding Engine | Medium — degraded but operational. Only basic intent/domain extraction, no entities |
| **Cached RuntimeContext** | Orchestrator | High for repeat queries. Cache last-known-good context per message hash (TTL: 5 min) |
| **Last-good context for similar queries** | Orchestrator | Medium — normalize message, find nearest cached context by intent similarity |
| **Graceful degradation message** | Orchestrator | Low — inform user "I'm operating in offline mode. Some capabilities are limited." |
| **Multi-provider failover** | Infrastructure | High — configure secondary LLM provider; auto-failover on primary timeout |
| **Retry with exponential backoff** | Understanding Engine | Low — helps with transient failures, not extended outages |

#### Fallback Chain

```
1. Primary LLM provider → available? → UnderstandingResult
2. Primary LLM → unavailable? → Secondary LLM provider → UnderstandingResult
3. Both LLMs unavailable? → Cached context for identical query? → Use cache
4. No cache? → Similar query in cache? → Use similar (lower confidence)
5. Nothing cached? → Regex fallback → Degraded UnderstandingResult (confidence < 0.50)
```

---

### 2. LLM Hallucination (High)

| Attribute | Value |
|---|---|
| **Risk** | The LLM produces incorrect intent, wrong domain, hallucinated entities, nonexistent file paths, or imaginary tools |
| **Probability** | Medium |
| **Impact** | High — wrong RuntimeContext leads to wrong executive response |
| **Detection** | Schema validation, retrieval validation, confidence scoring |

#### Mitigations

| Mitigation | Layer | Effectiveness |
|---|---|---|
| **Strict JSON schema validation** (Zod) | Understanding Engine, Retrieval Planner | High — invalid output is rejected before use |
| **Entity validation** | Runtime Context Builder | Medium — validate entity types against known enum; reject unknown entity types |
| **File path validation** | Repository Provider | High — if file path does not exist on filesystem, it is flagged as missing truth |
| **Tool capability validation** | Tool Catalog | High — if LLM requests a capability that no tool provides, it's flagged |
| **Confidence threshold** | Understanding Engine | High — if LLM confidence < 0.60, use fallback instead |
| **Redundancy check** | Runtime Context Builder | Medium — compare intent/domain against known business schema |
| **Reasoning trace** | All layers | Medium — human reviewable audit trail for every decision |

---

### 3. Latency Increase (Medium)

| Attribute | Value |
|---|---|
| **Risk** | RIC is significantly slower than RIE (2 LLM calls + grounding vs. 10ms regex) |
| **Probability** | High |
| **Impact** | Medium — user-facing latency increases from ~10ms to ~500-3000ms |
| **Detection** | Performance monitoring (latency_p50, p95, p99) |

#### Mitigations

| Mitigation | Layer | Effectiveness |
|---|---|---|
| **Thinking modes** | Understanding Engine | High — fast mode uses smaller/cheaper model for simple queries (200-500ms) |
| **Caching** | Orchestrator | High — identical queries skip LLM entirely (cache hit: ~10ms) |
| **Normalized query cache** | Orchestrator | Medium — normalize message before cache lookup (broader cache hits) |
| **Parallel grounding** | Grounding Layer | High — all providers run simultaneously (not sequential) |
| **Streaming context** | Orchestrator | Medium — return partial context immediately, enrich progressively |
| **Background pre-fetching** | Orchestrator | Low — predict common queries and pre-cache |

#### Latency Budget (Target)

| Component | Fast | Balanced | Deep |
|---|---|---|---|
| Understanding Engine | 200-500ms | 500-1500ms | 1500-4000ms |
| Retrieval Planner | 100-300ms | 300-1000ms | 1000-3000ms |
| Grounding Layer | 10-100ms | 10-100ms | 10-100ms |
| Context Builder | <5ms | <5ms | <5ms |
| **Total** | **310-905ms** | **810-2605ms** | **2510-7105ms** |

Worst case (deep mode, cache miss) is ~7 seconds. This is acceptable for complex strategic queries but not for simple inquiries. Fast mode for simple queries should keep p50 under 500ms.

---

### 4. API Cost Increase (Medium)

| Attribute | Value |
|---|---|
| **Risk** | Two LLM calls per request increase API costs significantly compared to zero-cost regex |
| **Probability** | High |
| **Impact** | Medium — operational cost increases |
| **Detection** | Cost monitoring dashboard |

#### Mitigations

| Mitigation | Layer | Effectiveness |
|---|---|---|
| **Fast mode for simple queries** | Understanding Engine | High — 80% of queries are "simple" (fast mode); 20% are balanced/deep |
| **Caching** | Orchestrator | High — identical queries within TTL window cost $0 |
| **Batch processing** | Orchestrator | Medium — combine multiple requests into one LLM call when possible |
| **Model tier selection** | Understanding Engine | High — fast mode uses GPT-4o-mini ($0.15/1M tokens); deep mode uses GPT-4o ($2.50/1M tokens) |
| **Token optimization** | Prompts | Medium — optimized system prompts reduce token count |

#### Cost Projection

| Scenario | Queries/day | Avg tokens | Cost/day (fast) | Cost/day (balanced) |
|---|---|---|---|---|
| Low volume | 1,000 | 500 | ~$0.15 | ~$2.50 |
| Medium volume | 10,000 | 500 | ~$1.50 | ~$25.00 |
| High volume | 100,000 | 500 | ~$15.00 | ~$250.00 |

With 80% fast + 20% balanced + 30% cache hit rate: **~$5-10/day at 10K queries**.

---

### 5. JSON Parse Failure (Low)

| Attribute | Value |
|---|---|
| **Risk** | LLM returns malformed JSON that cannot be parsed |
| **Probability** | Low (modern LLMs produce valid JSON > 99% with structured output mode) |
| **Impact** | Medium — causes retry latency, fallback to degraded mode |
| **Detection** | JSON.parse() throws SyntaxError |

#### Mitigations

| Mitigation | Effectiveness |
|---|---|
| **Structured output mode** (OpenAI `response_format`, Anthropic tool-use) | High — forces valid JSON by design |
| **Retry with stricter prompt** (max 2) | Medium — most failures are transient |
| **Partial parse recovery** | Medium — try to extract valid JSON from malformed response using regex |
| **Fallback to regex mode** | High — if all retries fail, degraded mode is better than no response |

---

### 6. Grounding Provider Failure (Medium)

| Attribute | Value |
|---|---|
| **Risk** | One or more Grounding Providers fail (database down, filesystem error, API timeout) |
| **Probability** | Medium |
| **Impact** | Medium — partial context, missing truth |
| **Detection** | Provider returns error in GroundingResult.errors[] |

#### Mitigations

| Mitigation | Effectiveness |
|---|---|
| **Error isolation** | High — one provider failure does not affect others (parallel execution) |
| **Missing truth tracking** | High — RuntimeContext.missingTruth reports what could not be retrieved |
| **Graceful degradation** | High — executive can still respond with partial data |
| **Provider health checks** | Medium — health() method on each provider; collect before processing |
| **Retry for transient failures** | Medium — retry once for timeouts |

---

### 7. Executive Incompatibility (High)

| Attribute | Value |
|---|---|
| **Risk** | Executive Runtimes do not work correctly with RIC's RuntimeContext v2 |
| **Probability** | Low (v2 is superset of v1, all existing fields preserved) |
| **Impact** | High — executives produce wrong responses or crash |
| **Detection** | Integration tests, executive output comparison |

#### Mitigations

| Mitigation | Effectiveness |
|---|---|
| **Backward compatible schema** | High — v2 adds fields, never removes or renames |
| **Shadow execution during migration** | High — Step 1 and Step 2 catch incompatibilities before cutover |
| **Executive test suite** | High — automated tests for all 7 executives |
| **Feature flag** | High — instant rollback by flipping flag |
| **Legacy mode** | High — executive can still receive v1-format fallback |

---

### 8. Repository Metadata Drift (Low)

| Attribute | Value |
|---|---|
| **Risk** | Repository metadata becomes stale as files are added/modified/deleted |
| **Probability** | Medium (with file watcher) / High (without file watcher) |
| **Impact** | Medium — Retrieval Planner may select nonexistent files or miss new files |
| **Detection** | File path validation at retrieval time |

#### Mitigations

| Mitigation | Effectiveness |
|---|---|
| **File watcher** (chokidar) | High — metadata regenerated on file change events |
| **Startup regeneration** | High — metadata always fresh after deployment |
| **On-demand regeneration** | Medium — regenerate on explicit request |
| **File existence check at retrieval** | High — RepositoryProvider validates paths before reading |

---

### 9. Cognitive Block Contradiction (Medium)

| Attribute | Value |
|---|---|
| **Risk** | Understanding Engine and Retrieval Planner produce contradictory outputs (e.g., Understanding says "high urgency" but Planner says "low priority") |
| **Probability** | Medium (two independent LLM calls) |
| **Impact** | Low — confidence scoring catches the inconsistency |
| **Detection** | ConfidenceAggregator detects mismatch |

#### Mitigations

| Mitigation | Effectiveness |
|---|---|
| **Context passing** | High — Planner receives full UnderstandingResult as context |
| **Confidence penalty for contradictions** | High — if understanding.urgency != plan.effort_level, confidence is reduced |
| **Human review in reasoning trace** | Medium — contradictory decisions are visible in trace |

---

### 10. System Complexity (Medium)

| Attribute | Value |
|---|---|
| **Risk** | The new architecture is too complex for the team to maintain |
| **Probability** | Low (architecture is cleaner than current RIE) |
| **Impact** | Medium — slower development, more bugs |
| **Detection** | Developer feedback, pull request quality |

#### Mitigations

| Mitigation | Effectiveness |
|---|---|
| **Clean separation of concerns** | High — 4 components with single responsibilities are easier to understand than 10 heuristic modules |
| **Comprehensive tests** | High — each component testable independently |
| **Architecture documentation** | High — this document serves as reference |
| **Clear interfaces** | High — each component has a well-defined contract |

---

## Risk Matrix

```
Probability
  High     │ (3) Latency    (4) Cost
           │ (8) Metadata
           │
  Medium   │ (2) Hallucination       (6) Provider Fail
           │ (9) Contradiction       (7) Executive Compat
           │ (10) Complexity
           │
  Low      │ (0) Verif. Gap   (5) JSON Parse  (1) LLM Availability
           │
           └────────────────────────────────── Impact
               Low    Medium      High     Critical
```

**Top 4 risks requiring active management**:

1. **LLM Availability (Critical Impact)** — mitigations: multi-provider + cache + fallback
2. **LLM Hallucination (High Impact)** — mitigations: schema validation + retrieval validation + verification engine
3. **Verification Gap (High Impact)** — mitigations: 6 independent rules + multi-factor confidence + explainability
4. **Latency Increase (High Probability)** — mitigations: thinking modes + cache + fast model for simple queries

---

## Rollback Procedure

### Instant Rollback (< 5 minutes)

If critical issues are detected after any deployment:

```bash
# Revert to RIE-based execution
git revert HEAD --no-commit
# Or use feature flag:
export RIC_ENABLED=false
pm2 restart api-server
```

### Full Rollback (< 30 minutes)

If Phase 4 (deletion) has been completed:

```bash
git revert <deletion-commit>
npm run build
pm2 restart api-server
```

### Rollback Test Frequency

- Manual: every deployment
- Automated: weekly in staging environment

---

## Health Check Endpoint

```typescript
GET /api/health/ric
{
  "status": "ok" | "degraded" | "down",
  "components": {
    "understanding": { "status": "ok", "latencyMs": 450, "fallbackActive": false },
    "planning": { "status": "ok", "latencyMs": 300, "fallbackActive": false },
    "grounding": {
      "operational": { "status": "ok" },
      "memory": { "status": "ok" },
      "knowledge": { "status": "ok" },
      "metadata": { "status": "degraded", "error": "Timeout" },
      "repository": { "status": "ok" }
    },
    "builder": { "status": "ok" },
    "cache": { "hitRate": 0.35, "entryCount": 128 }
  },
  "uptime": 3600,
  "version": "1.0.0"
}
```

---

## Incident Response Plan

### Severity 1 (System Down)

RIC cannot process any request.

**Actions**:
1. Flip `RIC_ENABLED=false` flag → system reverts to RIE immediately
2. Notify team via PagerDuty/Slack
3. Investigate root cause (LLM outage? Code bug? Configuration?)
4. Fix and deploy
5. Flip `RIC_ENABLED=true` after verification
6. Post-mortem within 48 hours

**SLA**: 15 minutes to mitigation

### Severity 2 (Degraded)

RIC works but with high latency, high error rate, or incorrect results.

**Actions**:
1. Route traffic to fast mode only (skip deep mode)
2. Increase cache TTL to reduce LLM calls
3. Investigate root cause
4. Fix and deploy

**SLA**: 2 hours to mitigation

### Severity 3 (Observability)

RIC works but metrics show anomalies.

**Actions**:
1. Investigate during normal business hours
2. Fix in next deployment cycle

**SLA**: 1 week to resolution
