---
id: adr-012-backend-reorganization-v1
title: ADR-012 — AI Backend Reorganization
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
last_reviewed: 2026-06-30
review_trigger:
  - OnArchitectureChange
knowledge_level: reference
context_priority: normal
depends_on: []
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr, sprint-5, reorganization
purpose: |
  Sprint 5: Moved AI runtime from routes/runtime/ to ai/runtime/.
  Created src/ai/index.ts as single public entry point.
  Zero behavior changes, zero prompt changes.
---

# ADR-012: AI Backend Reorganization

## Context

Blueprint (ENGINEERING_RUNTIME_ARCHITECTURE.md) defines 10 components in a clean subsystem. Implementation had these scattered across `routes/` with no physical separation. Technical misalignment between blueprint and codebase.

## Decision

**Move AI runtime to `src/ai/runtime/`, create facade at `src/ai/index.ts`.**

12 runtime files moved from `routes/runtime/` → `ai/runtime/`. Import paths updated: `./runtime/` → `../ai/runtime/`. `src/ai/index.ts` re-exports all AI functions as single public interface. Routes unchanged, business logic unchanged, prompts unchanged.

Old `routes/runtime/` directory deleted after migration verified.

## Consequences

### Positive
- Blueprint matches filesystem: `ai/runtime/` = physical location for runtime components
- Single entry: `import { ... } from "./ai"` instead of multiple deep imports
- Routes become thinner (future refactor opportunity)
- Zero API, frontend, DB, or prompt changes

### Negative
- `ai/index.ts` is a re-export facade, not genuine abstraction (interim)
- `llm-gateway.ts` and `tool-executor.ts` still import from `routes/ai-helpers.ts` (soft coupling)

## Status

Accepted and implemented in Sprint 5 (`e4f9155e`).
