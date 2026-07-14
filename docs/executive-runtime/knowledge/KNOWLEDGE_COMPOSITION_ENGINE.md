<!--
  EPIC R — Phase 9: Knowledge Composition Engine
  Sources: PROMPT_COMPOSITION_ENGINE.md, PROMPT_BLUEPRINT.md,
           knowledge-platform/providers/KnowledgeProvider.ts,
           learning/retrieval-engine.ts, knowledge/KnowledgeBackbone.ts
  DO NOT EDIT MANUALLY.
-->

# Knowledge Composition Engine

**Version:** 1.0.0  
**Status:** STABLE  

---

## Principle

Knowledge is NEVER assembled ad-hoc. It ALWAYS follows a deterministic composition order.

---

## Composition Order

```
Layer 01: Foundation       ──┐
Layer 02: Organization        │
Layer 03: Executive           │  ← Always included
Layer 04: Runtime             ├── (Static/known sources)
Layer 05: Memory            ──┘
                              │
Layer 06: Conversation      ──┐  ← Current session
Layer 07: Temporary            │  ← Dynamic/session-scoped
Layer 08: External           ──┘
                              │
Layer 09: User Context      ──┐  ← Request-specific
Layer 10: Prompt Assembly   ──┘  ← Final output
```

---

## Layer Definitions

### Layer 01: Foundation (ALWAYS included)
- **Source:** FoundationProvider.getFoundationContext()
- **Contents:** Philosophy (500 chars), Constitution (500 chars), North Star (500 chars)
- **Cache:** 5-minute TTL
- **Cost:** Low (truncated to token budget)
- **Included for:** ALL executives, ALL intents

### Layer 02: Organization (ALWAYS included)
- **Source:** FoundationProvider domain providers
- **Contents:** Identity, Directives, Capabilities, Governance gates
- **Cache:** 5-minute TTL
- **Cost:** Low
- **Included for:** ALL executives, ALL intents

### Layer 03: Executive (ALWAYS included)
- **Source:** Executive SPEC + PLAYBOOK + SYSTEM_PROMPT
- **Contents:** Per-executive identity, authority, capabilities, decision rules, communication, execution protocol, collaboration, output, failure, safety
- **Cache:** Loaded at boot, updated only on version change
- **Cost:** Low (pre-assembled)
- **Included for:** The target executive only

### Layer 04: Runtime (Context-dependent)
- **Source:** RuntimeFacade.health(), MetricsEngine.snapshot()
- **Contents:** System health status, pipeline metrics, runtime state
- **Cache:** 30-second TTL
- **Cost:** Low
- **Included for:** CAIO (always), other executives (on request)

### Layer 05: Memory (Context-dependent)
- **Source:** learning/retrieval-engine, executive-memory
- **Contents:** Past experiences, knowledge nodes, per-executive memory
- **Cache:** Session-scoped
- **Cost:** Medium-High
- **Included for:** All executives (when relevant history exists)

### Layer 06: Conversation (Context-dependent)
- **Source:** ContextManager (sliding history)
- **Contents:** Last 12 messages, temporal references resolved
- **Cache:** Session-scoped
- **Cost:** Low-Medium
- **Included for:** ALL executives (always included for context)

### Layer 07: Temporary (Context-dependent)
- **Source:** Working memory (ContextManager executive memory)
- **Contents:** Current findings, pending tasks, current confidence
- **Cache:** Within current execution only
- **Cost:** Low
- **Included for:** ALL executives

### Layer 08: External (Conditional)
- **Source:** KnowledgePlatform.semantic (external domain)
- **Contents:** Market data, competitor info, industry research
- **Cache:** Variable (based on source)
- **Cost:** Medium
- **Included for:** CMO (marketing), CKO (knowledge), CFO (market pricing)

### Layer 09: User Context (Request-specific)
- **Source:** User message, conversation history, user preferences
- **Contents:** Current request, user identity, user preferences
- **Cache:** None (per-request)
- **Cost:** Variable
- **Included for:** ALWAYS (the user message)

### Layer 10: Prompt Assembly (Final composition)
- **Source:** All previous layers composed into final prompt
- **Contents:** Combined system prompt + dynamic context
- **Cache:** None (per-request)
- **Cost:** Composition overhead only

---

## Composition Algorithm

```typescript
function composeKnowledge(
  executive: ExecutiveRole,
  intent: Intent,
  userMessage: string,
  executiveBrief: ExecutiveBrief
): AssembledKnowledge {

  // Step 1: Static layers (cached)
  const foundation = getFoundation(executive);
  const organization = getOrganization(executive);
  const executiveConfig = getExecutiveConfig(executive);

  // Step 2: Dynamic layers (parallel where possible)
  const [runtime, memory, conversation, external] = await Promise.all([
    // Layer 04: Runtime (only for CAIO or health intents)
    (executive === 'CAIO' || intent === 'health')
      ? getRuntimeHealth() : Promise.resolve(null),

    // Layer 05: Memory (context-aware retrieval)
    getExecutiveMemory(executive, intent, userMessage),

    // Layer 06: Conversation
    getConversation(executive),

    // Layer 08: External (only for relevant intents)
    (intent === 'marketing' || intent === 'knowledge')
      ? getExternalKnowledge(intent, userMessage) : Promise.resolve(null),
  ]);

  // Step 3: Temporary layer (always)
  const temporary = getTemporaryContext(executive);

  // Step 4: User context (always)
  const userCtx = parseUserContext(userMessage);

  // Step 5: Assemble in order
  const layers = [
    foundation,     // Layer 01
    organization,   // Layer 02
    executiveConfig,// Layer 03
    runtime,        // Layer 04 (nullable)
    memory,         // Layer 05 (nullable)
    conversation,   // Layer 06
    temporary,      // Layer 07
    external,       // Layer 08 (nullable)
    userCtx,        // Layer 09
  ];

  // Step 6: Filter nulls, merge, apply token budget
  return assembleLayers(layers.filter(Boolean), executive, intent);
}

function assembleLayers(
  layers: KnowledgeLayer[],
  executive: ExecutiveRole,
  intent: Intent
): AssembledKnowledge {

  // Apply token budget per layer
  const budget = getTokenBudget(executive, intent);
  const allocated = allocateBudget(layers, budget);

  // Merge layers in order (later layers override earlier)
  let merged = {};
  for (const layer of allocated) {
    merged = { ...merged, ...layer.content };
  }

  return {
    layers: allocated,
    merged,
    tokenUsage: allocated.reduce((sum, l) => sum + l.tokens, 0),
    timestamp: new Date(),
  };
}
```

---

## Token Budget Allocation

| Layer | % of Budget | Priority | Notes |
|-------|-------------|----------|-------|
| 01 Foundation | 15% | HIGH | Always included, truncated to fit |
| 02 Organization | 10% | HIGH | Always included, compact format |
| 03 Executive | 20% | HIGH | Pre-assembled, fixed size |
| 04 Runtime | 5% | MEDIUM | Only when requested |
| 05 Memory | 20% | MEDIUM | Highest variable cost |
| 06 Conversation | 15% | MEDIUM | Sliding window (last 12) |
| 07 Temporary | 5% | LOW | Current state only |
| 08 External | 5% | LOW | Only when relevant |
| 09 User Context | 5% | HIGH | The actual request |

### Budget by Executive
| Executive | Base Budget | Notes |
|-----------|------------|-------|
| CEO | 8000 tokens | Strategic decisions need context |
| CTO | 96000 chars* | Code analysis needs large context |
| CFO | 4000 tokens | Financial analysis |
| CMO | 4000 tokens | Marketing analysis |
| CAIO | 4000 tokens | System health |
| CKO | 4000 tokens | Knowledge queries |
| COO | 4000 tokens | Operational |

*CTO uses char budget not token budget due to code context requirements.

---

## Composition Rules

1. **Layer order is FIXED** — Foundation ALWAYS comes first, User ALWAYS comes last
2. **No layer skipping** — Each layer is either included (with content) or explicitly null
3. **No layer reordering** — Cannot swap layer positions for any reason
4. **Overriding** — Later layers can override earlier layers for conflicting information (User > Foundation for user preferences)
5. **Token truncation** — Layers are truncated from the bottom up (External first, then Memory, etc.)
6. **Null propagation** — If a layer source is unavailable, the layer is null and the composition continues
7. **Budget enforcement** — If total exceeds budget, lower-priority layers are truncated first

---

## Composition Validation

After composition, validate:

| Validation | Rule | Action on Failure |
|-----------|------|-------------------|
| Foundation present | Layer 01 must have content | Cannot proceed — escalate |
| Executive identity | Layer 03 must identify the executive | Cannot proceed — system error |
| User context | Layer 09 must have user message | Cannot proceed — no request |
| Token budget | Total <= budget | Truncate lowest priority layers |
| No contradictions | No layer contradicts Foundation | Report contradiction, use Foundation |
| Freshness | Memory/conversation within TTL | Refresh stale layers |

---

## Use Case Examples

### Example 1: CEO Strategic Decision
```
Layers composed:
01 Foundation: Philosophy + Constitution (truncated to 500 chars)
02 Organization: CEO Identity + Directives + Capabilities
03 Executive: CEO SYSTEM_PROMPT (pre-assembled, v1.0.0)
05 Memory: Recent strategic episodes (5 most recent)
06 Conversation: Last 12 messages
07 Temporary: Current decision context
09 User: Founders's request
```

### Example 2: COO Stock Adjustment
```
Layers composed:
01 Foundation: Constitution (compact, governance gates)
02 Organization: COO Identity + Directives + 18 EXECUTION_ACTIONS
03 Executive: COO SYSTEM_PROMPT (pre-assembled, v3.0.1)
05 Memory: Recent stock adjustment experiences (3 episodes)
06 Conversation: Last 12 messages
07 Temporary: Current stock levels
09 User: Operator's request
```

### Example 3: CAIO Health Check
```
Layers composed:
01 Foundation: Constitution (confidence gates section)
02 Organization: CAIO Identity + Directives + Capabilities
03 Executive: CAIO SYSTEM_PROMPT (pre-assembled, v1.0.0)
04 Runtime: RuntimeFacade.health() snapshot (8 dimensions)
05 Memory: Recent health episodes (10 most recent)
06 Conversation: Last 12 messages
07 Temporary: Current health check request
09 User: Requesting executive's question
```
