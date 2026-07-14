# T.0.1.5 — Phase 5: Pipeline Lock

## Source
T.0.1 Runtime Integration Point (T01_RUNTIME_INTEGRATION.md:5-16) — Options A through F

## LOCKED Pipeline Sequence

```
Foundation
    ↓
Knowledge
    ↓
Memory Read          ← LOCKED: Option C
    ↓
Cognitive
    ↓
Prompt
    ↓
LLM
    ↓
Decision
    ↓
Memory Write (post-hoc, via EIOS observer)
```

## Why Option C Was Chosen (LOCKED)

| Option | Position | Verdict | Reason for Rejection |
|:------:|----------|:-------:|----------------------|
| **A** | Before Foundation | **REJECTED** | Foundation identity (memoryScope, knowledgeDomains) is needed to scope memory access. Without identity, memory recall is too broad. |
| **B** | After Foundation, Before Knowledge | **REJECTED** | Knowledge provides domain classification for better memory recall. Without domain, memory query lacks context for relevance ranking. |
| **C** | **After Knowledge, Before Cognitive** | **LOCKED** | Knowledge provides domain context for memory scoping. Memory influences cognitive reasoning (evidence, confidence, decisions). Optimal balance. |
| **D** | After Cognitive | **REJECTED** | Cognitive already decided without memory context. Memory too late to influence reasoning. |
| **E** | After Prompt | **REJECTED** | Memory not in prompt or cognitive pipeline. Useless placement. |
| **F** | In Prompt Assembler | **REJECTED** | Memory becomes presentation-only concern. Should influence evidence/confidence, not just prompt text. |

## Pipeline Detail (LOCKED)

```
Step 1: IDENTITY
  → Load AgentIdentity (role, memoryScope, knowledgeDomains)
  → Establishes WHO is reasoning, WHAT scope they have

Step 2: FOUNDATION
  → Load FoundationAssets (directives, policies, business rules)
  → Establishes WHAT the executive must follow

Step 3: KNOWLEDGE
  → Load KnowledgeContext (domain facts, architecture, KG traversal)
  → Establishes WHAT the executive should know
  → DOMAIN is classified here — feeds into Memory Query

Step 4: MEMORY READ            ← LOCKED POSITION
  → MemoryProvider.read({
       executive: identity.role,
       query: message,
       domain: knowledge.domain,
       memoryScope: identity.memoryScope,
     })
  → Returns MemoryContext (past decisions, working memory, etc.)
  → Populates CognitiveContext.history

Step 5: COGNITIVE
  → CognitiveEngine.think(cognitiveContext)
  → EvidenceBuilder includes "memory" source
  → Decision, confidence, reasoning influenced by memory context

Step 6: PROMPT
  → PromptAssembler.assemble()
  → Memory context already in cognitiveContext, flows into prompt

Step 7: LLM
  → Model generates decision based on full context

Step 8: DECISION
  → ExecutiveDecision returned to caller

Step 9: MEMORY WRITE (post-hoc, SEPARATE PATH)
  → EIOS Observer listens to "decision.made" event
  → Records to DecisionRecorder, ExecutiveMemoryProvider
  → Invalidates cache
  → No interference with read path
```

## Single Sequence — No Alternatives (LOCKED)

```
Identity → Foundation → Knowledge → MEMORY READ → Cognitive → Prompt → LLM → Decision
```

No alternative sequences exist. No runtime configuration to reorder. Memory Read is always between Knowledge and Cognitive.

## Verification

| Check | Status |
|-------|:------:|
| Exactly ONE sequence? | **PASS** |
| All alternatives REJECTED? | **PASS** — Options A, B, D, E, F rejected with rationale |
| Position justified? | **PASS** — Knowledge provides domain for memory scoping |
| No runtime reordering? | **PASS** — Sequence is hard-coded, not configurable |
| Memory Write not in pipeline? | **PASS** — Write is separate post-hoc EIOS observer path |
