# Architecture Discovery v1.0 — AI Operating System (ALE)

**Date**: 2026-07-11  
**Mode**: READ-ONLY Analysis — No changes made  
**Scope**: Full system audit across 12 phases

---

## 1. Executive Inventory

### CEO Runtime

| Field | Value |
|---|---|
| **File** | `artifacts/api-server/src/ai/programs/ceo-runtime.ts` |
| **Entry Point** | `ai.ts` → `orchestrator.execute()` → registered in `index.ts:116` |
| **Responsibility** | REASONING mode. Mission planning, delegation, strategic decisions, CTO plan approval, executive report generation |
| **Tools** | NONE — CEO is pure LLM, no tool execution |
| **Model** | `callDeepSeek()` → DeepSeek API (`deepseek-chat`) |
| **Input** | `CEOContext { message, userId, onProgress, onTool, onState, onExecutionEvent }` |
| **Output** | `CEOResult { success, text, decision: ExecutiveDecision, pipeline }` |
| **Dependencies** | Identity, FoundationLoader, SemanticEngine, ExecutionSpecificationV1, VerificationEngine, OrganizationEngine, LLM, CKO, MissionEngine, KnowledgeBackbone, DB (`missionsTable`) |

### CTO Runtime

| Field | Value |
|---|---|
| **File** | `artifacts/api-server/src/ai/programs/cto-runtime.ts` |
| **Entry Point** | `ai.ts` → `orchestrator.execute()` → registered in `index.ts:136` |
| **Responsibility** | Code analysis, implementation, architecture review, DevOps. 15-stage pipeline. Has tool access. |
| **Tools** | Filesystem (readFile, writeFile, editFile, listDir, searchContent), Git, SSH, execCommand, BusinessData (9 tools) |
| **Model** | `callDeepSeekWithTools()` → `ExecutionPipeline` → `callLLMWithTools()` → DeepSeek API |
| **Input** | `CTOTask { message, userId, missionId, onProgress, onTool, onExecutionEvent }` |
| **Output** | `CTOResult { success, text, pipeline, reflection, toolsUsed, filesRead }` |
| **Dependencies** | Identity, Authorization, Directive, SemanticEngine, ExecutionSpec, Verification, Planner, KnowledgeLoader, ContextBuilder, PromptAssembler, LLM, ReflectionEngine, EvidenceCollector, KnowledgeEvolution, CKO |

### COO Runtime

| Field | Value |
|---|---|
| **File** | `artifacts/api-server/src/programs/coo-runtime.ts` |
| **Entry Point** | `ai.ts:189` — direct import bypassing orchestrator (fallback). Also registered in `index.ts:157` |
| **Responsibility** | Business operations: inventory, sales, products, expenses, shift audit, stock management |
| **Tools** | Via `executeOperation()` in `ai-business.ts` — 30+ business actions (CRUD on products, stock, expenses, etc.) |
| **Model** | `callDeepSeek()` → DeepSeek API (2-step: intent classifier → persona formatter) |
| **Input** | `COOTask { message, userId, branchId, onProgress }` |
| **Output** | `COOResult { success, text, pipeline }` |
| **Dependencies** | Identity, FoundationProvider, CKO, `ai-business.ts` (executeOperation), `routes/ai-business.ts` |

### CFO Runtime

| Field | Value |
|---|---|
| **File** | `artifacts/api-server/src/ai/programs/executive-runtime.ts:119` |
| **Entry Point** | Registered in `index.ts:175` — via `createExecutiveRuntime({ role: "CFO" })` |
| **Responsibility** | Financial reports, budget analysis |
| **Tools** | `LOCAL_TOOLS` via `ExecutionPipeline` |
| **Model** | `ExecutionPipeline` → `callLLMWithTools` → DeepSeek |
| **Input** | `ExecutiveTask { message, userId, onProgress }` |
| **Output** | `ExecutiveResult { success, text, pipeline }` |
| **Dependencies** | Identity, Directive, SemanticEngine, ExecutionPipeline, CKO |

### CMO Runtime

| Field | Value |
|---|---|
| **File** | `executive-runtime.ts:120` — `createExecutiveRuntime({ role: "CMO" })` |
| **Entry** | Registered? **UNKNOWN** — not found in `index.ts` registration |
| **Status** | **UNKNOWN** — defined but registration not confirmed |

### CHRO Runtime

| Field | Value |
|---|---|
| **File** | `executive-runtime.ts:121` — `createExecutiveRuntime({ role: "CHRO" })` |
| **Entry** | Registered? **UNKNOWN** — not found in `index.ts` registration |
| **Status** | **UNKNOWN** — defined but registration not confirmed |

### CIO Runtime

| Field | Value |
|---|---|
| **File** | `executive-runtime.ts:122` — `createExecutiveRuntime({ role: "CIO" })` |
| **Entry** | Registered? **UNKNOWN** — not found in `index.ts` registration |
| **Status** | **UNKNOWN** — defined but registration not confirmed |

### CKO (Consultant Runtime)

| Field | Value |
|---|---|
| **File** | `artifacts/api-server/src/programs/consultant/consultant-runtime.ts` |
| **Entry** | Registered in `index.ts:109`. Also injected into CEO, CTO, COO runtimes |
| **Responsibility** | Knowledge governance, architecture audit, policy recommendations, project structure mapping |
| **Tools** | NONE — read-only advisor |
| **Model** | No direct LLM — uses `consultantDomain.advisor()` (hardcoded logic + strategic cache) |
| **Input** | `ConsultantMode`, `question?: string` |
| **Output** | `ConsultantResult { success, text, findings, recommendations }` |
| **Dependencies** | KnowledgeGovernor, FoundationProvider, StrategicCache |

### Executive Hierarchy

```
Founder (user)
  ↓
AI Gateway (routes/ai.ts)
  ↓
Orchestrator (runtime-orchestrator.ts)
  ↓
CEO ─── CKO (advisory)
  ↓
CTO ─── CKO (advisory) ─── COO ─── CKO (advisory) ─── CFO (same skeleton)
```

---

## 2. Runtime Pipeline Inventory

### CEO Pipeline (`ceo-runtime.ts`)

```
execute()
  → 1. Identity
  → 2. ApprovalHandler (jika [CEO APPROVAL])
  → 3. DirectiveLoad (Foundation)
  → 4. CKOTranslate (consultantRuntime.translateToTargets)
  → 5. SemanticEngine (understand → SemanticContract)
  → 6. ExecutionSpec (buildSpecV1)
  → 7. Verification (verify spec)
  → 8. OrganizationEngine (delegateBySpec)
  → 9. Decision (ExecutiveDecision)
  → 10a. MissionQuery (jika tanya misi) → DB missionsTable
  → 10b. BackgroundMission (jika buat misi) → missionRuntime.create()
  → 10c. PromptAssembly + LLM (chat biasa)
  → 11. Refusal Post-process
  → 12. ExecutiveReport (output formatting)
```

**Synchronous** — seluruhnya dalam 1 request-response.

### CTO Pipeline (`cto-runtime.ts`)

```
execute()
  → 1. Identity
  → 2. Directive (Foundation)
  → 3. Authorization
  → 4. MissionScope
  → 5. SemanticEngine (understand → SemanticContract)
  → 6. ExecutionSpec (buildSpecV1)
  → 7. Verification
  → 8. Intent override (jika implement)
  → 9. Planner (taskGraph)
  → 10. ContextFetching (CKO map + MissionContextRegistry)
  → 11. KnowledgeLoader
  → 12. CKO Consultation
  → 13. PromptAssembly
  → 14. LLM via callDeepSeekWithTools → ExecutionPipeline
       → ExecutionDriver.run() loop:
         Cycle 1: EXPLORE (search, list, read)
         Cycle 2: ANALYZE (read, dependencies)
         Cycle 3: CONCLUDE (no tools, format output)
         Cycle 4: EXECUTE (write, edit, execCommand) — after CEO approval
  → 15. Reflection
  → 16. EvidenceCollection
  → 17. KnowledgeEvolution (jika gaps ditemukan)
```

**Synchronous** — loop via ExecutionGovernor.

### COO Pipeline (`coo-runtime.ts`)

```
execute()
  → 1. Identity
  → 2. Directive + Foundation + CKO Advisory
  → 3. IntentClassification (LLM-based: callDeepSeek)
  → 4a. DATA QUERY PATH:
       → executeOperation(action, params, branchId)
       → LLM format data → persona response
  → 4b. NON-DATA PATH:
       → System prompt assembly
       → callDeepSeek (LLM)
       → Parse JSON action
       → executeOperation()
       → Return result
```

**Synchronous** — single request.

### CFO (and generic executive) Pipeline (`executive-runtime.ts`)

```
execute()
  → 1. Identity
  → 2. Directive
  → 3. SemanticEngine
  → 4. ExecutionSpec
  → 5. Verification
  → 6. CKO Consultation
  → 7. PipelineLLM via ExecutionPipeline.execute()
  → 8. Result
```

**Synchronous**

---

## 3. Knowledge Inventory

### Foundation

| Knowledge | Location | Size | Loaded | Consumer |
|---|---|---|---|---|
| Foundation assets | `ai/runtime/foundation/domains/` (8 domain files) + `foundation-loader.ts` | UNKNOWN | On boot via `index.ts:73` | All runtimes via `getFoundationProvider()` |
| Foundation cache | `foundation-fingerprint.json` in `artifacts/api-server/` | UNKNOWN | On boot, cached in-memory + optionally Redis | Provider, Cache |
| Foundation docs | `ai/runtime/foundation/types/` | UNKNOWN | Loaded by `foundationLoader.load()` | PromptAssembler |

### Knowledge Backbone

| Knowledge | Location | Size | Loaded | Consumer |
|---|---|---|---|---|
| MissionContextRegistry | `knowledge/MissionContextRegistry.ts` | UNKNOWN | Lazy via `getRelevant()` | CTO, KnowledgeBackbone |
| ArchitectureRegistry | `knowledge/ArchitectureRegistry.ts` | UNKNOWN | On import | KnowledgeBackbone |
| CapabilityRegistry | `knowledge/CapabilityRegistry.ts` | UNKNOWN | On import | KnowledgeBackbone |
| Evidence Registry | In-memory in `KnowledgeBackbone` (Map) | Variable | Per mission | CEO, CTO |
| Finding Registry | In-memory array in `KnowledgeBackbone` | Variable | Per mission | CEO, CTO |

### Memory

| Knowledge | Location | Loaded | Consumer |
|---|---|---|---|
| Executive Memory | `memory/ContextManager.ts` (in-memory Map) | On first `getMemory()` call | CEO (via `knowledgeBackbone.summarizeMemory()`) |
| Decision History | `intelligence/decision-history.ts` | On call | KnowledgeBackbone |
| Mission History | `mission/MissionHistory.ts` | On call | KnowledgeBackbone |
| Organizational Memory | `intelligence/organizational-memory.ts` | On call | KnowledgeBackbone |

### Project Context (CKO)

| Knowledge | Location | Consumer |
|---|---|---|
| CKO file map | `consultant/consultant-discovery.ts` (loads via `load()` method) | CEO (translateToTargets), CTO (fetchContext), COO (advisory) |
| Strategic Cache | `consultant/consultant-cache.ts` (in-memory) | CKO itself |
| CKO Advisory prompts | `consultant/consultant-provider.ts` (hardcoded strings) | CEO, CTO, COO |

### DB-Stored Knowledge

| Knowledge | Table | Consumer |
|---|---|---|
| Mission records | `ai_missions` | CEO, aiMissionService |
| Conversation history | `ai_conversations` + `ai_messages` | All runtimes via `getHistory()` |
| Shared context | `shared_context` | ai.ts (after each response) |
| Checklist | `checklist_items` | CTO mode |

---

## 4. Database Inventory

### PostgreSQL (primary)

**Business tables:**

| Table | File | Purpose |
|---|---|---|
| `branches` | `lib/db/src/schema/branches.ts` | Store/cabang locations |
| `categories` | `lib/db/src/schema/categories.ts` | Product categories |
| `products` | `lib/db/src/schema/products.ts` | Menu items |
| `product_variants` | `lib/db/src/schema/productVariants.ts` | Product variants (size, ice level) |
| `orders` | `lib/db/src/schema/orders.ts` | Sales transactions |
| `order_items` | `lib/db/src/schema/orders.ts` | Line items per order |
| `ingredients` | `lib/db/src/schema/ingredients.ts` | Raw ingredients |
| `semi_finished` | `lib/db/src/schema/semiFinished.ts` | Semi-finished goods |
| `recipes` | `lib/db/src/schema/recipes.ts` | Bill of materials |
| `current_inventory` | `lib/db/src/schema/inventory.ts` | Live stock per item/branch |
| `stock_adjustments` | `lib/db/src/schema/inventory.ts` | Stock movement ledger |
| `expenses` | `lib/db/src/schema/expenses.ts` | Operational expenses |
| `shift_audits` | `lib/db/src/schema/shiftAudits.ts` | Cash/stock shift reconciliation |
| `user_branches` | `lib/db/src/schema/user_branches.ts` | User-branch assignments |

**AI Runtime tables:**

| Table | File | Purpose |
|---|---|---|
| `ai_missions` | `lib/db/src/schema/missions.ts` | Mission lifecycle records |
| `ai_mission_snapshots` | `lib/db/src/schema/missions.ts` | Mission cycle snapshots |
| `ai_conversations` | `lib/db/src/schema/conversations.ts` | Chat conversation heads |
| `ai_messages` | `lib/db/src/schema/messages.ts` | Individual chat messages |

**System tables:**

| Table | File | Purpose |
|---|---|---|
| `users` | `lib/db/src/schema/users.ts` | User accounts (auth + roles) |
| `session` | (connect-pg-simple) | Express session store |
| `shared_context` | `lib/db/src/schema/sharedContext.ts` | Cross-context summaries |
| `checklist_items` | `lib/db/src/schema/checklist.ts` | CTO checklist items |

### Redis

| Component | File | Status |
|---|---|---|
| Connection | `lib/redis/redis-connection.ts` | Optional — skipped if `REDIS_HOST` not set |
| Cache | `lib/redis/redis-cache.ts` | Foundation cache, rate limiting |
| Queue | `lib/redis/redis-queue.ts` | Knowledge queue |
| PubSub | `lib/redis/redis-pubsub.ts` | Event distribution |
| Lock | `lib/redis/redis-lock.ts` | Distributed locks |

**Redis is OPTIONAL** — app runs without Redis with degraded caching.

### Session Store

- **Type**: PostgreSQL via `connect-pg-simple` (`app.ts:86`)
- **Table**: `session` (auto-created)
- **Purpose**: Express session persistence

---

## 5. Tool Inventory

### Filesystem Tools (CTO only)

| Tool | Function | Allows |
|---|---|---|
| `listDirectory` | `listLocalDir()` | Read directory contents |
| `readFile` | `readLocalFile()` → fallback `fetchGitHubFile()` | Read any project file |
| `writeFile` | `writeLocalFile()` | Write new or overwrite file |
| `editFile` | `editLocalFile()` | Search-replace in file |
| `searchContent` | `searchLocalContent()` | grep across project |
| `getDependencies` | `getDependencies()` | Analyze import graph |

### Shell Tools (CTO only)

| Tool | Function | Allows |
|---|---|---|
| `execCommand` | `execLocalCommand()` | WHITELIST ONLY: git, pnpm, npm, pm2, node, tsc, npx, ls, cat, echo, uptime |
| `sshExec` | `sshExec()` | Run command on VPS via SSH |

### GitHub Tools (CTO only)

| Tool | Function | Allows |
|---|---|---|
| `fetchGitHubFile` | `fetchGitHubFile()` | Read file from GitHub (fallback) |
| `fetchGitHubDir` | `fetchGitHubDir()` | List GitHub directory (fallback) |

### Business Data Tools (CTO + COO)

| Tool | Tables Accessed |
|---|---|
| `getSalesSummary` | `orders`, `expenses` |
| `getFinancialReport` | `orders`, `order_items`, `expenses` |
| `getTopProducts` | `order_items`, `orders` |
| `getSalesChart` | `orders` |
| `getCashierPerformance` | `orders`, `users` |
| `getLowStockItems` | `current_inventory`, `ingredients`, `semi_finished` |
| `getInventoryLevels` | `current_inventory`, `ingredients`, `semi_finished` |
| `getOrderHistory` | `orders`, `order_items` |
| `getExpenseList` | `expenses` |
| `getShiftAuditSummary` | `shift_audits` |

### COO-Specific Actions (via `executeOperation()` in `ai-business.ts`)

- **Inventory**: `add_stock`, `reduce_stock`, `correct_stock`, `loss_correction`
- **Production**: `produce`
- **Products**: `add_product`, `add_product_with_variants_and_recipe`, `add_variant`, `update_price`, `update_variant_price`, `deactivate_product`
- **Recipes**: `add_recipe`, `add_recipe_by_name`, `update_recipe`
- **Ingredients/Semi**: `add_ingredient`, `add_semi_finished`
- **Expenses**: `add_expense`
- **Data**: `get_inventory_status`, `get_products`, `get_sales_summary`, `get_top_products`, `get_shift_audit`, `get_expenses`
- **Admin**: `change_role`

### Permission Matrix

| Tool | CEO | CTO | COO | CFO | CKO |
|---|---|---|---|---|---|
| Filesystem (all) | NO | YES | NO | NO | NO |
| Shell (whitelist) | NO | YES | NO | NO | NO |
| GitHub | NO | YES | NO | NO | NO |
| SSH | NO | YES | NO | NO | NO |
| Business Data | NO | YES | YES (via `executeOperation`) | YES | NO |
| COO-specific actions | NO | NO | YES | NO | NO |
| Write DB (CRUD ops) | NO | EditFiles | YES (COO actions) | NO | NO |

---

## 6. Communication Graph

```
                   ┌──────────────────────────────────────────┐
                   │           USER (HTTP Request)              │
                   │     POST /api/ai/chat {message, mode}      │
                   └────────────────┬─────────────────────────┘
                                    │
                   ┌────────────────▼─────────────────────────┐
                   │           AI Gateway (routes/ai.ts)        │
                   │  Parse @mentions, targetRuntime, mode, SSE │
                   └────────────────┬─────────────────────────┘
                                    │
                   ┌────────────────▼─────────────────────────┐
                   │         Runtime Orchestrator               │
                   │  health check → resolve → execute → result │
                   │  AfterExec: Knowledge Queue, Telemetry,    │
                   │  Learning, Council (conditional)           │
                   └──┬────────────┬────────────┬──────────────┘
                      │            │            │
         ┌────────────▼──┐  ┌─────▼──────┐  ┌──▼──────────────┐
         │   CEO Runtime │  │ CTO Runtime│  │  COO Runtime    │
         │  (REASONING)  │  │ (TOOLS)    │  │ (BUSINESS OPS)  │
         └───┬────┬──────┘  └──────┬─────┘  └──┬──────────────┘
             │    │                │           │
             │    │         ┌──────▼──────┐    │
             │    │         │ Execution   │    │
             │    │         │ Pipeline    │    │
             │    │         │ (Governor)  │    │
             │    │         └──────┬──────┘    │
             │    │                │           │
    ┌────────▼┐ ┌─▼─────────┐ ┌───▼────┐ ┌───▼───────┐
    │ Mission  │ │ CKO       │ │ Tools  │ │ ai-       │
    │ Engine   │ │ (Advisor) │ │ adapter │ │ business  │
    │ (13 st.) │ └───────────┘ │ (file/  │ │ (DB ops)  │
    └──────────┘               │ SSH/GH) │ └───────────┘
                               └─────────┘

    Communication Methods:
    ─────────────────────
    CEO → CKO:     Direct call (consultantRuntime.translateToTargets)
    CEO → CTO:     Mission creation → DB write → Background Engine → AI Mission Service (EventEmitter)
    CEO → COO:     Direct call (via orchestrator or @COO mention)
    CEO → DB:      Direct query (missionsTable for mission query)
    CTO → CEO:     Approval via "[CEO APPROVED]" prefix → ceoRuntime.execute()
    CTO → CKO:     Direct call (consultantRuntime.analyze)
    CTO → CKO Map: consultantDiscovery.load() (file index)
    COO → CKO:     ConsultantDomain.advisor("coo_advisory")
    Orchestrator → Knowledge Queue: Push MISSION_COMPLETED events
    Orchestrator → Telemetry: trace events
    Orchestrator → Learning: recordDecision
    Orchestrator → Council: conditional strategic topic trigger
    AI Mission Service: EventEmitter-based pub/sub for SSE streaming
    Kernel Event Bus: Runtime lifecycle events
```

---

## 7. Context Graph (per Executive)

### CEO Context (sent to LLM in `ceo-runtime.ts:255`)

| Block | Source | Est. Tokens | Mandatory? |
|---|---|---|---|
| Identity | `identity.ts` (CEO) | ~50 | Mandatory |
| Anti-halusinasi disclaimer | Hardcoded | ~100 | Mandatory |
| Directive | Foundation (`getDirective("CEO")`, up to 1500 chars) | ~375 | Mandatory |
| Executive Memory | `knowledgeBackbone.summarizeMemory("CEO/CTO")` | ~200 | Optional |
| Recent Mission History | DB query `missionsTable` (5 rows) | ~500 | Optional (try/catch) |
| Output Schema | `EXECUTIVE_OUTPUT_SCHEMA` | ~200 | Mandatory |
| Footer | `STREAM_POLICY` + `ERROR_POLICY` | ~100 | Mandatory |
| User Message | Up to 3000 chars | ~750 | Mandatory |
| History | DB `ai_messages`, mode=ceo | ~500-4000 | Optional |
| CKO Advisory | `consultantRuntime.translateToTargets()` | ~200 | Optional |

**Total est**: ~2,000-6,000 tokens

### CTO Context (sent to LLM via `ExecutionPipeline`)

| Block | Source | Est. Tokens | Mandatory? |
|---|---|---|---|
| Identity | `identity.ts` (CTO) | ~50 | Mandatory |
| Directive | Foundation (`getDirective("CTO")`, up to 1500 chars) | ~375 | Mandatory |
| Context Files | `fetchContext()` — CKO map + MissionContextRegistry (up to 5 files, 8000 chars each) | ~2,000-10,000 | Mandatory |
| Knowledge | `loadKnowledgeWithContent()` | ~1,000 | Conditional (strategy-dependent) |
| CKO Advisory | `consultantRuntime.analyze()` | ~500 | Optional |
| Output Schema | `CTO_OUTPUT_SCHEMA` (extensive, ~6000 chars) | ~1,500 | Mandatory |
| Cycle Strategy | Governor `CYCLE_CONTRACT` | ~200 | Mandatory |
| Tool Definitions | ~20 tool definitions from `tool-registry.ts` | ~2,000 | Mandatory (per cycle) |
| Footer | `STREAM_POLICY` + `ERROR_POLICY` | ~100 | Mandatory |
| User Message | Up to 5000 chars | ~1,250 | Mandatory |
| History | DB `ai_messages`, filtered (30 msgs) | ~3,000-6,000 | Optional |

**Total est**: ~10,000-22,000 tokens

### COO Context (sent to LLM)

| Block | Source | Est. Tokens | Mandatory? |
|---|---|---|---|
| Intent prompt | Hardcoded in `coo-runtime.ts:117` | ~400 | Mandatory (step 1) |
| Identity | Hardcoded in `coo-runtime.ts:181` | ~50 | Mandatory |
| Directive | Foundation (`getDirective("COO")`, up to 2000 chars) | ~500 | Mandatory |
| Foundation | `getFoundationContext()` (up to 1200 chars) | ~300 | Optional |
| CKO Advisory | `consultantDomain.advisor("coo_advisory")` | ~200 | Optional |
| Action Schema | `COO_ACTIONS_SCHEMA` | ~1,200 | Mandatory |
| Execution Schema | `COO_EXECUTION_SCHEMA` | ~300 | Mandatory |
| User Message | Up to 3000 chars | ~750 | Mandatory |
| History | DB `ai_messages`, mode=bisnis | ~500-4000 | Optional |

**Total est (non-data)**: ~3,700-7,700 tokens  
**Total est (data query)**: Step 1: ~400, Step 2: Data + persona prompt ~3,000-8,000

---

## 8. Retrieval Discovery

### CEO

| What | How | Source |
|---|---|---|
| Directive | `getFoundationProvider().getDirective("CEO")` | Foundation cache (in-memory) |
| Semantic intent | `understand()` → `callDeepSeek()` | LLM |
| CKO targets | `consultantRuntime.translateToTargets()` | In-memory CKO map |
| Executive memory | `knowledgeBackbone.summarizeMemory("CEO")` | In-memory ContextManager |
| Mission history | Direct DB query `missionsTable` | **PostgreSQL** |
| Decision context | Via `assemble()` from PromptAssembler | Foundation + Memory |

### CTO

| What | How | Source |
|---|---|---|
| Directive | `getFoundationProvider().getDirective("CTO")` | Foundation cache |
| File context | `fetchContext()` → CKO map (`consultantDiscovery.load()`) + `MissionContextRegistry.getRelevant()` | **In-memory CKO index** + **GitHub-backed registry** |
| Knowledge | `loadKnowledgeWithContent()` | Foundation loader |
| CKO advisory | `consultantRuntime.analyze()` | In-memory |
| Tool definitions | `resolveTools()` from `tool-registry.ts` | Hardcoded |
| TaskGraph plan | `plan(spec)` from `planner.ts` | In-memory |

### COO

| What | How | Source |
|---|---|---|
| Intent classification | `callDeepSeek()` with classification prompt | LLM |
| Business data | `executeOperation()` → direct SQL via Drizzle ORM | **PostgreSQL** (all 13 business tables) |
| Directive | `getFoundationProvider().getDirective("COO")` | Foundation cache |
| CKO advisory | `consultantDomain.advisor()` | Hardcoded strings |

### CFO (generic)

| What | How | Source |
|---|---|---|
| Semantic intent | `understand()` → `callDeepSeek()` | LLM (ai-helpers.ts) |
| CKO advisory | `consultantRuntime.analyze("cfo_advisory")` | In-memory |
| Business data | Via `ExecutionPipeline` → business tools | PostgreSQL |
| Directive | Foundation | Foundation |

---

## 9. Reasoning Discovery

### CEO

```
LLM Direct (callDeepSeek)
→ No planner, no chain, no validator loop
→ Single-shot reasoning with semantic contract + verification gate
→ Decision is a structured object (ExecutiveDecision) - but NOT used for routing
→ Mission creation is keyword-detected, not reasoned
```

### CTO

```
LLM + Loop (via ExecutionPipeline/ExecutionDriver/ExecutionGovernor)
→ Planner generates TaskGraph (but unused in actual execution?)
→ Strategy Engine evolves: EXPLORE → ANALYZE → CONCLUDE → (optional) EXECUTE
→ Each cycle has tool contract (allowed tools + must-use-tools)
→ Governor controls continuation logic
→ CEO approval callback required before EXECUTE cycle
→ ReflectionEngine evaluates output quality
→ EvidenceCollector measures strength
→ KnowledgeEvolution proposes if gaps found
```

### COO

```
Two-step LLM:
Step 1: Intent classifier (JSON-only output)
Step 2a: Data query path → execute real DB action → LLM formats as persona
Step 2b: Non-data path → LLM reasons → parses JSON action → executes → returns
No planner, no chain, no validator. Simple if/else branching.
```

### CFO (generic)

```
ExecutionPipeline (same as CTO)
→ Semantic → Spec → Verify → CKO → PipelineLLM → Result
Uses the same Governor-pipeline but without the 4-cycle contract.
```

---

## 10. Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.ts (Boot)                           │
│  FoundationLoader → FoundationCache → Redis                     │
│  ActivationAudit → Kernel → Orchestrator Registration           │
│  Kernel: registry, event-bus, lifecycle, heartbeat,             │
│          checkpoint, recovery, scheduler                        │
└──────────────────────┬─────────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│                    routes/ai.ts (Gateway)                       │
│  ai-helpers.ts (rate-limit, history, remember, shared-context) │
└──────┬──────────────┬──────────────────┬───────────────────────┘
       │              │                  │
       ▼              ▼                  ▼
┌──────────┐  ┌──────────────┐  ┌───────────────┐
│Orchestratr│  │ coo-runtime  │  │ ai-business.ts│
│registry   │  │(if not found │  │(30+ DBops)    │
│→ resolve  │  │ in registry) │  └───────────────┘
│→ execute  │  └──────────────┘
└──────┬────┘
       │
  ┌────▼───────────────────────────────────────────┐
  │         CEO Runtime (ai/programs/)              │
  │  Identity → Semantic → Spec → Verify → OrgEng  │
  │  → CKO → Decision → LLM → ExecutiveReport      │
  │  → MissionEngine (create/query)                 │
  └──┬──────────────┬────────────────┬─────────────┘
     │              │                │
     ▼              ▼                ▼
┌──────────┐ ┌───────────┐ ┌──────────────┐
│ knowledge │ │ ai-       │ │ CKO          │
│ Backbone  │ │mission-   │ │(consultant)  │
│ Memory    │ │service    │ │ translate    │
│ Decisions │ │(EventEmit)│ │ analyze      │
│ Evidence  │ └───────────┘ └──────────────┘
└──────────┘
     ▲
     │
┌────┴───────────────────────────────────────────┐
│         CTO Runtime (ai/programs/)              │
│  Identity → Directive → Auth → Scope → Semantic│
│  → Spec → Verify → Plan → ContextFetch → Knowl │
│  → CKO → Prompt → ExecutionPipeline            │
│    → Driver.run() → Governor loop              │
│      → callLLMWithTools → tool dispatch        │
│  → Reflection → Evidence → KnowledgeEvolution  │
└──┬────────────────┬────────────────┬───────────┘
   │                │                │
   ▼                ▼                ▼
┌────────┐  ┌────────────┐  ┌──────────────┐
│ tools  │  │  GitHub    │  │ MissionCtx    │
│ adapter│  │  raw API   │  │ Registry     │
│ - file │  │ (fallback) │  │ (cached)     │
│ - SSH  │  └────────────┘  └──────────────┘
│ - shell│
└────────┘
   │
   ▼
┌────────────────────────────────────────────────┐
│           PostgreSQL (Drizzle ORM)              │
│ branches, products, orders, ingredients, etc.   │
│ ai_missions, ai_conversations, ai_messages      │
│ session (express-session)                       │
└────────────────────────────────────────────────┘
```

---

## 11. Bottleneck Discovery

### Duplicate Responsibility

1. **Two COO execution paths**: `coo-runtime.ts` is registered in Orchestrator (`index.ts:157`) BUT also called directly via `import("../programs/coo-runtime")` in `ai.ts:191`. The direct path bypasses orchestration entirely.
2. **Business data tools duplicated**: 10 business tools exist in `tool-adapter.ts:541` (LOCAL_TOOLS) AND similar actions exist in `ai-business.ts:82` (executeOperation switch). CTO can call via tool, COO via executeOperation — different paths to same data.
3. **`get_sales_summary` vs `getSalesSummary`**: COO uses `get_sales_summary` in `ai-business.ts`, CTO uses `getSalesSummary` in `tool-adapter.ts:353`. Same data, different implementation.

### Legacy Module

1. **`legacyAssembleSystemPrompt`** in `prompt-assembler.ts:119` — marked as "Legacy compat" but still exported and used by `callDeepSeekWithTools` in `llm-adapter.ts:233` as fallback.
2. **`assembleSystemPrompt`** export alias — maintained for backward compat in `prompt-assembler.ts:138`.

### Dead Code

1. **CMO, CHRO, CIO runtimes** defined in `executive-runtime.ts:120-122` but not registered in `index.ts` — no entry point, no route to them.
2. **`organization/executive-board.ts`, `executive-collaboration.ts`, `executive-debate.ts`, `executive-voting.ts`** — imported nowhere in the main execution flow (confirmed by usage search not done, but appear isolated).
3. **`knowledge/knowledge-graph.ts`, `knowledge-evolution.ts`** — UTNG
4. **`mission/mission-objective.ts`, `mission-factory.ts`, `mission-contract.ts`** — likely superseded by `mission-engine.ts`.

### Tight Coupling

1. **CEO → CTO communication**: CEO creates mission → writes to DB → CTO reads from DB → AI Mission Service EventEmitter. Coupled via DB schema + EventEmitter provider.
2. **COO directly imports `executeOperation`** from `ai-business.ts` — no interface, no abstraction. Changes to `ai-business.ts` directly affect COO.
3. **`ai.ts` imports COO runtime directly** (`import("../programs/coo-runtime")`) bypassing orchestrator when `resolvedTarget === "COO"`. Dual path.
4. **`llm-adapter.ts` imports `ai-helpers.ts` for `callDeepSeek`**, but `ai-helpers.ts` imports from `llm-adapter.ts` for tools — circular import risk.

### Unnecessary Prompt

1. **CEO anti-halusinasi prompt** repeated verbatim twice in `ceo-runtime.ts:255` and `ceo-runtime.ts:290` — same text block hardcoded.
2. **`DILARANG: jangan pernah mengatakan "Confidence too low"`** appears in CEO prompt but this pattern is also handled in post-processing (`ceo-runtime.ts:311`).

### Context Duplication

1. **Foundation context** loaded multiple times: in `PromptAssembler.assemble()` for CEO and independently in `coo-runtime.ts:89` via `getFoundationContext()`.
2. **CKO advisory** fetched independently by each executive (CEO calls `translateToTargets`, CTO calls `analyze`, COO calls `advisor`).

### Hidden Dependency

1. **`foundation-fingerprint.json`** file location is resolved by trying 3 hardcoded paths (`foundation-cache.ts:16`) — no configuration.
2. **SSH, GitHub PAT, Redis** — all environment variables checked at runtime with fallbacks, but the fallback behavior is inconsistent (some crash, some silently degrade).
3. **`DEEPSEEK_MODEL`** env var — default is `"deepseek-chat"`, but `budget-config.ts` has `maxContext: 1000000` tokens. If the actual API model differs, token budget calculations are wrong.

### Circular Dependency

- **UNCONFIRMED** but `ai-helpers.ts` ↔ `llm-adapter.ts` relationship needs audit.

### Over-engineering

1. **ExecutiveDebate, ExecutiveVoting, ExecutiveBoard** — 5 files in `organization/` that appear unused by any runtime pipeline.
2. **MissionContract, MissionObjective, MissionFactory** — 5 files in `mission/` superseded by `mission-engine.ts`.
3. **15-stage CTO pipeline**: Authorization → Scope → Semantic → Spec → Verify → Plan → Context → Knowledge → CKO → Prompt → LLM → Reflect → Evidence → Evolve. Many stages (Authorization, Scope, Plan, Evidence, Evolve) have minimal operational impact.
4. **Council of Experts** (`ai/runtime/council/`) — triggered only if message contains "foundation", "architecture", "security", or "policy". Entire council infrastructure for rare conditional path.
5. **ActivationAudit, IntegrityCheck, BootReport** — elaborate boot ceremony that degrades to emergency mode silently.

### Under-engineering

1. **COO intent classifier** — single LLM call with limited prompt. No fallback, no retry, no confidence threshold.
2. **No input validation** on `executeOperation` params — raw params from LLM JSON directly into SQL.
3. **No error recovery** in `coo-runtime.ts`'s action execution — single try/catch around JSON parse.
4. **CMO/CHRO/CIO** — defined but not integrated. Dead code.
5. **COO streaming** — `mode !== "bisnis"` → SSE streaming. COO is always in "bisnis" mode → **no SSE streaming for COO**.

---

## 12. Architecture Health

| Dimension | Score | Evidence |
|---|---|---|
| **Executive Runtime** | 7/10 | 4/7 execs integrated (CEO, CTO, COO, CFO). 3 execs defined but not registered. COO has dual path. |
| **Knowledge** | 6/10 | Foundation well-organized. Knowledge Backbone has clear API. But CKO advisory is hardcoded strings, not true knowledge retrieval. Evidence registry is in-memory (lost on restart). |
| **Database** | 8/10 | Clean schema separation (business vs AI). Single PostgreSQL with optional Redis. No migration issues detected. |
| **Communication** | 5/10 | CEO→CTO via DB + EventEmitter. COO has dual path (orchestrator + direct). No standardized IPC. Council conditional. |
| **Runtime Pipeline** | 6/10 | CTO has well-defined governor loop. CEO has 12-stage pipeline. COO has simple 2-step. 3 executives use generic skeleton. |
| **Context** | 5/10 | Large context budgets (up to 22K tokens for CTO). Foundation and CKO loaded independently per executive. Anti-halusinasi prompts duplicated. |
| **Reasoning** | 6/10 | CTO has the most sophisticated reasoning (strategy cycle + governor). CEO is single-shot. COO is two-step LLM. No confidence engine used at runtime. |
| **Scalability** | 4/10 | All synchronous. No horizontal scaling. Single-threaded Express. CTO missions block. No worker pool. |
| **Maintainability** | 5/10 | Many ECP/RFC comments. Some dead code directories. Tight coupling between ai.ts and coo-runtime. Dual tool implementations. |
| **Extensibility** | 7/10 | `createExecutiveRuntime()` factory pattern is clean. Adding new executive is ~5 lines. Capability registry is well-structured. Tool registry is centralized. |
| **Observability** | 4/10 | Console.log heavy. Telemetry module exists (`observability/telemetry`) but only basic trace start/finish. No structured logging for AI decisions. Pino logger configured but underutilized. |
| **Security** | 7/10 | Role-based auth (owner/manager/cashier). SSH key auth. GitHub PAT. Helmet + CSRF + CORS + rate limiting. But no input sanitization in COO actions. CEO has no auth check on direct calls. |

**Overall**: **5.8/10** — Functional but with significant technical debt, dead code, and architectural inconsistencies.

---

## Final Output Summary

### Executive Inventory

- **Active**: CEO, CTO, COO, CFO, CKO (Consultant)
- **Defined but unregistered**: CMO, CHRO, CIO
- **Runtime files**: 6 runtime implementations across 3 files (`ceo-runtime.ts`, `cto-runtime.ts`, `executive-runtime.ts`, `coo-runtime.ts`, `consultant-runtime.ts`)

### Runtime Inventory

- **CEO**: 12-stage pipeline, single-shot LLM, mission creation via DB
- **CTO**: 15-stage pipeline, governor-controlled cycle loop (EXPLORE→ANALYZE→CONCLUDE→EXECUTE)
- **COO**: 2-step pipeline (intent classify → [data query + format | LLM + action execute])
- **Generic**: 8-stage pipeline for CFO/CMO/CHRO/CIO via ExecutionPipeline

### Knowledge Inventory

- **Foundation**: 8 domains, cached in-memory + optional Redis, fingerprint-based invalidation
- **CKO**: Hardcoded advisory strings + file map discovery
- **Memory**: In-memory executive memory, decision history, mission history
- **Registry**: MissionContextRegistry (GitHub-backed), ArchitectureRegistry, CapabilityRegistry

### Database Inventory

- **PostgreSQL**: 20 tables (13 business, 3 AI runtime, 4 system/audit/communication)
- **Redis**: Optional, 5 modules (connection, cache, queue, pubsub, lock)
- **Session Store**: PostgreSQL via connect-pg-simple

### Tool Inventory

- **Filesystem**: 6 tools (CTO only)
- **Shell**: 2 tools with whitelist (CTO only)
- **GitHub**: 2 tools fallback (CTO only)
- **Business Data**: 10 tools (CTO + COO via different paths)
- **COO Actions**: 30+ DB operations (COO only)

### Communication Graph

- **Orchestrator → Runtime**: Direct call
- **CEO → CTO**: DB mission write + EventEmitter SSE
- **CEO/CTO/COO → CKO**: Direct function call
- **Orchestrator → PostExec**: Knowledge Queue (Redis push), Telemetry (trace), Learning (decision record), Council (conditional)

### Dependency Graph

- Boot → Foundation → Kernel → Orchestrator → CEO/CTO/COO executable → DB/FS/SSH/GitHub
- CEO → MissionEngine → DB → AI Mission Service (EventEmitter) → SSE to client
- CTO → ExecutionPipeline → Driver → Governor → LLM → Tool dispatch → DB/FS/SSH

### Context Graph

- CEO: ~2K-6K tokens, 8 blocks (4 mandatory, 4 optional)
- CTO: ~10K-22K tokens, 10 blocks (all mandatory except history)
- COO: ~3.7K-7.7K tokens, 8 blocks (5 mandatory in non-data path)

### Bottlenecks

1. Dual COO path (orchestrator bypass)
2. Duplicate business tool implementations
3. 3 unregistered executives
4. CEO→CTO communication via DB poll
5. No SSE for COO
6. Circular import risk (llm-adapter ↔ ai-helpers)
7. Context duplication across executives
8. Over-engineered submodules (council, board, debate, voting)

### Unknown Areas

1. CMO, CHRO, CIO registration status — not found in `index.ts`
2. `organization/` submodules (board, collaboration, debate, voting) — usage unknown
3. `mission/` submodules (MissionObjective, MissionFactory, MissionContract) — superseded?
4. Actual `foundation-fingerprint.json` content — binary in tree.txt
5. Actual `foundation-loader.ts` asset loading mechanism
6. `ai/runtime/planner.ts` output (TaskGraph) — used by CTO but effect unclear
7. `governance/` modules (9 files) — integration with runtime pipeline unclear

### Risks

1. **COO direct path** (`ai.ts:191`) misses orchestration post-processing (knowledge queue, telemetry, learning)
2. **No input validation** in COO actions → SQL injection risk from malformed LLM output
3. **All synchronous** → long CTO missions block the request thread
4. **Hardcoded paths** for foundation-fingerprint.json — fragile across deployment environments
5. **In-memory evidence/finding registries** lost on restart

### Technical Debt

1. 3 dead executive runtimes
2. `organization/executive-*` files likely unused
3. `mission/Mission*` legacy files
4. Duplicated `assembleSystemPrompt` legacy function
5. Duplicated anti-halusinasi prompt text
6. Duplicated business data actions (tool-adapter.ts vs ai-business.ts)
7. Dual COO registration

### Recommended Investigation

1. Measure actual LLM token consumption per executive
2. Audit `organization/` submodules for dead code removal
3. Confirm CMO/CHRO/CIO registration in orchestrator
4. Evaluate `governance/` integration points with runtime pipeline
5. Review circular dependency between `ai-helpers.ts` and `llm-adapter.ts`
6. Audit `mission/` directory for superseded files
7. Verify `foundation-fingerprint.json` loads correctly in VPS production
8. Measure COO intent classifier accuracy on real user queries
