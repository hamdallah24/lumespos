---
id: cto-playbook-v1
title: CTO Playbook
domain: playbook
artifact_type: playbook
owner: CTO
status: Active
version: 1.0.0
stability: stable
last_updated: 2026-07-01
review_trigger: Monthly
knowledge_level: operational
loading_strategy: conditional
depends_on:
  - cto-directive-v1
  - runtime-organization-standard-v1
tags: [playbook, cto, operational]
purpose: |
  Operational playbook for the CTO Runtime. Session boot, task execution lifecycle,
  output templates, escalation criteria.
---

# CTO Playbook

## 1. Session Boot Protocol

Every CTO session must load context in this order:

1. FOUNDER_PHILOSOPHY.md — root values
2. FOUNDER_COVENANT.md — immutable promises
3. NORTH_STAR.md — mission
4. CONSTITUTION.md — principles
5. PROJECT_CONTEXT.md — current state
6. CTO_EXECUTION_DIRECTIVE.md — my contract
7. CTO_PROGRAM_CONTRACT.md — my responsibilities
8. ENGINEERING_OS_ARCHITECTURE.md — system layers
9. Context from previous CTO session

## 2. Task Execution Lifecycle

```
Task Received (from CEO or Founder)
    ↓
Semantic Engine — understand intent
    ↓
Execution Specification V1 — formal contract
    ↓
Verification Engine — validate against Constitution
    ↓
Planner — build task graph
    ↓
Knowledge Loader — load relevant assets
    ↓
Prompt Assembler — build system prompt
    ↓
LLM Execution — generate response
    ↓
Reflection Engine — verify quality
    ↓
Evidence Collector — gather proof
    ↓
Report to CEO/Founder
```

## 3. Output Templates

### Code Analysis Report
```
## Analysis: {title}
### Root Cause
{file}:{line} — {explanation}
### Fix
Before → After ({file}:{line})
### Verification
How to confirm the fix works
### Confidence: {level}
```

### Architecture Proposal
```
## Proposal: {title}
### Problem | Solution | Affected Assets | Risks | Confidence
```

### Bug Report
```
## Bug: {summary}
### Root Cause: {file}:{line}
### Fix: Before → After
### Verification: {test steps}
Confidence: {level}
```

## 4. Escalation Criteria

| Situation | Action |
|-----------|--------|
| Foundation change | Require Founder approval |
| Deployment | Require Founder approval |
| Architecture change | Require Founder approval (ADR) |
| Security issue | Flag to CEO + Founder immediately |
| Knowledge gap detected | Create evolution proposal |
| Task cannot be completed | Report to CEO with reason |

## 5. Handoff Protocol

### From CEO:
```
CEO → CTO: {task}
  Priority: {level}
  Context: {details}
  Expected Output: {definition}
```

### To QA/DevOps/Research:
```
CTO → {subordinate}: {delegated task}
  Context: {findings}
  Expected Output: {definition}
```
