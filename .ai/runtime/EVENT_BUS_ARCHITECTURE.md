---
id: event-bus-v1
title: Event Bus Architecture
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
  - runtime-architecture-v1
  - op-model-v1
referenced_by:
  - all-runtime-specs
consumers:
  - CTO
  - Runtime
  - All Engine Components
loading_strategy: conditional
tags:
  - runtime
  - event-bus
  - architecture
  - event-driven
  - decoupling
purpose: |
  Define the event-driven backbone of the Engineering Runtime.
  Every component communicates through events, not direct calls.
  This enables future extensibility without breaking existing code.
---

# Event Bus Architecture

## 1. Why I Exist

Direct component coupling is technical debt. If the Knowledge Loader calls the Planner directly, changing the Planner means changing the Knowledge Loader. The Event Bus decouples them: components publish events, the bus routes them, and subscribers react. A new component can be added without touching a single existing line.

## 2. Core Principle

> **Components do not know each other. They only know events.**

```
REQUEST_RECEIVED → Intent Classifier → INTENT_IDENTIFIED
                                              ↓
                                      Knowledge Loader
                                              ↓
                                      KNOWLEDGE_LOADED
                                              ↓
                                        Planner
                                              ↓
                                        PLAN_READY
                                              ↓
                                              ...
```

## 3. Event Catalog

### Request Lifecycle Events

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `REQUEST_RECEIVED` | Runtime Orchestrator | Intent Classifier | `{ requestId, userId, mode, rawMessage, timestamp }` |
| `INTENT_IDENTIFIED` | Intent Classifier | Knowledge Loader, Memory Bridge | `{ requestId, mode, complexity, toolSet }` |
| `KNOWLEDGE_LOADED` | Knowledge Loader | Memory Bridge, Planner | `{ requestId, assets: KnowledgeAsset[], tokenUsage }` |
| `MEMORY_LOADED` | Memory Bridge | Planner | `{ requestId, history, sharedContext, contaminationFlags }` |
| `PLAN_READY` | Planner | Prompt Assembler | `{ requestId, plan: Step[], estimatedRounds, confidence }` |
| `PROMPT_ASSEMBLED` | Prompt Assembler | LLM Gateway | `{ requestId, messages: Message[], tokenCount }` |

### LLM & Tool Events

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `LLM_REQUESTED` | LLM Gateway | Observability | `{ requestId, model, messagesCount, tokenCount }` |
| `LLM_COMPLETED` | LLM Gateway | Validator, Tool Executor, Observability | `{ requestId, message, toolCalls?, reasoning? }` |
| `LLM_ERROR` | LLM Gateway | Circuit Breaker, Observability | `{ requestId, status, errorBody }` |
| `TOOL_EXECUTION_STARTED` | Tool Executor | Response Renderer, Observability | `{ requestId, toolName, toolCallId }` |
| `TOOL_EXECUTION_COMPLETED` | Tool Executor | Validator, Observability | `{ requestId, toolCallId, result, durationMs }` |
| `TOOL_EXECUTION_ERROR` | Tool Executor | Circuit Breaker, Observability | `{ requestId, toolCallId, error }` |
| `VALIDATION_COMPLETED` | Validator | Response Renderer | `{ requestId, isValid, cleanedText, warnings }` |

### Response Events

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `RESPONSE_READY` | Response Renderer | Knowledge Evolution Engine | `{ requestId, finalText, statusEvents }` |
| `RESPONSE_STREAMING_STARTED` | Response Renderer | Observability | `{ requestId, textLength }` |
| `RESPONSE_STREAMING_COMPLETED` | Response Renderer | Memory Bridge, Knowledge Evolution Engine, Observability | `{ requestId, finalText, streamingDurationMs }` |
| `RESPONSE_ERROR` | Response Renderer | Observability, Circuit Breaker | `{ requestId, error }` |

### System Events

| Event | Publisher | Subscribers | Payload |
|-------|-----------|-------------|---------|
| `CIRCUIT_BREAKER_TRIPPED` | Circuit Breaker | Observability, Runtime Orchestrator | `{ requestId, round, reason }` |
| `KNOWLEDGE_GAP_DETECTED` | Knowledge Evolution Engine | Runtime Orchestrator | `{ requestId, gap: { domain, description, severity } }` |
| `PROPOSAL_TRIGGERED` | Knowledge Evolution Engine | CTO Agent | `{ requestId, gap, suggestedAction }` |
| `COMPONENT_HEALTH_CHECK` | Any component | Observability | `{ component, status, version, uptime }` |
| `OBSERVABILITY_SNAPSHOT` | Observability | Knowledge Evolution Engine | `{ period, metrics, trends, recommendations }` |

## 4. Event Bus Implementation

### Architecture

```
                    ┌─────────────────────────────┐
                    │      EVENT BUS               │
                    │                              │
                    │  pub(topic, payload)          │
                    │  sub(topic, handler)          │
                    │  once(topic, handler)         │
                    │  unsub(topic, handler)        │
                    └──────────┬──────────────────┘
                               │
          ┌────────────────────┼──────────────────────┐
          ↓                    ↓                       ↓
   ┌─────────────┐    ┌─────────────┐         ┌─────────────┐
   │ Publisher A  │    │ Publisher B  │         │ Subscriber C │
   │              │    │              │         │              │
   │ pub("TOPIC") │    │ pub("TOPIC") │         │ sub("TOPIC") │
   └─────────────┘    └─────────────┘         └─────────────┘
```

### Contract

```typescript
interface EventBus {
  // Publish an event to all subscribers
  publish(topic: string, payload: any): void;

  // Subscribe to a topic
  subscribe(topic: string, handler: EventHandler): Subscription;

  // Subscribe to a topic, execute once, then unsubscribe
  once(topic: string, handler: EventHandler): void;

  // Unsubscribe
  unsubscribe(topic: string, handler: EventHandler): void;
}

type EventHandler = (event: RuntimeEvent) => void | Promise<void>;

interface RuntimeEvent {
  id: string;
  topic: string;
  payload: any;
  timestamp: string;
  source: string; // component name
  requestId: string;
}

interface Subscription {
  topic: string;
  unsubscribe: () => void;
}
```

### Initialization

All components register during startup:

```typescript
// Example: Knowledge Loader setup
function initializeKnowledgeLoader(bus: EventBus) {
  bus.subscribe("INTENT_IDENTIFIED", async (event) => {
    const assets = await loadKnowledge(event.payload);
    bus.publish("KNOWLEDGE_LOADED", {
      requestId: event.requestId,
      assets,
      tokenUsage: computeTokens(assets)
    });
  });
}
```

## 5. Event Flow — Complete Request Example

```
User: "analisis file ai.ts dan temukan semua bug"

1. REQUEST_RECEIVED
   → Intent Classifier: mode="cto", complexity="complex", toolSet=READ_TOOLS

2. INTENT_IDENTIFIED
   → Knowledge Loader: load Foundation + CTO domain docs
   → Memory Bridge: load session history

3. KNOWLEDGE_LOADED
   → Planner: create 3-step plan (read ai.ts, find bugs, report)

4. MEMORY_LOADED
   → Planner: continue planning

5. PLAN_READY
   → Prompt Assembler: compile system prompt + context + instructions

6. PROMPT_ASSEMBLED
   → LLM Gateway: send to DeepSeek with READ_TOOLS

7. TOOL_EXECUTION_STARTED (readFile ai.ts)
   → Response Renderer: emit status "📄 Membaca file ai.ts..."

8. TOOL_EXECUTION_COMPLETED
   → LLM Gateway: send follow-up with tool result

9. LLM_COMPLETED (analysis response)
   → Validator: stripDSML, check completion, check contamination

10. VALIDATION_COMPLETED
    → Response Renderer: fakeStream final text

11. RESPONSE_STREAMING_COMPLETED
    → Memory Bridge: save conversation
    → Knowledge Evolution Engine: check for gaps

12. KNOWLEDGE_GAP_DETECTED (if any)
    → Create proposal in WORKSPACE
```

## 6. Error Flow

```
LLM_ERROR
    → Circuit Breaker: increment failure counter
    → Observability: log error details

If failureCount >= threshold:
    CIRCUIT_BREAKER_TRIPPED
        → Runtime Orchestrator: stop current request
        → Response Renderer: emit error to user
        → Observability: alert

If failureCount < threshold:
    → LLM Gateway: retry without tools (round 0 error)
    → LLM Gateway: throw immediately (round 1+ error)
```

## 7. Observability Integration

Every event is logged by the Observability Engine. This creates an immutable audit trail:

```
REQUEST_RECEIVED      → 14:30:01.123
INTENT_IDENTIFIED     → 14:30:01.145  (+22ms)
KNOWLEDGE_LOADED      → 14:30:01.234  (+89ms, 3 assets, 2100 tokens)
PLAN_READY            → 14:30:01.301  (+67ms, 3 steps, confidence 92%)
PROMPT_ASSEMBLED     → 14:30:01.331  (+30ms, 5 messages, 3200 tokens)
LLM_REQUESTED         → 14:30:01.332  (+1ms)
LLM_COMPLETED         → 14:30:03.890  (+2558ms, 1 tool_call)
TOOL_EXECUTION_STARTED  → 14:30:03.892  (+2ms)
TOOL_EXECUTION_COMPLETED → 14:30:03.945  (+53ms)
LLM_COMPLETED         → 14:30:06.120  (+2175ms, text response)
VALIDATION_COMPLETED  → 14:30:06.123  (+3ms, valid, 0 warnings)
RESPONSE_STREAMING_COMPLETED → 14:30:08.500  (+2377ms)
```

This trace can answer:
- Where is latency? (LLM: 4.7s total)
- Are tools working? (yes, 53ms)
- Is context loading efficient? (yes, 89ms for 3 assets)
- Did validation catch anything? (no warnings)

## 8. Future Extensibility

Because components are decoupled through events, adding a new component requires zero changes to existing components:

```
Current: Intent → Knowledge → ... → Renderer

New: add Security Scanner between Knowledge and Planner
      (subscribe to KNOWLEDGE_LOADED, validate, publish SECURITY_CHECKED)

Existing components: 0 changes required.
```

## 9. Non-Goals

- I do not define the exact implementation library. That belongs to implementation specs.
- I do not define persistent event storage. That belongs to DATABASE_SPEC.md.
- I do not define distributed event bus (multi-server). That is a future ADR.
- I do not define event schema validation. That is a P3 concern.
