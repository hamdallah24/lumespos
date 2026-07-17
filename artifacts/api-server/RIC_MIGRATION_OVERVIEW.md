# Migration Strategy — RIE to RIC

---

## Phase A: Data Collection

| Layer |  |
|---|---|
| **Status** | 🟢 Production (RIE) |
| **Execution** | RIE as primary |
| **Observation** | RIC as parallel observer |

```
User Request
     │
     ▼
application-runtime-adapter.ts
     │
     ├─── RIE.assemble()  → RuntimeContext  → Executive → Response
     │
     └─── RIC.assemble()  → RuntimeContext  → Logged & Compared (not used)
```

**Duration**: 3-5 days

**Success Criteria**:
- [ ] RIC completes < 3s for 95%+ of requests
- [ ] RIC output matches RIE output for 80%+ of queries
- [ ] No RIC-related errors crash the system
- [ ] Comparison data collected and reviewed

**Rollback**: Remove RIC call from adapter → instant revert to pure RIE.

---

## Phase B: Shadow Execution

| Layer |  |
|---|---|
| **Status** | 🟡 Production (RIC primary, RIE shadow) |
| **Execution** | RIC as primary |
| **Fallback** | RIE as fallback if RIC fails |
| **Observation** | RIE runs in parallel, logged for comparison |

```
User Request
     │
     ▼
application-runtime-adapter.ts
     │
     ├─── RIC.assemble()  → RuntimeContext  → Executive → Response
     │     (if RIC fails → RIE.assemble())
     │
     └─── RIE.assemble()  → RuntimeContext  → Logged (always runs in parallel)
```

**Duration**: 5-7 days

**Success Criteria**:
- [ ] RIC fallback rate < 2%
- [ ] RIC matches RIE > 90%
- [ ] Executive response quality maintained
- [ ] No regression in user-facing behavior

**Rollback**: Swap primary back to RIE (feature flag `RIC_ENABLED=false`).

---

## Phase C: Cutover

| Layer |  |
|---|---|
| **Status** | 🟢 Production (RIC primary) |
| **Execution** | RIC as primary |
| **Fallback** | Cached context (last-known-good, 5 min TTL) |
| **RIE removed** | No longer runs |

```
User Request
     │
     ▼
application-runtime-adapter.ts
     │
     └─── RIC.assemble()  → RuntimeContext  → Executive → Response
           (if RIC fails → cached context)
```

**Duration**: 3-5 days

**Success Criteria**:
- [ ] Cache hit rate > 80% for repeat queries
- [ ] Graceful degradation during RIC failures
- [ ] No user-facing impact observed

**Rollback**: Re-enable RIE fallback (revert to Phase B config).

---

## Phase D: Decommission

| Layer |  |
|---|---|
| **Status** | ✅ Production (RIC only) |
| **Execution** | RIC as primary |
| **Old RIE modules** | Deleted from codebase |

```
User Request
     │
     ▼
application-runtime-adapter.ts
     │
     └─── RIC.assemble()  → RuntimeContext  → Executive → Response
```

**Actions**:
1. Verify zero remaining imports from deleted RIE modules
2. Delete `intent/`, `domain/` directories
3. Replace old module implementations with new RIC versions
4. Update barrel exports
5. Full build + test suite

**Rollback**: `git revert <deletion-commit>` + rebuild + redeploy.

---

## Migration Timeline

```
Phase A: Data Collection   ████████░░░░   3-5 days
Phase B: Shadow Execution  ██████████████ 5-7 days
Phase C: Cutover           ████████░░░░   3-5 days
Phase D: Decommission      ████░░░░░░░░   1-2 days
                           ──────────────
                           12-19 days total
```

## Feature Flag Configuration

```typescript
// config/features.ts
export const RIC_CONFIG = {
  // Phase A: enabled=true, useForExecution=false
  // Phase B: enabled=true, useForExecution=true, rieFallback=true
  // Phase C: enabled=true, useForExecution=true, rieFallback=false
  // Phase D: enabled=true, useForExecution=true, rieFallback=false, rieDeleted=true
  enabled: true,
  useForExecution: false,
  rieFallback: true,
  cacheOnlyFallback: false,
  compareAndLog: true,
};
```
