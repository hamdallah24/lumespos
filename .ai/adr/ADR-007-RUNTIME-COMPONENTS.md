---
id: adr-007-runtime-components-v1
title: ADR-007 — Runtime Component Extraction
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnArchitectureChange
knowledge_level: reference
context_priority: normal
depends_on:
  - runtime-architecture-v1
  - component-interface-v1
  - sprint-2-proposal
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - runtime
  - components
  - modularization
  - sprint-2
purpose: |
  Document the decision to extract runtime components into separate files
  with metadata rather than a single ai-engine.ts monolith.
---

# ADR-007: Runtime Component Extraction

## Context

`callDeepSeekWithTools()` is a 350-line function handling LLM fetching, tool dispatching, validation, circuit breaking, and more. The ENGINEERING_RUNTIME_ARCHITECTURE.md blueprint defines 10 separate components. Sprint 2 needed to bridge the gap between blueprint and implementation.

Proposal initially suggested `ai-engine.ts` as a single new file. Founder requested individual files per component: `llm-gateway.ts`, `tool-executor.ts`, etc.

## Decision

**Each runtime component gets its own file in `routes/runtime/` with component metadata.**

Three components extracted in Sprint 2:
1. `llm-gateway.ts` — `fetchDeepSeekCompletion()` + `llmGateway` metadata
2. `tool-executor.ts` — re-export `executeToolCall()` + `toolExecutor` metadata
3. `registry.ts` — `RUNTIME_COMPONENTS` map + `validateRegistry()` + circular dependency detection

Component metadata follows the contract from `COMPONENT_INTERFACE.md`:
- `name`, `version`, `capabilities[]`, `dependencies[]`, `execute`

This is a soft introduction — components still import from `ai-helpers.ts`. The facade (`callDeepSeekWithTools`) remains unchanged. Full extraction (standalone implementieren with Event Bus) is Sprint 4.

## Consequences

### Positive
- Physical file structure matches conceptual blueprint
- Registry validates dependency graph (circular detection, missing dependencies)
- Zero behavior change — backward compatible
- Future extraction to full Event Bus is a mechanical change (replace direct import with bus publish)
- Each file is 20-50 lines — no monolith risk

### Negative
- Components currently import from ai-helpers.ts (soft coupling)
- Registry currently has 2 of 10 planned components
- No behavioral integration yet — components are metadata wrappers

### Neutral
- `callDeepSeekWithTools` still orchestrates the pipeline
- File count increases by 3

## Alternatives Considered

### Single `ai-engine.ts` file
**Rejected by Founder.** Would create a future monolith as more components are added. Separate files enable per-component ownership, testing, and evolution.

### Full extraction with Event Bus in Sprint 2
**Rejected.** Adding Event Bus during extraction means debugging two changes simultaneously. Violates "prefer evolution over revolution" principle from CONSTITUTION.md.

### No extraction — continue in ai-helpers.ts
**Rejected.** Blueprint defines components. Without matching file structure, the blueprint becomes outdated documentation. Code must converge toward the architecture, not diverge.

## Status

Accepted and implemented in Sprint 2 (`b660f11d`). Three new files in `routes/runtime/`.
