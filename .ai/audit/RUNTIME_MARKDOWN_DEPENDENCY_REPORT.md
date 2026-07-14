# Runtime Markdown Dependency Audit
## EPIC S.9.5 — Phase 1
**Date:** 2026-07-14 | **Scope:** `artifacts/api-server/src/`

---

## Executive Summary

| Category | Count |
|---|---|
| Files with markdown file reads | 6 |
| Files scanning markdown directories | 3 |
| CRITICAL runtime md dependencies | 3 |
| HIGH runtime md dependencies | 3 |
| MEDIUM indirect md dependencies | 3 |
| Informational | 12+ |

---

## CRITICAL

### C1 — FoundationLoader reads markdown? **NO** (reads only compiled JSON)
- **File:** `src/ai/runtime/foundation-loader.ts`
- **Actual reads:** `.ai/registry/*.json` + `.ai/generated/**/*.json`
- **Verdict:** FoundationLoader reads NO markdown files. Only compiled JSON.
- **Status: ✅ PASS**

### C2 — OrganizationEngine reads RUNTIME_REGISTRY.md
- **File:** `src/ai/runtime/organization-engine.ts:37-44`
- **Path:** `.ai/runtime/registry/RUNTIME_REGISTRY.md`
- **Fallback:** Hardcoded defaults (line 116-129) with all 8 runtimes + delegations
- **Verdict:** Reads markdown but has built-in fallback. Not in DGPS compile pipeline.
- **Status: ⚠️ GAP (Informational — fallback exists)**

### C3 — ConsultantProvider reads PROJECT_CONTEXT.md
- **File:** `src/programs/consultant/consultant-provider.ts:28,39`
- **Paths read:** `.ai/PROJECT_CONTEXT.md`, `.ai/README.md`, `docs/PROJECT_CONTEXT.md`
- **Verdict:** Direct markdown reads bypassing FoundationLoader. `docs/PROJECT_CONTEXT.md` reads from docs/.
- **Status: ❌ FAIL**

---

## HIGH

### H1 — FoundationCache reads foundation-fingerprint.json
- **File:** `src/ai/runtime/foundation/foundation-cache.ts:16-23`
- **Path:** `artifacts/api-server/foundation-fingerprint.json` (not markdown)
- **Verdict:** JSON file, not markdown. Cache invalidation metadata.
- **Status: ✅ PASS (not markdown)**

### H2 — RuntimeVerifier checks manifest.json
- **File:** `src/executive-runtime/verification/RuntimeVerifier.ts:46-47`
- **Path:** `.ai/registry/manifest.json` (existsSync only, no readFileSync)
- **Verdict:** No markdown read. Registry integrity check.
- **Status: ✅ PASS**

### H3 — FoundationRegistry delegates to FoundationLoader
- **File:** `src/ai/runtime/foundation/FoundationRegistry.ts:34`
- **Verdict:** Delegates entirely to `foundationLoader.load()`. No direct reads.
- **Status: ✅ PASS**

---

## MEDIUM

### M1 — MissionContextRegistry scans docs/
- **File:** `src/knowledge/MissionContextRegistry.ts:10,35,54`
- **Whitelist includes:** `"docs/"`
- **Extensions include:** `.md`
- **Verdict:** Scans and reads markdown files from docs/ directory. GitHub API fallback path.
- **Status: ❌ FAIL**

### M2 — ConsultantDiscovery scans docs/
- **File:** `src/programs/consultant/consultant-discovery.ts:56,65,99`
- **SCAN_DIRS includes:** `"docs"`
- **ROOT_CONTEXT_FILES includes:** `"docs/PROJECT_CONTEXT.md"`
- **Verdict:** Recursive scan of docs/ directory. Reads all files including .md.
- **Status: ❌ FAIL**

### M3 — Tool Adapter can read markdown
- **File:** `src/ai/tools/tool-adapter.ts:239-249`
- **Verdict:** Generic readFile tool exposed to LLM. Can read any markdown file within SAFE_DIRS. Not runtime-specific.
- **Status: ⚠️ Informational (tool, not runtime)**

---

## INFORMATIONAL

| File | Pattern | Detail |
|------|---------|--------|
| `ArchitectureRegistry.ts:13-21` | Static ADR paths | `docs/architecture/ADR-*.md` in metadata only, no I/O |
| `verification-domain.ts:1` | Comment | References `VERIFICATION_POLICY.md` in comment, actual code uses `getAssetContent()` |
| `trust-domain.ts:1,30` | Comment | References `TRUST_POLICY.md` in comment, actual code uses `getAssetContent()` |
| `governance-domain.ts:1` | Comment | References `EXECUTION_GOVERNANCE_POLICY.md` in comment, actual code uses `getAssetContent()` |
| `delegation-domain.ts:1,25` | Comment | References `DELEGATION_POLICY.md` in comment, actual code uses `getAssetContent()` |
| `knowledge-evolution.ts:36,39` | Proposal strings | Generates `.md` proposal filenames as output targets, no reads |
| `reflection-engine.ts:68` | Proposal strings | Generates `.md` proposal filenames |
| `constitutional-validator.ts:11` | Comment | References `CONSTITUTION.md` in comment, rules are hardcoded |
| `context-builder.ts:1,5` | Comment | References `CONTEXT_PACKAGE_SPEC.md` in comment |
| `ai-mission-service.ts:2,53` | Comment | References `MISSION_LIFECYCLE.md` in comment |
| `eios-runtime/observers/index.ts:97` | Proposal target | `target: "evolution.md"` as proposal output |
| `routes/ai-prompts.ts:15-66` | LLM instruction text | `readFile` as tool instruction string for AI, not actual I/O |

---

## Summary

| Severity | Count | PASS | FAIL |
|----------|-------|------|------|
| CRITICAL | 3 | 1 | 2 |
| HIGH | 3 | 3 | 0 |
| MEDIUM | 3 | 0 | 3 |
| Informational | 12+ | 12+ | 0 |

**3 failures found:** ConsultantProvider (reads docs/), ConsultantDiscovery (scans docs/), MissionContextRegistry (scans docs/)
