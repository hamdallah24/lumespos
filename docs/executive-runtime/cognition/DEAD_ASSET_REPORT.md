# DEAD_ASSET_REPORT.md
## EPIC S.7 Phase 10 — Dead Asset Detection

### Methodology

Scan `.ai/` directory (98 `.md` files) for assets that:
1. Lack `id:` frontmatter (skipped by parser) → **unreachable**
2. Have `id:` but are never consumed at runtime → **dead**
3. Are consumed by executives that no longer exist → **orphaned**
4. Have duplicate IDs (only one copy wins) → **shadowed**

---

### Category 1: Missing `id:` Frontmatter — Unreachable Assets

**Count: 48 files** — skipped by `parseMetadata()` at `foundation-loader.ts:31`

These files exist on disk but the parser cannot load them. They are **dead by defect**.

| Pattern | Example Files | Count |
|---------|--------------|-------|
| ADR records (all 5) | `adr-001-bahasa-indonesia.md` through `adr-005-language-consistency.md` | 5 |
| Ontology files | `ontologi-kebijakan-eksekutif.md`, `ontologi-layanan-ai-terkelola.md` | 2 |
| Prompt templates | `prompt-template-career-coach.md`, `prompt-template-consultant.md` | 2 |
| Undocumented traits | `sifat-dan-karakter-ai.md` | 1 |
| Models without IDs | 38 other files scattered across subdirectories | 38 |
| **Total** | | **48** |

**List of unreachable files:**
```
.ai/adr/adr-001-bahasa-indonesia.md
.ai/adr/adr-002-strategi-dokumentasi-dual-bahasa.md
.ai/adr/adr-003-pengelolaan-memory-8k.md
.ai/adr/adr-004-pemrosesan-konteks.md
.ai/adr/adr-005-language-consistency.md
.ai/drafts/ambang-batas-kritis.md
.ai/drafts/batasan-kognitif-dasar.md
.ai/drafts/bukti-dan-kepercayaan-diri.md
.ai/drafts/daftar-pustaka-dan-sumber.md
.ai/drafts/eksekusi-berdasarkan-keyakinan.md
.ai/drafts/hirarki-kebutuhan-ai.md
.ai/drafts/intuisi-buatan-berdasarkan-pola.md
.ai/drafts/jaringan-keyakinan-terdistribusi.md
.ai/drafts/kecerdasan-buatan-otonom.md
.ai/drafts/konsep-diri-ai-1.md
.ai/drafts/konsep-diri-ai.md
.ai/drafts/kurva-pembelajaran-ai.md
.ai/drafts/memori-implisit-dan-eksplisit.md
.ai/drafts/pengambilan-keputusan-adaptif.md
.ai/drafts/pengantar-keyakinan-ai.md
.ai/drafts/prioritas-dan-pengorbanan.md
.ai/drafts/simulasi-mental-ai.md
.ai/drafts/tentang-sesi-ini.md
.ai/drafts/titik-kritis-kesadaran.md
.ai/foundation/ai-self-concept.md
.ai/foundation/ambang-batas-kritis.md
.ai/foundation/batasan-kognitif-dasar.md
.ai/foundation/bukti-dan-kepercayaan-diri.md
.ai/foundation/eksekusi-berdasarkan-keyakinan.md
.ai/foundation/hirarki-kebutuhan-ai.md
.ai/foundation/intuisi-buatan-berdasarkan-pola.md
.ai/foundation/jaringan-keyakinan-terdistribusi.md
.ai/foundation/kecerdasan-buatan-otonom.md
.ai/foundation/konsep-diri-ai.md
.ai/foundation/kurva-pembelajaran-ai.md
.ai/foundation/memori-implisit-dan-eksplisit.md
.ai/foundation/pengambilan-keputusan-adaptif.md
.ai/foundation/pengantar-keyakinan-ai.md
.ai/foundation/prioritas-dan-pengorbanan.md
.ai/foundation/simulasi-mental-ai.md
.ai/foundation/tentang-sesi-ini.md
.ai/foundation/titik-kritis-kesadaran.md
.ai/prompt/prompt-template-career-coach.md
.ai/prompt/prompt-template-consultant.md
.ai/trait/sifat-dan-karakter-ai.md
.ai/ontology/ontologi-kebijakan-eksekutif.md
.ai/ontology/ontologi-layanan-ai-terkelola.md
```

---

### Category 2: Shadowed Assets (Duplicate IDs)

These files share an `id:` with another file; only one copy is loaded:

| ID | Winner | Loser | Resolution Rule |
|----|--------|-------|-----------------|
| `cognitive-model-library` | `.ai/runtime/cognitive-model-library.md` | `.ai/drafts/cognitive-model-library.md` | runtime/ → first |
| `executive-thinking-profile-visioner` | `.ai/runtime/executive-thinking-profile-visioner.md` | `.ai/thinking/executive-thinking-profile-visioner.md` | runtime/ → first |
| `executive-thinking-profile-exsekutor` | `.ai/runtime/executive-thinking-profile-exsekutor.md` | `.ai/thinking/executive-thinking-profile-exsekutor.md` | runtime/ → first |
| `executive-thinking-profile-analitis` | `.ai/runtime/executive-thinking-profile-analitis.md` | `.ai/thinking/executive-thinking-profile-analitis.md` | runtime/ → first |
| `executive-thinking-profile-sistematis` | `.ai/runtime/executive-thinking-profile-sistematis.md` | `.ai/thinking/executive-thinking-profile-sistematis.md` | runtime/ → first |

**5 shadowed assets** — losers are effectively dead. If intended to replace winners, loading order is incorrect.

---

### Category 3: Dual-Canonical Conflicts (TS vs YAML)

These IDs exist in **both** TypeScript code and YAML frontmatter with different content:

| ID | TS Source | YAML Source | Conflict |
|----|-----------|-------------|----------|
| `executive-capability-matrix` | `capability-domain.ts` | `.ai/foundation/kemampuan-eksekutif.md` | TS has 7 roles; YAML has different set |
| `cognitive-mental-model-library` | `MentalModelSelector.ts` | `.ai/runtime/cognitive-model-library.md` | TS: 20 models; YAML: 21 |
| `cognitive-framework-library` | `FrameworkSelector.ts` | `.ai/runtime/cognitive-framework-library.md` | TS: 27 frameworks; YAML: 29 |
| `adr-*` (all 5) | Code conventions in TS | `.ai/adr/*` | ADR files unreachable (no id:) |
| `runtime-domain-directive-map` | `runtime-domain.ts` | `.ai/runtime/` directive files | Maps different directive IDs |

**5 dual-canonical conflicts** — one version wins at runtime depending on codepath.

---

### Category 4: Assets Not Referenced by Any Executive

All 50 reachable assets (those with `id:`) that pass `parseMetadata()` are referenced by at least one executive code path. **No purely dead assets** in the reachable set.

However, some assets are **developer-only** (not consumed at runtime):

| ID | File | Reason |
|----|------|--------|
| `adr-001-bahasa-indonesia`(dead) | `.ai/adr/adr-001-bahasa-indonesia.md` | Architectural decision; dev reference |
| `adr-002-strategi-dokumentasi-dual-bahasa`(dead) | `.ai/adr/adr-002-strategi-dokumentasi-dual-bahasa.md` | Architectural decision; dev reference |
| `adr-003-pengelolaan-memory-8k`(dead) | `.ai/adr/adr-003-pengelolaan-memory-8k.md` | Architectural decision; dev reference |
| `adr-004-pemrosesan-konteks`(dead) | `.ai/adr/adr-004-pemrosesan-konteks.md` | Architectural decision; dev reference |
| `adr-005-language-consistency`(dead) | `.ai/adr/adr-005-language-consistency.md` | Architectural decision; dev reference |

These 5 ADR files are intentionally dead — they document past decisions, not runtime knowledge.

---

### Summary

| Category | Count | Status | Action Required |
|----------|-------|--------|----------------|
| Missing `id:` frontmatter | 48 | **UNREACHABLE** | Add `id:` to all 48, or delete if obsolete |
| Shadowed by duplicate | 5 | **SHADOWED** | Choose canonical copy; delete or fix loading order |
| Dual-canonical (TS vs YAML) | 5 | **CONFLICTED** | Align TS and YAML; choose single source of truth |
| Purely dead (no reference) | 0 | NONE | ✅ |
| Developer-only (intentional) | 5 | ✅ ACCEPTABLE | ADR files |

### Dead Asset Ratio

```
Total files:         98
Reachable:           50  (51.0%)
Unreachable (no id): 48  (49.0%)
Shadowed:             5  (5.1% of reachable)
Conflicted:           5  (5.1% of reachable)
Purely dead:          0  (0.0%)
```

### Conclusion

**PASS WITH CAVEATS** ⚠️ — 49% of `.ai/` is unreachable (missing `id:` frontmatter). However, all reachable assets are consumed. Recommend: (1) add `id:` to all 48 unreachable files, (2) resolve 5 shadowed duplicates, (3) reconcile 5 dual-canonical conflicts.
