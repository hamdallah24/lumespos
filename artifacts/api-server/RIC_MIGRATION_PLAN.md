# RIC Migration Plan — RIE to RIC

**Status**: Proposed

**Date**: 2026-07-16

---

## Migration Strategy Overview

Migration from RIE to RIC follows a **4-phase parallel-run strategy** ensuring zero downtime:

```
Phase A: Data Collection   Both run, RIE executes, RIC observes
Phase B: Shadow Execution  Both run, RIC executes, RIE shadows
Phase C: Cutover           RIC executes, cache fallback, RIE removed
Phase D: Decommission      RIC only, old code deleted
```

---

## Phase A: Data Collection Gate

| Aspect | Configuration |
|---|---|
| **Execution** | RIE is primary — produces RuntimeContext used by executives |
| **Observation** | RIC runs in parallel — produces RuntimeContext for comparison only |
| **User impact** | None — RIC output is never used for execution |
| **Risk** | None — RIC failures are logged, never surfaced |

### Architecture

```
User Message
     │
     ▼
application-runtime-adapter.ts
     │
     ├── RIE.assemble() → RuntimeContext → Executive → Response
     │
     └── RIC.assemble() → RuntimeContext → Logged & Compared
```

### Code Change

```typescript
async function executeWithRIE(event: ExecutionEvent): Promise<ExecutiveResponse> {
  // EXISTING PATH — used for actual execution
  const start = Date.now();
  const rieContext = await RuntimeIntelligence.assemble(event);
  const rieLatency = Date.now() - start;

  // NEW PATH — observability only, runs in parallel
  RIC.assemble(event).then(ricContext => {
    Logger.emit('ric_comparison', {
      message: event.message,
      rie: {
        intent: rieContext.intent,
        domain: rieContext.domain,
        confidence: rieContext.confidence,
      },
      ric: {
        intent: ricContext.intent,
        domain: ricContext.domain,
        confidence: ricContext.confidence,
      },
      match: compareContexts(rieContext, ricContext),
      latency: { rie: rieLatency, ric: Date.now() - start },
    });
  }).catch(error => {
    Logger.warn('ric_observation_failed', { error, message: event.message });
  });

  // Existing executive path — unchanged
  return executive.execute(rieContext);
}
```

### Metrics Collected

| Metric | Purpose | Target |
|---|---|---|
| `ric_comparison_match_rate` | How often does RIC agree with RIE? | > 80% |
| `ric_latency` | How fast is RIC? | < 3s p95 |
| `ric_error_rate` | How often does RIC fail? | < 2% |
| `ric_fallback_rate` | How often does RIC use regex fallback? | < 5% |

### Duration

3-5 days of production observation.

### Exit Criteria

- [ ] RIC completes successfully for ≥ 95% of requests
- [ ] RIC output matches RIE output for ≥ 80% of queries
- [ ] RIC fallback rate < 5%
- [ ] No RIC-related errors crash the server
- [ ] Team has reviewed comparison data

### Rollback

Remove the RIC call from `application-runtime-adapter.ts` → instant revert to pure RIE.

---

## Phase B: Shadow Execution Gate

| Aspect | Configuration |
|---|---|
| **Execution** | RIC is primary — produces RuntimeContext used by executives |
| **Fallback** | RIE runs in parallel; if RIC fails, RIE context is used |
| **Observation** | RIE output still logged for comparison |
| **User impact** | Users receive RIC-powered responses; no perceptible change |

### Architecture

```
User Message
     │
     ▼
application-runtime-adapter.ts
     │
     ├── RIC.assemble() → RuntimeContext → Executive → Response
     │     (if RIC fails → RIE.assemble() as fallback)
     │
     └── RIE.assemble() → RuntimeContext → Logged (always runs in parallel)
```

### Code Change

```typescript
async function execute(event: ExecutionEvent): Promise<ExecutiveResponse> {
  let context: RuntimeContext;

  // PRIMARY: Try RIC
  try {
    context = await RuntimeIntelligenceCore.assemble(event);
    Logger.emit('ric_primary', { message: event.message, latency });
  } catch (ricError) {
    // FALLBACK: Use RIE
    Logger.error('ric_fallback', { error: ricError, message: event.message });
    context = await RuntimeIntelligence.assemble(event);
  }

  // SHADOW: Always run RIE for comparison (fire-and-forget)
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

### Duration

5-7 days of production observation.

### Exit Criteria

- [ ] RIC fallback rate < 2%
- [ ] RIC matches RIE agreement > 90%
- [ ] Executive response quality maintained (no degradation)
- [ ] No regression in user-facing behavior
- [ ] Latency within acceptable range

### Rollback

Swap primary back to RIE via feature flag:

```typescript
if (FeatureFlags.RIC_ENABLED) {
  try { context = await RIC.assemble(event); }
  catch { context = await RIE.assemble(event); }
} else {
  context = await RIE.assemble(event);
}
```

Set `RIC_ENABLED=false` → instant rollback to RIE-only mode.

---

## Phase C: Cutover Gate

| Aspect | Configuration |
|---|---|
| **Execution** | RIC is primary — produces RuntimeContext used by executives |
| **Fallback** | Cached context (last-known-good, 5 min TTL) |
| **RIE** | No longer runs in parallel |
| **User impact** | None under normal operation; degraded cache experience if RIC fails |

### Architecture

```
User Message
     │
     ▼
application-runtime-adapter.ts
     │
     └── RIC.assemble() → RuntimeContext → Executive → Response
           (if RIC fails → cached context)
```

### Code Change

```typescript
async function execute(event: ExecutionEvent): Promise<ExecutiveResponse> {
  try {
    context = await RuntimeIntelligenceCore.assemble(event);
    // Cache for fallback
    contextCache.set(normalizeMessage(event.message), context, 300); // 5 min
  } catch (error) {
    Logger.error('ric_failure', { error, message: event.message });
    // Try cache
    const cached = contextCache.get(normalizeMessage(event.message));
    if (cached) {
      Logger.warn('ric_cache_hit', { message: event.message });
      context = cached;
    } else {
      // Last resort: return error with degraded response
      throw new RuntimeIntelligenceError('RIC unavailable', error);
    }
  }

  return executive.execute(context);
}
```

### Cache Warming

Before Phase C cutover, pre-warm the cache:

```bash
# Run overnight — process all common queries through RIC
for query in $(getCommonQueries); do
  curl -X POST /api/internal/warm-cache -d "{\"message\": \"$query\"}"
  sleep 0.1
done
```

### Duration

3-5 days of production observation.

### Exit Criteria

- [ ] Cache hit rate > 80% for repeat queries
- [ ] RIC failure recovery via cache works correctly
- [ ] No user-facing impact during RIC failures
- [ ] Team confident in RIC reliability

### Rollback

Re-enable RIE fallback (revert to Phase B configuration):

```typescript
// Change from cache-only fallback back to RIE fallback
try { context = await RIC.assemble(event); }
catch { context = await RIE.assemble(event); }
```

---

## Phase D: Decommission Gate

| Aspect | Configuration |
|---|---|
| **Execution** | RIC only — no RIE code exists |
| **Old modules** | `intent/`, `domain/` deleted; old implementations overwritten |
| **User impact** | None |

### Actions

1. **Verify zero remaining usage**:
   ```bash
   grep -r "IntentIntelligence\|DomainIntelligence\|old.*Intelligence" src/
   ```
2. **Delete old module directories**:
   - Remove `src/runtime-intelligence/intent/`
   - Remove `src/runtime-intelligence/domain/`
   - Overwrite `repository/`, `tool/`, `planning/`, `memory/`, `metadata/` with RIC versions
3. **Clean imports**:
   - Remove old module imports from `src/runtime-intelligence/index.ts`
   - Update any remaining direct imports
4. **Build verification**:
   ```bash
   npm run build
   ```
5. **Test suite**:
   ```bash
   npm run test
   ```

### Rollback

```bash
git revert <deletion-commit>
npm run build
npm run test
pm2 restart api-server
```

---

## Summary: 4-Phase Migration

```
Phase A (Days 1-5):    RIE ████████████████  RIC ░░░░░░░░░░░░   RIE executes
Phase B (Days 6-12):   RIE ░░░░░░░░░░░░░░  RIC ████████████████   RIC executes, RIE shadows
Phase C (Days 13-16):  RIE off  RIC ████████████████  Cache ░░░   RIC executes, cache fallback
Phase D (Days 17-18):  RIC only  ██████████████████████████████   Old code deleted

Total: 18 days
```

## Feature Flag Configuration

```typescript
// src/config/features.ts
export const RIC_FEATURES = {
  enabled: true,              // Master switch — turns RIC on/off globally
  useForExecution: false,     // Phase A: false, Phase B+: true
  rieFallback: true,          // Phase B: true, Phase C+: false
  cacheFallback: false,       // Phase C: true
  compareAndLog: true,        // Phase A-B: true, Phase C+: false
  logLevel: 'info',           // debug | info | warn | error
};
```

## Success Criteria

| Metric | Phase A | Phase B | Phase C | Phase D |
|---|---|---|---|---|
| RIC match rate | > 80% | > 90% | > 95% | 100% |
| RIC fallback rate | < 5% | < 2% | < 1% | < 1% |
| RIC error rate | < 2% | < 1% | < 0.5% | < 0.1% |
| Cache hit rate | N/A | N/A | > 80% | > 80% |
| Latency p95 | < 3s | < 3s | < 3s | < 3s |
| Executive quality | No regression | No regression | No regression | Baseline |

---

**Migrations should be boring.** If any gate produces surprising results, pause, investigate, and fix before proceeding. The parallel-run strategy ensures that the old system is always available as a safety net until we are certain the new system is superior.
