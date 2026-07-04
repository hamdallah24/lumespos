# Compatibility Policy — Lumé CMN v1.0

## Current State

`src/routes/ai-helpers.ts` serves as a compatibility barrel. It re-exports from the actual source modules without containing any implementations.

## Why It Still Exists

Historical consumers in `src/routes/ai.ts` and `src/ai/` still import through this barrel. Removing it would require updating ~12 import sites across multiple layers.

## What It Re-Exports

| Category | Symbols | Source |
|----------|---------|--------|
| LLM | `callDeepSeek`, `callDeepSeekWithTools` | `llm/llm-adapter.ts` |
| Tools | `executeToolCall`, `fetchGitHubFile`, `searchRepoFiles`, `getDependencies`, `mergeDeploy`, etc. | `tools/tool-adapter.ts` |
| Memory | `remember`, `getHistory`, `getOrCreateConversation`, `clearMemory` | `services/ai-memory-service.ts` |
| Config | `PROJECT_ROOT`, `GITHUB_PAT`, `SSH_HOST`, etc. | `tools/tool-adapter.ts` |

## What Remains Local

| Function | Reason |
|----------|--------|
| `saveSharedContext`, `getSharedContext` | Routes-specific utility |
| `getChecklistItems`, `upsertChecklistItem`, `clearChecklistItems` | Routes-specific utility |
| `checkRateLimit` | Routes-specific utility |

## Migration Plan to `src/ai/index.ts`

### Phase 1: Current (Fix Pack C)
- `ai-helpers.ts` serves as barrel
- All consumers work through barrel

### Phase 2: Direct Import Migration
- Update `src/ai/` consumers to import from actual source files
- Example: `llm-gateway.ts` → `import from "../../llm/llm-adapter"`
- Example: `tool-executor.ts` → `import from "../../tools/tool-adapter"`

### Phase 3: Facade Creation
- Create `src/ai/index.ts` as the official AI facade
- Re-exports from: `llm/`, `tools/`, `services/`
- Update `ai.ts` to import from `src/ai/index.ts`

### Phase 4: Barrel Removal
- Delete `routes/ai-helpers.ts`
- All consumers migrated

## Removal Conditions

`ai-helpers.ts` can be deleted when:

1. ✅ No `ai/` file imports DB functions from `routes/ai-helpers` (DONE — Fix Pack A)
2. All `src/ai/` files import from actual source locations
3. `ai.ts` imports LLM/Tool/Memory from `src/ai/index.ts`
4. Remaining route utilities (shared context, checklist, rate limiter) moved to appropriate locations

## Compatibility Guarantee

Until Phase 4, `ai-helpers.ts` guarantees:
- Zero breaking changes to public API
- All re-exported functions maintain identical signatures
- No new implementations added
