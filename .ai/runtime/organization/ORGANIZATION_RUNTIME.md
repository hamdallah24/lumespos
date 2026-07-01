---
id: organization-runtime-v1
title: Organization Runtime Specification
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
  - runtime-organization-standard-v1
  - foundation-governance-hierarchy-v1
tags: [runtime, organization, spec, foundation-freeze]
purpose: |
  Formal specification for the Organization Runtime.
  Defines Runtime discovery, delegation engine, health aggregation,
  capability resolution, and relationship management.
  No implementation code. Contract only.
---

# Organization Runtime

## Purpose

Maintain the organization graph, resolve capabilities, aggregate health, and route delegation between Runtimes. The Organization Runtime is the "nervous system" of the AI organization.

## Responsibilities

| Responsibility | Detail |
|---------------|--------|
| **Runtime Discovery** | Read `RUNTIME_REGISTRY.md` to build the dynamic organization tree |
| **Delegation Engine** | Route tasks by matching domain keywords to Runtime capabilities |
| **Health Aggregation** | Collect health status from all Runtimes, report to CEO |
| **Capability Resolution** | Answer "who can do X?" by querying capability manifests |
| **Relationship Management** | Maintain parent/child/delegate relationships from the Registry |
| **Reports To Founder** | All organization-level changes escalate through CEO |

## Runtime Discovery

```
RUNTIME_REGISTRY.md
    ↓ Parse table rows
    ↓ Build in-memory Organization Graph
    ↓ Map Runtime IDs → Identity + Capability + Health + Missions
    ↓ Expose via query API
```

## Delegation Engine

```
Task received (from CEO or direct)
    ↓
Match task keywords → Runtime capabilities
    ↓
Check Runtime health (skip offline/busy)
    ↓
Check Runtime maturity (L2+ can be delegated to)
    ↓
Route task to best match
    ↓
Log delegation to Mission Runtime
```

## Delegation Rules

| Task Domain | Runtime | Health Check |
|-------------|---------|-------------|
| code, bug, deploy, ssh | CTO (RUNTIME-002) | Must be Healthy |
| inventory, sales, ops | COO (RUNTIME-003) | L2+ only |
| finance, budget | CFO (RUNTIME-004) | L2+ only |
| testing, verification | QA (RUNTIME-005) | Must be Healthy |
| research, analysis | Research (RUNTIME-007) | Must be Healthy |
| unknown | CTO (RUNTIME-002) | Default |

## Health Aggregation

```
For each Runtime in Registry:
    Check health state (Healthy/Busy/Waiting/Offline)
    Aggregate maturity level
    Report to CEO Runtime
    Update Executive Workspace
```

## Forbidden

- NEVER execute tools
- NEVER modify code
- NEVER override CEO authority
- NEVER modify the Foundation
