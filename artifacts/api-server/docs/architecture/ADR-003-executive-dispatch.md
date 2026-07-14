# ADR-003: Executive Dispatch

**Status:** Accepted (Frozen)
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
Seven executives (CEO, CTO, COO, CFO, CMO, CAIO, CKO) need to be invoked by the application layer and by each other.

## Problem
Direct executive-to-executive calls (e.g., CTO calling CEO.execute()) create tight coupling and bypass lifecycle controls.

## Decision
ExecutiveDispatchRegistry is the single dispatch mechanism. All executive invocation goes through the registry. The application-runtime-adapter.ts normalizes different executive return types into a common format. Executives communicate with each other exclusively through the dispatch registry.

## Alternatives Considered
- Direct imports: Tight coupling. Rejected.
- Event bus only: Loses typed return values. Rejected.

## Consequences
- All 7 executives registered via `ExecutiveDispatchRegistry.register()`
- CEO uses `ExecutiveDispatchRegistry.dispatch("CEO")` for cross-executive calls
- Application uses `applicationRuntime.executeMessage()` which routes through the adapter
