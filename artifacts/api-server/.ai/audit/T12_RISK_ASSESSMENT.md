# T12.0 — Risk Assessment

## 1. Risk Summary

| ID | Risk | Category | Probability | Impact | Severity | Mitigation |
|----|------|----------|-------------|--------|----------|------------|
| R01 | Executive stops working after migration | Runtime | HIGH | CRITICAL | **CRITICAL** | Phase 1 backward compat |
| R02 | RuntimeContext too large for network | Performance | MEDIUM | HIGH | **HIGH** | Optimize serialization |
| R03 | Awareness collection failure crashes request | Resilience | LOW | CRITICAL | **HIGH** | try/catch + graceful fallback |
| R04 | Additional LLM calls increase cost | Cost | HIGH | MEDIUM | **HIGH** | Monitor usage, cache when possible |
| R05 | Executive context building logic conflicts with RIC | Logic | MEDIUM | HIGH | **HIGH** | Dual-read during migration |
| R06 | Replan loop infinite/runaway | Resilience | LOW | CRITICAL | **HIGH** | Max 2 iterations hardcoded |
| R07 | SSE streaming breaks during migration | UX | MEDIUM | HIGH | **HIGH** | Test streaming edge-to-edge |
| R08 | EIOS pipeline loses ExecutiveBrief dependency | Pipeline | MEDIUM | MEDIUM | **MEDIUM** | Generate brief FROM RuntimeContext |
| R09 | Grounding provider timeout stalls entire request | Performance | MEDIUM | MEDIUM | **MEDIUM** | Timeout per task (already implemented) |
| R10 | PastPlanMemory returns stale/invalid plans | Quality | LOW | MEDIUM | **MEDIUM** | Confidence threshold gate |
| R11 | Executive still builds own context (waste) | Performance | HIGH | LOW | **MEDIUM** | Code review per executive |
| R12 | Verification false positives block valid requests | Quality | LOW | MEDIUM | **MEDIUM** | Adjustable thresholds |
| R13 | CircuitBreaker OPEN state prevents legitimate calls | Resilience | LOW | MEDIUM | **MEDIUM** | Half-open recovery mechanism |
| R14 | MetricsStore memory growth unbounded | Memory | LOW | LOW | **LOW** | Bounded store (50 entries) |
| R15 | RuntimeContext backward compat breaks external consumers | Integration | LOW | LOW | **LOW** | No external consumers found |

## 2. Critical Risks — Detailed Analysis

### R01: Executive Stops Working After Migration

**Description:** When an executive's `execute()` method signature changes from `(ctx: CEOContext)` to `(runtimeContext: RuntimeContext)`, all existing callers break. If any caller is missed, the executive will throw TypeErrors at runtime.

**Probability:** HIGH — 8 executives × multiple callers = many touch points
**Impact:** CRITICAL — Production outage, all AI requests fail

**Mitigation Plan:**
```
Phase 1: Dual-signature support
  execute(ctx: CEOContext | RuntimeContext): Detect type at runtime
  [BACKWARD COMPATIBLE — no production risk]

Phase 2: Deprecate old signature
  execute(runtimeContext: RuntimeContext, legacyCtx?: CEOContext):
  Legacy parameter optional, ignored if RuntimeContext present
  [LOW RISK — old callers still work]

Phase 3: Remove legacy
  execute(runtimeContext: RuntimeContext):
  All callers updated in previous phase
  [NO RISK — all callers already migrated]
```

### R02: RuntimeContext Size

**Description:** RuntimeContext can be 6.5-15KB with full grounding data. For large repositories, the file contents alone could be 100KB+. This could slow serialization and SSE streaming.

**Probability:** MEDIUM — depends on repository size
**Impact:** HIGH — streaming latency, memory pressure

**Mitigation Plan:**
```
• Limit file contents to top 10 files (already in GroundingLayer limits?)
• Stream grounding results incrementally
• Compress evidence array (truncate to last 50 entries)
• AwarenessBrief trimmed by AwarenessPrioritizer (already done)
```

### R03: Awareness Collection Failure

**Description:** `UnifiedAwarenessEngine.collect()` queries 7 external sources. If any source is down (BusinessStateCollector, DigitalTwin, etc.), the entire collection could fail.

**Probability:** LOW — each source has try/catch
**Impact:** CRITICAL — no awareness = no context = no response

**Mitigation Plan:**
```
• Each source wrapped in individual try/catch (ALREADY IMPLEMENTED)
• Degraded awareness if some sources fail
• Default health: 'unknown' if no data
• Timeout per source: 500ms max
```

## 3. Risk Matrix

```
CRITICAL │  R01                         R03, R05, R06, R07
         │  │                           │
    HIGH │  R02, R04                    │
         │  │                           │
  MEDIUM │  R11          R08, R09,      │
         │               R12            │
     LOW │  R15          R10, R13, R14  │
         │                              │
         └──────────────────────────────┤
            LOW        MEDIUM      HIGH
                      PROBABILITY
```

## 4. Risk Response Strategy

| Severity | Response | Monitoring |
|----------|----------|------------|
| **CRITICAL** (R01, R03, R05, R06, R07) | Prevent: backward compat, try/catch, hard limits | Per-request monitoring |
| **HIGH** (R02, R04) | Mitigate: size limits, cost monitoring | Weekly cost review |
| **MEDIUM** (R08, R09, R10, R11, R12, R13) | Accept with monitoring | Automated alerts |
| **LOW** (R14, R15) | Accept | Runbook documentation |

## 5. Migration Risk Timeline

```
Week 1-2 (Phase 1): RuntimeGateway creation
  Risk Level: LOW
  Risk: New code path alongside existing — no production impact
  Safety: Old path remains active

Week 3-4 (Phase 2): Executive migration
  Risk Level: HIGH
  Risk: Each executive update could break behavior
  Safety: Dual-signature, gradual per-executive, per-executive testing

Week 5-6 (Phase 3): EIOS pipeline update
  Risk Level: MEDIUM
  Risk: Pipeline reordering could break EIOS consumers
  Safety: New stage added, old brief_generator retained during transition

Week 7-8 (Phase 4): Legacy removal
  Risk Level: MEDIUM
  Risk: Removing old code could break unported consumers
  Safety: Comprehensive grep before each deletion
```

## 6. Rollback Triggers

| Condition | Action | Time to Recover |
|-----------|--------|-----------------|
| AI chat returning 500 errors | Restore old routes/ai.ts | < 5 minutes |
| Executive decision quality drops | Revert to old execute signature | < 30 minutes |
| Response latency increases > 50% | Disable replan loop | < 1 minute |
| Cost exceeds 2x budget | Disable awareness collection | < 1 minute |
| EIOS pipeline failure | Remove ric_assemble stage | < 5 minutes |
