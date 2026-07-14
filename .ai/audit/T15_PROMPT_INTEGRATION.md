# T15 — Prompt Integration Audit

## What Was Checked
Whether the PromptAssembler receives and includes Memory Context in the LLM system prompt.

## Finding: ⚠️ PARTIAL — CEO Only

### Evidence

**1. CEO integrates memory into prompt assembly**
`CEOProgram.ts:332-337`:
```typescript
const memoryBlock = [
  memoryCtx.workingMemory,
  memoryCtx.recentDecisions,
  memoryCtx.episodicMemory,
  memoryCtx.knowledgeContext,
].filter(Boolean).join("\n");
// ...
context: [memoryBlock, missionsContext].filter(Boolean).join("\n\n") || undefined,
```
This `context` field is passed to `assemble()` where it appears as Block 5.5 ("Executive Results / Context").

**2. Other executives do NOT add memory to prompt**
- CTO, COO, CFO, CMO, CAIO, CKO, CHRO all call `memoryProvider.read()` and pass `memoryCtx` to `CognitiveEngine.think()` via `context.memoryContext`
- None of them extract memory blocks and pass them into the prompt assembly
- The memory context is passed to CognitiveEngine which does NOT consume it (see T10)

**3. PromptAssembler receives context only from CEO**
`PromptAssembler.ts` accepts `input.context` and places it in Block 5.5, but this field is only populated by CEO's `execute()` method.

### Memory Context in LLM Prompt (CEO only)
```
BLOCK 1: Identity + Directive    ← "You are the CEO..."
BLOCK 2: Foundation Knowledge    ← Domain-specific knowledge base
BLOCK 3: Active Mission          ← Current organizational missions
BLOCK 4: Decision Context        ← Cognitive trace metadata
BLOCK 5: Output Schema           ← Expected JSON shape
BLOCK 5.5: Executive Context     ← [workingMemory] [recentDecisions]
                                   [episodicMemory] [knowledgeContext]  ← ONLY FOR CEO
BLOCK 6: Tool Rules              ← Available tools
BLOCK 7: Footer                  ← Stream + error + budget policies
```

### Memory Context Fields Used Per Executive
| Field | CEO | CTO | COO | CFO | CMO | CAIO | CKO | CHRO |
|-------|-----|-----|-----|-----|-----|------|-----|------|
| `workingMemory` | ✅ Prompt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `recentDecisions` | ✅ Prompt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `episodicMemory` | ✅ Prompt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `knowledgeContext` | ✅ Prompt | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `organizationalMemory` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `semanticMemory` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Verdict
**Prompt integration: PARTIAL (1/8 executives).** Only CEO feeds memory blocks into the prompt assembly. Other executives discard memory context by passing it only to CognitiveEngine, which ignores it.
