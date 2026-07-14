# ADR-001: Single Runtime Architecture

**Status:** Accepted (Frozen)
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
The codebase historically had multiple runtime systems (World A AI runtime, World A observability, World A execution engine) operating alongside EIOS. This created duplicate state, inconsistent lifecycle management, and architectural drift.

## Problem
Multiple runtime systems with overlapping responsibilities create maintenance burden, inconsistent behavior, and increased surface area for bugs.

## Decision
EIOS is the single canonical runtime. All runtime lifecycle, pipeline execution, observability (metrics, tracing, circuit breaking), governance, scheduling, and registry management must belong to EIOS. The application layer may contain business logic but not runtime concerns.

## Alternatives Considered
- Keep dual runtime: Maintained parallel World A + EIOS, eventually deprecating EIOS. Rejected because EIOS is already more mature and feature-complete.
- Hybrid: Let each module choose its runtime. Rejected because this creates unpredictable interactions.

## Trade-offs
- (+) Single source of truth for all runtime state
- (+) Consistent lifecycle management
- (-) Migration cost for existing World A components
- (-) Learning curve for EIOS API

## Consequences
- All new runtime features go into EIOS
- World A runtime components bridged to EIOS must maintain backward compatibility
- Business logic stays in application layer

## Future Impact
- Enables architecture freeze with predictable runtime behavior
- Plugin system can trust EIOS as stable foundation
