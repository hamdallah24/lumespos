---
id: architecture-assessment-v1
title: Architecture Assessment
domain: workspace
artifact_type: report
owner: CTO
status: Active
version: 1.0.0
last_updated: 2026-06-30
tags: [sprint-6.5, assessment, architecture]
---

# Architecture Assessment

## Executive Summary

The Physical folder structure has 3 issues: (1) `routes/` still contains 2,373 lines of AI logic that belongs in `ai/`, (2) `ai/` is a re-export facade, not a true home, (3) 9 runtime files are infrastructure-only — missing 7 pipeline components. The Registry validates 22 components with 1 circular dependency. Module coupling is low — all runtime files import from shared `routes/` files, not from each other (except registry↔health-policy).

## Evidence

| # | Finding |
|---|---------|
| 1 | `routes/ai-helpers.ts` (836 lines) is the largest single file — should be split by domain (memory, tools, LLM) |
| 2 | `ai/index.ts` (39 lines) re-exports from `routes/` — not a true facade, just a pass-through |
| 3 | 1 circular dependency: registry.ts ↔ health-policy.ts |
| 4 | Pipeline components are in wrong locations: Renderer in ai.ts, Memory Bridge in ai-helpers.ts |
| 5 | `src/ai/` structure incomplete: missing memory/, knowledge/, planner/, context/, tools/, foundation/ directories |
| 6 | `src/ai/prompts/index.ts` is a verbatim copy of routes/ai-prompts.ts — should be the source, not a copy |

## Folder Structure Assessment

| Directory | Files | Populated | Status |
|-----------|-------|-----------|--------|
| `ai/runtime/` | 12 | 12 | Complete but over-engineered infrastructure |
| `ai/governance/` | 4 | 4 | Complete |
| `ai/security/` | 2 | 2 | Complete |
| `ai/prompts/` | 1 | 1 (copy) | Needs consolidation |
| `ai/memory/` | 0 | 0 | Missing |
| `ai/knowledge/` | 0 | 0 | Missing |
| `ai/planner/` | 0 | 0 | Missing |
| `ai/context/` | 0 | 0 | Missing |
| `ai/tools/` | 0 | 0 | Missing |
| `ai/foundation/` | 0 | 0 | Missing |
| `routes/` | 5 (AI) | 5 (2373 lines) | Legacy — belongs in ai/ |

## Recommendation

1. **P2:** Fix circular dependency in registry↔health-policy
2. **P3:** Move Memory Bridge logic from ai-helpers to ai/memory/
3. **P3:** Move Renderer logic from ai.ts to ai/runtime/renderer.ts
4. **P4 (Sprint 16):** Full migration: routes/ → ai/ with all files moving to their proper subdirectories

## Estimated Effort
P2: 30 min | P3: 1h each | P4: 1 sprint

## Suggested Sprint
P2 in Sprint 8 | P3 in Sprint 8-9 | P4 in Sprint 16
