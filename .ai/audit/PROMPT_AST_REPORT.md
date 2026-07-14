# Prompt AST Report
## EPIC S.9.5 — Phase 2
**Date:** 2026-07-14

---

## Compiled Prompt Assets

### Global Prompt
- **File:** `.ai/generated/prompt/global-prompt.json.json`
- **ID:** `global-prompt`
- **Compiled from:** `docs/executive-runtime/prompts/GLOBAL_SYSTEM_PROMPT.md`
- **Status:** ✅ Available, loaded by FoundationLoader

### Executive Directives (compiled prompt content)
All 8 executive directives are compiled from SYSTEM_PROMPT.md + EXECUTIVE_SPEC.md + PLAYBOOK.md:

| Asset ID | Compiled File | Loaded at Runtime? | Status |
|----------|--------------|-------------------|--------|
| `ceo-directive` | `.ai/generated/runtime/ceo-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `cto-directive` | `.ai/generated/runtime/cto-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `coo-directive` | `.ai/generated/runtime/coo-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `cfo-directive` | `.ai/generated/runtime/cfo-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `cmo-directive` | `.ai/generated/runtime/cmo-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `caio-directive` | `.ai/generated/runtime/caio-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `cko-directive` | `.ai/generated/runtime/cko-directive.directive.json` | ❌ (dir mismatch) | FAIL |
| `chro-directive` | `.ai/generated/runtime/chro-directive.directive.json` | ❌ (dir mismatch) | FAIL |

**Root Cause:** ALL 8 directive files are in `.ai/generated/runtime/` but FoundationLoader looks for them in `.ai/generated/executive/`.

---

## Prompt Assembly Architecture

```
PromptAssembler.assemble(input):
  BLOCK 1: Identity          ← getIdentity(role)         [identity.ts — hardcoded in code]
  BLOCK 1b: Directive        ← getFoundationProvider().getDirective(role)  [compiled JSON]
  BLOCK 2: Foundation Know.  ← foundationLoader.load()   [compiled JSON]
  BLOCK 3: Mission           ← from input
  BLOCK 4: Decision Context  ← from input
  BLOCK 5: Output Schema     ← from input
  BLOCK 6: Executive Results ← from input
  BLOCK 7: Tool Rules        ← from input
  FOOTER: STREAM_POLICY + ERROR_POLICY
```

The PromptAssembler consumes ONLY compiled assets via FoundationLoader.
