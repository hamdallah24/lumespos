---
id: adr-008-runtime-stabilization-v1
title: ADR-008 — Runtime Stabilization
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
  - adr-007-runtime-components-v1
  - sprint-3-proposal
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - runtime
  - validator
  - events
  - registry
  - sprint-3
purpose: |
  Document decisions from Sprint 3: extracting Validator as a pure component,
  dynamic registry, and minimal event system introduction.
---

# ADR-008: Runtime Stabilization

## Context

Sprint 3 targeted: extract Validator, make registry dynamic, introduce events.

## Decisions

### 1. Validator as pure component

Validator extracted to `runtime/validator.ts`. Zero dependencies on LLM, Tools, or Memory. Accepts input, returns `ValidationResult`. Follows `component-interface-v1` with metadata: `name`, `version`, `capabilities`, `dependencies: []`, `health()`.

**Rationale:** Pure components are testable in isolation, composable, and replaceable. A future ML-based validator can swap in without changing any callers.

### 2. Dynamic Registry

Registry upgraded from static `RUNTIME_COMPONENTS` map to dynamic `Map` with `register()`, `unregister()`, `getComponent()`, `health()`, `capabilities()`, `list()`, `validateRegistry()`. Components self-register on import. No `import` changes needed to add new components.

**Rationale:** Future planners, loaders, and agents can register themselves. Enables plugin-style architecture without a plugin system.

### 3. Minimal Events

`runtime/events.ts` — lightweight event emitter: `on()`, `off()`, `emit()`. Four predefined events: `BeforeValidation`, `AfterValidation`, `ToolExecuted`, `LLMCompleted`. Integrated into `callDeepSeekWithTools` at tool execution and validation points.

**Rationale:** Establish event pattern without Event Bus. Future observability, monitoring, and debugging tools subscribe to these events. Full Event Bus (Sprint 4) is a natural upgrade.

## Consequences

### Positive
- Validator is now independently importable and testable
- Registry grows dynamically — adding a component is `register({...})`
- Event emissions create an audit trail of tool executions and validations
- Zero behavior change in `callDeepSeekWithTools` — facade still works identically
- `ai-helpers.ts` reduced from 917 to 820 lines (97 lines extracted)

### Negative
- Event emissions add <1ms overhead per validation (negligible)
- Registry auto-registers on import — no explicit init needed, but import order matters

## Status

Accepted and implemented in Sprint 3 (`c13959ef`).
