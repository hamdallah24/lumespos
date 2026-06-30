---
id: prompt-assessment-v1
title: Prompt Audit Assessment
domain: workspace
artifact_type: report
owner: CTO
status: Active
version: 1.0.0
last_updated: 2026-06-30
tags: [sprint-6.5, assessment, prompt]
---

# Prompt Audit Assessment

## Executive Summary

`ai-prompts.ts` (233 lines, 3 system prompts) contains: 1 broken rule numbering (no rule 8), 2 contradictory instructions within BANG, 3 contradictions within COO, 2 duplicated rules across prompts, and extensive hardcoded strings. The Foundation's Prompt Assembler blueprint (P2) is not yet built — all prompts are hand-assembled.

## Evidence

| # | Severity | Finding |
|---|----------|---------|
| 1 | **HIGH** | COO `response` field contradiction: examples say "fill response" (lines 189-224), rule 6 says "leave empty" (line 232) |
| 2 | **HIGH** | BANG tool calling contradiction: "minimal tools" (rule 12) vs "gather ALL files" (line 26) |
| 3 | **MEDIUM** | `add_stock` price ambiguity: is `price` total or per-unit? |
| 4 | **MEDIUM** | Duplicate rule: "JANGAN MENGARANG ANGKA" in both BANG (rule 12) and COO (rule 6) |
| 5 | **MEDIUM** | Broken numbering: BANG rules jump from 7→9 (no rule 8) |
| 6 | **LOW** | BANG identity confusion: "KAMU BANG" but "JANGAN jawab sebagai BANG" |
| 7 | **LOW** | COO JSON format ambiguity: `action` vs `actions` root key selection unclear |

## Impact

Contradictory instructions cause: COO fills response when it shouldn't (bloat), BANG calls tools for simple questions (unnecessary latency), price calculations are unreliable (business risk).

## Recommendation

1. **P1:** Fix COO contradiction — align examples and rules
2. **P1:** Fix BANG tool calling — remove "gather ALL files" from line 26
3. **P2:** Fix rule numbering (add rule 8 or renumber)
4. **P3:** Migrate prompts to Prompt Assembler when built (Sprint 9)

## Estimated Effort
P1: 15 min | P2: 5 min | P3: 1 sprint

## Suggested Sprint
P1-P2 in Sprint 7 | P3 in Sprint 9
