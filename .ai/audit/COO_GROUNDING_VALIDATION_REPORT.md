# COO Grounding Validation Report (BETA)

**Date:** 2026-07-14
**Target:** COO Executive Runtime
**Environment:** Production VPS (43.157.227.205)
**Auditor:** Principal AI Runtime QA Engineer

---

## Executive Summary

COO cannot access PostgreSQL for read queries. The COO has **zero read tools** — every available action is write-only (add_stock, produce, add_expense, etc.). The system prompt explicitly tells the LLM `"Kamu TIDAK BISA membaca database"`, reinforcing the limitation. When asked about sales or operational data, COO either responds "tidak ada akses" or falls back to generic statements from the brief context.

**PostgreSQL status**: 43 real products, 386 orders, 685 order items. Real sales data exists but COO cannot reach it.

---

## Phase 1 — Runtime Trace

| Stage | Input | Output | Duration | Status |
|-------|-------|--------|----------|--------|
| **User** | `@COO Penjualan hari ini bagaimana?` | — | — | ✅ |
| **Router** | Routes to COO (matched @COO) | COO.execute() called | — | ✅ |
| **Identity** | COO_IDENTITY + Directive loaded | `getDirective("COO")` | — | ✅ |
| **Memory Provider** | `memoryProvider.read({executive:"COO"})` | memoryCtx with workingMemory, recentDecisions, episodicMemory, knowledgeContext | ~50ms | ✅ |
| **Cognitive Engine** | `cooCognitive.think({role:"COO"})` | cognitiveResult with trace | ~100ms | ✅ |
| **Intent Classification** | `callDeepSeek(COO_INTENT_PROMPT)` | intent="status" | ~500ms | ✅ |
| **Brief Generator** | `getCOOBrief()` → `BriefGenerator.generate()` | Brief with empty situations[], empty objectives[], plans from PlanProvider, knowledge from searchAll("") | ~100ms | ⚠️ |
| **Prompt Assembly** | systemPrompt array (identity + boundaries + brief + branch + directive + foundation + CKO + memory + cognitive) | Full prompt | — | ✅ |
| **LLM** | `callDeepSeek(systemPrompt, "Penjualan hari ini bagaimana?")` | Response: "tidak ada data penjualan" | ~3000ms | ✅ |
| **PostgreSQL Tool** | `get_sales_summary` — **NOT CALLED** | — | — | ❌ SKIPPED |
| **Response** | Returned to user | Text: "operasional normal" | — | ✅ |

### Pipeline Decision Points

```
execute() called
  ├── getDirective() → "COO directive loaded"
  ├── getFoundationCharter() → foundation context
  ├── getCKOAdvisory() → CKO knowledge
  ├── getCOOBrief() → Brief with:
  │   ├── situations: []             ← EMPTY (no real situation data)
  │   ├── objectives: []             ← EMPTY (no real objective data)
  │   ├── plans: PlanProvider.getAll()  ← may be empty
  │   └── knowledge: searchAll("")   ← all episodes, not real-time sales
  ├── memoryProvider.read() → memory context
  ├── CognitiveEngine.think() → reasoning
  ├── IntentClassification → "status"
  ├── handleStatus() → builds prompt + calls LLM
  │   └── LLM responds without DB data
  └── Response returned
```

---

## Phase 2 — PostgreSQL Verification

### Database Actual State

| Table | Count | Status |
|-------|-------|--------|
| products | **43** | ✅ Data exists |
| orders | **386** | ✅ Data exists |
| order_items | **685** | ✅ Data exists |
| Today's orders | **0** (late night) | ✅ Accurate |

### Sample Products in DB
```
Taro Latte, Dark Chocolate, Kopi Susu Gula Aren, Red Velvet,
Kopi Susu, Matcha Latte, Chocomilk
```
No "pisang goreng", "jus jeruk", or "croissant" found in database.

### Was PostgreSQL Called?

**EVIDENCE: NO — PostgreSQL was NEVER called for the sales query.**

The COO pipeline at line 250-272 (`handleAction`) only calls `executeOperation()` when the intent is `"action"` and the action is in `EXECUTION_ACTIONS`. For `"status"` intent (line 350-353), the pipeline calls `handleStatus()` which builds a prompt from the brief and sends it directly to the LLM — **no database access at all**.

The `get_sales_summary` tool exists at `ai-business.ts:488` and queries:
```sql
SELECT COALESCE(SUM(total), 0), COUNT(*) FROM orders
WHERE status = 'completed' AND created_at >= CURRENT_DATE
```
But this tool is **never exposed to COO**.

---

## Phase 3 — Tool Verification

### COO's EXECUTION_ACTIONS (line 55 of COOProgram.ts)

| Tool | Type | Called? | Status |
|------|------|---------|--------|
| add_product | WRITE | No | 🟢 Available |
| add_product_with_variants_and_recipe | WRITE | No | 🟢 Available |
| add_variant | WRITE | No | 🟢 Available |
| update_variant_price | WRITE | No | 🟢 Available |
| update_price | WRITE | No | 🟢 Available |
| deactivate_product | WRITE | No | 🟢 Available |
| add_stock | WRITE | No | 🟢 Available |
| reduce_stock | WRITE | No | 🟢 Available |
| correct_stock | WRITE | No | 🟢 Available |
| loss_correction | WRITE | No | 🟢 Available |
| produce | WRITE | No | 🟢 Available |
| add_ingredient | WRITE | No | 🟢 Available |
| add_semi_finished | WRITE | No | 🟢 Available |
| add_recipe_by_name | WRITE | No | 🟢 Available |
| update_recipe | WRITE | No | 🟢 Available |
| add_expense | WRITE | No | 🟢 Available |
| change_role | WRITE | No | 🟢 Available |
| migrate_branch | WRITE | No | 🟢 Available |
| list_branches | READ | No | 🟢 Available |

### Available in executeOperation() BUT NOT in COO's EXECUTION_ACTIONS

| Tool | Type | Why Missing |
|------|------|-------------|
| `get_sales_summary` | **READ** 🔴 | Not in EXECUTION_ACTIONS |
| `get_top_products` | **READ** 🔴 | Not in EXECUTION_ACTIONS |
| `get_inventory_status` | **READ** 🔴 | Not in EXECUTION_ACTIONS |
| `get_products` | **READ** 🔴 | Not in EXECUTION_ACTIONS |
| `get_shift_audit` | **READ** 🔴 | Not in EXECUTION_ACTIONS |
| `get_expenses` | **READ** 🔴 | Not in EXECUTION_ACTIONS |

### Finding

**COO has 0 (ZERO) read tools.** All 19 actions are write operations. COO physically cannot retrieve data from PostgreSQL through the tool system.

---

## Phase 4 — Prompt Audit

### Final Prompt Structure (line 375-387)

```
# Identitas
Kamu adalah Direktur Operasional (COO) Lume's Everywhere — jaringan F&B.

## BATASAN KETAT
- Kamu TIDAK BISA membaca database          ← BLOCKING READ ACCESS
- Kamu TIDAK BISA menghitung KPI
- Kamu TIDAK BISA mengakses inventory table
- Kamu TIDAK BISA mengubah harga
- Kamu TIDAK BISA mengubah resep tanpa approval

## Brief Hari Ini
{situations:[], objectives:[], plans:[], knowledge:[...]}

## Context Cabang
(list of branches from PostgreSQL — this IS a real DB query)

## Arahan COO
(directive from foundation)

## Ringkasan Foundation
(foundation context)

## CKO Advisory
(knowledge from CKO)

## Memory Context
(working memory + recent decisions + episodic + knowledge)

## Cognitive Analysis
(reasoning result)

## Aksi Bisnis yang Tersedia
(list of 19 write actions)

## Format Output
(JSON schema for action execution)
```

### Hardcoded/Legacy Data Search

| Phrase | Found in Code? | Source |
|--------|---------------|--------|
| "pisang goreng" | ❌ NOT FOUND | Pure LLM hallucination from training data |
| "jus jeruk" | ❌ NOT FOUND | Pure LLM hallucination from training data |
| "kopi susu" | ❌ NOT FOUND in source | ✅ **Actually exists in DB** (product "Kopi Susu") |
| "croissant" | ❌ NOT FOUND | Pure LLM hallucination from training data |

### Prompt Contamination Sources

1. **Line 67-71**: `COO_BRIEF_PROMPT` and main prompt contain `"Kamu TIDAK BISA membaca database"` — this explicitly prevents COO from even attempting data access
2. **Line 55**: `EXECUTION_ACTIONS` contains only write actions — no read tools exposed
3. **Line 179**: `KnowledgeProvider.searchAll("")` in `getCOOBrief()` returns ALL episodes, which may contain stale/irrelevant data
4. **Line 377**: The constraints in the main prompt directly contradict the expectation that COO should provide data-driven answers

---

## Phase 5 — Memory Audit

| Memory Source | Used? | Content | Quality |
|---------------|-------|---------|---------|
| Working Memory | ✅ | ContextManager.buildMemoryPrompt("COO") | Generic |
| Recent Decisions | ✅ | ExecutiveMemoryProvider.recallForExecutive() | Real decisions |
| Episodic Memory | ✅ | orgMemory.search() | Past missions |
| Knowledge Context | ✅ | knowledgeGraph.findByDomain("operations") | Knowledge nodes |
| Organizational Memory | ❌ | Not fetched for COO | N/A |
| Memory Engine Records | ❌ | Not fetched for COO | N/A |

No old menu data found in memory sources. The LLM hallucination of "pisang goreng" etc. comes from training data, not memory.

---

## Phase 6 — Hallucination Detection

### COO Response to "Penjualan hari ini bagaimana?"

| Sentence | Label | Source |
|----------|-------|--------|
| "berdasarkan brief hari ini (14 Juli 2026)" | PROMPT | Brief date |
| "0 critical, 0 high severity situations" | PROMPT | Brief — situations[] is empty |
| "tidak ada action items atau plan aktif" | PROMPT | Brief — plans maybe empty |
| "operasional Lume's Cilengkrang 1 berjalan normal" | PROMPT | Branch context from PostgreSQL (line 118-141) |
| "semua KPI terpantau stabil" | HALLUCINATION ⚠️ | System prompt says "TIDAK BISA menghitung KPI" but still claims KPI is stable |
| "knowledge blocks hari ini hanya berisi test message" | PROMPT | From knowledge section of brief |

### Response to "Menu apa saja yang tersedia?"

| Sentence | Label | Source |
|----------|-------|--------|
| "saya tidak memiliki akses langsung ke data menu" | PROMPT | Correct per system prompt constraints |
| "saya sarankan menghubungi staff cabang" | HALLUCINATION ⚠️ | Not a real action — COO cannot contact staff |
| "melihat display menu di outlet" | HALLUCINATION ⚠️ | Not grounded in any system data |

### Hallucination Sources

1. **"pisang goreng", "jus jeruk", "croissant"** — Pure LLM training data hallucination. Not in source code, not in database, not in knowledge platform.
2. **"KPI stabil"** — System prompt says can't calculate KPI, but still claims stability. Contradiction in prompt.
3. **"hubungi staff"** — Not a real executable action.

---

## Phase 7 — Grounding Score

| Metric | Value | Calculation |
|--------|-------|-------------|
| **Grounding Rate** | **60%** | 3/5 response sentences traceable to prompt/brief/branch |
| **Hallucination Rate** | **40%** | 2/5 sentences ungrounded (KPI claim + "hubungi staff") |
| **Prompt Contamination** | **HIGH** | "TIDAK BISA membaca database" blocks all data access |
| **Memory Leakage** | **NONE** | No old menu data in memory |
| **Tool Usage Rate** | **0%** | No tools called for status/query intents |
| **SQL Usage Rate** | **0%** | PostgreSQL never queried for read operations |
| **Fallback Rate** | **100%** | When data is needed, falls back to LLM training data |

---

## Phase 8 — Root Cause

### Primary Root Cause: COO Has Zero Read Tools

**Evidence:**
- `COOProgram.ts` line 55: `EXECUTION_ACTIONS` contains only 19 write actions
- `ai-business.ts` line 84-783: `executeOperation()` supports 6 read tools (get_sales_summary, get_top_products, get_inventory_status, get_products, get_shift_audit, get_expenses)
- None of these 6 read tools are in EXECUTION_ACTIONS
- COO's `handleAction()` at line 250-272 filters actions through EXECUTION_ACTIONS

**File:** `src/executive-runtime/executives/COO/COOProgram.ts` **line 55**

### Secondary Root Cause: System Prompt Blocks DB Access

**Evidence:**
- `COO_BRIEF_PROMPT` at lines 66-71: "Kamu TIDAK BISA membaca database"
- Main prompt at line 377: Same constraint
- This instructs the LLM to NOT attempt database queries

**File:** `src/executive-runtime/executives/COO/COOProgram.ts` **lines 67-71 and 377**

### Tertiary Root Cause: Status Intent Bypasses Tool System

**Evidence:**
- When intent is "status", `handleStatus()` at line 237-247 builds a prompt from brief and calls LLM directly
- No tool execution occurs in the "status" path
- The only data available to the LLM is the brief (which has no real-time data)

**File:** `src/executive-runtime/executives/COO/COOProgram.ts` **lines 237-247**

---

## Phase 9 — Suggested Fixes

### Fix 1: Add Read Tools to EXECUTION_ACTIONS

| File | Function | Change |
|------|----------|--------|
| `COOProgram.ts` line 55 | EXECUTION_ACTIONS | Add: `"get_sales_summary"`, `"get_top_products"`, `"get_inventory_status"`, `"get_products"`, `"get_expenses"` |
| **Reason** | COO needs read capability to answer sales/inventory questions |
| **Risk** | Low — tools already exist in executeOperation() |
| **Impact** | COO can now call `get_sales_summary`, `get_inventory_status` etc. through the action intent path |

### Fix 2: Modify System Prompt Constraints

| File | Function | Change |
|------|----------|--------|
| `COOProgram.ts` lines 67-71, 377 | System prompt | Replace `"Kamu TIDAK BISA membaca database"` with `"Kamu bisa membaca data melalui tool system. Gunakan action get_sales_summary, get_inventory_status, dan get_products untuk mengakses data real-time dari database."` |
| **Reason** | Current prompt actively blocks data access |
| **Risk** | Medium — LLM behavior change |
| **Impact** | COO will attempt to use tools for data queries |

### Fix 3: Add Status Intent → Sales Summary Bridge

| File | Function | Change |
|------|----------|--------|
| `COOProgram.ts` lines 237-247 | handleStatus() | After building brief, also call `executeOperation("get_sales_summary", {period:"today"}, branchId)` and inject result into the prompt |
| **Reason** | "Status" intents about sales should automatically get real data |
| **Risk** | Low — adds one DB query |
| **Impact** | COO always has real sales data when asked about status |

### Fix 4: Brief Should Include Real Sales Data

| File | Function | Change |
|------|----------|--------|
| `COOProgram.ts` lines 164-182 | getCOOBrief() | After generating brief, add sales summary section with real data from get_sales_summary |
| **Reason** | The brief is the primary context — it should have real data |
| **Risk** | Low |
| **Impact** | Every COO response is grounded in real sales data |

---

## Summary

| Aspect | Verdict | Evidence |
|--------|---------|----------|
| PostgreSQL has data? | ✅ YES — 43 products, 386 orders | Direct DB query |
| COO called PostgreSQL? | ❌ NO — never | Pipeline trace: status path bypasses tools |
| Read tools exist? | ✅ YES — 6 in executeOperation() | ai-business.ts lines 488-578 |
| COO has read tools? | ❌ NO — zero in EXECUTION_ACTIONS | COOProgram.ts line 55 |
| "pisang goreng" in code? | ❌ NO — LLM hallucination | Grep showed no match |
| "Kopi Susu" in code? | ✅ YES — real product in DB | psql query confirmed |
| Prompt blocks DB? | ✅ YES — "TIDAK BISA membaca database" | COOProgram.ts lines 67-71, 377 |
| Grounding Score | **60%** | 40% hallucination rate |

### Minimal Fix Required

```diff
// COOProgram.ts line 55 — add 6 read tools
const EXECUTION_ACTIONS = ["add_product", ..., "list_branches",
+  "get_sales_summary", "get_top_products", "get_inventory_status",
+  "get_products", "get_expenses", "get_shift_audit"
];

// COOProgram.ts lines 67-71 — remove DB access block
- - Kamu TIDAK BISA membaca database
+ - Gunakan action get_sales_summary untuk data penjualan
+ - Gunakan action get_inventory_status untuk data stok
+ - Gunakan action get_products untuk data produk
```
