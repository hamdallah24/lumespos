# Confidence Report
## EPIC S.9.6 — Phase 9: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## P0-1: DGPS Directory Mismatch

| Metric | Value |
|--------|-------|
| **Confidence** | **100%** |
| **Type** | Configuration bug (directory naming) |
| **Evidence source** | Source code line-by-line analysis |
| **Multiple independent proofs** | 5 corroborating code locations |

### Evidence Chain:
1. `paths.ts:21` — `aiGeneratedRuntime` hardcoded to `"runtime"` directory ✅
2. `publish.ts:49,56` — writes directives to `p.aiGeneratedRuntime` ✅
3. `compile.ts:26,33` — same pattern in compile command ✅
4. `foundation-loader.ts:149,160` — searches `generated/${type}` where `type = "executive"` ✅
5. `foundation-loader.ts:161` — `existsSync` check → silent skip ✅
6. Filesystem: `.ai/generated/runtime/` exists, `.ai/generated/executive/` does not ✅
7. `verify.ts:32` — DGPS verify also expects `"runtime"` (same bug direction) ✅
8. `verify-runtime.ts:27` — DGPS verify-runtime also expects `"runtime"` ✅

### Could this be a false positive?
**No.** The mismatch is confirmed by reading the actual source code at multiple points. The filesystem was also checked to confirm the directory exists at `runtime/` not `executive/`. All evidence converges.

---

## P0-2: CHRO Missing from ROLE_DIRECTIVE_MAP

| Metric | Value |
|--------|-------|
| **Confidence** | **100%** |
| **Type** | Missing data (omission error) |
| **Evidence source** | Source code line-by-line inspection |

### Evidence Chain:
1. `runtime-domain.ts:7-15` — Map has 7 entries, CHRO is the 8th missing ✅
2. Every other executive (CEO, CTO, COO, CFO, CMO, CAIO, CKO) confirmed present ✅
3. Map is `Record<string, string>` — no TypeScript error for missing keys ✅
4. Registry `executive.json:66-74` — confirms `chro-directive` IS a valid asset ✅
5. Compiled file exists at `.ai/generated/runtime/chro-directive.directive.json` ✅
6. `CHROProgram.ts:28` — confirms CHRO calls `getDirective("CHRO")` ✅
7. `CHROProgram.ts:29` — confirms fallback to empty string ✅

### Could this be a false positive?
**No.** The missing key is directly visible in the source code. The map definition at line 7-15 is 13 lines long with 7 entries; CHRO is simply not among them.

---

## P1-A: ConsultantProvider reads docs/

| Metric | Value |
|--------|-------|
| **Confidence** | **100%** |
| **Type** | Architecture violation (bypass) |
| **Evidence source** | Source code line-by-line analysis |

### Evidence Chain:
1. `consultant-provider.ts:28` — `"docs/PROJECT_CONTEXT.md"` in rootFiles array ✅
2. `consultant-provider.ts:37-39` — `existsSync` + `readFileSync` for the path ✅
3. `consultant-provider.ts:185` — `"docs/architecture/"` in HARDCODED_MAP ✅
4. `consultant-provider.ts:190` — `"docs/PROJECT_CONTEXT.md"` in ROOT_KEYWORD_MAP ✅
5. CEOProgram.ts import + call of `consultantRuntime.translateToTargets()` ✅

### Could this be a false positive?
**No.** The file path `"docs/PROJECT_CONTEXT.md"` is clearly present in the source code as a string literal in the `rootFiles` array. The `readFileSync` call is on line 39. The only guard is `existsSync` on line 37 which checks if the file exists before reading — this is a safety check, not a functional bypass of the `docs/` path.

---

## P1-B: ConsultantDiscovery scans docs/

| Metric | Value |
|--------|-------|
| **Confidence** | **100%** |
| **Type** | Architecture violation (scope) |
| **Evidence source** | Source code line-by-line analysis |

### Evidence Chain:
1. `consultant-discovery.ts:56` — `"docs"` in SCAN_DIRS array ✅
2. `consultant-discovery.ts:65` — `"docs/PROJECT_CONTEXT.md"` in ROOT_CONTEXT_FILES ✅
3. `consultant-discovery.ts:68` — `.md` in EXTENSIONS set ✅
4. `consultant-discovery.ts:80-105` — `scanFiles()` recursively reads all files ✅

### Could this be a false positive?
**No.** The string `"docs"` in the SCAN_DIRS array at line 56 is visible in the source. The `scanFiles` function uses `readdirSync` with `recursive: true` on each SCAN_DIRS entry, which means every file under `docs/` is listed and every matching extension (including `.md`) file is read via `readFileSync`.

---

## P1-C: MissionContextRegistry scans docs/

| Metric | Value |
|--------|-------|
| **Confidence** | **100%** |
| **Type** | Architecture violation (scope) |
| **Evidence source** | Source code line-by-line analysis |

### Evidence Chain:
1. `MissionContextRegistry.ts:10` — `"docs/"` in WORKSPACE_WHITELIST ✅
2. `MissionContextRegistry.ts:27` — `.md` in ALLOWED_EXTENSIONS ✅
3. `MissionContextRegistry.ts:35` — `readdirSync` with `recursive: true` ✅
4. `MissionContextRegistry.ts:54` — `readFileSync` for content reading ✅

### Could this be a false positive?
**No.** The string `"docs/"` at line 10 is a literal in the whitelist array. The `scanLocalFiles()` function iterates all whitelisted directories including `docs/` and enumerates all files recursively.

---

## False Positive Verification

| Finding from S.9.5 | Verified? | Confidence | Notes |
|-------------------|:---------:|:----------:|-------|
| **P0-1**: DGPS writes to runtime/, FL reads from executive/ | ✅ **CONFIRMED** | 100% | 8 corroborating code locations |
| **P0-2**: CHRO missing from ROLE_DIRECTIVE_MAP | ✅ **CONFIRMED** | 100% | Direct source code inspection |
| **P1-A**: ConsultantProvider reads docs/ | ✅ **CONFIRMED** | 100% | readFileSync with "docs/" path |
| **P1-B**: ConsultantDiscovery scans docs/ | ✅ **CONFIRMED** | 100% | "docs" in SCAN_DIRS |
| **P1-C**: MissionContextRegistry scans docs/ | ✅ **CONFIRMED** | 100% | "docs/" in WORKSPACE_WHITELIST |

### Potential false positives from S.9.5 that were investigated and DISMISSED:

| Potential Finding | Result | Reason |
|------------------|:------:|--------|
| OrganizationEngine reads markdown | ✅ **NOT a docs/ violation** | Reads from `.ai/runtime/registry/`, not from `docs/`. Has built-in defaults fallback. |
| ArchitectureRegistry references docs/ | ✅ **NOT a docs/ violation** | Static metadata only. No `readFileSync` calls. Paths are documentation, not file reads. |
| Foundation domain comments reference .md files | ✅ **NOT a docs/ violation** | Comments only. Actual code uses `getAssetContent()` from FoundationLoader. |
| KnowledgeEvolution/ReflectionEngine reference .md | ✅ **NOT a docs/ violation** | Proposal output strings, not file reads. |

**No false positives were found in the original S.9.5 audit.** All P0 and P1 findings have been verified with 100% confidence.
