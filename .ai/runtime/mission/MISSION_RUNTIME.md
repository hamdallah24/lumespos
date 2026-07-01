---
id: mission-runtime-v1
title: Mission Runtime Specification
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
  - organization-runtime-v1
tags: [runtime, mission, spec, foundation-freeze]
purpose: |
  Formal specification for the Mission Runtime.
  Defines mission lifecycle, registry, assignment, delegation,
  completion, reflection, evidence, and archiving.
  No implementation code. Contract only.
---

# Mission Runtime

## Purpose

Track every mission from creation through completion. The Mission Runtime is the "circulatory system" of the AI organization — missions flow through it, from Founder intent to verified completion.

## Mission Lifecycle

```
CREATED → UNDERSTANDING → PLANNING → DELEGATED → RUNNING
         ↓                ↓          ↓           ↓
      WAITING          BLOCKED       ↓        WAITING
         ↓                ↓          ↓           ↓
      CANCELLED       FAILED    REVIEW    ARCHIVED
                                    ↓
                              COMPLETED → ARCHIVED
```

## Mission States

| State | Meaning |
|-------|---------|
| CREATED | Mission registered, not yet started |
| UNDERSTANDING | CEO analyzing intent |
| PLANNING | Decomposing into tasks |
| DELEGATED | Assigned to Runtime |
| RUNNING | Executing |
| WAITING | Awaiting input or approval |
| BLOCKED | Cannot proceed |
| REVIEW | Under evaluation |
| APPROVED | Passed verification |
| COMPLETED | Successfully finished |
| FAILED | Did not achieve objective |
| CANCELLED | Terminated by Founder |
| ARCHIVED | Moved to history |

## Mission Contract

```yaml
mission:
  id: M-{n}
  title: string
  owner: Runtime_ID
  sponsor: Runtime_ID
  priority: normal|high|critical
  runtime_policy: GREETING|KNOWLEDGE|ANALYSIS|DEVOPS|BUSINESS
  
work_packages:
  - id: WP-{n}-{i}
    domain: string
    assigned_to: Runtime_ID
    status: pending|assigned|completed
    
evidence:
  - type: metric|finding|gap
    source: string
    data: object
    
reflection:
  objective_achieved: boolean
  gaps: KnowledgeGap[]
  recommendation: string
```

## Mission Registry

```
Active missions stored in-memory per session.
Completed missions archived with evidence.
Query by: owner, status, priority, Runtime, date range.
```

## Delegation Flow

```
CEO creates Mission
    ↓
Organization Runtime resolves capability
    ↓
Mission assigned to best-fit Runtime
    ↓
Runtime executes work packages
    ↓
QA verifies (if applicable)
    ↓
Reflection evaluates
    ↓
Evidence collected
    ↓
Knowledge Evolution Proposal (if gaps found)
    ↓
Mission completed → archived
```

## Forbidden

- NEVER auto-complete without evidence
- NEVER skip verification
- NEVER override Founder cancellation
