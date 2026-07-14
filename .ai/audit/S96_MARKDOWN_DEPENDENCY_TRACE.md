# Markdown Dependency Trace
## EPIC S.9.6 — Phase 5: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## Finding P1-A: ConsultantProvider reads docs/

### Source file: `src/programs/consultant/consultant-provider.ts`

### Import (line 4):
```typescript
import { existsSync, readFileSync } from "fs";
```

### Direct filesystem reads (lines 22-50):
```typescript
private getRootProjectContext() {
  const rootFiles = [
    "package.json",
    "pnpm-workspace.yaml",
    ".ai/PROJECT_CONTEXT.md",       // ← markdown file
    ".ai/README.md",                 // ← markdown file
    "docs/PROJECT_CONTEXT.md",       // ← markdown file in docs/
  ];
  // ...
  for (const rel of rootFiles) {
    const full = resolve(cwd, rel);
    if (!existsSync(full)) continue;           // line 37
    foundFiles.push(rel);
    const content = readFileSync(full, "utf-8")  // line 39 — DIRECT FILE READ
      .slice(0, 2500);
    // ...
  }
}
```

### Call chain:
```
CEOProgram.ts → consultantRuntime.translateToTargets()
  → ConsultantDomain.translateToTargets()
    → this.getRootProjectContext()           ← direct filesystem reads
      → readFileSync("docs/PROJECT_CONTEXT.md")
      → readFileSync(".ai/PROJECT_CONTEXT.md")
      → readFileSync(".ai/README.md")
```

### Hardcoded docs/ paths (lines 185, 190):
```typescript
// Line 185 (HARDCODED_MAP):
"architecture": {
  targetFiles: ["docs/architecture/"],      // ← docs/ reference
  entities: ["architecture"],
  domain: "architecture",
  businessContext: "Context from architecture docs"
}

// Line 190 (ROOT_KEYWORD_MAP):
"project": {
  targetFiles: ["docs/PROJECT_CONTEXT.md"],  // ← docs/ reference
  entities: ["project"],
  domain: "architecture",
  businessContext: "Project context document"
}
```

### Impact:
| Aspect | Detail |
|--------|--------|
| Bypasses FoundationLoader? | ✅ YES — direct `readFileSync` |
| Reads from `docs/`? | ✅ YES — `docs/PROJECT_CONTEXT.md` |
| Reads from `.ai/` (non-compiled)? | ✅ YES — `.ai/PROJECT_CONTEXT.md`, `.ai/README.md` |
| Is this in Executive Runtime path? | ✅ YES — `src/programs/consultant/` |
| Called from CEO? | ✅ YES — `consultantRuntime.translateToTargets()` |
| Filesystem access method | `readFileSync` (synchronous, blocking) |

---

## Finding P1-B: ConsultantDiscovery scans docs/

### Source file: `src/programs/consultant/consultant-discovery.ts`

### Import (line 5):
```typescript
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
```

### SCAN_DIRS includes "docs" (line 56):
```typescript
const SCAN_DIRS = [
  // ... 20 other directories ...
  "docs",        // ← LINE 56: ENTIRE docs/ DIRECTORY
  "scripts",
];
```

### ROOT_CONTEXT_FILES includes docs/PROJECT_CONTEXT.md (line 65):
```typescript
const ROOT_CONTEXT_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  ".ai/PROJECT_CONTEXT.md",
  ".ai/README.md",
  "docs/PROJECT_CONTEXT.md",     // ← docs/ reference
];
```

### EXTENSIONS includes .md (line 68):
```typescript
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".sql", ".md"]);
```

### scanFiles() reads every file including markdown (lines 80-105):
```typescript
function scanFiles(dir: string) {
  const entries = readdirSync(fullPath, { withFileTypes: true, recursive: true });
  for (const e of entries) {
    if (!e.isFile() || !EXTENSIONS.has(extname(e.name).toLowerCase())) continue;
    // ...
    const fileContent = readFileSync(join(e.parentPath, e.name), "utf-8")
      .slice(0, 3000);
    results.push({ path: ..., content: fileContent });
  }
}
```

### Call chain:
```
consultant-discovery.ts (auto-run on startup or nightly)
  → scanFiles("docs")         ← recursive scan of ALL files in docs/
    → readFileSync for each .md file found
  → buildFileMap()             ← reads ROOT_CONTEXT_FILES including docs/PROJECT_CONTEXT.md
    → readFileSync("docs/PROJECT_CONTEXT.md")
```

---

## Finding P1-C: MissionContextRegistry scans docs/

### Source file: `src/knowledge/MissionContextRegistry.ts`

### Import (line 7):
```typescript
import { readdirSync, readFileSync, existsSync } from "fs";
```

### WORKSPACE_WHITELIST includes "docs/" (line 10):
```typescript
const WORKSPACE_WHITELIST = [
  "artifacts/", "src/", "workspace/", ".ai/",
  "docs/",                  // ← LINE 10: docs/ is whitelisted
  "lib/"
];
```

### ALLOWED_EXTENSIONS includes .md (line 27):
```typescript
const ALLOWED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".sql",
  ".md",                    // ← markdown files can be read
  ".yaml", ".yml", ".env.example"
]);
```

### scanLocalFiles() recursively scans docs/ (lines 29-48):
```typescript
function scanLocalFiles(): string[] {
  for (const dir of WORKSPACE_WHITELIST) {     // includes "docs/"
    const entries = readdirSync(fullPath, { withFileTypes: true, recursive: true });
    for (const e of entries) {
      if (!e.isFile()) continue;
      const ext = ...;
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;  // .md passes filter
      results.push(relative);
    }
  }
}
```

### getContent() reads markdown from docs/ (lines 93-116):
```typescript
async getContent(path: string): Promise<string | null> {
  if (!WORKSPACE_WHITELIST.some(w => path.startsWith(w))) return null;
  // path = "docs/executive-runtime/..." → STARTS WITH "docs/" → ALLOWED
  const local = readLocalFile(path);          // readFileSync
  // ...
}
```

### readLocalFile() (lines 50-58):
```typescript
function readLocalFile(path: string): string | null {
  const fullPath = join(PROJECT_ROOT, path);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf-8");     // reads ANY whitelisted file
}
```

### Call chain:
```
MissionContextRegistry.getRelevant(domain, message)
  → searchRepoFiles(message)  (GitHub API, primary)
  → if fails: scanLocalFiles()  ← scans "docs/" recursively, includes .md
  → getContent(path)            ← reads content from docs/ paths
    → readLocalFile(path)       ← readFileSync
```

---

## Summary: Markdown Dependency Classification

| Component | File | Pattern | Reads docs/? | Bypasses FoundationLoader? | Runtime Path? | Severity |
|-----------|------|---------|:------------:|:--------------------------:|:------------:|:--------:|
| ConsultantProvider | `consultant-provider.ts:28,39` | `readFileSync(path)` | ✅ `docs/PROJECT_CONTEXT.md` | ✅ | ✅ (CEO calls it) | **P1** |
| ConsultantDiscovery | `consultant-discovery.ts:56,65,99` | `readdirSync` + `readFileSync` | ✅ full `docs/` scan | ✅ | ✅ (startup/nightly) | **P1** |
| MissionContextRegistry | `MissionContextRegistry.ts:10,35,54` | `readdirSync` + `readFileSync` | ✅ `docs/` whitelisted | ✅ | ⚠️ (knowledge, not executive) | **P1** |

### Key Question: Is ConsultantProvider in the runtime path?

**YES.** `CEOProgram.ts` imports and calls `consultantRuntime.translateToTargets()` during question processing:
```typescript
// CEOProgram.ts (searched in S.9 phase 5)
const ckoTargets = await consultantRuntime.translateToTargets(ctx.message);
```

This means every CEO question triggers a markdown file read from `docs/PROJECT_CONTEXT.md`. This is a confirmed runtime path bypass.

### Not in runtime path:
- **ConsultantDiscovery** runs on startup or nightly schedule, not per-question. But it's still a violation of the purity principle.
- **MissionContextRegistry** is a fallback for the GitHub API. It's in the knowledge layer, not called directly by any executive per-question. But it can be triggered by the `getContent()` method.

### Not valid markdown dependencies (false positives from S.9.5):
- `SYSTEM_PROMPT.md` — **Zero reads** in runtime code. All executives use compiled directives from FoundationLoader.
- `EXECUTIVE_SPEC.md` — **Zero reads** in runtime code. Compiled into directive JSON.
- `PLAYBOOK.md` — **Zero reads** in runtime code. Compiled into directive JSON.
- `organization-engine.ts` reading `RUNTIME_REGISTRY.md` — Reads from `.ai/runtime/registry/`, NOT from `docs/`. Has built-in defaults fallback. Not a `docs/` violation.
