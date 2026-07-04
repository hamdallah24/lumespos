# ADR-001: Foundation v2.0

**Status:** ACCEPTED
**Date:** ECP-039–ECP-040
**Supersedes:** Foundation v1.0

## Context

Lumé CMN needs a stable execution foundation. Every AI agent in the organization must execute through the same pipeline with the same governance rules.

## Decision

Foundation v2.0 consists of these frozen modules:

| Module | Owner | Responsibility |
|--------|-------|---------------|
| `ExecutionGovernor` | execution-governor.ts | Single Source of Truth for all execution policy |
| `ExecutionPipeline` | execution-pipeline.ts | Single entry point for all execution |
| `ExecutionDriver` | execution-driver.ts | Single lifecycle controller (Governor loop) |
| `ExecutionContract` | execution-manifest.ts | Immutable contract between Governor and Runtime |
| `LLM Adapter` | llm-adapter.ts | Stateless DeepSeek communication |
| `Tool Adapter` | tool-adapter.ts | Stateless tool execution |

## Rules

1. Foundation modules **MUST NOT** be modified without a new ADR
2. Only allowed changes: bug fixes, security fixes, performance optimization, non-breaking interface extension
3. **FORBIDDEN**: moving ownership, changing lifecycle, changing dependency graph, changing main flow
4. All new features **MUST** be built as extensions above Foundation

## Dependencies

Foundation depends on nothing above it. Only on `llm/` and `tools/` sub-layers.

## Violations

Any change to Foundation without ADR approval = Architecture Compliance FAIL.
