# T.0.1 — Phase 7: Memory Read — Per-Executive Integration

## Integration Point

Every executive calls `CognitiveEngine.think()` in their `execute()` method. Memory read is inserted as a step immediately before this call.

```
Current:  1→2→3→4→5→[think]→7→8→9
Proposed: 1→2→3→4→5→6→[think]→7→8→9
                     ↑
            MemoryProvider.read()
```

## Per-Executive Integration

### CEO (`CEOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` at line ~200 |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CEO", domain: mission.domain, memoryScope: "organization", maxTokens: 2500 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` |
| **Existing memory read** | `knowledgeBackbone.summarizeMemory("CEO")` at line ~100 — replace or supplement |
| **Why replace?** | `summarizeMemory()` is KnowledgeBackbone aggregation, not MemoryProvider — MemoryProvider is richer (decisions + working + episodic) |
| **Risk** | CEO already reads memory via KnowledgeBackbone; replacing with MemoryProvider changes the memory format. Mitigation: parallel run during transition, CEO gets BOTH until certified |

### CTO (`CTOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` at line ~60 |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CTO", domain: "architecture", memoryScope: "project", maxTokens: 2000 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` |
| **Existing reads** | `missionContextRegistry.getRelevant()` (file content) — unrelated to memory |
| **Risk** | Low — CTO reads file context, not memory. MemoryProvider is additive, not replacing |

### COO (`COOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "COO", domain: "operations", memoryScope: "project", maxTokens: 1500 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` |
| **Existing reads** | KnowledgeProvider (not memory) — no conflict |
| **Risk** | Low — purely additive |

### CFO (`CFOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CFO", domain: "finance", memoryScope: "project", maxTokens: 1500 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` |
| **Existing reads** | KnowledgeProvider (not memory) — no conflict |
| **Risk** | Low — purely additive |

### CMO (`CMOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CMO", domain: "marketing", memoryScope: "project", maxTokens: 1500 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` |
| **Existing reads** | KnowledgeProvider (not memory) — no conflict |
| **Risk** | Low — purely additive |

### CAIO (`CAIOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CAIO", domain: "ai-operations", memoryScope: "project", maxTokens: 2000 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` + `context.additionalContext = memoryContext.episodicMemory` |
| **Existing reads** | None (CAIO is newer executive) |
| **Risk** | Low — purely additive. CAIO benefits most from episodic memory (past incidents) |

### CKO (`CKOProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CKO", domain: "knowledge", memoryScope: "organization", maxTokens: 3000 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` + `context.additionalContext = memoryContext.organizationalMemory` |
| **Existing reads** | `knowledgeGovernor.getContext()` (knowledge, not memory) — no conflict |
| **Risk** | Medium — CKO manages ALL memory, so MemoryProvider may affect CKO's own reasoning. CKO needs BOTH raw knowledge (via KnowledgeGovernor) AND memory (via MemoryProvider). Ensure no duplication |

### CHRO (`CHROProgram.ts`)

| Aspect | Detail |
|--------|--------|
| **Execute method** | `execute()` |
| **Memory before** | At line `this.cognitiveEngine.think()` |
| **Query** | `{ executive: "CHRO", domain: "hr", memoryScope: "project", maxTokens: 1500 }` |
| **What memory is injected** | `context.history = memoryContext.recentDecisions` |
| **Existing reads** | KnowledgeProvider (not memory) — no conflict |
| **Risk** | Low — purely additive |

## Integration Code Pattern

```typescript
// PROPOSED — pattern for all 8 executives (NO IMPLEMENTATION)
execute(message: string): Promise<ExecutiveDecision> {
  // --- existing steps ---
  const identity = await this.loadIdentity();
  const foundation = await this.loadFoundation();
  const specs = await this.buildExecutionSpec(message);
  const knowledge = await this.loadKnowledge(specs);

  // --- NEW: Memory Read Step ---
  const memoryContext = await memoryProvider.read({
    executive: identity.role,
    query: message,
    domain: specs.domain,
    memoryScope: identity.memoryScope,
    maxTokens: identity.role === 'CEO' || identity.role === 'CKO' ? 3000
            : identity.role === 'CTO' || identity.role === 'CAIO' ? 2000
            : 1500,
  });

  // --- existing Cognitive call ---
  const cognitiveContext: CognitiveContext = {
    sessionId: specs.executionId,
    role: identity.role,
    history: memoryContext.recentDecisions ?? [],
    // Additional memory fields could be injected via additionalContext
  };
  const decision = await this.cognitiveEngine.think(cognitiveContext, ...);

  // --- existing post-processing ---
  return decision;
}
```

## Integration Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Memory latency adds 500ms to executive reasoning | CEO/CTO critical path affected | Timeout per store, graceful degradation |
| Memory context changes cognitive output | Non-deterministic decisions | A/B test with/without memory, log differences |
| Memory blowup in prompt token budget | LLM context window exceeded | `maxTokens` parameter, priority truncation |
| CEO's existing `KnowledgeBackbone.summarizeMemory()` conflicts | Duplicate memory context | Parallel run → compare → replace |
| CKO recursive memory read | CKO reads own memory writes -> feedback loop | Filter CKO's own decisions from CKO's memory |
| Executive-specific memory needs diverge | 8 different implementations | Shared `MemoryProvider.read()` with per-executive config |
