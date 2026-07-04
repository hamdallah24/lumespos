# ADR-005: AI Facade & Barrel

**Status:** ACCEPTED
**Date:** ECP-046A (Fix Pack A)
**Supersedes:** Direct Runtime → routes/ imports

## Context

`routes/ai-helpers.ts` evolved from a monolithic helper file (898 lines, 42 exports) into a compatibility barrel. However, DB memory functions (`remember`, `getHistory`, etc.) lived in `routes/`, forcing the `ai/` layer to import upward.

## Decision

1. DB memory functions moved to `services/ai-memory-service.ts` — single owner of conversation persistence
2. `ai-helpers.ts` becomes a **barrel only**: LLM re-exports, Tool re-exports, Memory re-exports
3. No implementations in `ai-helpers.ts`
4. Future: `ai-helpers.ts` → `src/ai/index.ts` as the official AI facade

## Rules

1. `ai-helpers.ts` **MUST NOT** contain new business logic
2. All DB operations **MUST** live in `services/`
3. `src/ai/` **MUST NOT** import DB functions from `src/routes/`
4. Runtime **MUST** use Gateway → Adapter chain, not direct Adapter imports

## Current Barrel Structure

```
ai-helpers.ts
  ├── LLM re-exports   → llm/llm-adapter.ts
  ├── Tool re-exports  → tools/tool-adapter.ts
  ├── Memory re-exports → services/ai-memory-service.ts
  ├── Shared context   (kept — routes-specific utility)
  ├── Checklist        (kept — routes-specific utility)
  └── Rate limiter     (kept — routes-specific utility)
```

## Migration to `src/ai/index.ts`

**When**: All `src/ai/` consumers migrated to import from actual source files.
**Trigger**: Zero remaining `import...from.*routes/ai-helpers` in `src/ai/`.

## Violations

New function definitions in `ai-helpers.ts` = Architecture Compliance FAIL.
