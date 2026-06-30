---
id: tool-assessment-v1
title: Tool Calling Audit Assessment
domain: workspace
artifact_type: report
owner: CTO
status: Active
version: 1.0.0
last_updated: 2026-06-30
tags: [sprint-6.5, assessment, tool-calling]
---

# Tool Calling Audit Assessment

## Executive Summary

Tool calling has 3 known patterns from production data: (1) `needsDevOps` keyword check is too coarse — 20 hardcoded strings, (2) `searchContent` returns raw grep output that model echoes as text, (3) `sshExec`/`execCommand` were historically available for file reading (fixed by READ_TOOLS/DEVOPS split in Sprint 2). Validation now catches shell commands in output (Sprint 1). The system has no tool-use budget or frequency tracking — agents can call the same tool repeatedly without limit.

## Evidence

| # | Severity | Finding | Source |
|---|----------|---------|--------|
| 1 | MEDIUM | `needsDevOps` keyword list is not data-driven | ai.ts:279 (20 hardcoded strings) |
| 2 | MEDIUM | No tool call frequency tracking | No budget or rate limit per tool |
| 3 | MEDIUM | `searchContent` output format is raw grep — model echoes it | ai-helpers.ts:360-371 |
| 4 | LOW | Tool execution max 3 rounds per request — no per-tool limit | ai-helpers.ts:MAX_ROUNDS=3 |
| 5 | LOW | Hallucinated DSML tool calls detected by `parseDSMLToolCalls` fallback | ai-helpers.ts:560-578 |

## Impact

Aggressive tool usage: unnecessary GitHub fetches when local files suffice, repeated tool calls for same file, grep output format polluting model context.

## Recommendation

1. **P2:** Replace `needsDevOps` keyword list with Intent Classifier component
2. **P3:** Add per-tool frequency tracking (via ExecutionContext already in place)
3. **P3:** Format `searchContent` output as structured JSON, not raw grep

## Estimated Effort
P2: 1 sprint (Sprint 11) | P3: included in Sprint 11

## Suggested Sprint
All in Sprint 11 (Intent Classifier)
