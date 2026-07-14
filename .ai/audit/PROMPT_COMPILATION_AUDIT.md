# Prompt Compilation Audit
## EPIC S.9.5 — Phase 2
**Date:** 2026-07-14

---

## Prompt Flow Architecture

```
docs/executive-runtime/executives/{ROLE}/{SYSTEM_PROMPT,EXECUTIVE_SPEC,PLAYBOOK}.md
                                    │
                              [DGPS Compile]
                                    │
                                    ▼
                    .ai/generated/runtime/{role}-directive.directive.json
                                    │
                              [FoundationLoader.load()]
                                    │
                                    ▼
                    getAssetContent("ceo-directive") → FoundationCache → return string
                                    │
                              [PromptAssembler.assemble()]
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
               Identity      Directive      Foundation Knowledge
               (code)       (compiled)        (compiled)
                                    │
                              [LLM Payload]
```

**Key finding:** No `SYSTEM_PROMPT.md` is ever read at runtime by any executive. All 8 executives have their SYSTEM_PROMPT.md compiled by DGPS into `.directive.json` files.

---

## Per-Executive Audit

| Executive | Uses `assemble()` | Directive from Compiled JSON | Compiled Asset Exists | Direct Markdown Read | Result |
|-----------|:-----------------:|:----------------------------:|:---------------------:|:--------------------:|:------:|
| **CEO** | ✅ | ✅ | ✅ | ❌ | **PASS** |
| **CTO** | ✅ | ✅ | ✅ | ❌ | **PASS** |
| **COO** | ❌ (bypasses) | ✅ | ✅ | ❌ | **FAIL** |
| **CFO** | ✅ | ✅ | ✅ | ❌ | **PASS** |
| **CMO** | ✅ | ✅ | ✅ | ❌ | **PASS** |
| **CAIO** | ✅ | ✅ | ✅ | ❌ | **PASS** |
| **CKO** | ❌ (disconnected) | ❌ (never calls getDirective) | ✅ (orphaned) | ❌ | **FAIL** |
| **CHRO** | ✅ | ❌ (missing from ROLE_DIRECTIVE_MAP) | ✅ (unreachable) | ❌ | **FAIL** |

---

## Bugs Found

### BUG-P1: CHRO missing from ROLE_DIRECTIVE_MAP
- **File:** `runtime-domain.ts:7-15`
- **Impact:** `getDirective("CHRO")` returns null. CHRO runs with empty directive.
- **Fix:** Add `CHRO: "chro-directive"` to ROLE_DIRECTIVE_MAP.

### BUG-P2: COO bypasses PromptAssembler
- **File:** `COOProgram.ts:357-368`
- **Impact:** COO's prompt is hand-concatenated inline. 3 prompt constants (`COO_BRIEF_PROMPT`, `COO_INTENT_PROMPT`, `COO_EXECUTION_SCHEMA`) are hardcoded, not managed by DGPS.
- **Fix:** Refactor COO to use `assemble()` and move inline prompts to DGPS directives.

### BUG-P3: CKO completely disconnected from prompt infrastructure
- **File:** `CKOProgram.ts:116-135`
- **Impact:** CKO does not import `getFoundationProvider()`, `getIdentity()`, or `assemble()`. Compiled directive is dead code.
- **Fix:** Refactor CKO to use `assemble()` + `getFoundationProvider().getDirective("CKO")`.
