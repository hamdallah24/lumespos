# ADR-008: RuntimeFacade Philosophy

**Status:** Accepted
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
RuntimeFacade is the single public API for EIOS runtime, used by plugins and application components. The current implementation has 13 methods.

## Problem
A facade with many methods risks becoming a God Object. However, premature splitting creates import complexity for consumers.

## Decision
RuntimeFacade remains monolithic for now (13 methods, each 1-3 lines of delegation). It qualifies as a proper facade because:
- No business logic — pure delegation to internal subsystems
- Each method maps 1:1 to a distinct internal component
- All consumers (plugins) need access to all capabilities
- Method count is manageable (<15)

If method count exceeds 15, split into sub-facades:
- ExecutionFacade: execute
- ObservabilityFacade: metrics, trace, health, snapshot
- SchedulerFacade: schedule, unschedule
- RegistryFacade: registry, capability
- EventFacade: subscribe, emit, context
- LifecycleFacade: shutdown

## Alternatives Considered
- Split now: Creates 6 import paths for plugin authors. Added complexity without demonstrated need.
- Inline all methods without facade: Exposes internal implementation. Rejected.

## Consequences
- Single import path for all EIOS runtime access
- Clear extension path for future sub-facades
- Each method authorized via PermissionTokenManager
