---
id: foundation-governance-hierarchy-v1
title: Foundation Governance Hierarchy
domain: governance
artifact_type: policy
owner: Founder
status: Active
version: 1.0.0
stability: locked
last_updated: 2026-07-01
knowledge_level: governing
context_priority: critical
loading_strategy: always
depends_on:
  - founder-philosophy-v1
  - founder-covenant-v1
  - constitution-v1
referenced_by:
  - all-directives
  - all-contracts
consumers:
  - All Runtimes
  - Proposal Review
  - Governor
tags: [governance, hierarchy, priority, conflict-resolution]
purpose: |
  Defines the priority order of all Foundation documents.
  When two documents conflict, the higher-priority document prevails.
  Lower may extend. Lower may never weaken.
---

# Foundation Governance Hierarchy

## Priority Chain

```
1.  FOUNDER_PHILOSOPHY          ← Root. Immutable. Never overridden.
2.  FOUNDER_COVENANT            ← Immutable promise to humanity.
3.  NORTH_STAR                  ← Mission and vision.
4.  CONSTITUTION                ← Governance principles.
5.  ENGINEERING LAWS            ← #001-#009.
6.  RUNTIME_ORGANIZATION_STANDARD ← How Runtimes live and evolve.
7.  EXECUTIVE_DIRECTIVE          ← Runtime-specific thinking contract.
8.  PROGRAM_CONTRACT             ← Runtime responsibilities.
9.  PLAYBOOK                     ← Operational procedures.
10. METRICS                      ← Performance tracking.
11. ADR                          ← Historical decisions.
```

## Resolution Rule

> When document A (higher priority) contradicts document B (lower priority), **A prevails.**

The conflict must be logged and escalated to the Founder.

## Extension Rule

> **Lower-priority documents may extend higher-priority documents.**
> **Lower-priority documents may never weaken or contradict higher-priority documents.**

Example:
- A Playbook may add operational details to a Directive ✅
- A Playbook may NOT reduce the authority scope defined in a Directive ❌
- A Directive may add specifics to the Constitution ✅
- A Directive may NOT override a Constitutional principle ❌

## Conflict Log

When a conflict is detected, record:

| Date | Documents | Nature | Resolution | Escalated |
|------|-----------|--------|-----------|-----------|
| (TBD) | (TBD) | (TBD) | (TBD) | (TBD) |

This log grows over time as the Engineering OS evolves.

## Binding On

All Runtimes, Programs, Proposal Reviews, and future Governance mechanisms.

---

*This document is locked. Changes require Founder approval via proposal.*
