# Prompt Audit Report

**Version:** 1.0.0  
**Phase:** EPIC Q — Phase 1  
**Last Updated:** 2026-07-13

---

## Audit Scope

Audited all prompt sources across 27 files for 7 executives (CEO, CTO, CFO, CMO, CAIO, CKO, COO).

### Files Audited

| # | File | Role |
|---|------|------|
| 1 | `src/routes/ai-prompts.ts` | Shared schemas (CTO_OUTPUT_SCHEMA, JSON_OUTPUT_SCHEMA, EXECUTIVE_OUTPUT_SCHEMA) |
| 2 | `src/ai/runtime/prompt-assembler.ts` | `assemble()` function + STREAM_POLICY, ERROR_POLICY |
| 3 | `src/ai/runtime/identity.ts` | `getIdentity()` + IDENTITIES map |
| 4 | `src/ai/runtime/foundation/foundation-provider.ts` | `getDirective()`, `getFoundationContext()` |
| 5 | `src/ai/runtime/foundation/domains/foundation-domain.ts` | Foundation philosophy/constitution |
| 6 | `src/ai/runtime/foundation/domains/runtime-domain.ts` | Directive loading |
| 7 | `src/ai/runtime/foundation/domains/governance-domain.ts` | Confidence gates |
| 8 | `src/ai/runtime/foundation/foundation-cache.ts` | Asset content loading |
| 9 | `src/ai/runtime/semantic-engine.ts` | SEMANTIC_PROMPT |
| 10 | `src/ai/runtime/execution/execution-strategy.ts` | Governor cycle directives |
| 11 | `src/ai/runtime/execution/execution-driver.ts` | Execution driver inline prompts |
| 12 | `src/ai/runtime/context-builder.ts` | Mode-specific instructions |
| 13 | `src/ai/runtime/context/context-assembler.ts` | Context assembly |
| 14 | `src/executive-runtime/executives/CEO/CEOProgram.ts` | CEO inline prompts |
| 15 | `src/executive-runtime/executives/CTO/CTOProgram.ts` | CTO prompt assembly |
| 16 | `src/executive-runtime/executives/COO/COOProgram.ts` | COO inline prompts (3 distinct) |
| 17 | `src/executive-runtime/executives/CFO/CFOProgram.ts` | CFO prompt assembly |
| 18 | `src/executive-runtime/executives/CMO/CMOProgram.ts` | CMO prompt assembly |
| 19 | `src/executive-runtime/executives/CAIO/CAIOProgram.ts` | CAIO prompt assembly |
| 20 | `src/executive-runtime/executives/CKO/CKOProgram.ts` | CKO inline prompt |
| 21 | `src/ai/llm/llm-adapter.ts` | callDeepSeek(), callDeepSeekWithTools() |
| 22 | `src/ai/runtime/execution/execution-pipeline.ts` | Pipeline entry |
| 23 | `src/programs/consultant/consultant-provider.ts` | CKO advisory wrappers |
| 24 | `src/programs/consultant/consultant-runtime.ts` | CKO identity |
| 25 | `src/operational-decision-engine/ai-engine/prompts/SituationPrompt.ts` | ODE situation |
| 26 | `src/operational-decision-engine/ai-engine/prompts/ReasoningPrompt.ts` | ODE reasoning |
| 27 | `src/ai/tools/tool-adapter.ts` | Tool definitions |

---

## Findings Summary

| Category | Count | Severity |
|----------|-------|----------|
| Identity bugs | 2 | CRITICAL |
| Directive gaps | 3 | HIGH |
| Architecture inconsistencies | 6 | HIGH |
| Duplications | 5 | MEDIUM |
| Schema mismatches | 3 | MEDIUM |
| Missing behaviors | 3 | MEDIUM |
| Prompt budget concerns | 2 | LOW |

---

## Finding 1: CAIO Identity Missing (CRITICAL)

**Location:** `src/ai/runtime/identity.ts` — IDENTITIES map  
**Details:** `getIdentity("CAIO")` returns `null`. CAIO is not defined in the IDENTITIES map. `CAIOProgram.ts` uses `getIdentity("CAIO")!` with non-null assertion, which will crash at runtime when `assemble()` tries to access `id.role`, `id.authority`, etc.

**Impact:** CAIO system prompt assembly will throw TypeError at runtime.

## Finding 2: CKO Identity Missing (CRITICAL)

**Location:** `src/ai/runtime/identity.ts` — IDENTITIES map  
**Details:** CKO is not defined in IDENTITIES. CKO has a separate `CKO_IDENTITY` in `consultant-runtime.ts` but does NOT use `assemble()`.

**Impact:** CKO bypasses standard prompt assembly — cannot benefit from framework inheritence.

## Finding 3: CMO, CAIO, CKO No Foundation Directives (HIGH)

**Location:** `src/ai/runtime/foundation/domains/runtime-domain.ts` — ROLE_DIRECTIVE_MAP  
**Details:** `ROLE_DIRECTIVE_MAP` only maps CEO, CTO, COO, CFO. CMO, CAIO, and CKO directives return `null`.

**Impact:** These executives have no strategic directive context in their prompts.

## Finding 4: COO Bypasses `assemble()` (HIGH)

**Location:** `COOProgram.ts` line 284-293  
**Details:** COO manually concatenates its system prompt instead of using the shared `assemble()` function. This means COO misses: Foundation context injection, streaming policy, error policy, and token budgeting.

**Impact:** Inconsistent prompt quality. COO prompt missing standardized safety rules.

## Finding 5: CKO Bypasses `assemble()` (HIGH)

**Location:** `CKOProgram.ts` line 98-117  
**Details:** CKO uses direct `callDeepSeek()` with hand-built prompt instead of `assemble()`.

**Impact:** CKO prompt missing all standardized foundation context, streaming rules, and error prevention.

## Finding 6: CEO Wraps `assemble()` in Inline Prefix (HIGH)

**Location:** `CEOProgram.ts` line 268-275  
**Details:** CEO prepends `DILARANG` + `ANTI-HALUSINASI DATA` rules before `assemble()` output, creating redundant identity (identity stated twice).

**Impact:** Redundant identity block. Hardcoded anti-halucination rule only on CEO — other executives missing equivalent protection.

## Finding 7: COO Identity Stated 3 Times (MEDIUM)

**Location:** `COOProgram.ts` lines 41, 225, 285  
**Details:** COO identity has three slightly different versions:
- Line 41: `Kamu adalah **Direktur Operasional (COO)** Lume's Everywhere.`
- Line 225: Same as above
- Line 285: `Kamu adalah **Direktur Operasional (COO)** Lume's Everywhere — jaringan F&B.`

**Impact:** Inconsistent identity presentation.

## Finding 8: "BATASAN KETAT" Duplicated (MEDIUM)

**Location:** `COOProgram.ts` lines 49-53 AND lines 286-288  
**Details:** Same 5 restrictions duplicated verbatim in `COO_BRIEF_PROMPT` and fallback prompt.

**Impact:** Maintenance burden — must update both copies.

## Finding 9: "Anti-Halusinasi" in Two Forms (MEDIUM)

**Location:** `src/ai/runtime/prompt-assembler.ts` (ERROR_POLICY) vs `CEOProgram.ts` line 269-270  
**Details:** ERROR_POLICY says "JANGAN MENGARANG ANGKA tanpa data dari tool". CEO prefix says "ANTI-HALUSINASI DATA: DILARANG KERAS menyebut angka penjualan...". Different rules, overlapping intent.

**Impact:** Confusion about which rule applies. CEO has stricter anti-halucination than other executives.

## Finding 10: CONCLUDE Format in 3 Places (MEDIUM)

**Location:** `CTO_OUTPUT_SCHEMA`, `execution-strategy.ts`, `execution-driver.ts`  
**Details:** Same "## Root Cause / ## Verified Evidence / ## Rekomendasi Teknis / ## Confidence" format appears in:
1. `CTO_OUTPUT_SCHEMA` (ai-prompts.ts)
2. Governor CONCLUDE directive (execution-strategy.ts)
3. Execution driver CONCLUDE retry message (execution-driver.ts)

**Impact:** Maintenance burden — three copies with slightly different wording.

## Finding 11: "Output MINIMAL 500 KARAKTER" in 4 Places (MEDIUM)

**Location:** `CTO_OUTPUT_SCHEMA`, `CTOProgram.ts` post-assembly, driver CONCLUDE retry, driver safety check  
**Details:** Same rule repeated 4 times.

**Impact:** Maintenance burden.

## Finding 12: CFO/CMO/CAIO Use Wrong Output Schema (MEDIUM)

**Location:** `CFOProgram.ts`, `CMOProgram.ts`, `CAIOProgram.ts`  
**Details:** All three use `JSON_OUTPUT_SCHEMA` which lists COO-specific actions (`add_stock`, `reduce_stock`, `produce`, etc.). These executives have no tools to execute those actions.

**Impact:** Prompts reference capabilities these executives don't have.

## Finding 13: CEO Schema References Missing Data (MEDIUM)

**Location:** `EXECUTIVE_OUTPUT_SCHEMA` in ai-prompts.ts  
**Details:** Schema says "Data misi sudah diberikan di ## Executive Results" — but this section may not be present in all CEO conversations.

**Impact:** Confusing for CEO when no Executive Results context is provided.

## Finding 14: No Financial Analysis Behavior Governed (MEDIUM)

**Location:** `CFOProgram.ts`  
**Details:** CFO uses `JSON_OUTPUT_SCHEMA` (action format) but has no prompt defining HOW to do financial analysis.

**Impact:** CFO behavior is underspecified.

## Finding 15: No Marketing Analysis Behavior Governed (MEDIUM)

**Location:** `CMOProgram.ts`  
**Details:** Same as CFO — no marketing-specific behavior defined.

## Finding 16: No AI System Analysis Behavior Governed (MEDIUM)

**Location:** `CAIOProgram.ts`  
**Details:** Same as CFO/CMO — no AI system analysis behavior defined.

## Finding 17: CKO Identity Says "readonly" but decide() Can Trigger Actions (LOW)

**Location:** `consultant-runtime.ts` CKO_IDENTITY vs `CKOProgram.ts` decide()  
**Details:** CKO authority is "readonly" but its `decide()` method returns decisions that could result in actions.

**Impact:** Potential authority mismatch.

## Finding 18: CEO Prompt Budget 8000 vs Others 4000 (LOW)

**Location:** `CEOProgram.ts` vs other executives  
**Details:** CEO uses `maxTokens: 8000` and system message slice of 32000 chars. Others use 4000-16000.

**Impact:** CEO has significantly more context budget.

## Finding 19: CTO Context Can Be 96000 Chars (LOW)

**Location:** `CTOProgram.ts` line 255  
**Details:** `fileContext.text.slice(0, 96000)` means CTO can receive 96K of file content in context.

**Impact:** Could exceed context window limits.

---

## Resolution Plan

| Finding | Resolution | Phase |
|---------|-----------|-------|
| 1. CAIO identity missing | Add CAIO to IDENTITIES | EPF v1.0 |
| 2. CKO identity missing | Add CKO to IDENTITIES | EPF v1.0 |
| 3. CMO/CAIO/CKO directives | Add to ROLE_DIRECTIVE_MAP | EPF v1.0 |
| 4. COO bypasses assemble() | Migrate COO to use EPF | EPF v1.0 |
| 5. CKO bypasses assemble() | Migrate CKO to use EPF | EPF v1.0 |
| 6. CEO inline prefix redundancy | Move anti-halucination to GLOBAL layer | EPF v1.0 |
| 7. COO identity duplication | Single identity in EPF | EPF v1.0 |
| 8. BATASAN KETAT duplication | Single source in EPF | EPF v1.0 |
| 9. Anti-halusinasi conflict | Unify in GLOBAL layer | EPF v1.0 |
| 10. CONCLUDE format triplication | Single source in CTO prompt | EPF v1.0 |
| 11. 500 char rule quadruplication | Single source in CTO prompt | EPF v1.0 |
| 12. CFO/CMO/CAIO wrong schema | Executive-specific schemas | EPF v1.0 |
| 13. CEO missing data reference | Fix EXECUTIVE_OUTPUT_SCHEMA | EPF v1.0 |
| 14-16. Missing behaviors | Add executive-specific behavior sections | EPF v1.0 |
| 17. CKO authority mismatch | Fix CKO authority to "limited" | EPF v1.0 |
| 18-19. Token budgets | Standardize | EPF v1.0 |
