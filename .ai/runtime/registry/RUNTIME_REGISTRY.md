---
id: runtime-registry-v1
title: Runtime Registry
domain: runtime
artifact_type: registry
owner: CTO
status: Active
version: 1.1.0
stability: stable
last_updated: 2026-07-01
review_trigger: OnRuntimeChange
knowledge_level: governing
loading_strategy: always
depends_on:
  - runtime-organization-standard-v1
tags: [runtime, registry, organization, directory]
purpose: |
  Single source of truth for all Engineering OS Runtimes.
  Permanent Runtime IDs, organizational structure, maturity, health, version, capability, and mission ownership.
  Used by Executive Workspace for dynamic org charts.
---

# Runtime Registry

## Organization Tree

```
Founder
  └── CEO (RUNTIME-001, Level A, L2)
      ├── CTO (RUNTIME-002, Level B, L2)
      │   ├── QA (RUNTIME-005, Level C, L0)
      │   ├── DevOps (RUNTIME-006, Level C, L0)
      │   └── Research (RUNTIME-007, Level C, L0)
      ├── COO (RUNTIME-003, Level B, L0)
      │   ├── Inventory (RUNTIME-008, Level C, L0)
      │   ├── Sales (RUNTIME-009, Level C, L0)
      │   └── Warehouse (RUNTIME-010, Level C, L0)
      └── CFO (RUNTIME-004, Level B, L0)
          ├── Accounting (RUNTIME-011, Level C, L0)
          ├── Budget (RUNTIME-012, Level C, L0)
          └── Audit (RUNTIME-013, Level C, L0)
```

## Runtime Status

| ID | Runtime | Parent | Unit | Level | Version | Health | Maturity | Directive | Contract | Playbook | Metrics | Capability | Mission Types |
|----|---------|--------|------|-------|---------|--------|----------|-----------|----------|----------|---------|-----------|---------------|
| RUNTIME-001 | CEO | Founder | Executive | A | 1.0.0 | Healthy | L2 | ✅ | ✅ | ✅ | ✅ | ✅ | strategy, delegation, review |
| RUNTIME-002 | CTO | CEO | Engineering | B | 1.2.0 | Healthy | L2 | ✅ | ✅ | ✅ | ✅ | ✅ | code, architecture, devops |
| RUNTIME-003 | COO | CEO | Operations | B | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | inventory, sales, ops |
| RUNTIME-004 | CFO | CEO | Finance | B | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | budget, accounting, audit |
| RUNTIME-005 | QA | CTO | Engineering | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | testing, verification |
| RUNTIME-006 | DevOps | CTO | Engineering | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | deploy, ci_cd, pipeline |
| RUNTIME-007 | Research | CTO | Engineering | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | analysis, investigation |
| RUNTIME-008 | Inventory | COO | Operations | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | inventory_management |
| RUNTIME-009 | Sales | COO | Operations | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | sales_tracking |
| RUNTIME-010 | Warehouse | COO | Operations | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | warehouse_logistics |
| RUNTIME-011 | Accounting | CFO | Finance | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | accounting_transactions |
| RUNTIME-012 | Budget | CFO | Finance | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | budget_planning |
| RUNTIME-013 | Audit | CFO | Finance | C | — | Planned | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 | audit_review |

## Health States

| State | Meaning |
|-------|---------|
| **Healthy** | Operational, all kernel services accessible |
| **Busy** | Currently executing missions — accepts queued tasks |
| **Waiting** | Awaiting input or approval — cannot accept new tasks |
| **Offline** | Not operational |
| **Maintenance** | Upgrading, no task acceptance |
| **Planned** | Registered but not yet activated |

## Legend

- **Level A**: Executive. CEO only. Can delegate to B.
- **Level B**: Director. CTO, COO, CFO. Can delegate to C.
- **Level C**: Operator. Executes tasks. Cannot delegate.
- **Maturity**: L0=Identity, L1=Governed, L2=Operational, L3=Observable, L4=Learning, L5=Autonomous
- **Runtime ID**: Permanent identifier — never changes even if name/alias changes
