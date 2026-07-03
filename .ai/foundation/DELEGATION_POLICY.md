---
id: delegation-policy-v1
title: Delegation Policy
domain: foundation
artifact_type: policy
owner: Founder
status: Active
version: 1.0.0
stability: stable
lifecycle: ACTIVE
authorized_consumers:
  - All Runtimes
last_updated: 2026-07-03
knowledge_level: governing
context_priority: critical
loading_strategy: always
depends_on:
  - constitution-v1
  - ceo-directive-v1
  - runtime-registry
tags: [foundation, policy, delegation, routing, hierarchy]
purpose: |
  Defines delegation rules for the Organization Engine and Delegation Engine.
  Routing matrix, fallback, escalation chain, and circular prevention.
---

# Delegation Policy

## Hierarchy

```
Founder (sovereign)
    │
    ▼
CEO (RUNTIME-001, Level A Executive)
    │
    ├──→ CTO (RUNTIME-002, Level B Director)
    │       ├──→ QA (RUNTIME-005, Level C Operator)
    │       ├──→ DevOps (RUNTIME-006, Level C Operator)
    │       └──→ Research (RUNTIME-007, Level C Operator)
    │
    ├──→ COO (RUNTIME-003, Level B Director)
    │       ├──→ Inventory
    │       └──→ Sales
    │
    └──→ CFO (RUNTIME-004, Level B Director)
            ├──→ Accounting
            └──→ Audit
```

## Authority Levels

| Level | Name | Can Delegate? | Examples |
|-------|------|--------------|----------|
| A | Executive | Yes — to B-level | CEO |
| B | Director | Yes — to C-level | CTO, COO, CFO |
| C | Operator | No | QA, DevOps, Research |

## Routing Matrix

Domain-to-runtime mapping. Used by Organization Engine for delegation routing.

| Domain Pattern | Target Runtime | Runtime ID |
|---------------|----------------|------------|
| `code\|bug\|deploy\|ssh\|architecture\|refactor\|server\|vps` | CTO | RUNTIME-002 |
| `inventory\|sales\|ops\|warehouse` | COO | RUNTIME-003 |
| `budget\|accounting\|audit\|finance` | CFO | RUNTIME-004 |
| `test\|verify\|qa\|quality` | QA | RUNTIME-005 |
| `deploy\|ci\|pipeline` | DevOps | RUNTIME-006 |
| `research\|investigation\|analysis\|study` | Research | RUNTIME-007 |

## Fallback

| Scenario | Action |
|----------|--------|
| Domain not matched | Route to CTO (RUNTIME-002) — default |
| Runtime offline | Try next runtime in same capability group |
| All runtimes offline | Escalate to CEO (RUNTIME-001) |
| CEO offline | Escalate to Founder |

## Escalation Chain

```
Runtime blocked → Parent runtime → CEO → Founder
```

## Circular Prevention

| Rule |
|------|
| Runtime A may not delegate to Runtime B if B has already delegated to A in the current mission chain. |
| Runtime A may not delegate to itself. |
| A runtime may not delegate to a runtime with equal or higher authority level. |

## Maturity Gating

| Maturity Level | Allowed Actions |
|---------------|----------------|
| L0 | May accept tasks. May not delegate. |
| L1 | May delegate within capability. |
| L2 | Full delegation authority within level. |
| L3+ | Autonomous delegation with evidence tracking. |

## Single-Runtime Mode

In single-runtime execution mode (current production mode):
- All tasks assigned to CTO (RUNTIME-002) by default
- CEO handles fallback delegation

---

*This policy follows Foundation Canonical Specification v1.0. Changes require ADR.*
