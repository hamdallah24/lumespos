# Minimal Fix Plan
## EPIC S.9.6 — Phase 8: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** NO code changes — proposal only

---

## Fix P0-1: DGPS Directory Mismatch

### Problem
DGPS writes directive assets to `.ai/generated/runtime/` but FoundationLoader reads from `.ai/generated/executive/`.

### Evidence
- Producer: `tools/dgps/src/utils/paths.ts:21` → `aiGeneratedRuntime` = `.ai/generated/runtime/`
- Consumer: `artifacts/api-server/src/ai/runtime/foundation-loader.ts:149,160` → type = `"executive"` → reads `.ai/generated/executive/`
- Registry name: `tools/dgps/src/registry/generator.ts:16` → registry category = `"executive"`

### Root Cause
The DGPS output directory name (`"runtime"`) does not match the registry category name (`"executive"`). The `paths.ts:21` constant was named after the `knowledge_level` field (`"runtime"`) instead of the registry type or asset category.

### Minimal Fix

**Option A (Recommended — 5 files, ~6 LOC changed):**
Rename DGPS output directory from `"runtime"` to `"executive"`:

1. `tools/dgps/src/utils/paths.ts:21` — Change path:
   - Before: `aiGeneratedRuntime: resolve(root, ".ai", "generated", "runtime")`
   - After: `aiGeneratedExecutive: resolve(root, ".ai", "generated", "executive")`

2. `tools/dgps/src/commands/publish.ts:49,56` — Update references:
   - `p.aiGeneratedRuntime` → `p.aiGeneratedExecutive` (2 occurrences)

3. `tools/dgps/src/commands/compile.ts:26,33` — Update references:
   - `p.aiGeneratedRuntime` → `p.aiGeneratedExecutive` (2 occurrences)

4. `tools/dgps/src/commands/verify.ts:32` — Update directory name:
   - `["runtime", "foundation", ...]` → `["executive", "foundation", ...]`

5. `tools/dgps/src/commands/verify-runtime.ts:27` — Update directory name:
   - `resolve(aiGenerated, "runtime", ...)` → `resolve(aiGenerated, "executive", ...)`

6. `bash` — Rename existing directory:
   - `mv .ai/generated/runtime .ai/generated/executive`
   - Or re-run `dgps publish`

**Option B (Not recommended — breaks naming convention):**
Change FoundationLoader's `registryTypes` to `"runtime"` instead of `"executive"`:
- Requires changing `foundation-loader.ts:149` AND renaming `executive.json` to `runtime.json` in registry
- Would diverge from the registry type name, causing consistency issues

### Regression Risk
- **Low** — Directory rename is a pure filesystem operation plus constant changes. No logic changes.
- **Verification:** Run `dgps verify` and `dgps verify-runtime` — both use the same updated path
- **Rollback:** Restore original directory name or re-run `dgps publish`

### Affected Files
| File | Change Type | LOC Changed |
|------|-------------|:-----------:|
| `tools/dgps/src/utils/paths.ts:21` | Constant rename | 1 |
| `tools/dgps/src/commands/publish.ts:49,56` | Variable rename | 2 |
| `tools/dgps/src/commands/compile.ts:26,33` | Variable rename | 2 |
| `tools/dgps/src/commands/verify.ts:32` | Array string | 1 |
| `tools/dgps/src/commands/verify-runtime.ts:27` | Path string | 1 |
| **Total** | | **~7 LOC** |

---

## Fix P0-2: CHRO Missing from ROLE_DIRECTIVE_MAP

### Problem
`ROLE_DIRECTIVE_MAP` in `runtime-domain.ts` has 7 entries but omits CHRO.

### Evidence
- `runtime-domain.ts:7-15` — Map: CEO, CTO, COO, CFO, CMO, CAIO, CKO. CHRO absent.
- `runtime-domain.ts:27-28` — `ROLE_DIRECTIVE_MAP[role.toUpperCase()]` returns undefined for CHRO → returns null
- `executive.json:66-74` — `chro-directive` IS registered with valid checksum
- `.ai/generated/runtime/chro-directive.directive.json` — Compiled asset exists

### Root Cause
The `runtime-domain.ts` file was not updated when the CHRO executive was created. The initial map (CEO, CTO, COO) was extended with CFO, CMO, CAIO, CKO over time but CHRO was missed.

### Minimal Fix

**1 file, 1 line added:**

`artifacts/api-server/src/ai/runtime/foundation/domains/runtime-domain.ts:15` — Add CHRO entry:
```typescript
const ROLE_DIRECTIVE_MAP: Record<string, string> = {
  CEO: "ceo-directive",
  CTO: "cto-directive",
  COO: "coo-directive",
  CFO: "cfo-directive",
  CMO: "cmo-directive",
  CAIO: "caio-directive",
  CKO: "cko-directive",
  CHRO: "chro-directive",    // ← ADD THIS LINE
};
```

**Note:** This fix alone is insufficient — the directory mismatch (P0-1) must also be fixed, otherwise `getAssetContent("chro-directive")` still returns empty.

### Regression Risk
- **Very low** — Adding a key to a TypeScript `Record<string, string>`. No existing behavior changes.
- All 7 existing executives continue working identically.
- CHRO begins resolving its directive ID correctly.
- **Still blocked by** the directory mismatch until P0-1 is also fixed.

### Affected Files
| File | Change Type | LOC Changed |
|------|-------------|:-----------:|
| `runtime-domain.ts:15` | Add 1 line | 1 |
| **Total** | | **~1 LOC** |

---

## Fix P1-A: ConsultantProvider reads docs/

### Problem
ConsultantProvider reads `docs/PROJECT_CONTEXT.md`, `.ai/PROJECT_CONTEXT.md`, `.ai/README.md` via direct `readFileSync` instead of FoundationLoader.

### Evidence
- `consultant-provider.ts:26-28` — Hardcoded file paths including `"docs/PROJECT_CONTEXT.md"`
- `consultant-provider.ts:37-39` — `existsSync` + `readFileSync` bypass
- Called from `CEOProgram.ts` during question processing

### Root Cause
The `getRootProjectContext()` method was written before DGPS compiled assets existed. It reads raw markdown files for project context because there was no FoundationLoader to query.

### Minimal Fix

**Option A (Compile PROJECT_CONTEXT.md as DGPS asset):**
1. Add `docs/PROJECT_CONTEXT.md` and `.ai/PROJECT_CONTEXT.md` to DGPS scanner's source directories
2. `consultant-provider.ts` — Replace `readFileSync` with `foundationLoader.load()`:
   ```typescript
   const assets = foundationLoader.load();
   const contextAsset = assets.find(a => a.id === "project-context");
   const content = contextAsset?.content || "";
   ```

**Option B (Smaller scope — just remove docs/ read):**
1. Remove `"docs/PROJECT_CONTEXT.md"` from `rootFiles` array (line 28)
2. Keep `.ai/PROJECT_CONTEXT.md` and `.ai/README.md` reads for now
3. Add DGPS compilation of `.ai/PROJECT_CONTEXT.md` as a future task

### Regression Risk
- **Option A:** Medium — requires DGPS scanner to index `PROJECT_CONTEXT.md` files, plus re-publish
- **Option B:** Low — just removes one file path check. Content from `.ai/PROJECT_CONTEXT.md` still available.

### Affected Files
| File | Change Type | LOC Changed |
|------|-------------|:-----------:|
| `consultant-provider.ts:28` | Remove path from array | 1 |
| (Option A) `tools/dgps/src/scanner/scanner.ts` | Add scan source | ~5 |
| **Total (Option B):** | | **~1 LOC** |

---

## Fix P1-B: ConsultantDiscovery scans docs/

### Problem
`SCAN_DIRS` includes `"docs"` — the entire docs/ directory is recursively scanned for file mapping.

### Evidence
- `consultant-discovery.ts:56` — `"docs"` in `SCAN_DIRS` array
- `consultant-discovery.ts:65` — `"docs/PROJECT_CONTEXT.md"` in `ROOT_CONTEXT_FILES`
- `consultant-discovery.ts:68` — `.md` in `EXTENSIONS` set

### Minimal Fix
1. Remove `"docs"` from `SCAN_DIRS` array (line 56)
2. Remove `"docs/PROJECT_CONTEXT.md"` from `ROOT_CONTEXT_FILES` (line 65)
3. (Optional) Keep `.ai/PROJECT_CONTEXT.md` in `ROOT_CONTEXT_FILES`

### Regression Risk
- **Low-Medium** — File map will no longer include docs/ files. CKO keyword search for docs/ paths will return no matches. If docs/ content is important for CKO advisory, it needs to be compiled as DGPS knowledge assets instead.
- **Safe removal** — the file map is a cache; missing entries just means no hits from those directories

### Affected Files
| File | Change Type | LOC Changed |
|------|-------------|:-----------:|
| `consultant-discovery.ts:56` | Remove `"docs"` from array | 1 |
| `consultant-discovery.ts:65` | Remove `"docs/PROJECT_CONTEXT.md"` | 1 |
| **Total** | | **~2 LOC** |

---

## Fix P1-C: MissionContextRegistry scans docs/

### Problem
`WORKSPACE_WHITELIST` includes `"docs/"` — allows scanning and reading of all docs/ files.

### Evidence
- `MissionContextRegistry.ts:10` — `"docs/"` in `WORKSPACE_WHITELIST`
- `MissionContextRegistry.ts:27` — `.md` in `ALLOWED_EXTENSIONS`
- `MissionContextRegistry.ts:35` — `readdirSync` recursive scan
- `MissionContextRegistry.ts:54` — `readFileSync` file content read

### Minimal Fix
1. Remove `"docs/"` from `WORKSPACE_WHITELIST` (line 10)

### Regression Risk
- **Low** — Primary path is GitHub API. Local file scan is fallback only. Removing `docs/` means the fallback won't include documentation files. Mission context resolution for queries that need docs/ will fail when GitHub API is unavailable.
- **Acceptable** — FoundationLoader already provides compiled knowledge via registry; mission context should use this instead of raw docs/ scanning.

### Affected Files
| File | Change Type | LOC Changed |
|------|-------------|:-----------:|
| `MissionContextRegistry.ts:10` | Remove `"docs/"` from array | 1 |
| **Total** | | **~1 LOC** |

---

## Summary of All Fixes

| Finding | Files | LOC | Risk | Dependency |
|---------|:-----:|:---:|:----:|:----------:|
| **P0-1**: Dir mismatch | 5 DGPS files | ~7 | Low | None |
| **P0-2**: CHRO map | 1 runtime file | ~1 | Very Low | P0-1 must also be fixed |
| **P1-A**: Consultant docs/ | 1 consultant file | ~1 | Low | May need DGPS scanner update |
| **P1-B**: ConsultantDiscovery | 1 consultant file | ~2 | Low-Med | May affect CKO file map |
| **P1-C**: MissionContextRegistry | 1 knowledge file | ~1 | Low | Acceptable trade-off |
| **Total** | **~8 files** | **~12 LOC** | | |

### Execution Order
1. Fix P0-1 (dir mismatch) → re-run `dgps publish`
2. Fix P0-2 (CHRO map) → verify `getDirective("CHRO")` returns content
3. Fix P1-A (ConsultantProvider) → optionally with DGPS scanner update
4. Fix P1-B (ConsultantDiscovery) → remove docs/ from scan
5. Fix P1-C (MissionContextRegistry) → remove docs/ from whitelist
