# ADR-007: Execution Ownership

**Status:** Accepted
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
The AI execution layer (`ai/runtime/execution/`, 21 files) contains LLM execution orchestration that predates EIOS.

## Problem
Some files share names with EIOS components (PipelineContext, PipelineMetrics, scheduler, budget) creating confusion about ownership.

## Decision
PipelineEngine is the single execution runtime. The AI execution layer is business logic — it orchestrates LLM conversations for AI-assisted coding. Despite shared names, NO file in `execution/` duplicates EIOS functionality:
- `execution-context.ts`: AI-specific execution state (unique, no EIOS duplicate)
- `execution-budget.ts`: Token/tool/time budgeting (PerformanceBudget is SLA timing — different concern)
- `execution-metrics.ts`: AI quality metrics (USES MetricsEngine for emission)
- `execution-journal.ts`: AI execution manifest (USES PipelineAudit for recording)
- `scheduler.ts`: Candidate selection algorithm (PipelineScheduler is cron scheduling — different concern)
- `runtime-resolver.ts`: Runtime instance discovery (no EIOS equivalent)

## Alternatives Considered
- Move execution/ into EIOS: Would mix business logic into runtime layer. Rejected.
- Delete execution/ and use PipelineEngine: PipelineEngine is stage-based, cannot do LLM loop. Rejected.

## Consequences
- AI execution layer stays in application layer
- Bridges to EIOS infrastructure via public API (MetricsEngine, PipelineAudit)
- PipelineEngine remains the only infrastructure execution runtime
