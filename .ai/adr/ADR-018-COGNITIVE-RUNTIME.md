---
id: adr-018-cognitive-runtime-v1
title: ADR-018 — Cognitive Runtime (Sprint 9)
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
review_trigger: OnArchitectureChange
knowledge_level: reference
tags: [adr, sprint-9, cognitive, intent]
purpose: |
  Sprint 9: Intent Classifier (7 categories, layered detection) and
  Capability Engine (evidence gating). Replaces keyword-based needsDevOps.
---

# ADR-018: Cognitive Runtime

## Context

Tool selection was based on `needsDevOps()` — 20 hardcoded keywords. This caused: SSH called for file analysis, tools called for greetings, no differentiation between "analyze" and "implement". 

## Decisions

**1. Intent Classifier — 7 categories, layered detection:**

| Layer | Category | Detection |
|-------|----------|-----------|
| 1 | greeting | Exact match on common greetings |
| 2 | approval | "SETUJU", "approve", "merge" |
| 3 | devops_operation | 4 regex signal groups |
| 4 | business_action | Inventory, order, price patterns |
| 5 | analyze_code | Read/review/audit + file paths |
| 6 | implement_change | Fix/create/generate + needsApproval check |
| 7 | knowledge_query | Architecture/docs/standards questions |

Default: `analyze_code` (conservative — assumes read-only).

**2. Capability Engine — evidence gating:**

Tools blocked unless intent provides evidence:
- `execCommand`: requires devops_operation + confidence ≥80
- `sshExec`: requires devops_operation + confidence ≥85
- `readFile`: requires file paths in request
- `searchContent`: requires keywords or file paths

**3. Pipeline:** Intent Classifier → Capability Engine → Knowledge Loader → Prompt Assembler → LLM

**Replaces:** `needsDevOps()` (20 hardcoded keywords in ai.ts:279)

## Status

Implemented Sprint 9 (`a844e901`). 32 components registered.
