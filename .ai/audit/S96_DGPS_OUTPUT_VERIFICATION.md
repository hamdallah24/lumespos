# DGPS Output Verification
## EPIC S.9.6 — Phase 1: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## 1. Execution Flow: DGPS Publish Pipeline

### Flow Diagram
```
DGPS CLI (`dgps publish`)
  │
  ├─ [1/8] scanDocuments()                    tools/dgps/src/scanner/scanner.ts
  ├─ [2/8] validateDocuments()                tools/dgps/src/validator/validator.ts
  ├─ [3/8] buildDependencyGraph()              tools/dgps/src/compiler/graph.ts
  ├─ [4/8] compileDirectives(sources)          tools/dgps/src/compiler/directive-compiler.ts
  ├─ [4/8] compileFoundation(sources)          tools/dgps/src/compiler/foundation-compiler.ts
  ├─ [4/8] compileKnowledge(sources)           tools/dgps/src/compiler/knowledge-compiler.ts
  ├─ [4/8] compilePrompts(sources)             tools/dgps/src/compiler/prompt-compiler.ts
  ├─ [4/8] compileAdrs(sources)               tools/dgps/src/compiler/adr-compiler.ts
  │
  ├─ Write generated assets                   tools/dgps/src/commands/publish.ts:47-60
  │    DIRECTIVES  →  p.aiGeneratedRuntime     ← TARGET DIR
  │    FOUNDATIONS →  p.aiGeneratedFoundation
  │    KNOWLEDGE   →  p.aiGeneratedKnowledge
  │    PROMPTS     →  p.aiGeneratedPrompt
  │    ADRS        →  p.aiGeneratedAdr
  │
  ├─ [5/8] generateRegistries()               tools/dgps/src/registry/generator.ts
  ├─ [5/8] writeRegistries()                  tools/dgps/src/registry/generator.ts:85-113
  └─ [6/8] verifyAssets()
```

---

## 2. Path Resolution Chain

### `paths.ts:13-27` — All path definitions
```typescript
// File: tools/dgps/src/utils/paths.ts
// Lines 20-21:
aiGenerated:     resolve(root, ".ai", "generated"),
aiGeneratedRuntime: resolve(root, ".ai", "generated", "runtime"),    // ← hardcoded "runtime"
aiGeneratedFoundation: resolve(root, ".ai", "generated", "foundation"),
aiGeneratedKnowledge: resolve(root, ".ai", "generated", "knowledge"),
aiGeneratedPrompt: resolve(root, ".ai", "generated", "prompt"),
aiGeneratedAdr: resolve(root, ".ai", "generated", "adr"),
```

**Root cause:** Line 21 defines `aiGeneratedRuntime` pointing to directory `"runtime"`. No `aiGeneratedExecutive` path exists.

### `publish.ts:47-60` — Where assets are written
```typescript
// File: tools/dgps/src/commands/publish.ts
// Line 49:
ensureDir(p.aiGeneratedRuntime);                              // creates .ai/generated/runtime/
// Line 56:
writeGeneratedAssets(p.aiGeneratedRuntime, directives, "directive");  // writes *.directive.json to runtime/
```

### `assets.ts:9-18` — File writer
```typescript
// File: tools/dgps/src/utils/assets.ts
// Lines 15-16:
const file = resolve(dir, `${asset.id}.${ext}.json`);
writeFileSync(file, JSON.stringify(asset, null, 2), "utf-8");
```
For directives: `resolve(".ai/generated/runtime/", "ceo-directive.directive.json")`
→ **Output:** `.ai/generated/runtime/ceo-directive.directive.json`

### `compile.ts:26,33` — Same pattern in compile-only command
```typescript
// File: tools/dgps/src/commands/compile.ts
// Line 26:
ensureDir(p.aiGeneratedRuntime);
// Line 33:
const file = resolve(p.aiGeneratedRuntime, `${asset.id}.directive.json`);
```

---

## 3. Registry Generation

### `generator.ts:13-19` — Registry names
```typescript
// File: tools/dgps/src/registry/generator.ts
// Lines 13-19:
const registries: Record<string, Registry> = {
    foundation: { assets: {} },
    knowledge: { assets: {} },
    executive: { assets: {} },    // ← named "executive", not "runtime"
    prompt: { assets: {} },
    adr: { assets: {} },
};
```

### `generator.ts:30-31` — Directives map to "executive" registry
```typescript
// Lines 30-31:
if (asset.asset_type === "directive") {
    registries.executive.assets[asset.id] = entry;   // ← stores in "executive" registry
```

### `generator.ts:97-99` — Registry file written with registry name
```typescript
// Lines 97-99:
for (const [name, reg] of Object.entries(registries)) {
    writeFileSync(resolve(aiRegistry, `${name}.json`), ...);   // → executive.json
}
```

---

## 4. Actual Filesystem State

### Directories under `.ai/generated/`
```
Get-ChildItem .ai/generated/ -Directory
adr/          ← PRESENT
executive/    ← ABSENT (FoundationLoader expects this)
foundation/   ← PRESENT
graphs/       ← PRESENT (empty)
knowledge/    ← PRESENT
prompt/       ← PRESENT
runtime/      ← PRESENT (DGPS writes here)
```

### Directive files under `.ai/generated/runtime/`
```
Get-ChildItem .ai/generated/runtime/
caio-directive.directive.json
ceo-directive.directive.json    ← Written here by DGPS
cfo-directive.directive.json
chro-directive.directive.json
cko-directive.directive.json
cmo-directive.directive.json
coo-directive.directive.json
cto-directive.directive.json
```

---

## 5. Verification Commands Also Hardcode "runtime"

### `verify.ts:32` — DGPS verify expects "runtime"
```typescript
// File: tools/dgps/src/commands/verify.ts
// Line 32:
const genDirs = ["runtime", "foundation", "knowledge", "prompt", "adr", "graphs"];
```

### `verify-runtime.ts:27` — DGPS verify-runtime expects "runtime"
```typescript
// File: tools/dgps/src/commands/verify-runtime.ts
// Line 27:
const directivePath = resolve(aiGenerated, "runtime", `${exec}-directive.directive.json`);
```

---

## 6. Proven Facts

| Fact | Evidence | Confidence |
|------|----------|:----------:|
| DGPS writes directives to `.ai/generated/runtime/` | `paths.ts:21` → `aiGeneratedRuntime` = `.ai/generated/runtime/`; `publish.ts:49,56` writes to this path | **100%** |
| Registry names the category "executive" | `generator.ts:16` → `executive: { assets: {} }` | **100%** |
| Registry file written as `executive.json` | `generator.ts:97-99` → `"${name}.json"` where name = "executive" | **100%** |
| No `.ai/generated/executive/` directory exists | Filesystem listing shows `runtime/` exists, `executive/` does not | **100%** |
| All 8 directive files exist in `runtime/` | `ls .ai/generated/runtime/` shows 8 files | **100%** |

**Conclusion: DGPS writes to `.ai/generated/runtime/` but no consumer looks there for runtime/ type assets. The FoundationLoader looks for `.ai/generated/executive/` which does not exist. This is a confirmed P0 bug.**

---

## 7. Mapping Summary

```
DGPS Producer                     Consumer (FoundationLoader)
───────────────────────────────   ─────────────────────────────────
publish.ts:49                     foundation-loader.ts:160
ensureDir(p.aiGeneratedRuntime)   generatedDir = join(aiRoot, "generated", type)
  → ".ai/generated/runtime/"       → where type = "executive" (from registryTypes)
                                     → ".ai/generated/executive/"

publish.ts:56                     foundation-loader.ts:161
writeGeneratedAssets(             if (!existsSync(generatedDir)) continue;
  p.aiGeneratedRuntime,           → ".ai/generated/executive/" does not exist
  directives,                     → SILENTLY SKIPS all 8 executive directives
  "directive"
)
  → writes to ".ai/generated/runtime/"

MISMATCH: "runtime" ≠ "executive"
```
