# Producer vs Consumer Alignment
## EPIC S.9.6 — Phase 3: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## Alignment Table

### Directives (executive/runtime assets)

| Producer | DGPS Compiler | Consumer | FoundationLoader |
|----------|---------------|----------|------------------|
| File | `tools/dgps/src/commands/publish.ts:56` | File | `src/ai/runtime/foundation-loader.ts:160` |
| Function | `writeGeneratedAssets(p.aiGeneratedRuntime, ...)` | Function | `generatedDir = join(aiRoot, "generated", type)` |
| Directory | `.ai/generated/runtime/` | Directory | `.ai/generated/executive/` |
| Status | **MISMATCH** | | |

### All Asset Types

| Asset Type | Producer Directory | Consumer Directory | Match? |
|-----------|-------------------|-------------------|:-------:|
| **Directives** (executive) | `runtime/` | `executive/` | ❌ **MISMATCH** |
| Foundation | `foundation/` | `foundation/` | ✅ MATCH |
| Knowledge | `knowledge/` | `knowledge/` | ✅ MATCH |
| Prompt | `prompt/` | `prompt/` | ✅ MATCH |
| ADR | `adr/` | `adr/` | ✅ MATCH |

**Only executive/directive assets have a mismatch.** The other 4 types are perfectly aligned.

---

## Root Cause Analysis

### Why the mismatch exists

Two different naming conventions were used:

1. **DGPS paths.ts** (`tools/dgps/src/utils/paths.ts:21`):
   - Named `aiGeneratedRuntime` because the directive-compiler.ts line 52 sets `knowledge_level: "runtime"` for directives
   - The directory was named after the **knowledge_level**, not the **asset type** or **registry category**

2. **FoundationLoader** (`src/ai/runtime/foundation-loader.ts:149,160`):
   - Uses `registryTypes` array which matches registry file names
   - Registry file is named `executive.json` (from generator.ts:16)
   - Directory is derived from the **registry type name**: `generated/${type}` where type = "executive"

3. **Registry Generator** (`tools/dgps/src/registry/generator.ts:16,30-31`):
   - Names the registry category `"executive"` (not `"runtime"`)
   - Maps directive assets into `registries.executive` (line 31)
   - So registry type name = "executive", but output directory name = "runtime"

### Timeline
- DGPS compiler (`paths.ts`) was written first with `runtime/` directory
- Registry generator (`generator.ts`) was written later with `executive` registry name
- FoundationLoader was written to consume from directory matching registry type name
- The mismatch was never caught because the FoundationLoader silently skips non-existent directories

### Contributing Factor
The `verify.ts` and `verify-runtime.ts` verification commands also hardcode `"runtime"` (verify.ts:32, verify-runtime.ts:27), so DGPS internal verification also uses the wrong directory name — the same bug is reproduced in the verification tooling itself.

---

## Impact Summary

| Metric | Value |
|--------|-------|
| Affected asset count | 8 (all executive directives) |
| Assets loaded correctly | 0 of 8 (0%) |
| Assets that should be loaded | 8 of 8 (100%) |
| Assets silently dropped | 8 |
| Consumers affected | CEO, CTO, COO, CFO, CMO, CAIO, CKO, CHRO |
| Error or warning emitted | None (silent skip) |
| Other asset types affected | None (foundation, knowledge, prompt, adr all aligned) |
