---
id: organization-graph-v1
title: Organization Graph
domain: runtime
artifact_type: spec
owner: CTO
status: Active
version: 1.0.0
stability: frozen
last_updated: 2026-07-01
review_trigger: Quarterly
knowledge_level: governing
loading_strategy: always
depends_on:
  - runtime-registry-v1
  - organization-runtime-v1
tags: [runtime, organization, graph, spec, foundation-freeze]
purpose: |
  Formal Organization Graph — runtime relationships, hierarchy, and delegation chain.
  Derived from RUNTIME_REGISTRY.md. Used by Organization Runtime and Executive Workspace.
---

# Organization Graph

## Structure

```
Founder
  │
  CEO (RUNTIME-001, Level A, L2)
  │
  ├── CTO (RUNTIME-002, Level B, L2)
  │   ├── QA (RUNTIME-005, Level C, L0)
  │   ├── DevOps (RUNTIME-006, Level C, L0)
  │   └── Research (RUNTIME-007, Level C, L0)
  │
  ├── COO (RUNTIME-003, Level B, L0)
  │   ├── Inventory (RUNTIME-008, Level C, L0)
  │   ├── Sales (RUNTIME-009, Level C, L0)
  │   └── Warehouse (RUNTIME-010, Level C, L0)
  │
  ├── CFO (RUNTIME-004, Level B, L0)
  │   ├── Accounting (RUNTIME-011, Level C, L0)
  │   ├── Budget (RUNTIME-012, Level C, L0)
  │   └── Audit (RUNTIME-013, Level C, L0)
  │
  └── [Organization Runtime] — manages the graph
      └── [Mission Runtime] — tracks all missions
```

## Graph Properties

| Property | Value |
|----------|-------|
| Total Runtimes | 13 |
| Active (Healthy) | 2 (CEO, CTO) |
| Planned | 11 |
| Max Depth | 4 (Founder → CEO → CTO → QA) |
| Level A | 1 (CEO) |
| Level B | 3 (CTO, COO, CFO) |
| Level C | 9 |

## Chain of Command

```
CEO → CTO → QA    (task: test_verification)
CEO → CTO → DevOps  (task: deploy_production)
CEO → COO → Inventory (task: stock_audit)
CEO → CFO → Accounting (task: report_generation)
```

## Runtime Dependencies

| Runtime | Kernel Services Used |
|---------|---------------------|
| CEO | 6 (Organization, Trust, Identity, Semantic, ExecutionSpec, Reflection) |
| CTO | 11 (Planner, Knowledge, Semantic, Context, Prompt, LLM, Reflection, Evidence, org, identity, auth) |
| COO | 4 (Semantic, Knowledge, Reflection, Evidence) |
