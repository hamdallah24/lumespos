---
id: sprint-2-proposal-v1
title: Sprint 2 — Runtime Modularization (Phase 1)
domain: workspace
artifact_type: proposal
owner: CTO
status: Proposal
version: 0.1.0
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnArchitectureChange
knowledge_level: reference
context_priority: high
depends_on:
  - runtime-architecture-v1
  - component-interface-v1
  - adr-006-contamination-guard-v1
referenced_by: []
consumers:
  - CTO
  - Founder
loading_strategy: on-demand
tags:
  - sprint
  - modularization
  - runtime
  - architecture
  - sprint-2
purpose: |
  Sprint 2 Proposal: Begin modularizing the monolith callDeepSeekWithTools()
  into standalone components matching the ENGINEERING_RUNTIME_ARCHITECTURE.md
  blueprint. Extract LLM Gateway and Tool Executor. Zero behavior change.
---

## Proposal: Sprint 2 — Runtime Modularization (Phase 1)

### Problem

`callDeepSeekWithTools()` is 350 lines and handles: LLM fetching, tool dispatching, input validation, message sanitization, DSML parsing, response validation, circuit breaking, history management, and progress emission. This violates the Runtime Architecture blueprint which defines 10 separate components each with a single responsibility.

**Current state:**
```
ai-helpers.ts (917 lines, 1 monolith)
  ├── callDeepSeekWithTools() — LLM + tools + validation + history + circuit
  ├── callDeepSeek() — non-tool LLM
  ├── executeToolCall() — tool dispatch
  └── validators/parsers/filters — scattered helpers
```

**Blueprint state (ENGINEERING_RUNTIME_ARCHITECTURE.md):**
```
LLM Gateway (P0) → Tool Executor (P0) → Validator (P1) → Memory Bridge (P1)
```

### Solution

**Phase 1: Extract LLM Gateway + Tool Executor as standalone functions in a new file.**

New file: `artifacts/api-server/src/routes/ai-engine.ts`

Extracted functions (identical logic, new location):
1. `fetchLLM()` — the DeepSeek API call + error handling + timeout management
2. `executeTools()` — the tool execution loop (already exists as `executeToolCall`, enhanced)

`callDeepSeekWithTools()` refactored to call these extracted functions instead of inline logic. Zero behavior change. Identical response output.

### Architecture Delta

```
BEFORE:
  callDeepSeekWithTools() {
    // 350 lines: fetch + parse + tool loop + validate + history
  }

AFTER:
  callDeepSeekWithTools() {
    // 50 lines: orchestrate + call fetchLLM() + call executeTools()
  }

  ai-engine.ts (new):
    fetchLLM()        — DeepSeek API call, error handling, timeout
    executeTools()    — tool dispatch, result collection, progress emission
```

### Affected Assets

| Asset | Impact |
|-------|--------|
| `ai-engine.ts` | **NEW** — 2 functions extracted from ai-helpers.ts |
| `ai-helpers.ts` | **MODIFIED** — callDeepSeekWithTools refactored to call extracted functions |
| `ai.ts` | No change — imports remain from same barrel |
| Foundation docs | No change |
| ADR | ADR-007 generated |
| Runtime architecture | P0 components now have standalone implementations |

### Rationale

**Why Sprint 2 = extraction, not new features:**

1. **Foundation-first:** Every future component (Prompt Assembler, Knowledge Loader, Planner) needs the P0 components to be standalone. You can't compose a pipeline from a monolith.

2. **Risk-free:** Extraction is copy-paste to new file, then call the new function from the old location. If the call behavior is identical, the system behavior is identical. Verified by typecheck + identical function signatures.

3. **Unblocks Event Bus:** The Event Bus needs components that can be registered independently. Currently, everything is locked inside one function closure. Extraction makes components "bus-ready."

4. **Adheres to Runtime Architecture:** Sprint 2 creates the physical file structure that matches the conceptual blueprint. Before: blueprint says "LLM Gateway is P0" but it doesn't exist as a standalone file. After: it does.

**Why not Event Bus yet (Sprint 4):**

- Extraction establishes component boundaries WITHOUT requiring the Event Bus infrastructure.
- Adding Event Bus on top of already-extracted components is a 1-line change per component (replace direct call with `bus.publish()`).
- Adding Event Bus DURING extraction means debugging two changes simultaneously — violates "prefer evolution over revolution."

### Technical Debt

| Debt | Priority | Target Sprint |
|------|----------|---------------|
| `callDeepSeekWithTools` still orchestrates (not Event Bus) | P3 | Sprint 4 |
| `ai-helpers.ts` still contains validators/filters that belong in ai-engine.ts | P2 | Sprint 3 |
| No Component Registry yet | P3 | Sprint 4 |

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|------------|
| Extraction introduces subtle behavioral difference | Low | High | Identical signatures, identical logic. Verified by typecheck. |
| Import path breaks other consumers | Very Low | Low | Functions exported from same barrel (ai-helpers.ts re-exports ai-engine.ts) |
| Performance degradation from function call overhead | None | None | Direct function calls, no proxy/wrapper. Identical execution path. |

### Confidence

**High (95%)** — Extraction is the safest form of refactoring. The logic doesn't change; the location does. 5% uncertainty: edge case in import re-export path.

### Deliverables

1. `ai-engine.ts` — new file with `fetchLLM()` + `executeTools()` (extracted from ai-helpers.ts)
2. `ai-helpers.ts` — refactored `callDeepSeekWithTools()` using new functions
3. ADR-007 — Sprint 2 architecture decision
4. Sprint 2 Report — retrospective with lessons learned + metrics delta

### Approval Requested
[ ] Approve
[ ] Reject
[ ] Revise (comment below)
