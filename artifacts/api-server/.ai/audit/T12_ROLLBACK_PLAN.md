# T12.0 — Rollback Plan

## 1. Rollback Strategy Overview

| Level | Trigger | Action | Recovery Time | Data Loss |
|-------|---------|--------|---------------|-----------|
| **L1 — Route Level** | AI chat returns errors | Restore old route handler | < 5 min | None |
| **L2 — Adapter Level** | executeMessage behavior broken | Revert to application-runtime-adapter | < 15 min | None |
| **L3 — Executive Level** | Executive decision quality degraded | Revert per-executive to old signature | < 30 min | None |
| **L4 — Pipeline Level** | EIOS pipeline fails | Remove ric_assemble stage | < 10 min | None |
| **L5 — Full Rollback** | Multiple failures | Revert all changes to last stable commit | < 60 min | None |

## 2. Rollback Procedure — L1 (Route Level)

### Trigger Conditions
- `POST /api/ai/chat` returns 4xx/5xx errors
- SSE streaming not delivering events
- Auth errors after route change

### Procedure
```bash
# 1. Identify the issue
grep -r "RuntimeGateway" routes/ai.ts
# If RuntimeGateway import/call exists:

# 2. Revert routes/ai.ts to stable version
git checkout HEAD -- src/routes/ai.ts

# 3. Restart server
npm run build && npm run start

# 4. Verify
curl -X POST /api/ai/chat -H "Content-Type: application/json" \
  -d '{"message":"test","userId":1}'
```

### Estimated Time: < 5 minutes

## 3. Rollback Procedure — L2 (Adapter Level)

### Trigger Conditions
- `RuntimeGateway.assemble()` throws errors
- RIC pipeline failures
- `RICAdapter` initialization failures

### Procedure
```bash
# 1. Restore application-runtime-adapter.ts
git checkout HEAD -- src/ai/runtime/application-runtime-adapter.ts

# 2. Restore routes/ai.ts to use applicationRuntime
# Revert the import change
git checkout HEAD -- src/routes/ai.ts

# 3. Rebuild
npm run build

# 4. Restart
npm run start

# 5. Verify all 3 callers still work:
#   - routes/ai.ts: POST /api/ai/chat
#   - proposal-executor.ts: executeApprovedProposal()
#   - mission-background-engine.ts: dailyAnalysis(), ceoReview(), ceoSummary()
```

### Estimated Time: < 15 minutes

## 4. Rollback Procedure — L3 (Executive Level)

### Trigger Conditions
- Specific executive returns wrong results after migration
- CEO/CTO/COO/etc. produces unexpected decisions
- Executive confidence scores drop

### Procedure (Per Executive, e.g., CEO)

```bash
# 1. Revert CEO implementation
git checkout HEAD -- src/executive-runtime/executives/CEO/

# 2. Verify CEO export still matches old interface
#   Old: execute(ctx: CEOContext) → CEOResult
#   If RuntimeGateway calls new signature, add adapter:

# 3. Add temporary adapter in application-runtime-adapter or RuntimeGateway
const ceoAdapter = {
  async execute(ctx: RuntimeContext) {
    // Convert RuntimeContext → CEOContext
    const legacyCtx = {
      message: ctx.intelligence.intent,
      userId: ctx.runtime.trace.userId,
      // ... map remaining fields
    };
    return ceoRuntime.execute(legacyCtx);
  }
};

# 4. Restart
npm run build && npm run start

# 5. Verify CEO responses
```

### Repeat for each executive that needs rollback (CTO, CFO, COO, etc.)
### Estimated Time: < 30 minutes per executive

## 5. Rollback Procedure — L4 (Pipeline Level)

### Trigger Conditions
- EIOS pipeline execution fails
- `ric_assemble` stage throws errors
- Pipeline DAG validation fails

### Procedure
```bash
# 1. Remove ric_assemble stage registration
# Edit: src/eios-runtime/stages/index.ts
# Remove or comment out the ric_assemble stage definition

# 2. Restore brief_generator stage to produce ExecutiveBrief
# (Already exists, may need to re-enable if it was disabled)

# 3. Restore executive_runtime stage to use ExecutiveBrief
# Revert to: ExecutiveDispatchRegistry.dispatch(role, brief, {})
git checkout HEAD -- src/eios-runtime/stages/index.ts

# 4. Rebuild and restart

# 5. Verify pipeline execution via TriggerEngine
```

### Estimated Time: < 10 minutes

## 6. Full Rollback Procedure — L5

### Trigger Conditions
- Multiple simultaneous failures across L1-L4
- System-wide degradation > 50%
- Critical bug found in RIC core

### Procedure
```bash
# 1. Identify last stable commit
git log --oneline -20

# 2. Full revert of all migrated directories
git checkout <stable-commit-hash> -- \
  src/routes/ai.ts \
  src/ai/runtime/ \
  src/runtime-intelligence-core/ \
  src/eios-runtime/stages/index.ts \
  src/executive-runtime/executives/CEO/ \
  src/executive-runtime/executives/CTO/ \
  src/executive-runtime/executives/CFO/ \
  src/executive-runtime/executives/COO/ \
  src/executive-runtime/executives/CMO/ \
  src/executive-runtime/executives/CAIO/ \
  src/executive-runtime/executives/CHRO/ \
  src/executive-runtime/executives/CKO/ \
  src/organization/executive-collaboration.ts

# 3. Revert gateway and compat changes
git checkout <stable-commit-hash> -- \
  src/runtime-intelligence/RuntimeIntelligenceCompat.ts \
  .ai/audit/

# 4. Clean rebuild
rm -rf dist/
npm run build

# 5. Restart
npm run start

# 6. Verify ALL critical paths:
#   - POST /api/ai/chat → CEO response
#   - EIOS pipeline execution
#   - Executive collaboration
#   - Mission background engine
```

### Estimated Time: < 60 minutes

## 7. Rollback Safety Net

### Git Branching Strategy

```
main          ─── (stable, production)
                  │
migration/t12 ────┼─── (active development)
                  │     │
                  │     ├── phase-1-runtime-gateway
                  │     ├── phase-2-executive-migration
                  │     ├── phase-3-eios-integration
                  │     └── phase-4-legacy-removal
                  │
                  └─── Each phase branches from main
                       Each phase merges to migration/t12 first
                       Final merge to main after ALL phases verified
```

### Feature Flags

```typescript
// Phase 1-4 feature flags (implemented in config or env vars)
const FEATURE_FLAGS = {
  USE_RUNTIME_GATEWAY: process.env.FEAT_RUNTIME_GATEWAY === 'true',
  USE_RIC_UNDERSTANDING: process.env.FEAT_RIC_UNDERSTANDING === 'true',
  USE_RIC_PLANNING: process.env.FEAT_RIC_PLANNING === 'true',
  USE_RIC_GROUNDING: process.env.FEAT_RIC_GROUNDING === 'true',
  USE_RIC_VERIFICATION: process.env.FEAT_RIC_VERIFICATION === 'true',
  USE_REPLAN_LOOP: process.env.FEAT_REPLAN_LOOP === 'true',
};

// All flags default to 'false' — zero risk on deploy
// Each flag flipped independently after validation
```

### Immediate Rollback Commands

```bash
# If deploy goes wrong, disable ALL RIC features instantly:
export FEAT_RUNTIME_GATEWAY=false
export FEAT_RIC_UNDERSTANDING=false
export FEAT_RIC_PLANNING=false
export FEAT_RIC_GROUNDING=false
export FEAT_RIC_VERIFICATION=false
export FEAT_REPLAN_LOOP=false
# Restart process — system falls back to old architecture
```

## 8. Verification Checklist (Post-Rollback)

| Check | Command/Script | Expected |
|-------|----------------|----------|
| Route accessible | `curl -X POST /api/ai/chat` | 200 OK |
| SSE streaming | `curl -N -X POST /api/ai/chat` | Events received |
| CEO response | Message without @mention | CEO response |
| CTO response | Message with @CTO | CTO response |
| EIOS pipeline | Trigger test event | Pipeline executes |
| Executive collaboration | Create test mission | All execs respond |
| Mission background | Wait for scheduled run | CTO analysis triggers |
| Proposal executor | Execute test proposal | CTO review triggers |
