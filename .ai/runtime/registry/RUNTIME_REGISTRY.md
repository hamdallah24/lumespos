---
id: runtime-registry-v1
title: Runtime Registry
domain: runtime
artifact_type: registry
owner: CTO
status: Active
version: 1.0.0
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
  Defines organizational structure, maturity, and status of each Runtime.
  Used by Executive Workspace for dynamic org charts.
---

# Runtime Registry

## Organization Tree

```
Founder
  └── CEO (Executive, L2)
      ├── CTO (Engineering, L2)
      │   ├── QA (L0)
      │   ├── DevOps (L0)
      │   └── Research (L0)
      ├── COO (Operations, L0)
      │   ├── Inventory (L0)
      │   ├── Sales (L0)
      │   └── Warehouse (L0)
      └── CFO (Finance, L0)
          ├── Accounting (L0)
          ├── Budget (L0)
          └── Audit (L0)
```

## Runtime Status

| Runtime | Parent | Unit | Level | Delegates | Maturity | Directive | Contract | Playbook | Metrics | Active |
|---------|--------|------|-------|-----------|----------|-----------|----------|----------|---------|--------|
| CEO | Founder | Executive | A | CTO,COO,CFO | L2 | ✅ | ✅ | ✅ | Planned | ✅ |
| CTO | CEO | Engineering | B | QA,DevOps,Research | L2 | ✅ | ✅ | ✅ | ✅ | ✅ |
| COO | CEO | Operations | B | Inventory,Sales,Warehouse | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| CFO | CEO | Finance | B | Accounting,Budget,Audit | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| QA | CTO | Engineering | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| DevOps | CTO | Engineering | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Research | CTO | Engineering | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Inventory | COO | Operations | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Sales | COO | Operations | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Warehouse | COO | Operations | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Accounting | CFO | Finance | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Budget | CFO | Finance | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |
| Audit | CFO | Finance | C | — | L0 | ❌ | ❌ | ❌ | ❌ | 🟡 |

## Legend

- **Level A**: Executive. CEO only. Can delegate to B.
- **Level B**: Director. CTO, COO, CFO. Can delegate to C.
- **Level C**: Operator. Executes tasks. Cannot delegate.
- **Maturity**: L0=Identity, L1=Governed, L2=Operational, L3=Observable, L4=Learning, L5=Autonomous
