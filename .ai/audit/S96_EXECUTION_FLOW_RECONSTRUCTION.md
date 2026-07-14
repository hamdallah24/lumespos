# Execution Flow Reconstruction
## EPIC S.9.6 — Phase 6: Root Cause Validation
**Date:** 2026-07-14 | **Rule:** No code changes — forensic analysis only

---

## Flow 1: CEO → Directive Resolution (The Critical Path)

```
User Question
  │
  ▼
CEOProgram.execute(ctx)                          CEOProgram.ts
  │
  ├── consultantRuntime.translateToTargets()     ← calls ConsultantProvider
  │     └── getRootProjectContext()               ← reads docs/PROJECT_CONTEXT.md (P1 bypass)
  │
  ├── getFoundationProvider().getDirective("CEO") foundation-provider.ts:51
  │     │
  │     └── runtimeDomain.directive("CEO")        runtime-domain.ts:26
  │           │
  │           ├── ROLE_DIRECTIVE_MAP["CEO"]       runtime-domain.ts:8
  │           │     = "ceo-directive"  ✅         ← CEO IS in map (unlike CHRO)
  │           │
  │           ├── getAssetContent("ceo-directive") foundation-cache.ts:83
  │           │     │
  │           │     └── foundationLoader.load()   foundation-loader.ts:230
  │           │           │
  │           │           ├── aiFolderPath()       → ".ai/"
  │           │           ├── manifest check       → ".ai/registry/manifest.json" ✅
  │           │           │
  │           │           └── loadFromRegistry()   foundation-loader.ts:147
  │           │                 │
  │           │                 ├── type = "executive"
  │           │                 ├── .ai/registry/executive.json   ✅ read (8 asset IDs)
  │           │                 │
  │           │                 └── .ai/generated/executive/  ❌ DOES NOT EXIST
  │           │                       │
  │           │                       └── existsSync → false
  │           │                             └── continue  ⛔ SILENTLY SKIPS
  │           │
  │           └── content = ""  ← EMPTY because no executive assets loaded
  │
  ├── directiveContent = ""     ← EMPTY STRING at runtime
  │
  ├── assemble({ directive: "", identity, ... })    prompt-assembler.ts
  │     └── BLOCK 1b: Directive = "" (empty)        ← NO DIRECTIVE IN PROMPT
  │
  └── callDeepSeek(systemPrompt, ...)
        └── LLM receives prompt WITHOUT directive instructions
```

### Result:
- CEO runs **without its compiled SYSTEM_PROMPT.md content**
- Prompt lacks: role definition, responsibilities, constraints, delegation rules
- LLM operates on identity (hardcoded) + foundation knowledge only
- **Partial degradation** — CEO still functions but without directive context

---

## Flow 2: CHRO → Directive Resolution (Double Failure)

```
CHROProgram.execute()                            CHROProgram.ts
  │
  └── getDirective()                              CHROProgram.ts:26
        │
        └── provider.getDirective("CHRO")         foundation-provider.ts:51
              │
              └── runtimeDomain.directive("CHRO") runtime-domain.ts:26
                    │
                    ├── ROLE_DIRECTIVE_MAP["CHRO"] runtime-domain.ts:7-15
                    │     = undefined  ❌ NOT IN MAP ← FAILURE 1
                    │
                    └── return null                runtime-domain.ts:28
                          │
                          └── content = ""         ← returns empty string
```

### Even if CHRO were in ROLE_DIRECTIVE_MAP:
```
                    ┌── getAssetContent("chro-directive")
                    │     └── foundationLoader.load()
                    │           └── loadFromRegistry()
                    │                 └── .ai/generated/executive/ ❌ DOES NOT EXIST
                    │                       └── continue  ⛔ SILENTLY SKIPS
                    └── content = ""             ← also empty due to dir mismatch
```

### Result:
- CHRO has **two blocking issues**: (1) missing from role map, (2) directory mismatch
- Prompt lacks ALL directive content
- Same degradation as CEO but worse — even if dir mismatch is fixed, CHRO still fails

---

## Flow 3: CKO — Completely Disconnected

```
CKOProgram.execute()                             CKOProgram.ts
  │
  ├── NO call to getFoundationProvider()
  ├── NO call to getDirective("CKO")
  ├── NO call to getIdentity("CKO")
  └── NO call to assemble()
        │
        └── Uses hardcoded inline prompt fallback  CKOProgram.ts:116-135
              └── template literal concatenation
                    ├── "Anda adalah CKO..."
                    ├── knowledgeStats
                    ├── searchResults
                    └── brief
```

### Even if directory mismatch is fixed:
- CKO still wouldn't use the compiled directive
- CKO doesn't call `getFoundationProvider()` at all
- Compiled `cko-directive.directive.json` is **truly orphaned** — never accessed
- This is an architecture gap, not a configuration bug

---

## Flow 4: COO — Bypasses PromptAssembler

```
COOProgram.execute()                             COOProgram.ts
  │
  ├── getDirective("COO") ✅ (map exists, but dir mismatch → "")
  ├── getFoundationCharter()  ✅ (foundation assets load fine)
  │
  └── Manual prompt construction                  COOProgram.ts:357-368
        └── template literal:
              identity + directive + charter + cko + brief + branchContext
              ↑ uses 3 hardcoded prompt constants not managed by DGPS
```

### Result:
- COO also has empty directive (dir mismatch) but is architecturally different from CKO
- COO does call `getFoundationProvider()` — just doesn't use `assemble()`
- 3 hardcoded prompt constants (`COO_BRIEF_PROMPT`, `COO_INTENT_PROMPT`, `COO_EXECUTION_SCHEMA`) are not in DGPS

---

## Flow 5: ConsultantProvider — Bypasses FoundationLoader

```
consultantRuntime.translateToTargets(message)    consultant-provider.ts
  │
  ├── getFoundationProvider()  ← IS imported but only used for fallback
  │
  └── this.getRootProjectContext()               consultant-provider.ts:22
        │
        ├── readFileSync(".ai/PROJECT_CONTEXT.md")      ← LINE 39
        ├── readFileSync(".ai/README.md")                ← LINE 39
        └── readFileSync("docs/PROJECT_CONTEXT.md")      ← LINE 39
              │
              └── All 3 bypass FoundationLoader completely
                    Direct synchronous filesystem reads
```

### This is called from CEO:
```typescript
// CEOProgram.ts (confirmed in S.9 phase 5 trace)
const ckoTargets = await consultantRuntime.translateToTargets(ctx.message);
```

### Impact:
- Every CEO question that triggers CKO advisory performs direct markdown reads
- Bypasses FoundationLoader → compiled asset cache → registry
- Reads raw markdown from `docs/` directory

---

## Flow 6: FoundationLoader — Correct for All Types Except Executive

```
foundationLoader.load()                          foundation-loader.ts
  │
  └── loadFromRegistry()                         foundation-loader.ts:147
        │
        for each type in ["foundation","executive","knowledge","prompt","adr"]:
        │
        ├── type = "foundation"
        │     ├── registry: .ai/registry/foundation.json     ✅ EXISTS
        │     └── generated: .ai/generated/foundation/       ✅ EXISTS → 17 assets LOADED
        │
        ├── type = "executive"
        │     ├── registry: .ai/registry/executive.json      ✅ EXISTS (8 asset IDs read)
        │     └── generated: .ai/generated/executive/        ❌ DOES NOT EXIST → SKIP
        │
        ├── type = "knowledge"
        │     ├── registry: .ai/registry/knowledge.json      ✅ EXISTS
        │     └── generated: .ai/generated/knowledge/        ✅ EXISTS → 50 assets LOADED
        │
        ├── type = "prompt"
        │     ├── registry: .ai/registry/prompt.json         ✅ EXISTS
        │     └── generated: .ai/generated/prompt/           ✅ EXISTS → 2 assets LOADED
        │
        └── type = "adr"
              ├── registry: .ai/registry/adr.json            ✅ EXISTS
              └── generated: .ai/generated/adr/              ✅ EXISTS → 9 assets LOADED
```

### Result:
- 78 assets loaded (foundation 17 + knowledge 50 + prompt 2 + adr 9)
- 8 executive assets expected but 0 loaded
- **Total: 78/86 = 90.7% loaded rate** for registry-registered assets

---

## Summary: What Actually Reaches the LLM

| Executive | Identity | Directive | Foundation Knowledge | Prompt Structure |
|-----------|:--------:|:---------:|:-------------------:|:----------------:|
| CEO | ✅ hardcoded | ❌ empty | ✅ from registry | ✅ via assemble() |
| CTO | ✅ hardcoded | ❌ empty | ✅ (skipped for CTO) | ✅ via assemble() |
| COO | ✅ hardcoded | ❌ empty | ✅ from registry | ⚠️ manual (no assemble) |
| CFO | ✅ hardcoded | ❌ empty | ✅ from registry | ✅ via assemble() |
| CMO | ✅ hardcoded | ❌ empty | ✅ from registry | ✅ via assemble() |
| CAIO | ✅ hardcoded | ❌ empty | ✅ from registry | ✅ via assemble() |
| CKO | ⚠️ inline | ❌ none | ❌ none | ❌ inline fallback |
| CHRO | ✅ hardcoded | ❌ empty | ✅ from registry | ✅ via assemble() |

**All 8 executives run without their compiled directive content. The runtime is partially degraded — foundation knowledge, identity, and prompt assembly structure all work, but directive instructions (SYSTEM_PROMPT.md content) are absent from all prompts.**
