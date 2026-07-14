# ADR-002: PipelineEngine Ownership

**Status:** Accepted (Frozen)
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
The system has two execution paradigms: EIOS PipelineEngine (stage-based DAG execution) and World A ExecutionDriver (LLM conversation loop). Both are necessary — they solve different problems.

## Problem
PipelineEngine must be the single execution runtime, but the AI execution loop (strategy transitions, tool calls, LLM orchestration) is fundamentally different from stage-based pipeline execution.

## Decision
PipelineEngine is the sole execution runtime for infrastructure pipelines (business intelligence, decision context, strategy simulation, workflow, executive dispatch). The AI execution loop (execution-driver.ts, execution-governor.ts) is business logic — it orchestrates LLM conversations for coding tasks. These coexist: PipelineEngine handles infrastructure orchestration, AI execution handles LLM interaction.

## Alternatives Considered
- Make PipelineEngine the only execution path: Would require converting LLM loops into EIOS stages, which is architecturally wrong (mixing business logic into runtime).
- Make ExecutionDriver the only execution path: Would lose PipelineEngine's stage orchestration, retry, circuit breaker, and observability benefits.

## Trade-offs
- (+) PipelineEngine remains clean (no business logic)
- (+) AI execution loop remains flexible for LLM-specific patterns
- (-) Dual execution paths require clear documentation
- (-) Shared infrastructure (MetricsEngine, PipelineAudit) must be properly bridged

## Consequences
- AI execution loop uses EIOS infrastructure (MetricsEngine, PipelineAudit, TraceManager) via bridges
- PipelineEngine owns infrastructure pipelines
- AI execution owns LLM interaction pipelines
