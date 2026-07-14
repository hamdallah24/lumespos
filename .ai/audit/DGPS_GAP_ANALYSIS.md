# DGPS Gap Analysis
## EPIC S.9.5 — Phase 9
**Date:** 2026-07-14

---

## Gap Classification

| Priority | Definition |
|----------|------------|
| **P0** | Runtime-breaking — causes empty/corrupt data in critical path |
| **P1** | Architecture violation — bypasses FoundationLoader to read docs/ |
| **P2** | Incomplete integration — asset compiled but not consumed by runtime |
| **P3** | Technical debt — metadata gaps, dead code, naming inconsistencies |

---

## P0 — Runtime-Breaking

### GAP-1: Executive directives compiled to wrong directory
- **Severity:** P0
- **Component:** DGPS Compiler (`tools/dgps/src/utils/paths.ts:21`)
- **Issue:** `aiGeneratedRuntime` resolves to `.ai/generated/runtime/` but FoundationLoader expects `.ai/generated/executive/`
- **Impact:** ALL 8 executive directives return empty strings at runtime. CEO, CTO, COO, CFO, CMO, CAIO, CKO, CHRO run without directive content.
- **Fix:** Change DGPS output directory from `runtime/` to `executive/`:
  1. `paths.ts:21`: rename `aiGeneratedRuntime` → `aiGeneratedExecutive`, path `"runtime"` → `"executive"`
  2. `publish.ts:49,56`: use new path
  3. `compile.ts:26,33`: use new path
  4. `verify.ts:32`: change `"runtime"` → `"executive"`
  5. `verify-runtime.ts:27`: change `"runtime"` → `"executive"`
  6. Rename directory: `.ai/generated/runtime/` → `.ai/generated/executive/`

### GAP-2: CHRO missing from ROLE_DIRECTIVE_MAP
- **Severity:** P0
- **Component:** Runtime Domain (`runtime-domain.ts:7-15`)
- **Issue:** `ROLE_DIRECTIVE_MAP` has 7 entries (CEO, CTO, COO, CFO, CMO, CAIO, CKO) but NOT CHRO
- **Impact:** `getDirective("CHRO")` returns null. CHRO runs with empty directive.
- **Fix:** Add `CHRO: "chro-directive"` to `ROLE_DIRECTIVE_MAP`

### GAP-3: manifest.json total_assets mismatch
- **Severity:** P0 (metadata integrity)
- **Component:** DGPS Registry Generator (`tools/dgps/src/registry/generator.ts`)
- **Issue:** `total_assets: 98` vs actual 86 (off by 12)
- **Impact:** Registry metadata is unreliable
- **Fix:** Correct `total_assets` calculation in generator

---

## P1 — Architecture Violation

### GAP-4: ConsultantProvider reads docs/PROJECT_CONTEXT.md directly
- **Severity:** P1
- **Component:** Consultant (`src/programs/consultant/consultant-provider.ts:28,39`)
- **Issue:** Direct `readFileSync` of `docs/PROJECT_CONTEXT.md`, `.ai/PROJECT_CONTEXT.md`, `.ai/README.md`
- **Impact:** Bypasses FoundationLoader. CKO advisory context is not sourced from compiled assets.
- **Fix:** Compile PROJECT_CONTEXT.md via DGPS. Have ConsultantProvider read from FoundationLoader instead of direct filesystem.

### GAP-5: ConsultantDiscovery scans docs/ directory
- **Severity:** P1
- **Component:** Consultant (`src/programs/consultant/consultant-discovery.ts:56,99`)
- **Issue:** `SCAN_DIRS` includes `"docs"`. Recursively reads all files with `readFileSync`.
- **Impact:** Full filesystem scan of docs/ bypassing FoundationLoader.
- **Fix:** Remove `"docs"` from SCAN_DIRS. Source file maps from FoundationLoader compiled registry.

### GAP-6: MissionContextRegistry scans docs/ directory
- **Severity:** P1
- **Component:** Knowledge (`src/knowledge/MissionContextRegistry.ts:10,35,54`)
- **Issue:** `WORKSPACE_WHITELIST` includes `"docs/"`. Scans and reads `.md` files.
- **Impact:** Fallback path can read any docs/ file.
- **Fix:** Remove `"docs/"` from WORKSPACE_WHITELIST.

---

## P2 — Incomplete Integration

### GAP-7: CKO completely disconnected from FoundationLoader
- **Severity:** P2
- **Component:** CKO Executive (`src/executive-runtime/executives/CKO/CKOProgram.ts`)
- **Issue:** CKO never imports `getFoundationProvider()`, `getIdentity()`, or `assemble()`. Compiled directive is dead code.
- **Impact:** CKO uses hardcoded inline prompt fallback. Cannot be updated via DGPS.
- **Fix:** Refactor CKO to use `assemble()` + `getFoundationProvider().getDirective("CKO")`.

### GAP-8: COO bypasses PromptAssembler
- **Severity:** P2
- **Component:** COO Executive (`src/executive-runtime/executives/COO/COOProgram.ts:357-368`)
- **Issue:** Prompt is hand-concatenated inline. Three prompt constants hardcoded.
- **Impact:** COO doesn't benefit from PromptAssembler's structured blocks, token budgeting, or Foundation Knowledge injection.
- **Fix:** Refactor COO to use `assemble()`.

### GAP-9: Mental Model selector uses hardcoded array (not compiled asset)
- **Severity:** P2
- **Component:** Cognitive Pipeline (`MentalModelSelector.ts`)
- **Issue:** 20 models hardcoded in code. Compiled Mental Model Library (46 models) from DGPS is never consumed.
- **Impact:** Runtime only sees 20 models vs 46 documented. Cognitive selection is limited.
- **Fix:** Load mental models from FoundationLoader and populate selector dynamically.

### GAP-10: Framework selector uses hardcoded array (not compiled asset)
- **Severity:** P2
- **Component:** Cognitive Pipeline (`FrameworkSelector.ts`)
- **Issue:** 25 frameworks hardcoded. Compiled Framework Library (29 frameworks) never consumed.
- **Impact:** Same pattern as GAP-9.
- **Fix:** Load frameworks from FoundationLoader.

### GAP-11: Knowledge Architecture never compiled (orphan)
- **Severity:** P2
- **Component:** DGPS Scanner
- **Issue:** `executive-knowledge-architecture` in dependency graph but never compiled or registered.
- **Impact:** Asset absent from runtime.
- **Fix:** Add source document and compile via DGPS.

### GAP-12: Decision Models never compiled (orphan)
- **Severity:** P2
- **Component:** DGPS Scanner
- **Issue:** `executive-decision-model` in dependency graph but never compiled or registered.
- **Impact:** Asset absent from runtime.
- **Fix:** Add source document and compile via DGPS.

---

## P3 — Technical Debt

### GAP-13: dependency-graph.json has 0 edges
- **Severity:** P3
- **Component:** DGPS Dependency Graph
- **Issue:** 108 nodes, 0 edges. Node IDs don't match registry IDs.
- **Impact:** Dependency resolution provides no value.
- **Fix:** Populate edges based on `depends_on` metadata from compiled assets.

### GAP-14: All knowledge.json assets have empty consumers
- **Severity:** P3
- **Component:** DGPS Registry Generator
- **Issue:** All 42 knowledge assets have `"consumer": []`. No traceability.
- **Impact:** Cannot statically determine which runtime components consume which knowledge assets.
- **Fix:** Populate `consumer` field during generation based on asset metadata.

### GAP-15: foundation-loader.ts exports dead code parseMetadata()
- **Severity:** P3
- **Component:** FoundationLoader
- **Issue:** `parseMetadata()` is a YAML frontmatter parser exported but never called anywhere.
- **Impact:** Code bloat.
- **Fix:** Remove dead export.

---

## Summary

| Priority | Count | Examples |
|----------|:-----:|---------|
| **P0** | 3 | Wrong output directory, missing CHRO mapping, wrong total_assets |
| **P1** | 3 | ConsultantProvider, ConsultantDiscovery, MissionContextRegistry read docs/ |
| **P2** | 6 | CKO/COO disconnected, hardcoded selectors, orphan assets |
| **P3** | 3 | Empty dependency graph, empty consumers, dead code |
| **Total** | **15** | |
