# ADR-005: Scheduler Ownership

**Status:** Accepted
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
Seven active scheduler-like mechanisms exist: PipelineScheduler, KernelScheduler, MissionEngine polling, HealthMonitor, RuntimeGovernance periodic checks, ConsultantScheduler, KernelHeartbeat.

## Problem
No single scheduler can serve all these purposes — each has different stop conditions, trigger mechanisms, lifecycle bindings, and consumers.

## Decision
No shared SchedulerService abstraction. Each scheduler remains with its owning module because they serve fundamentally different purposes:
- PipelineScheduler (EIOS): Pipeline execution timing
- KernelScheduler (Kernel): Organizational task timing
- MissionEngine polling (AI Runtime): Mission lifecycle
- HealthMonitor (AI Runtime): External service health
- RuntimeGovernance (EIOS): Internal integrity checks
- ConsultantScheduler (CKO): Knowledge maintenance
- KernelHeartbeat (Kernel): Liveness monitoring

## Alternatives Considered
- Unified SchedulerService: Would need to accommodate 7 different scheduling patterns. Over-engineered for no consolidation benefit.
- Make PipelineScheduler the central scheduler: PipelineScheduler only fires triggers — cannot call arbitrary functions.

## Consequences
- HealthMonitor missing stop mechanism fixed
- All schedulers documented in ownership matrix
- No behavioral changes to any scheduler
