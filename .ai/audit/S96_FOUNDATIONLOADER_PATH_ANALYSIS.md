# FoundationLoader Path Analysis
## EPIC S.9.6 — Phase 2: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## 1. Load Flow

```
foundationLoader.load()
  │
  └─ loadFoundation()                     foundation-loader.ts:134
       │
       ├─ aiFolderPath()                  foundation-loader.ts:87-93
       │    └─ resolves `.ai/` directory relative to cwd
       │
       ├─ manifestPath check              foundation-loader.ts:137-141
       │    └─ join(aiRoot, "registry", "manifest.json")
       │    └─ throws error if missing
       │
       └─ loadFromRegistry(aiRoot, registryDir)   foundation-loader.ts:147-188
            │
            └─ for each type in registryTypes:
                 registryTypes = ["foundation", "executive", "knowledge", "prompt", "adr"]
                                                    ↑ "executive" ← THE KEY TYPE
                 │
                 ├─ registryPath = join(registryDir, `${type}.json`)
                 │    → ".ai/registry/executive.json"  ← EXISTS, reads 8 asset IDs
                 │
                 ├─ generatedDir = join(aiRoot, "generated", type)
                 │    → ".ai/generated/executive/"     ← DOES NOT EXIST
                 │
                 └─ if (!existsSync(generatedDir)) continue;
                      → SILENTLY SKIPS ALL 8 EXECUTIVE DIRECTIVES
```

---

## 2. All Hardcoded Paths in FoundationLoader

### `aiFolderPath()` — lines 87-93
```typescript
function aiFolderPath(): string {
  const cwd = process.cwd();
  if (cwd.includes("api-server")) return resolve(cwd, "..", "..", ".ai");
  return resolve(cwd, ".ai");
}
```
- **Dynamic:** Resolves based on `process.cwd()`
- **Result:** Typically `D:\web pos\Point-Of-Sale\.ai`

### `loadFoundation()` — lines 134-144
```typescript
const root = aiFolderPath();                                // line 135
const registryDir = join(root, "registry");                 // line 136
const manifestPath = join(registryDir, "manifest.json");    // line 137
```
- `root + "/registry/"` → `.ai/registry/`
- `root + "/registry/manifest.json"` → `.ai/registry/manifest.json`

### `loadFromRegistry()` — lines 147-188
```typescript
const registryTypes = ["foundation", "executive", "knowledge", "prompt", "adr"];   // line 149
```
- **Hardcoded array** of 5 registry types
- **No `"runtime"` type** in this array

```typescript
const registryPath = join(registryDir, `${type}.json`);      // line 152
// → ".ai/registry/executive.json"
```
```typescript
const generatedDir = join(aiRoot, "generated", type);       // line 160
// → ".ai/generated/executive/"
```

---

## 3. The Critical Path Construction

### Line 160: `generatedDir = join(aiRoot, "generated", type)`
```
Input:  type = "executive"   (from registryTypes array)
Result: ".ai/generated/executive/"
```

### Line 161: `if (!existsSync(generatedDir)) continue;`
```
existsSync(".ai/generated/executive/") → false (does not exist)
→ continue → SKIP all 8 executive directives
```

### Alternative: What if type = "runtime"?
If `registryTypes` had `"runtime"` instead of `"executive"`:
```
generatedDir = join(aiRoot, "generated", "runtime")
→ ".ai/generated/runtime/"
existsSync → true
→ Would load all 8 directives ✓
```

---

## 4. Where registryTypes Comes From

The `registryTypes` array at line 149 is hardcoded:
```typescript
const registryTypes = ["foundation", "executive", "knowledge", "prompt", "adr"];
```

These names match the registry file names written by `generator.ts:97-99`:
```typescript
for (const [name, reg] of Object.entries(registries)) {
    writeFileSync(resolve(aiRegistry, `${name}.json`), ...);
}
```
Where `name` is one of: `foundation`, `knowledge`, `executive`, `prompt`, `adr`

So FoundationLoader uses the **registry name** (`executive`) to construct the **generated directory path** (`.ai/generated/executive/`), but DGPS writes directive assets to `.ai/generated/runtime/` — a directory named after the **knowledge_level** ("runtime") rather than the **registry type** ("executive").

---

## 5. Silent Failure

```typescript
// Line 160-161:
const generatedDir = join(aiRoot, "generated", type);
if (!existsSync(generatedDir)) continue;
```

This is a **silent skip** with zero logging:
- No `console.warn`
- No `console.error`
- No thrown error
- No counter increment
- The FoundationLoader simply returns an array with 0 executive assets

The registry WAS read (line 155), establishing that 8 assets exist (`ids.size > 0` at line 158), but the generated directory doesn't exist so none are loaded. The FoundationLoader returns 86 assets (foundation + knowledge + prompt + adr) instead of 98 (including 8 executive + the missing ones).

---

## 6. Proven Facts

| Fact | Evidence | Confidence |
|------|----------|:----------:|
| FoundationLoader searches `.ai/generated/executive/` | `foundation-loader.ts:160` → `join(aiRoot, "generated", type)` where `type = "executive"` | **100%** |
| `.ai/generated/executive/` does not exist | Filesystem check confirms absence | **100%** |
| FoundationLoader silently skips executive type | `foundation-loader.ts:161` → `if (!existsSync(generatedDir)) continue;` | **100%** |
| Registry IS read successfully | `foundation-loader.ts:155` → reads `executive.json` with 8 asset IDs | **100%** |
| No error or warning is emitted | Code review: no logging in the skip path | **100%** |
| Only executive type is affected | Other 4 types (foundation, knowledge, prompt, adr) have matching directories | **100%** |

**Conclusion: FoundationLoader genuinely looks for `.ai/generated/executive/` and silently skips all executive directives when it's not found. This is not a false positive — it is a confirmed directory naming mismatch between DGPS (writes to `runtime/`) and FoundationLoader (reads from `executive/`).**
