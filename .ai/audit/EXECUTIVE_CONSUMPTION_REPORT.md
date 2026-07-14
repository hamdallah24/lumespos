# Executive Consumption Audit
## EPIC S.9.5 — Phase 5
**Date:** 2026-07-14

---

## Methodology
For each executive, trace the full chain:
```
Question → Dispatch → Directive → Foundation → Knowledge → Prompt → LLM
```
Verify source of EVERY asset. PASS = all from registry, FAIL = any from docs/markdown.

---

## CEO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("CEO")` → `FoundationCache` → `FoundationLoader` → `.ai/generated/` | ✅ | ❌ |
| Foundation | `assemble()` → `foundationLoader.load()` | ✅ | ❌ |
| Knowledge | `buildGraph()` → `foundationLoader.load()` | ✅ | ❌ |
| Prompt | `assemble()` → blocks from FoundationLoader | ✅ | ❌ |
| Identity | `getIdentity("CEO")` from identity.ts | N/A (code) | ❌ |

**Verdict: ✅ PASS**

---

## CTO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("CTO")` → FoundationLoader | ✅ | ❌ |
| Foundation | SKIPPED (mode="cto" skips Foundation Knowledge block) | N/A | ❌ |
| Knowledge | `loadKnowledgeWithContent()` → FoundationLoader | ✅ | ❌ |
| Prompt | `assemble()` | ✅ | ❌ |
| Identity | `getIdentity("CTO")` | N/A (code) | ❌ |

**Verdict: ✅ PASS**

---

## COO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("COO")` → FoundationLoader | ✅ | ❌ |
| Foundation | `getFoundationCharter()` → `foundationDomain.*()` → FoundationLoader | ✅ | ❌ |
| Knowledge | EIOS KnowledgeProvider (runtime) | N/A | ❌ |
| Prompt | Manual assembly (not via PromptAssembler) | ✅ (directive+charter from registry) | ❌ |
| Identity | identity.ts | N/A (code) | ❌ |

**Verdict: ✅ PASS** (Directive and Foundation still come from registry)

---

## CFO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("CFO")` → FoundationLoader | ✅ | ❌ |
| Foundation | `assemble()` → FoundationLoader | ✅ | ❌ |
| Knowledge | FoundationLoader | ✅ | ❌ |
| Prompt | `assemble()` | ✅ | ❌ |
| Identity | `getIdentity("CFO")` | N/A (code) | ❌ |

**Verdict: ✅ PASS**

---

## CMO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("CMO")` → FoundationLoader | ✅ | ❌ |
| Foundation | `assemble()` → FoundationLoader | ✅ | ❌ |
| Knowledge | FoundationLoader | ✅ | ❌ |
| Prompt | `assemble()` | ✅ | ❌ |
| Identity | `getIdentity("CMO")` | N/A (code) | ❌ |

**Verdict: ✅ PASS**

---

## CAIO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("CAIO")` → FoundationLoader | ✅ | ❌ |
| Foundation | `assemble()` → FoundationLoader | ✅ | ❌ |
| Knowledge | FoundationLoader | ✅ | ❌ |
| Prompt | `assemble()` | ✅ | ❌ |
| Identity | `getIdentity("CAIO")` | N/A (code) | ❌ |

**Verdict: ✅ PASS**

---

## CKO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | **NONE** — CKO never calls `getFoundationProvider()` | ❌ | ❌ |
| Foundation | **NONE** — CKO never calls `getFoundationProvider()` | ❌ | ❌ |
| Knowledge | Consultant internal + EIOS KnowledgeProvider | N/A | ❌ |
| Prompt | Hardcoded inline fallback (lines 116-135) | ❌ | ❌ |
| Identity | Hardcoded in CKO_CONFIG (never imported) | ❌ | ❌ |

**Verdict: ❌ FAIL — CKO completely disconnected from FoundationLoader**

---

## CHRO

| Asset | Source | From Registry? | From Markdown? |
|-------|--------|:--------------:|:--------------:|
| Directive | `getFoundationProvider().getDirective("CHRO")` → **returns null** (missing from ROLE_DIRECTIVE_MAP) | ❌ | ❌ |
| Foundation | `assemble()` → FoundationLoader | ✅ | ❌ |
| Knowledge | FoundationLoader | ✅ | ❌ |
| Prompt | `assemble()` | ✅ | ❌ |
| Identity | `getIdentity("CHRO")` | N/A (code) | ❌ |

**Verdict: ❌ FAIL — CHRO directive returns null due to missing mapping**

---

## Summary

| Executive | Directive | Foundation | Knowledge | Prompt | Overall |
|-----------|:---------:|:----------:|:---------:|:------:|:-------:|
| **CEO** | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **CTO** | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **COO** | ✅ | ✅ | ✅ | ⚠️ (manual) | **PASS** |
| **CFO** | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **CMO** | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **CAIO** | ✅ | ✅ | ✅ | ✅ | **PASS** |
| **CKO** | ❌ | ❌ | ⚠️ | ❌ | **FAIL** |
| **CHRO** | ❌ | ✅ | ✅ | ✅ | **FAIL** |

**5 PASS / 2 FAIL / 1 ⚠️ (COO: all registry assets OK, but bypasses PromptAssembler)**
