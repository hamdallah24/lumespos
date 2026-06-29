---
id: adr-009-observability-v1
title: ADR-009 — Observability (In-Memory)
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
  - adr-008-runtime-stabilization-v1
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - observability
  - metrics
  - tracing
  - logging
  - sprint-3.5
purpose: |
  Document Sprint 3.5 decisions: in-memory observability without database,
  ExecutionContext as single data structure, ring buffer logging.
---

# ADR-009: Observability (In-Memory)

## Context

Five sprints of tool calling improvements have rendered the system increasingly complex. Debugging errors requires knowledge of the entire pipeline state at the point of failure. Without structured observability, debugging is trial-and-error.

## Decision

**Implement in-memory observability with 4 components:**

1. **ExecutionContext** — single mutable data structure per request. Every component writes to it. `.step()`/`.end()` for pipeline tracking, `.tool()` for tool execution, `.setMetric()`/`.incMetric()` for counters. `.report()` generates a human-readable trace.

2. **Logger** — structured logging with 4 levels (debug/info/warn/error), ring buffer (last 100 entries), query by request ID. Mirrors all output to console for PM2 logs.

3. **Metrics** — in-memory pipeline and tool metrics. `recordPipeline()` on every request completion. `pipelineSummary()` and `toolReport()` for quick dashboards. Ring buffer of 500 entries.

4. **Trace** — lightweight wrapper. `finalize(ctx)` called once per request (in try/finally block). Logs full pipeline report to console. `errorTrace()` for failure diagnosis.

**Chose in-memory over database** because:
- Zero infrastructure changes
- Ring buffers limit memory footprint (<1MB)
- Sufficient for current single-server architecture
- Database persistence can be added later as a subscriber to events

## Consequences

### Positive
- Every request generates a full pipeline trace in PM2 logs
- `pm2 logs pos-api --lines 20` now shows structured traces with timing, tools, and errors
- Ring buffers provide queryable recent history without database load
- `Execution.Context.report()` format: "✅ LLMGateway.fetch 2100ms \n ✅ Validator.validate 3ms"

### Negative
- In-memory metrics lost on restart (acceptable for debugging)
- No persistent dashboard (future sprint)
- Raw trace strings in console, not structured JSON output

## Status

Accepted and implemented in Sprint 3.5 (`a2767336`).
