---
id: adr-020-codegen-deprecation-v1
title: ADR-020 — Deprecation of Legacy Code Generation Pipeline
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
last_reviewed: 2026-06-30
review_trigger:
  - OnPolicyChange
knowledge_level: reference
context_priority: normal
depends_on: []
referenced_by: []
consumers:
  - CTO
loading_strategy: on-demand
tags:
  - adr
  - deprecation
  - codegen
  - single-execution-path
purpose: |
  Document the architectural decision to remove the legacy code generator.
  All implementation now flows through the governed CTO Runtime pipeline.
---

# ADR-020: Code Generator Deprecation

## Context

`ai-codegen.ts` (498 lines) was built before the Engineering OS Foundation existed. It generates code from chat messages, bypassing: governance, proposal system, execution specification, planner, reflection, and evidence collection. It duplicates CTO Runtime functionality and provides a backdoor to skip founder approval.

Engineering OS v1.0 is now frozen with a complete governance pipeline: Proposal → Governor → ExecutionSpec → Planner → CTO Runtime → Reflection → Evidence.

## Decision

**Remove `ai-codegen.ts`. Replace `generateNow` with contract-driven `approve_proposal`.**

All code implementation now flows through:
```
Proposal → ProposalExecutor → ExecutionSpec → CTO Runtime → Planner → Knowledge → LLM → Reflection → Evidence
```

Frontend `generateNow: true` replaced with `action: "approve_proposal", proposalId: "..."`.

## Consequences

### Positive
- Single Execution Path enforced (Law #009 — Kernel Purity)
- No backdoor to bypass governance
- -498 lines of legacy code
- All implementation governed by same pipeline (CEO, CTO, COO)

### Negative
- "Approve" flow requires a proposal ID (must exist before approval)
- Removed `legacy/removed-ai-codegen.ts` archived for 1 release as rollback safety

## Status

Accepted. Implemented June 30, 2026. File archived to `legacy/removed-ai-codegen.ts`.
