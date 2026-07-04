# Architecture Audit Checklist — Lumé CMN v1.0

Run this checklist before every merge that touches architecture layers.

---

## P0 — Blocking (Must Pass)

### 1. Governor SSOT
```bash
# Must return exactly 1 result (execution-driver.ts:35)
rg "new ExecutionGovernor" src/
```

- [ ] Only `execution-driver.ts` instantiates `ExecutionGovernor`
- [ ] Governor lifecycle methods (`beforeCycle`, `afterCycle`, `shouldContinue`) only in execution layer

### 2. Runtime Purity
- [ ] No Runtime creates Governor
- [ ] No Runtime sets budget/exit/verification policy
- [ ] All Runtimes accept `ExecutionContract` parameter
- [ ] Runtime → Gateway → Adapter chain preserved (no direct Adapter imports)

### 3. No Reverse Dependencies
```bash
# Must return 0 results for DB function imports
rg "from.*routes/ai-helpers" src/ai/ | grep -E "remember|getHistory|getOrCreateConversation|clearMemory"
```

- [ ] `src/ai/` does not import DB functions from `src/routes/`
- [ ] Lower layer does not import from upper layer

### 4. No Circular Dependencies
- [ ] No file imports from a file that directly/transitively imports back
- [ ] Benign cycles (lazy imports in function bodies) are documented

### 5. Layer Separation
- [ ] Governance → Collective → Learning → Organization → Execution → LLM → Tools (one direction)
- [ ] No layer imports from a layer above it

### 6. Public Interface Stable
- [ ] `ExecutionPipeline.execute()` — signature unchanged
- [ ] `ExecutionDriver.run()` — signature unchanged
- [ ] `callDeepSeek()` — signature unchanged
- [ ] `callDeepSeekWithTools()` — signature unchanged
- [ ] `callLLMWithTools()` — signature unchanged
- [ ] `executeToolCall()` — signature unchanged

---

## P1 — Cleanup (Should Pass)

### 7. No Dead Imports
```bash
pnpm --filter ./artifacts/api-server run typecheck
```

- [ ] TypeScript compilation passes (pre-existing errors only)
- [ ] No unused imports in any file

### 8. No Dead Exports
- [ ] Every export is used by at least one consumer
- [ ] Compatibility exports are documented in `compatibility.md`

### 9. No Magic Numbers
- [ ] All thresholds from `policy-engine.ts` or `execution-policy.ts`
- [ ] No hardcoded `maxTokens=2000`, `confidence>85`, etc.

---

## P2 — Documentation (Should Pass)

### 10. ADR Updated
- [ ] Any architecture change has a corresponding ADR
- [ ] ADR status is ACCEPTED, not DRAFT

### 11. Module Registry Updated
- [ ] New modules registered in `module-registry.md`
- [ ] Future modules registered in `future-modules.md`

### 12. Foundation Integrity
- [ ] Foundation modules unchanged (execution-governor, execution-driver, execution-pipeline, llm-adapter, tool-adapter)
- [ ] If changed, corresponding ADR exists

---

## Quick Verification Script

```bash
#!/bin/bash
echo "=== Governor SSOT ==="
rg "new ExecutionGovernor" src/ | grep -v execution-driver && echo "FAIL" || echo "PASS"

echo "=== Reverse Deps ==="
rg "from.*routes/ai-helpers" src/ai/ | grep -E "remember|getHistory" && echo "FAIL" || echo "PASS"

echo "=== TypeScript ==="
pnpm --filter ./artifacts/api-server run typecheck 2>&1 | grep "error TS" | grep -v "requireAuth\|auth\.ts" && echo "FAIL (new errors)" || echo "PASS"

echo "=== Layer Separation ==="
rg "from.*governance" src/ai/runtime/execution/ && echo "FAIL" || echo "PASS"
rg "from.*governance" src/learning/ && echo "FAIL" || echo "PASS"

echo "=== Done ==="
```
