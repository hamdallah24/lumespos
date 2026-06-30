---
id: legacy-assessment-v1
title: Legacy Code Assessment
domain: workspace
artifact_type: report
owner: CTO
status: Active
version: 1.0.0
last_updated: 2026-06-30
tags: [sprint-6.5, assessment, legacy]
purpose: |
  Sprint 6.5 Assessment #1: Legacy code audit of routes/ directory.
---

# Legacy Code Assessment

## Executive Summary

The `routes/` directory contains 2,373 lines of AI logic (5 files) that predate the Engineering OS Foundation. 7 unused imports, 3 duplicate function patterns, 4 structurally duplicated code blocks, and 2 monolithic functions >200 lines. This report identifies what must be migrated, what can be deleted, and what needs refactoring before Migration Sprint 16.

## Current State

| File | Lines | Exports | Largest Function | Issues |
|------|-------|---------|-----------------|--------|
| `ai.ts` | 615 | 1 (router) | POST handler 503 lines | 7 unused imports, `toolLabels` dead code |
| `ai-helpers.ts` | 836 | 38 | `callDeepSeekWithTools` 224 lines | 2 unused imports, 5 duplicate patterns |
| `ai-prompts.ts` | 233 | 3 | BANG_ORCHESTRATOR 137 lines | Broken rule numbering (no rule 8) |
| `ai-business.ts` | 203 | 2 | `executeOperation` 173 lines | 1 unused import |
| `ai-codegen.ts` | 498 | 3 | `generateAndCommit` 251 lines | 2 unused imports, duplicates ai-helpers |

## Evidence

| # | Finding | Location |
|---|---------|----------|
| 1 | 7 unused imports in ai.ts mega-import | ai.ts:6 (`executeToolCall`, `readLocalFile`, `listLocalDir`, `searchLocalContent`, `ToolDef`, `clearChecklistItems`, `lastScore`) |
| 2 | `toolLabels` (19-28) is dead code — duplicate of `toolLabelMap` in ai-helpers | ai.ts:19-28 |
| 3 | Fetch-with-timeout pattern duplicated 3x in ai-helpers | ai-helpers.ts:191, 657, 223 |
| 4 | DB try/catch pattern duplicated 8x in ai-helpers | ai-helpers.ts (multiple) |
| 5 | `clearMemory` duplicates `getOrCreateConversation` logic | ai-helpers.ts:102 |
| 6 | ai-codegen.ts re-implements root path, GitHub client, file writer | ai-codegen.ts:13, 17, 179 |
| 7 | `execAsync` = same pattern as `execP` in ai-helpers | ai-codegen.ts:11 vs helpers:18 |
| 8 | `generateAndCommit` (251 lines) and `executeOperation` (173 lines) need decomposition | ai-codegen.ts, ai-business.ts |
| 9 | SSE setup duplicated at lines 92 and 272 | ai.ts:92-102, 272-275 |
| 10 | Broken rule numbering in BANG prompt (no rule 8) | ai-prompts.ts:130 |

## Impact

These issues cause: maintenance burden (8 patterns to update per change), import bloat (9 unused imports), fragile refactoring (monolithic functions cannot be tested in isolation), and inconsistency (different error formats, different truncation limits, different variable names for identical patterns).

## Root Cause

The codebase grew organically before the Engineering OS Foundation existed. No Architecture Decision Records or coding standards guided the initial implementation. Functions were added inline rather than extracted.

## Recommendation

1. **P1:** Remove 9 unused imports (zero-risk cleanup)
2. **P2:** Extract fetch-with-timeout + DB error handler + error formatter to shared utilities
3. **P3:** Decompose `generateAndCommit`, `executeOperation`, POST handler into sub-functions
4. **P4:** Remove duplicate `toolLabels` from ai.ts
5. **P5:** Fix BANG prompt broken rule numbering

## Dependencies
None — all changes are within existing files.

## Estimated Effort
P1: 15 min | P2: 30 min | P3: 2h | P4: 5 min | P5: 5 min

## Suggested Sprint
P1 in Sprint 7 (pre-migration cleanup). P2-P5 in Sprint 16 (Migration).
