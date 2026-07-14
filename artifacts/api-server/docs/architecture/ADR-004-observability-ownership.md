# ADR-004: Observability Ownership

**Status:** Accepted (Frozen)
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
Observability (metrics, tracing, circuit breaking, auditing, health monitoring) was historically split between World A and EIOS.

## Decision
EIOS is the single owner of all runtime observability: MetricsEngine, TraceManager, CircuitBreaker, PipelineAudit, PerformanceBudget, RuntimeHealth. World A components that need observability MUST bridge to EIOS infrastructure (as execution-metrics.ts → MetricsEngine, execution-journal.ts → PipelineAudit).

## Alternatives Considered
- Keep World A observability: Duplicate state and inconsistent reporting. Rejected.
- Abstract observability behind interface: Over-engineered for current needs. Deferred.

## Consequences
- World A RuntimeMetricsAggregator backed by MetricsEngine
- World A ExecutionMetrics emits to MetricsEngine
- World A ExecutionJournal records to PipelineAudit
- HealthMonitor remains as application-level health (external service pings)
