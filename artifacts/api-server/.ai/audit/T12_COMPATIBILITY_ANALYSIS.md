# T12.0 — Compatibility Analysis

## 1. Subsystem Compatibility Matrix

| Subsystem | Current Interface | Target Interface | Compatible? | Migration Required |
|-----------|------------------|-----------------|-------------|-------------------|
| **Mission Engine** | Calls `applicationRuntime.executeMessage()` | Must call `RuntimeGateway.assemble()` | ❌ | Update import + call pattern |
| **EIOS Runtime** | Pipeline calls `ExecutiveDispatchRegistry.dispatch(role, brief, {})` | Must pass RuntimeContext instead of `{}` | ⚠️ Partial | Update dispatch signature |
| **Executive Runtime** | `execute(task: ExecutiveTask)` | `execute(runtimeContext: RuntimeContext)` | ❌ | All 8 execs updated |
| **Operational Truth Provider** | `read(needs)` returning `OperationalData[]` | Same (inside GroundingLayer) | ✅ | No change |
| **Capability Router** | `resolveProvider(capability)` | Same | ✅ | No change |
| **Reflection Engine** | `reflect(...)` takes verification + refinement | Same | ✅ | No change |
| **Metrics Store** | `recordRequest(...)` takes domain + confidence | Same | ✅ | No change |
| **LLM Adapter** | `callDeepSeek(prompt, messages, tools)` | Same (called by RIC instead of execs) | ✅ | No change |
| **Tool Adapter** | `executeToolCall(call)` | Same (called by GroundingLayer after executive) | ✅ | No change |
| **Communication Runtime** | Used by COO for notifications | Same | ✅ | No change |
| **Knowledge Backbone** | `updateMemory(executive, data)` | Same | ✅ | No change |
| **CapabilityGraph (kKnowledge)** | `canExecute(role, tool)` | May be deprecated (RIC handles tools) | ⚠️ | May become unused |
| **Executive Board** | `register(role)` → `organizationEngine.delegate()` | Same | ✅ | No change |
| **Executive Dispatch Registry** | `dispatch(role, brief, context)` | `dispatch(role, runtimeContext)` | ⚠️ | Update parameter shape |

## 2. Executive-Level Compatibility

### CEO — CEOProgram.ts

| Current Behavior | Target Behavior | Compat? | Notes |
|-----------------|-----------------|---------|-------|
| Accepts `CEOContext` | Accepts `RuntimeContext` | ❌ | CEOContext has 15+ fields, RuntimeContext has ~50 |
| Builds system prompt via `buildCEOPrompt()` | Uses pre-built `UnderstandingResult` from RIC | ❌ | CEO_SYSTEM_PROMPT must be restructured |
| Queries memory for mission context | Memory already in `RuntimeContext.grounding.memory` | ✅ | Just read instead of query |
| Scans repo for relevant files | Repo files already in `RuntimeContext.grounding.repository` | ✅ | Just read instead of scan |
| Calls `callDeepSeek()` | Calls LLM only for executive decision, not understanding | ⚠️ | Needs RIC-provided context |
| Returns `CEOResult` | Returns `ExecutiveResponse` | ❌ | Return type change |

**Compatibility Score: 3/10** — CEO has most complex context building, needs significant restructuring.

### CTO — CTOProgram.ts

| Current Behavior | Target Behavior | Compat? | Notes |
|-----------------|-----------------|---------|-------|
| Accepts `CTOTask` | Accepts `RuntimeContext` | ❌ | Different input shape |
| Calls `getDependencies()` for code analysis | Code files in `RuntimeContext.grounding.repository` | ✅ | Read instead of scan |
| Calls `callDeepSeekWithTools()` for multi-turn | RIC handles planning, Grounding handles tools | ❌ | CTO's core flow changes |
| Has commented-out CEO approval via dispatch | CEO approval in RuntimeContext.refinementHistory | ✅ | Read history instead of dispatch |

**Compatibility Score: 4/10** — CTO's multi-turn execution pattern must be redesigned.

### CFO, CMO, CAIO, CHRO, CKO

| Current Behavior | Target Behavior | Compat? | Notes |
|-----------------|-----------------|---------|-------|
| Accept `ExecutiveTask` | Accept `RuntimeContext` | ❌ | Input change |
| Build own prompt | Use RIC understanding | ⚠️ | Medium effort |
| Query data directly | Read from `RuntimeContext.grounding.operational` | ✅ | Simpler read |
| Call `callDeepSeek()` | Call LLM only for decision, not context | ⚠️ | Medium effort |

**Compatibility Score: 6/10** — Simpler executives require less restructuring.

### COO — COOProgram.ts

| Current Behavior | Target Behavior | Compat? | Notes |
|-----------------|-----------------|---------|-------|
| Accepts `ExecutiveTask` | Accepts `RuntimeContext` | ❌ | Input change |
| Handles inventory, sales, operations | Operational data in RuntimeContext | ✅ | Read instead of query |
| Sends notifications via CommunicationProvider | Same | ✅ | No change |
| Complex multi-step operational workflows | Workflow reasoning in executive, data from RIC | ⚠️ | Medium effort |

**Compatibility Score: 5/10** — COO has complex domain logic but data access simplifies.

## 3. Integration Point Compatibility

### Application-Runtime-Adapter (.executeMessage)

| Current | Target | Compat? |
|---------|--------|---------|
| `applicationRuntime.executeMessage(params)` | `runtimeGateway.assemble(params)` | ❌ |
| Returns `ExecuteMessageResult` | Returns `GatewayResult` | ❌ |
| Internal registry of 8 executives | RuntimeGateway determines target via @mention | ❌ |
| Callbacks (onProgress, onTool, etc.) | Same callbacks supported | ✅ |

### ExecutiveDispatchRegistry (.dispatch)

| Current | Target | Compat? |
|---------|--------|---------|
| `dispatch(role, brief: ExecutiveBrief, context: Record<string,unknown>)` | `dispatch(role, executiveContext: ExecutiveContext)` | ⚠️ |
| Returns `ExecutiveDecision \| null` | Returns `ExecutiveDecision \| null` | ✅ |
| Handler interface: `{ role, decide(brief, context) }` | Handler interface: `{ role, decide(executiveContext) }` | ⚠️ |

### EIOS Pipeline

| Current | Target | Compat? |
|---------|--------|---------|
| 11 stages, `executive_runtime` is last | 12 stages, `ric_assemble` before `executive_runtime` | ⚠️ |
| `brief_generator` produces `ExecutiveBrief` | `ric_assemble` produces `RuntimeContext` | ⚠️ |
| Stages read/write via `ctx.read()`/`ctx.apply()` | Same pattern | ✅ |
| Pipeline engine resilience (circuit breaker, bulkhead) | Same | ✅ |

## 4. Data Format Compatibility

| Data | Current Format | Target Format | Compat? |
|------|---------------|---------------|---------|
| User message | Raw string in `ExecutiveTask.message` | Raw string in `ReasonerInput.message` | ✅ |
| Intent | Implicit in executive prompt | Explicit in `RuntimeContext.intelligence.intent` | ❌ |
| Domain | Implicit (which executive is chosen) | Explicit in `RuntimeContext.intelligence.domain` | ❌ |
| Entities | Extracted by executive prompt | Extracted by RIC in `RuntimeContext.intelligence.entities` | ❌ |
| Tools | Hardcoded per executive | Selected by RIC in `RetrievalPlan.toolNeeds` | ❌ |
| Memory data | Queried per executive | In `RuntimeContext.grounding.memory` | ✅ |
| Operational data | Queried per executive | In `RuntimeContext.grounding.operational` | ✅ |
| Knowledge data | Queried per executive | In `RuntimeContext.grounding.knowledge` | ✅ |
| File contents | Scanned per executive | In `RuntimeContext.grounding.repository` | ✅ |
| Confidence | Per-executive subjective | In `RuntimeContext.runtime.confidence.overall` | ✅ |
| Awareness | NONE | In `RuntimeContext.awareness` | ✅ (NEW) |
| Verification | NONE | In `RuntimeContext.verification.results` | ✅ (NEW) |
| Refinement history | NONE | In `RuntimeContext.refinementHistory` | ✅ (NEW) |

## 5. Compatibility Verification Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Mission Engine can still create/execute missions | ⚠️ | Must update import from `applicationRuntime` → `RuntimeGateway` |
| EIOS pipeline can still produce decisions | ⚠️ | New `ric_assemble` stage must be registered |
| All 8 executives can still respond | ❌ | Each must be migrated to accept RuntimeContext |
| OperationalTruthProvider returns same data | ✅ | No change needed |
| CapabilityRouter resolves same providers | ✅ | No change needed |
| ReflectionEngine still produces patterns | ✅ | Called by RuntimeGateway, not by execs |
| MetricsStore still tracks domain metrics | ✅ | Called by RuntimeGateway |
| LLM calls still reach DeepSeek | ✅ | RIC uses same llm-adapter |
| Tool calls still execute filesystem ops | ✅ | GroundingLayer uses same tool-adapter |
| Communication (COO notifications) still works | ✅ | No change needed |
| KnowledgeBackbone memory updates still work | ✅ | Called by mission engine, not execs |
| ExecutiveBoard registration still works | ✅ | Organization layer unchanged |
| ExecutiveDispatchRegistry dispatch still works | ⚠️ | New context parameter is optional at first |
