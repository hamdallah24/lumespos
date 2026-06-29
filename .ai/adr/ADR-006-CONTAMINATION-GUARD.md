---
id: adr-006-contamination-guard-v1
title: ADR-006 — Validator Before Remember()
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
  - sprint-1-proposal
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - validator
  - memory
  - contamination
  - sprint-1
purpose: |
  Document the architectural decision to validate AI responses before
  saving them to persistent memory via remember(). This prevents
  history contamination across sessions.
---

# ADR-006: Validator Before Remember()

## Context

The CTO agent saves conversation history to `ai_messages` via `remember()`. The assistant response is stored as-is — including any shell commands, DSML fragments, or garbled text that the model may produce.

On the next session, `getHistory()` loads this contaminated data back into the context. The model then echoes the contamination, producing more contamination. Over multiple sessions, this creates a positive feedback loop of deteriorating responses.

## Decision

**Validate all AI responses before calling `remember()`.**

The `validateResponse()` function runs on every return path from `callDeepSeekWithTools()`:
- Normal text return (no tool calls)
- Retry path (round 0 error recovery)
- Safety net path (max rounds exhausted)

Validation checks:
1. Shell command contamination (21 patterns: `cd`, `grep`, `wc`, `pm2`, `\|`, `&&`, etc.)
2. Garbled text patterns (merged path fragments, escaped characters)
3. DSML fragments (post-stripDSML residual)
4. Completion check (response too short — likely incomplete)

If contamination is detected, the response is cleaned before `remember()` is called. The original (possibly contaminated) text is still returned to the user via fakeStream — only the persistent memory is sanitized.

## Consequences

### Positive
- History contamination feedback loop broken
- Backward compatible — no signature changes, existing callers unaffected
- Adheres to CONSTITUTION.md: "Always Preserve Context"
- Adheres to CTO_EXECUTION_DIRECTIVE: "History Truncation" + "Sanitize + Validate"
- Rollback: remove 3 `validateResponse` call lines

### Negative
- Adds ~5ms latency per response (string matching, O(n))
- False positive risk: valid code examples in responses could be flagged
- Validator patterns need maintenance as models evolve

### Neutral
- Validation warnings logged to console — not surfaced to frontend yet (future improvement)

## Alternatives Considered

### Regex-based cleanup in remember()
**Rejected.** Would require updating both save and load paths. Less testable. Cleaner to validate at the source (before storage).

### Post-load cleanup in getHistory()
**Rejected.** Already implemented via `filterContamination()` — but this is defense-in-depth, not the primary guard.

### No validator — rely on prompt engineering alone
**Rejected.** Prompts reduce probability but cannot guarantee zero contamination. Engineering defense required.

## Status

Accepted and implemented in Sprint 1 (`abe0dbbf`). Single file change: `ai-helpers.ts`.
