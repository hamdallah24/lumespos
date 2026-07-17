# P0 — Architecture Hardening Audit

## Verdict: **13 VIOLATIONS — HARDENING DIPERLUKAN**

---

## ✅ PASSED CHECKS

| Check | Status | Detail |
|-------|--------|--------|
| RIC Pipeline order | ✅ PASS | Awareness → Understand → Plan → Ground → Verify → Confidence → Context |
| Awareness before Understanding | ✅ PASS | `collectBrief()` dipanggil sebelum `understand()` |
| RIC components private | ✅ PASS | `UnderstandingEngine`, `RetrievalPlanner`, `GroundingLayer`, `VerificationEngine` hanya dipanggil dari `RuntimeIntelligenceCore.ts` |
| Gateway → RICAdapter → RIC | ✅ PASS | Chain tidak terputus |
| RICAdapter → RuntimeIntelligenceCore | ✅ PASS | `adapter.assemble()` → `core.assemble()` |
| Executive `.execute()` via Gateway | ✅ PASS | Semua single-target requests via `getRuntimeGateway().assemble()` |
| Executive `.decide()` via collaboration | ✅ PASS | `executive-collaboration.ts` passing context yang benar |

---

## ❌ VIOLATIONS FOUND

### BYPASS TYPE A: RUNTIME GATEWAY (1 violation)

| # | File | Line | Issue |
|---|------|------|-------|
| A1 | `routes/ai.ts` | 127 | `applicationRuntime.executeForTargets()` **langsung**, bypass Gateway |

**Detail:** Multi-mention path (e.g., `@CEO @CTO laporan keuangan`) masih panggil adapter langsung, tidak lewat `RuntimeGateway`. Akibatnya RIC tidak ikut serta, ExecutiveContext tidak terkirim.

**Severity: HIGH**

---

### BYPASS TYPE B: EIOS PIPELINE (1 violation)

| # | File | Line | Issue |
|---|------|------|-------|
| B1 | `eios-runtime/stages/index.ts` | 164 | `ExecutiveDispatchRegistry.dispatch(role, brief, {})` — context **`{}`** |

**Detail:** Stage `executive_runtime` mengirim `{}` sebagai konteks ke executive. Tidak ada session state, tidak ada awareness, tidak ada RIC.

**Severity: MEDIUM** (EIOS pipeline jarang aktif)

---

### BYPASS TYPE C: EXECUTIVE LANGSUNG PANGGIL LLM (6 violations)

| # | File | Line | Issue |
|---|------|------|-------|
| C1 | `CEO/CEOProgram.ts` | 12 | `import { callDeepSeek }` langsung |
| C2 | `CFO/CFOProgram.ts` | 11 | `import { callDeepSeek }` langsung |
| C3 | `COO/COOProgram.ts` | 5 | `import { callDeepSeek }` langsung |
| C4 | `CMO/CMOProgram.ts` | 11 | `import { callDeepSeek }` langsung |
| C5 | `CKO/CKOProgram.ts` | 4 | `import { callDeepSeek }` langsung |
| C6 | `CAIO/CAIOProgram.ts` | 14 | `import { LOCAL_TOOLS }` dari tool-adapter langsung |

**Detail:** 6 dari 8 executive masih panggil LLM langsung. Hanya CTO (via ExecutionEngine) dan CHRO yang tidak.

**Severity: HIGH** — executive tidak boleh tahu LLM adapter.

---

### BYPASS TYPE D: CHRO PANGGIL TOOL LANGSUNG (1 violation)

| # | File | Line | Issue |
|---|------|------|-------|
| D1 | `CHRO/CHROProgram.ts` | 11 | `import { LOCAL_TOOLS }` dari tool-adapter langsung |

**Detail:** CHRO mengimpor tool adapter langsung, tidak melalui `ExecutionEngine`.

**Severity: MEDIUM**

---

### BYPASS TYPE E: EKSTERNAL PANGGIL LLM LANGSUNG (3 violations)

| # | File | Line | Issue |
|---|------|------|-------|
| E1 | `programs/consultant/consultant-provider.ts` | 11 | `import { callDeepSeek }` langsung |
| E2 | `programs/consultant/consultant-discovery.ts` | 279 | Dynamic import `callDeepSeek` |
| E3 | `operational-decision-engine/AIReasoningEngine.ts` | 49 | Dynamic import `callDeepSeek` |
| E4 | `routes/shiftAudits.ts` | 477 | Dynamic import `callLLMWithTools` |

**Detail:** Program di luar executive-runtime dan RIC memanggil LLM langsung. Tidak melalui Gateway.

**Severity: LOW** (program independen, bukan bagian dari AI OS chat flow)

---

### BYPASS TYPE F: TOOL ADAPTER DIPANGGIL LANGSUNG (1 violation)

| # | File | Line | Issue |
|---|------|------|-------|
| F1 | `knowledge/MissionContextRegistry.ts` | 6 | `import { searchRepoFiles, fetchGitHubFile }` dari tool-adapter langsung |

**Detail:** MissionContextRegistry memanggil tool langsung, tidak lewat `ExecutionEngine`.

**Severity: LOW**

---

## SUMMARY

| Bypass Type | Count | Severity | Impact |
|-------------|-------|----------|--------|
| A — Gateway bypass | 1 | HIGH | Multi-mention tanpa RIC |
| B — EIOS `{}` context | 1 | MEDIUM | Executive tanpa konteks |
| C — Executive panggil LLM | 6 | HIGH | Executive tidak pure |
| D — CHRO panggil tool | 1 | MEDIUM | Tool tanpa ExecutionEngine |
| E — Eksternal panggil LLM | 4 | LOW | Program independen |
| F — Tool langsung | 1 | LOW | Knowledge bypass |
| **TOTAL** | **14** | | |

## RECOMMENDATION

### Immediate Fix (hari ini):
1. **A1** — Ganti `applicationRuntime.executeForTargets()` di `routes/ai.ts:127` dengan loop `getRuntimeGateway().assemble()` per target
2. **B1** — Update `eios-runtime/stages/index.ts:164` untuk passing konteks yang proper (tidak `{}`)

### Short Term (1-2 minggu):
3. **C1-C6** — Route semua LLM call executive melalui ReasoningProvider (RIC) atau ExecutionEngine
4. **D1** — Route CHRO tool call melalui ExecutionEngine

### Long Term (post-P1):
5. **E1-E4, F1** — Program eksternal boleh tetap independen, tapi harus melalui Gateway jika ingin akses AI OS
