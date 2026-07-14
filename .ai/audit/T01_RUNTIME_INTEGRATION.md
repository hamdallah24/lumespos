# T.0.1 — Phase 4: Runtime Integration Point

## Where Should Memory Be Read?

### Options Considered

| Option | Point | Effect | Pros | Cons |
|:------:|-------|--------|------|------|
| **A** | Before Foundation | Memory before identity + assets | Foundation can use memory context | Foundation is independent of memory |
| **B** | After Foundation | Memory before Knowledge | Foundation context available for memory scoping | No knowledge yet — memory recall limited |
| **C** | **After Knowledge** | **Memory before Cognitive** | **Knowledge available for context-aware recall** | **Slightly later in pipeline** |
| **D** | After Cognitive | Memory after reasoning | Cognitive already made decision | Memory too late to influence decision |
| **E** | After Prompt | Memory after prompt assembly | — | Memory not in prompt — useless |
| **F** | In Prompt Assembler | Memory as prompt block | Simple injection | Token budget competition with other blocks |

### Recommendation: **Option C — After Knowledge, Before Cognitive**

### Rationale

```
Pipeline:
  Identity → Foundation → Knowledge → Memory Read → Cognitive → Prompt → LLM → Decision
                                                ↑
                                          HERE — Option C
```

**Technical Reasons:**

1. **Knowledge is needed for memory scoping** — domain classification from Knowledge helps MemoryProvider filter relevant past decisions and episodes. Without knowing the domain, memory recall is too broad.

2. **EvidenceBuilder already expects context** — `CognitivePipeline.ts:61` passes `context: CognitiveContext` to `buildEvidenceSet()`. The `CognitiveContext.history: ExecutiveDecision[]` field is the designated vehicle for memory. Currently always `[]`.

3. **EvidenceSource "memory" has 0.8 relevance** — `CognitiveContracts.ts:80` already includes `"memory"` as evidence source. `EvidenceBuilder.ts` already has `"memory": 0.8` relevance score ready. The only missing piece is the data.

4. **Token budget is manageable** — Memory loaded before Cognitive can be fed into `CognitiveContext`. The Cognitive pipeline can decide whether to include it based on context size, without competing with Prompt Assembly token budget.

5. **No pipeline modification needed** — `MemoryProvider.read()` is called between Knowledge loading and CognitiveEngine.think(), populating `cognitiveContext.history`. Zero changes to CognitivePipeline, EvidenceBuilder, or PromptAssembler.

### Implementation Point (No Code Change)

```
// CognitiveEngine.ts — lines 37-43
const cognitiveContext: CognitiveContext = {
  sessionId: options.sessionId ?? `session-${Date.now()}`,
  role: options.role,
  history: [],                            // ← MemoryProvider fills this
};

// PROPOSED insertion point (outside CognitiveEngine, in caller):
const memoryContext = await memoryProvider.read({
  executive: role,
  query: message,
  domain: contract?.domain,
  memoryScope: identity.memoryScope,
});

cognitiveContext.history = memoryContext.recentDecisions;  // ← Memory data injected
```

### Alternative: Prompt Assembler Injection (Option F)

```
PromptAssembly:
  Block 1: Identity (always)
  Block 2: Foundation (budget)
  Block 3: Mission (budget)
  Block 4: Decision Context (budget)
  Block 5: Output Schema (budget)
  Block 5.5: Memory Context (NEW — between exec results and tool rules)
    → memoryProvider.read() result formatted as "## Memory & Past Context"
  Block 6: Tool Rules (budget)
  Block 7: Footer (always)
```

**Verdict: Option C is superior** because:
- Memory influences Cognitive reasoning (decisions, confidence, evidence) — not just prompt text
- EvidenceSource "memory" contract already exists in the cognitive layer
- Option F would make memory a presentation-only concern

### Integration Architecture

```
  ┌──────────────────────────────────────────────┐
  │           Executive Program (CEO/CTO/etc)     │
  │                                               │
  │  1. Load Identity                             │
  │  2. Load Foundation + Directive               │
  │  3. Semantic Understanding                    │
  │  4. Build Execution Spec                      │
  │  5. Load Knowledge (via KnowledgeLoader)       │
  │                                               │
  │  6. READ MEMORY ← MemoryProvider.read()        │  ← NEW STEP
  │     - Past decisions (executive-scoped)        │
  │     - Working memory (current tasks)           │
  │     - Semantic memory (if temporal refs)       │
  │     - Episodic memory (similar missions)       │
  │                                               │
  │  7. CognitiveEngine.think()                    │
  │     - context.history populated from step 6    │
  │     - EvidenceBuilder includes "memory" source │
  │                                               │
  │  8. PromptAssembler.assemble()                 │
  │     - context includes memory summary          │
  │                                               │
  │  9. LLM → Decision                            │
  │  10. WRITE MEMORY ← record episode + decision  │
  └──────────────────────────────────────────────┘
```

### What Changes (Files That Would Be Modified in T.0.2)

| File | Change | Risk |
|------|--------|:----:|
| CEO's `execute()` | Add `memoryProvider.read()` call before `CognitiveEngine.think()` | Low — additive |
| CTO's `execute()` | Same | Low |
| COO/CFO/CMO/CAIO/CHRO | Same | Low |
| CKO's `execute()` | Same | Low |
| `CognitiveEngine.think()` | No change | None |
| `CognitivePipeline.runPipeline()` | No change | None |
| `EvidenceBuilder` | Add "memory" to sources list | Low |
| `PromptAssembler` | No change (memory goes via context) | None |
| `RuntimeFacade` | No change | None |

### Why NOT Option A, B, D, E, F

| Option | Rejected Because |
|:------:|-----------------|
| **A — Before Foundation** | Foundation identity is needed to scope memory access (memoryScope, knowledgeDomains) |
| **B — After Foundation** | Only, but Knowledge provides domain classification for better recall |
| **D — After Cognitive** | Memory too late — cognitive already decided without memory context |
| **E — After Prompt** | Useless — memory not in prompt or cognitive pipeline |
| **F — In PromptAssembler** | Memory should influence evidence/confidence/decisions, not just prompt text |
