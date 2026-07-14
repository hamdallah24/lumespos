# Executive Runtime Status Intent Architecture Audit (BETA)

**Date:** 2026-07-14
**Auditor:** Principal Executive Runtime Architecture Auditor
**Scope:** All 8 executives — CEO, CTO, CFO, COO, CMO, CHRO, CAIO, CKO

---

## Phase 1 — Status Intent Discovery

### Search Results: `handleStatus`, `intentType === "status"`, fast path handlers

| Executive | File | Lines | Handler | Type |
|-----------|------|-------|---------|------|
| **CEO** | `CEOProgram.ts` | — | ❌ **NONE** | — |
| **CTO** | `CTOProgram.ts` | — | ❌ **NONE** | — |
| **CFO** | `CFOProgram.ts` | — | ❌ **NONE** | — |
| **COO** | `COOProgram.ts` | 237-248 | `handleStatus()` | **FAST PATH** |
| **COO** | `COOProgram.ts` | 350-354 | `intentType === "status"` | **FAST PATH** |
| **CMO** | `CMOProgram.ts` | — | ❌ **NONE** | — |
| **CHRO** | `CHROProgram.ts` | — | ❌ **NONE** | — |
| **CAIO** | `CAIOProgram.ts` | — | ❌ **NONE** | — |
| **CKO** | `CKOProgram.ts` | 68-71 | Keyword routing (council) | FAST PATH (different) |

### COO Fast Path (exact code)

```typescript
// COOProgram.ts:350-354
if (intentType === "status") {
    pipeline.push("BriefConsumer");
    executionResult = await handleStatus(intentData.query || task.message, branchId);
    return { success: true, text: executionResult, pipeline };
}
```

```typescript
// COOProgram.ts:237-248
async function handleStatus(query: string, branchId?: number): Promise<string> {
  const brief = await getCOOBrief(branchId);
  const plans = PlanProvider.getAll();
  const planSummaries = plans.map(p => { ... }).join("\n");
  const responsePrompt = `${COO_BRIEF_PROMPT}\n\n# Brief Hari Ini\n${...}\n\n# Progres Eksekusi\n${...}`;
  const llmResponse = await callDeepSeek(responsePrompt, query, 0, "bisnis", 2000, false);
  return llmResponse;
}
```

---

## Phase 2 — Runtime Flow Mapping

### COO (FAST PATH — Status Intent)

```
User "Penjualan hari ini?"
  ↓
Router → @COO matched
  ↓
COO.execute()
  ├── getDirective()
  ├── getFoundationCharter()
  ├── getCKOAdvisory()
  ├── getCOOBrief()        ← brief generated (no real sales data)
  ├── memoryProvider.read()
  ├── CognitiveEngine.think()
  ├── IntentClassification  ← "status" detected
  │     └── FAST PATH TRIGGERED
  ├── handleStatus()
  │     └── callDeepSeek(prompt, query)   ← NO TOOLS
  └── Response
```

### CEO (FULL PIPELINE — No Tool System)

```
User "Strategi ekspansi?"
  ↓
Router → @CEO matched
  ↓
CEO.execute()
  ├── understand() → spec.intent
  ├── buildSpecV1 → ExecutionSpec
  ├── Verification
  ├── MissionCheck
  ├── MemoryProvider.read()
  ├── CognitiveEngine.think()
  ├── PromptAssembly
  ├── callDeepSeek(prompt)    ← NO TOOLS
  └── Response
```

### CTO (FULL PIPELINE — Tool System)

```
User "Arsitektur teknologi?"
  ↓
Router → @CTO matched
  ↓
CTO.execute()
  ├── understand() → spec.intent
  ├── Verification
  ├── Planner
  ├── ContextFetching (files)
  ├── KnowledgeLoader
  ├── CKO
  ├── MemoryProvider.read()
  ├── CognitiveEngine.think()
  ├── resolveTools() → toolSet
  ├── callDeepSeekWithTools()    ← WITH TOOLS
  └── Response
```

### CFO/CMO/CHRO/CAIO (FULL PIPELINE — Generic Tools)

```
User "{domain-specific} query"
  ↓
Router → @exec matched
  ↓
Executive.execute()
  ├── understand() → spec.intent
  ├── Verification
  ├── GovernanceCheck
  ├── CKO consult
  ├── MemoryProvider.read()
  ├── CognitiveEngine.think()
  ├── Context (Plans + Knowledge + Branch)
  ├── ExecutionPipeline.execute(LOCAL_TOOLS)  ← GENERIC TOOLS
  └── Response
```

### CKO (KEYWORD ROUTING — No Tool System)

```
User "Knowledge query"
  ↓
Router → @CKO matched
  ↓
CKO.execute()
  ├── keyword match?
  │     ├── council keywords → councilSessionManager → return
  │     └── no match → advisory mode
  ├── MemoryProvider.read()
  ├── CognitiveEngine.think()
  ├── consultantRuntime.analyze()
  │     └── fail → KnowledgeProvider.searchAll() + callDeepSeek
  └── Response
```

---

## Phase 3 — Planner Verification

| Executive | Status Intent Has Planner? | Evidence |
|-----------|---------------------------|----------|
| **CEO** | N/A — no status handler | No `handleStatus`, no `intentType === "status"` |
| **CTO** | N/A — no status handler | Planner always runs for all queries |
| **CFO** | N/A — no status handler | `ExecutionPipeline.execute()` always runs |
| **COO** | **❌ BYPASSED** | Lines 350-354: returns `handleStatus()` directly, never reaches tool fallback at lines 368-434 |
| **CMO** | N/A — no status handler | `ExecutionPipeline.execute()` always runs |
| **CHRO** | N/A — no status handler | `ExecutionPipeline.execute()` always runs |
| **CAIO** | N/A — no status handler | `ExecutionPipeline.execute()` always runs |
| **CKO** | N/A — no status handler | No tool system exists |

**Conclusion: Only COO has a status handler, and it bypasses the planner/tool system.**

---

## Phase 4 — Tool Verification

| Executive | Status Query "hari ini bagaimana?" | Candidate Tool | Tool Executed | Rows | Database Called |
|-----------|-----------------------------------|----------------|---------------|------|----------------|
| **CEO** | No status handler → full pipeline | N/A (no tools) | ❌ | — | ❌ |
| **CTO** | No status handler → full pipeline | `resolveTools(CTO)` | ✅ tools available | — | Depends on tool |
| **CFO** | No status handler → full pipeline | `LOCAL_TOOLS` | ✅ tools available | — | Depends on tool |
| **COO** | **Status detected → handleStatus()** | **❌ NO TOOL** | **❌** | **0** | **❌ PostgreSQL not queried** |
| **CMO** | No status handler → full pipeline | `LOCAL_TOOLS` | ✅ tools available | — | Depends on tool |
| **CHRO** | No status handler → full pipeline | `LOCAL_TOOLS` | ✅ tools available | — | Depends on tool |
| **CAIO** | No status handler → full pipeline | `LOCAL_TOOLS` | ✅ tools available | — | Depends on tool |
| **CKO** | No status handler → advisory mode | N/A (no tools) | ❌ | — | ❌ |

**Conclusion: COO is the ONLY executive where a status query bypasses all tools.**

---

## Phase 5 — Memory Verification

| Executive | Status Query Memory Read | Sources | Result in Prompt? |
|-----------|-------------------------|---------|-------------------|
| **CEO** | ✅ Full pipeline | working + episodic + knowledge | ✅ Via `assemble()` |
| **CTO** | ✅ Full pipeline | working + decisions + knowledge | ✅ Via prompt |
| **CFO** | ✅ Full pipeline | working + decisions + knowledge | ✅ Via prompt |
| **COO** | ✅ Yes, BUT... | memoryProvider.read() called at line 300 | ⚠️ memoryCtx assembled (line 373) but handleStatus() at line 352 discards it — uses brief instead |
| **CMO** | ✅ Full pipeline | working + decisions + knowledge | ✅ Via prompt |
| **CHRO** | ✅ Full pipeline | working + decisions + knowledge | ✅ Via prompt |
| **CAIO** | ✅ Full pipeline | working + decisions + knowledge | ✅ Via prompt |
| **CKO** | ✅ Memory read | memoryCtx | ✅ Via prompt |

**Key finding for COO:** Memory IS read (line 300-311) and the memoryCtx IS assembled (line 373), but `handleStatus()` at line 352 **does not use memoryCtx**. The `handleStatus()` function generates its own prompt from the brief and plan summaries, ignoring the memory context that was already fetched.

---

## Phase 6 — Prompt Assembly Audit

### COO handleStatus() Final Prompt (lines 243-245)

```
# Identitas
Kamu adalah Direktur Operasional (COO) Lume's Everywhere.

# Wewenang
[approve/monitor/report]

# BATASAN KETAT
- TIDAK BISA membaca database
- TIDAK BISA menghitung KPI
- TIDAK BISA mengakses inventory
...

# Brief Hari Ini
{JSON brief — empty situations, empty objectives, knowledge blocks}

# Progres Eksekusi
{plan summaries}
```

**Tool Result in prompt?** ❌ **NO**
**Memory Result in prompt?** ❌ **NO** (memoryCtx ignored)
**Knowledge Result in prompt?** ⚠️ PARTIAL (via `KnowledgeProvider.searchAll("")` in brief)
**Learning Result in prompt?** ❌ **NO**
**PostgreSQL Result in prompt?** ❌ **NO**

### COO Full Pipeline (fallback) Prompt (lines 375-387)

```
# Identitas
...

## BATASAN KETAT
- TIDAK BISA membaca database
...

## Brief Hari Ini
{brief}

## Context Cabang
{real branch data — this IS from PostgreSQL via getBranchContext()}

## Arahan COO / Foundation / CKO / Memory Context / Cognitive Analysis
...

## Aksi Bisnis yang Tersedia
{19 actions — NO read tools}

## Format Output
{schema}
```

**Tool Result in prompt?** ✅ YES (if tool was executed via JSON action)
**Memory Result in prompt?** ✅ YES
**Knowledge Result in prompt?** ⚠️ PARTIAL
**PostgreSQL Result in prompt?** ✅ YES (branch context)

### Other Executives (CFO/CMO/CHRO/CAIO) Final Prompt

All use `assemble()` + post-assembly additions:
```
{assemble(identity, directive, decision:trace, outputSchema, maxTokens, mode)}
+ branchContext
+ CKO Advisory
+ Plans Context
+ Knowledge
+ [Memory Context — added in T5.4]
```

**Tool Result in prompt?** ✅ YES (via ExecutionPipeline)
**Memory Result in prompt?** ✅ YES (via memoryCtx block)
**Knowledge Result in prompt?** ✅ YES (via KnowledgeProvider.searchAll)
**PostgreSQL Result in prompt?** ⚠️ Branch context only

---

## Phase 7 — Architecture Consistency

| Aspect | CEO | CTO | CFO | COO | CMO | CHRO | CAIO | CKO |
|--------|-----|-----|-----|-----|-----|------|------|-----|
| **Intent Detection** | `understand()` | `understand()` | `understand()` | **Custom prompt** | `understand()` | `understand()` | `understand()` | Keyword |
| **Status Handler** | ❌ | ❌ | ❌ | **✅ YES** | ❌ | ❌ | ❌ | ❌ |
| **Tool Planner** | ❌ | ✅ Custom | ✅ Generic | ✅ Custom + fallback | ✅ Generic | ✅ Generic | ✅ Generic | ❌ |
| **Memory Before LLM** | ✅ | ✅ | ✅ | ✅ (ignored in fast path) | ✅ | ✅ | ✅ | ✅ |
| **PostgreSQL Access** | ❌ | ❌ | ❌ | **✅ list_branches only** | ❌ | ❌ | ❌ | ❌ |
| **Fast Path** | 3 exits (mission, approval, verify) | ❌ | ❌ | **✅ 4 exits (approve, status, action, question)** | ❌ | ❌ | ❌ | 2 keyword exits |
| **Architecture Pattern** | Pure reasoning | Full pipeline + tools | Generic pipeline + tools | **Hybrid: fast path + fallback** | Generic pipeline + tools | Generic pipeline + tools | Generic pipeline + tools | Pure knowledge |

**Consistency Score:** 3/8 (CFO, CMO, CHRO, CAIO share same architecture. CEO, CTO, COO, CKO each unique.)

---

## Phase 8 — Pattern Detection

### Pattern 1: The "CFO/CMO/CHRO/CAIO" Cluster (4 executives)
- Share identical `Program.ts` template
- All use `understand()` → `buildSpecV1()` → `ExecutionPipeline.execute(LOCAL_TOOLS)`
- None have any form of fast path or status handler
- None have executive-specific tool selection
- All use the generic `LOCAL_TOOLS` from `tool-adapter.ts`

### Pattern 2: The "Unique Architectures" (4 executives)
- **CEO**: Pure reasoning, no tools, semantic engine for intent
- **CTO**: Full pipeline with executive-specific tool resolution
- **COO**: Hybrid design with explicit intent classification + fast paths + tool fallback
- **CKO**: Minimal architecture, keyword routing, no tools

### Pattern 3: COO's Intent Classification Design
COO is the **ONLY** executive with:
1. An explicit intent classification prompt (`COO_INTENT_PROMPT`)
2. A dedicated `handleStatus()` function
3. An `EXECUTION_ACTIONS` whitelist
4. A dual-path design (fast path for recognized intents, LLM fallback with tool parsing for everything else)

### Pattern 4: The Status Intent Gap
Only COO has a status intent handler. The other 7 executives treat status-like queries as regular queries that go through the full pipeline (or advisory mode for CKO).

---

## Phase 9 — Root Cause Analysis

### Root Cause: COO's `handleStatus()` is a Design Intent, Not a Bug

| Dimension | Analysis |
|-----------|----------|
| **Origin** | Intentional design. COO's `COO_INTENT_PROMPT` explicitly defines "status" as a valid intent. The `handleStatus()` function was deliberately created. |
| **Design Intent** | "Status" was designed as a lightweight path for operational check-ins ("gimana kabar hari ini", "apa yang terjadi") — not data queries. The assumption was that these don't need database access. |
| **Bug or Feature?** | **Feature that became a bug.** The design intent was valid for casual check-ins, but sales/inventory queries are also classified as "status", creating a false dichotomy. |
| **Technical Debt** | MEDIUM. The `handleStatus()` function bypasses tool execution, memory context, and PostgreSQL. It relies solely on the brief, which has empty situations and objectives. |
| **Legacy Code** | The pattern predates the tool system. When tools were added (executeOperation), `handleStatus()` was never updated to use them. |
| **Commit Evidence** | `COO_BRIEF_PROMPT` at lines 57-81: `"Kamu TIDAK BISA membaca database"` — this constraint was designed for the COO's pre-tool era and was never removed when tools became available. |

### Why This Is Not a Local Bug

```
COO's handleStatus() design flaw:
  status query → no tools → no SQL → LLM-only response
                    ↓
              This is the INTENDED behavior
                    ↓
              But it INTENTIONALLY excludes database access
                    ↓
              When user asks "Penjualan hari ini?"
              → classified as "status" (correct per intent prompt)
              → handleStatus() runs (correct per code path)
              → no sales data returned (correct per design, WRONG per user expectation)
```

This is an **architectural design flaw**, not a bug. The system works exactly as coded, but the coding assumption (status queries don't need data) is wrong.

---

## Phase 10 — Impact Analysis

### If COO's handleStatus() Were Removed

| Area | Impact | Severity |
|------|--------|----------|
| **Mission system** | None — CEO handles missions | ✅ None |
| **Council** | None — council handles own flow | ✅ None |
| **Planner** | Positive — all queries go through tool planner | ✅ Improved |
| **Tool Runtime** | Positive — tools always evaluated | ✅ Improved |
| **Learning** | No impact — learning is downstream of tool execution | ✅ Neutral |
| **Memory** | Positive — memoryCtx used instead of discarded | ✅ Improved |
| **Latency** | Negative — adds 1-3s for tool evaluation | ⚠️ +1-3s |
| **Token Usage** | Negative — more tokens for tool results | ⚠️ +500-2000 tokens |

### If COO's handleStatus() Were Extended to Use Tools (Recommended)

| Area | Impact | Severity |
|------|--------|----------|
| **Status queries** | Sales data now included | ✅ Positive |
| **Memory** | Still used but now augmented with tool data | ✅ Positive |
| **Latency** | Adds ~200ms for get_sales_summary execution | ✅ Low |
| **Token Usage** | Adds ~100-200 tokens for sales summary | ✅ Low |

---

## Phase 11 — Risk Analysis

| Change | Risk Level | Reasoning |
|--------|-----------|-----------|
| Add read tools to EXECUTION_ACTIONS | **LOW** | Tools already exist in executeOperation(). COO's handleAction() proven to work (Phase 2 tests 4-5). |
| Inject get_sales_summary into handleStatus() | **LOW** | Adds one extra DB query. No architectural change. handleStatus() already has `branchId` available. |
| Remove "TIDAK BISA membaca database" from prompt | **MEDIUM** | Changes behavior of non-status paths too. Need to replace with proper tool usage guidance. |
| Merge handleStatus() into main pipeline | **HIGH** | Major architectural change. Affects all 4 fast paths (approve, status, action, question). Could break operational workflows. |
| Remove handleStatus() entirely | **HIGH** | All status queries would fall to the LLM fallback path. The fallback path also has limited tool access. |
| Apply COO pattern to other executives | **MEDIUM** | Adding explicit intent classification to 6 other execs changes their architecture fundamentally. |

---

## Phase 12 — Fix Strategy (Design Only)

### Option A: Minimal — Add Read Tools to COO's EXECUTION_ACTIONS

| Dimension | Assessment |
|-----------|------------|
| **Complexity** | **LOW** — Add 6 strings to an array |
| **Risk** | **LOW** — Tools exist and are tested (list_branches proven working) |
| **Backward Compat** | ✅ FULL — COO can still use fast paths; only gains new capability |
| **Maintainability** | ✅ — Simple array, easy to understand |
| **Scalability** | ✅ — Adding more read tools is same pattern |
| **User Impact** | Queries like "Cek stok bahan baku" would now work via action intent |

### Option B: Medium — Inject Real Data Into handleStatus()

| Dimension | Assessment |
|-----------|------------|
| **Complexity** | **MEDIUM** — Add 3-5 lines in handleStatus() to call get_sales_summary + get_inventory_status |
| **Risk** | **LOW** — Read-only queries, no side effects |
| **Backward Compat** | ✅ FULL — Existing responses only enhanced with data |
| **Maintainability** | ✅ — handleStatus() stays as-is, just augmented |
| **Scalability** | ⚠️ — Each new data source needs a new tool call in handleStatus() |
| **User Impact** | "Penjualan hari ini?" would now include real sales numbers |

### Option C: Major — Remove Fast Paths, Unify Pipeline

| Dimension | Assessment |
|-----------|------------|
| **Complexity** | **HIGH** — Remove 4 fast paths, redesign COO.execute() |
| **Risk** | **HIGH** — approve/action/question intents may break |
| **Backward Compat** | ❌ — Changes behavior of existing workflows |
| **Maintainability** | ✅ — Single pipeline instead of 5 paths |
| **Scalability** | ✅ — New capabilities automatically flow to all queries |
| **User Impact** | Latency increases 1-3s for all queries |

### Option D: Cross-Executive — Add Status Intent to All Executives

| Dimension | Assessment |
|-----------|------------|
| **Complexity** | **HIGH** — 6 execs need new intent classification |
| **Risk** | **HIGH** — Changing 6 executive architectures simultaneously |
| **Backward Compat** | ⚠️ — New fast paths could break existing behavior |
| **Maintainability** | ❌ — 6 new code paths to maintain |
| **Scalability** | ❌ — Each exec needs individual tool configuration |
| **User Impact** | Positive — faster responses for status queries |

### Recommendation: **Option A + B (Sequential)**

**Phase 1 (Option A):** Add 6 read tools to `EXECUTION_ACTIONS`
```typescript
// COOProgram.ts line 55 — add:
"get_sales_summary", "get_top_products", "get_inventory_status",
"get_products", "get_expenses", "get_shift_audit"
```
This enables queries like "Cek stok bahan baku" and "Tampilkan penjualan" to work through the action intent → handleAction → executeOperation → PostgreSQL pipeline.

**Phase 2 (Option B):** Inject `get_sales_summary` into `handleStatus()`
```typescript
// COOProgram.ts handleStatus() — add before LLM call:
const salesData = await executeOperation("get_sales_summary", {period: "today"}, branchId);
// Append to responsePrompt
```
This enables "Penjualan hari ini bagaimana?" to include real sales data.

**Rationale:** Phase 1 is zero-risk (tools exist, proven working). Phase 2 has low risk (read-only). Together they solve the COO grounding problem without touching any other executive or changing the architecture.

**Do NOT apply to other executives** — CEO/CTO/CFO/CMO/CHRO/CAIO/CKO don't have the status fast path problem. COO is unique and should be fixed locally.
