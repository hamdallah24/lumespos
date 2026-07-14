# Registry Integrity Report
## EPIC S.9.5 — Phase 6
**Date:** 2026-07-14

---

## Files Audited

| File | Exists? | Assets | Checksums |
|------|:-------:|:------:|:---------:|
| `.ai/registry/manifest.json` | ✅ | 98 declared (86 actual) | ✅ All ✅ |
| `.ai/registry/foundation.json` | ✅ | 17 | ✅ All |
| `.ai/registry/executive.json` | ✅ | 8 | ✅ All |
| `.ai/registry/knowledge.json` | ✅ | 50 | ✅ All |
| `.ai/registry/prompt.json` | ✅ | 2 | ✅ All |
| `.ai/registry/adr.json` | ✅ | 9 | ✅ All |
| `.ai/registry/dependency-graph.json` | ✅ | 108 nodes, 0 edges | N/A |

---

## Check Results

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | All checksums present | ⚠️ PARTIAL | All 86 registered assets have valid SHA-256 checksums. But `manifest.json` says `total_assets: 98` — off by 12. |
| 2 | All referenced assets exist in `.ai/generated/` | ❌ FAIL | **8 executive directives NOT found.** FoundationLoader looks for `.ai/generated/executive/` which doesn't exist. Files are in `.ai/generated/runtime/`. |
| 3 | No orphan assets | ✅ PASS | All files in `.ai/generated/` have corresponding registry entries. |
| 4 | No duplicate IDs | ✅ PASS | All IDs unique across all registries. |
| 5 | Dependency graph valid | ⚠️ PARTIAL | Graph has 0 edges — trivially valid but empty. Node IDs use source-level names (e.g., `executive-constitution`) that don't match registry IDs (e.g., `foundation-executive-constitution`). |

---

## Critical Finding: Executive Directive Directory Mismatch

```
Registry (executive.json) references:
  ceo-directive, cto-directive, coo-directive, cfo-directive,
  cmo-directive, caio-directive, cko-directive, chro-directive

FoundationLoader looks in:
  .ai/generated/executive/     ← DOES NOT EXIST

DGPS writes to:
  .ai/generated/runtime/       ← EXISTS with 8 files
```

**Impact:** `getAssetContent("ceo-directive")` returns `""` for ALL 8 executives. All directives are empty at runtime.

**Root Cause:** DGPS `paths.ts:21` defines `aiGeneratedRuntime` → `.ai/generated/runtime/`. FoundationLoader `foundation-loader.ts:160` constructs path as `join(aiRoot, "generated", type)` where `type = "executive"` (from registry type name).

---

## Minor Findings

1. `manifest.json` `total_assets: 98` — actual count is 86 (12 phantom assets)
2. `dependency-graph.json` has 108 nodes but 0 edges — no dependency relationships tracked
3. `foundation-loader.ts` exports dead code `parseMetadata()` (YAML frontmatter parser, never called)
