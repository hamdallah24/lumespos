---
id: runtime-architecture-v1
title: Engineering Runtime Architecture
domain: runtime
artifact_type: architecture
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnArchitectureChange
  - Quarterly
knowledge_level: governing
context_priority: critical
depends_on:
  - north-star-v1
  - constitution-v1
  - op-model-v1
  - project-context-v1
referenced_by:
  - all-runtime-specs
  - all-systems-blueprints
consumers:
  - CTO
  - Runtime
  - ContextEngine
  - MemoryEngine
  - Planner
  - AgentRouter
loading_strategy: conditional
tags:
  - runtime
  - architecture
  - pipeline
  - execution
  - blueprint
purpose: |
  Define the complete Request→Response pipeline for the AI Engineering Runtime.
  Every component in the pipeline, every interface between components,
  and the data flow from user input to knowledge evolution.
  This is the nervous system of the Engineering OS — written before any implementation.
---

# Engineering Runtime Architecture

## 1. Why I Exist

The Foundation defines what we are and how to think. The Runtime defines how the system actually works when a request arrives. Without this document, implementation drifts. Components get built in isolation. Interfaces break. This document is the contract that every engine must implement.

## 2. Who Uses Me

**Primary:** Every engine developer, every agent that implements the Runtime.
**Secondary:** CTO — for architecture validation and impact analysis.

## 3. Who Depends On Me

Every `runtime/*` specification and every `systems/*` blueprint depends on this document. Change here → review all downstream.

## 4. What Happens if I Change

A change to the Runtime Architecture triggers review of all runtime specs, all system blueprints, and the AI_OPERATING_MODEL (for lifecycle alignment).

## 5. What Is Not My Responsibility

- I do not define specific technology choices. That belongs to individual specs.
- I do not define data schemas. That belongs to DATABASE_SPEC.md.
- I do not define agent missions. That belongs to directives.
- I do not define tool implementations. That belongs to TOOL_SPEC.md.

---

## Complete Request→Response Pipeline

```
                         ┌─────────────────────────┐
                         │   USER REQUEST           │
                         │   (Human or Agent)       │
                         └───────────┬─────────────┘
                                     ↓
                         ┌─────────────────────────┐
                         │ 1. INTENT CLASSIFIER     │
                         │ • Mode detection         │
                         │ • Complexity scoring     │
                         │ • Tool set selection     │
                         └───────────┬─────────────┘
                                     ↓
                         ┌─────────────────────────┐
                         │ 2. KNOWLEDGE LOADER      │
                         │ • Foundation always      │
                         │ • Domain conditional     │
                         │ • Task-specific on-demand│
                         │ • Token budget allocator │
                         └───────────┬─────────────┘
                                     ↓
                         ┌─────────────────────────┐
                         │ 3. MEMORY BRIDGE         │
                         │ • Session history load   │
                         │ • Shared context load    │
                         │ • History truncation     │
                         │ • Contamination filter   │
                         └───────────┬─────────────┘
                                     ↓
                         ┌─────────────────────────┐
                         │ 4. PLANNER               │
                         │ • Task decomposition     │
                         │ • Tool sequence planning │
                         │ • Knowledge gap detection│
                         │ • Confidence estimation  │
                         └───────────┬─────────────┘
                                     ↓
                         ┌─────────────────────────┐
                         │ 5. PROMPT ASSEMBLER       │
                         │ • System prompt selection │
                         │ • Context injection       │
                         │ • Instruction composition │
                         │ • Token budget validation │
                         └───────────┬─────────────┘
                                     ↓
                         ┌─────────────────────────┐
                         │ 6. LLM GATEWAY           │
                         │ • Model routing           │
                         │ • Tool dispatch           │
                         │ • Streaming response      │
                         │ • Reasoning capture       │
                         └───────────┬─────────────┘
                                     ↓
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │ TEXT (final) │ │ TOOL_CALLS   │ │ ERROR        │
           └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                  ↓                ↓                ↓
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │ 7. VALIDATOR │ │ 8. TOOL EXEC │ │ CIRCUIT      │
           │ • DSML strip │ │ • Sanitize   │ │ BREAKER      │
           │ • Sequence   │ │ • Validate   │ │ • Retry?     │
           │ • Length     │ │ • Execute    │ │ • Surface    │
           └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                  ↓                ↓                ↓
           ┌──────────────────────────────────────────────┐
           │ 9. RESPONSE RENDERER                          │
           │ • fakeStream (token-by-token)                 │
           │ • Status events (tool progress)               │
           │ • Final done event                            │
           └───────────────────┬──────────────────────────┘
                               ↓
           ┌──────────────────────────────────────────────┐
           │ 10. KNOWLEDGE EVOLUTION ENGINE                │
           │ • Conversation memory save                    │
           │ • Shared context update                       │
           │ • Knowledge gap detection                     │
           │ • Proposal trigger (if gap found)              │
           └──────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. Intent Classifier

**Input:** Raw user message string.
**Output:** `{ mode, complexity, toolSet, needsApproval }`

| Field | Type | Description |
|-------|------|-------------|
| `mode` | enum | `cto` \| `bisnis` \| `chat` \| `vps` |
| `complexity` | enum | `simple` (direct answer) \| `complex` (proposal required) |
| `toolSet` | enum | `READ_TOOLS` \| `DEVOPS_TOOLS` \| `[]` |
| `needsApproval` | boolean | Whether a proposal is required before execution |

**Logic:**
- `mode` detection: keyword matching + NLP intent classification.
- `toolSet`: `needsDevOps()` check → DEVOPS if matched, READ otherwise. Skip tools entirely if greeting/simple question.
- `complexity`: `simple` if answerable from context. `complex` if requires multi-step reasoning, code changes, or architecture decisions.
- `needsApproval`: `true` if complexity is `complex` AND change affects Foundation/Architecture.

**Current implementation:** `ai.ts` mode dispatch + `needsDevOps` keyword check.

---

### 2. Knowledge Loader

**Input:** `{ mode, taskDescription }`
**Output:** `KnowledgePayload` — ordered array of Knowledge Assets with content.

**Token Budget:**
```
Total budget: 8000 tokens (for context)
  ├── Foundation: unlimited (always loaded, critical priority)
  │     NORTH_STAR, CONSTITUTION, README, FOUNDATION_INDEX
  ├── Domain: load by mode (conditional)
  │     CTO mode → OP_MODEL, CTO_DIRECTIVE
  │     DevOps mode → RELEASE_PLAYBOOK, DEPLOY docs
  ├── Specific: load by task keywords (on-demand)
  │     "database" → DATABASE_SPEC, DATABASE_STANDARD
  │     "tool calling" → TOOL_EXECUTION, TOOL_SPEC
  └── Remaining budget → error margin
```

**Loading Strategy:**
```
for each Knowledge Asset:
  if loading_strategy == "always"        → load
  if loading_strategy == "conditional"   → load if domain matches mode
  if loading_strategy == "on-demand"     → load if task keywords match
  if loading_strategy == "manual"        → skip
  if token_budget_exceeded               → prioritize by knowledge_level + context_priority
```

**Current implementation:** None — ad-hoc context building in `ai.ts`. This is the first engine to build.

---

### 3. Memory Bridge

**Input:** `{ userId, mode, taskDescription }`
**Output:** `{ sessionHistory, sharedContext, contaminationFlags }`

| Field | Type | Description |
|-------|------|-------------|
| `sessionHistory` | `Message[]` | Last N messages from this user+mode conversation |
| `sharedContext` | `string` | Latest shared_context entry from any agent |
| `contaminationFlags` | `string[]` | Warnings if history contains raw commands, garbled text |

**Rules:**
- `getHistory(userId, mode, 400)` — truncated to 400 chars per message.
- `saveSharedContext` — after every meaningful response, write 500-char summary.
- Contamination detection: scan history for shell commands, DSML tags, garbled patterns.
- Max messages: 20 per conversation. Older pruned automatically.

**Current implementation:** `ai-helpers.ts` getHistory/remember. Needs contamination filter.

---

### 4. Planner

**Input:** `{ mode, taskDescription, knowledgePayload, history }`
**Output:** `{ plan: Step[], estimatedRounds: number, confidence: number }`

**Step Types:**
| Type | Description |
|------|-------------|
| `read` | Read a specific file or search codebase |
| `analyze` | Synthesize information from loaded context |
| `propose` | Create a proposal in WORKSPACE |
| `implement` | Execute a code change |
| `validate` | Run validation checks |
| `report` | Generate a report or answer |

**Planning Logic:**
- For `simple` tasks: single-step, direct answer. No tools needed.
- For `complex` tasks: multi-step. Read files → analyze → propose (if needed) → implement → validate.
- Max planning depth: 3 rounds of tool calling.
- If plan exceeds 3 rounds, reduce scope or escalate.

**Current implementation:** Implicit in `callDeepSeekWithTools` — no explicit planner. This is the second engine to build.

---

### 5. Prompt Assembler

**Input:** `{ systemPromptId, context: KnowledgePayload, history, instructions }`
**Output:** `PromptPackage` — array of messages ready for LLM.

**Assembly Logic:**
```
messages = []

// Layer 1: System
messages.push({ role: "system", content: compileSystemPrompt(systemPromptId) })

// Layer 2: Knowledge Context (as system continuation)
for asset in context:
  messages.push({ role: "system", content: formatKnowledgeAsset(asset) })

// Layer 3: Memory
messages.push(...history)

// Layer 4: Instructions
messages.push({ role: "user", content: instructions })

// Layer 5: Token budget validation
validateTokenBudget(messages, maxTokens: 8000)
```

**Format Rules:**
- Knowledge Assets formatted as: `[ASSET: {id}] {title}\n{content}\n---`
- History messages: role-tagged, truncated to 400 chars.
- System prompt: compiled from Foundation prompt + specialized domain prompt.
- Max total tokens: 8000. Trim low-priority context if exceeded.

**Current implementation:** Manual string concatenation in `ai.ts`. Needs extraction to dedicated engine.

---

### 6. LLM Gateway

**Input:** `PromptPackage`, `{ model, tools, stream }`
**Output:** `TextResponse | ToolCalls | Error`

**Responsibilities:**
- Route to correct model (`deepseek-chat`, `deepseek-v4-pro`, etc.)
- Format tools for API (DeepSeek format vs OpenAI format)
- Handle streaming vs non-streaming
- Capture reasoning_content for thinking models
- Timeout management (30s per round)
- Error handling: 400, 429, 500 with structured logging

**Non-Streaming Mode (current):**
```
fetch → json response → parse message → check tool_calls → return
```

**Streaming Mode (future):**
```
fetch → SSE stream → parse deltas → accumulate → check tool_calls → return
```

**Circuit Breaker:**
- Max 3 rounds of tool calling.
- Error after round 1 → throw immediately.
- Error at round 0 → retry without tools.
- Safety net: force text on round 3.

**Current implementation:** `callDeepSeekWithTools` in `ai-helpers.ts`. Already stable. Keep as foundation for this component.

---

### 7. Validator

**Input:** LLM response text.
**Output:** `{ isValid: boolean, cleanedText: string, warnings: string[] }`

**Validation Steps:**
1. `stripDSML()` — remove any hallucinated tool call tags.
2. `parseDSMLToolCalls()` — if found, convert to actual tool calls (fallback).
3. Check response length — must be substantive (>50 chars for analysis).
4. Check for contamination patterns — shell commands, garbled text.
5. Check output format — follows specialist format rules.
6. Check completion — response is complete, not truncated.

**Warnings:**
- `DSML_DETECTED`: Tool calls found as text, converted.
- `COMMAND_LEAK`: Shell commands found in response text.
- `TRUNCATED`: Response appears incomplete.
- `MALFORMED`: Response does not follow output format.

**Current implementation:** Partial — `stripDSML` + `parseDSMLToolCalls` in `ai-helpers.ts`. Needs completion checks.

---

### 8. Tool Executor

**Input:** `ToolCall[]` from LLM.
**Output:** `{ results: ToolResult[], roundComplete: boolean }`

**Execution Flow:**
```
for each toolCall:
  1. validateMessageSequence(messages) — ensure tool ordering
  2. sanitizeMessages(messages) — clean content types
  3. validate tool_call.id exists
  4. executeToolCall(name, args) → result
  5. push { role: "tool", tool_call_id: id, content: result }
  6. emit progress status to frontend
```

**Tool Result Rules:**
- Content must be string — never object. Use `JSON.stringify()` if needed.
- Content capped at 2000 chars.
- Must match `tool_call_id` exactly — no mismatch.
- Error results must be captured, not thrown.

**Current implementation:** `executeToolCall` + tool loop in `ai-helpers.ts`. Stable.

---

### 9. Response Renderer

**Input:** `{ finalText: string, statusEvents: string[] }`
**Output:** SSE stream to frontend.

**Stream Format:**
```
{ type: "status", message: "⚙️ Menganalisis permintaan..." }
{ type: "status", message: "📄 Membaca file ai.ts..." }
{ type: "status", message: "✅ Menyusun jawaban..." }
{ type: "delta", delta: "The" }
{ type: "delta", delta: " ans" }
{ type: "delta", delta: "wer" }
...
{ type: "done", finalText: "The answer is..." }
```

**fakeStream Parameters:**
- Chunk size: 4 characters
- Delay: 25ms between chunks
- Status events emitted before streaming begins
- `type: "done"` signals completion to frontend

**Current implementation:** `fakeStream()` + `emitStatus()` in `ai.ts`. Stable.

---

### 10. Knowledge Evolution Engine

**Input:** `{ userId, mode, userMessage, assistantResponse, toolResults }`
**Output:** `{ memorySaved: boolean, gapsFound: KnowledgeGap[] }`

**Post-Response Actions:**
1. `remember(userId, mode, userMessage, assistantResponse)` — save to conversation.
2. `saveSharedContext(userId, mode, summary)` — save cross-agent context.
3. Scan response for knowledge gaps — mentions of undocumented features, missing specs.
4. If gaps found → create proposal for new Knowledge Asset.
5. If response mentions Architecture change → flag for ADR creation.

**Gap Detection Heuristics:**
- Response references a file not in catalog → propose catalog entry.
- Response identifies a bug pattern → propose knowledge pattern entry.
- Response suggests architecture change → propose ADR.
- No existing doc covers a topic → propose new spec.

**Current implementation:** Partial — `remember()` + `saveSharedContext()` in `ai-helpers.ts`. Gap detection not implemented.

---

## Dependency Between Components

```
Intent Classifier
    │
    ├──→ Knowledge Loader ──→ Memory Bridge
    │                              │
    └──────────────────────────────┤
                                   ↓
                              Planner
                                   │
                                   ↓
                        Prompt Assembler
                                   │
                                   ↓
                             LLM Gateway
                                   │
                    ┌──────────────┼──────────────┐
                    ↓              ↓              ↓
               Validator    Tool Executor    Circuit Breaker
                    │              │              │
                    └──────────────┼──────────────┘
                                   ↓
                        Response Renderer
                                   │
                                   ↓
                     Knowledge Evolution Engine
```

---

## Implementation Priority

| Priority | Component | Reason |
|----------|-----------|--------|
| **P0** | LLM Gateway | Already exists (`callDeepSeekWithTools`). Stable. Baseline. |
| **P0** | Response Renderer | Already exists (`fakeStream`). Stable. |
| **P0** | Tool Executor | Already exists. Stable. Needs extraction to dedicated file. |
| **P1** | Validator | Partially exists. Add completion checks + contamination detection. |
| **P1** | Memory Bridge | Exists. Add contamination filter + shared context improvements. |
| **P2** | Prompt Assembler | New. Extract from ad-hoc string concat in ai.ts. |
| **P2** | Knowledge Loader | New. Must implement `loading_strategy` from Knowledge Asset metadata. |
| **P3** | Planner | New. Explicit planning with step decomposition. |
| **P3** | Intent Classifier | New. Formalize existing mode dispatch + needsDevOps. |
| **P4** | Knowledge Evolution Engine | New. Gap detection, proposal triggering. Future. |

---

## Interfaces

### Component Interface Contract

Every component must expose:

```typescript
interface RuntimeComponent<Input, Output> {
  name: string;
  execute(input: Input, context: RuntimeContext): Promise<Output>;
  validate(input: Input): ValidationResult;
  metrics(): ComponentMetrics;
}

interface RuntimeContext {
  requestId: string;
  userId: number;
  mode: "cto" | "bisnis" | "chat" | "vps";
  startedAt: Date;
  tokenBudget: number;
  roundCount: number;
}
```

### Logging Contract

Every component must log:

```typescript
interface ComponentLog {
  component: string;
  action: "start" | "complete" | "error" | "skip";
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  errors?: string[];
  warnings?: string[];
}
```

---

## Non-Goals

- I do not specify exact TypeScript types or function signatures. That belongs to individual specs.
- I do not specify database schemas. That belongs to DATABASE_SPEC.md.
- I do not specify UI behavior. That belongs to the frontend architecture.
- I do not specify deployment. That belongs to RELEASE_PLAYBOOK.md.
