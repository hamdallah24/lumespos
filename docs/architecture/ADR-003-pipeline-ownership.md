# ADR-003: Pipeline Ownership

**Status:** ACCEPTED
**Date:** ECP-040
**Supersedes:** while loop in ai-helpers.ts

## Context

The execution loop (`while (governor.shouldContinue())`) with LLM calls, tool dispatch, strategy injection, validation, and final call was embedded inside `ai-helpers.ts`. This meant the LLM adapter layer owned the lifecycle.

## Decision

Move full lifecycle ownership to `ExecutionDriver`. The LLM adapter becomes stateless.

| Component | Before | After |
|-----------|--------|-------|
| Governor lifecycle | In llm-adapter (`callDeepSeekWithTools`) | In `ExecutionDriver.run()` |
| LLM call | In `callDeepSeekWithTools` (with loop) | `callLLMWithTools()` — stateless single request |
| Strategy injection | In llm-adapter | In ExecutionDriver |
| Tool execution | In llm-adapter | In ExecutionDriver |
| History persistence | In llm-adapter | In ExecutionDriver |
| Final call | In llm-adapter | In ExecutionDriver |

## Rules

1. `ExecutionDriver.run()` is the **single** execution loop
2. `callLLMWithTools()` makes **one** request to DeepSeek — no loop, no Governor
3. `callDeepSeekWithTools()` is a **compatibility wrapper** — delegates to Pipeline
4. LLM adapter **MUST NOT** import `ExecutionGovernor`

## Violations

```ts
// FORBIDDEN — Adapter must never run loops
while (...) { ... }  // ❌ in llm/

// FORBIDDEN — Adapter must never create Governor
new ExecutionGovernor(...)  // ❌ in llm/
```

Any loop or Governor instantiation in `llm/` = Architecture Compliance FAIL.
