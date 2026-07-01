---
id: mission-lifecycle-v1
title: Mission Lifecycle
domain: runtime
artifact_type: standard
owner: CTO
status: Active
version: 1.0.0
stability: frozen
last_updated: 2026-07-01
review_trigger: Quarterly
knowledge_level: governing
loading_strategy: always
depends_on:
  - mission-standard-v1
tags: [runtime, mission, lifecycle, standard, foundation-freeze]
purpose: |
  Standard lifecycle for every mission in the Engineering OS.
  13 states. Every transition requires evidence.
---

# Mission Lifecycle

## State Machine

```
CREATED ──────────────────────────────────────────────────────┐
    │                                                         │
    ├──► UNDERSTANDING ──► CANCELLED (Founder)                │
    │         │                                                │
    │         └──► WAITING (needs more context)                │
    │                                                         │
    └──► PLANNING ──► BLOCKED (missing capability)            │
              │                                                │
              └──► DELEGATED ──► WAITING (awaiting agent)     │
                        │                                      │
                        └──► RUNNING ──► WAITING (awaiting input)
                              │                                │
                              ├──► FAILED (cannot complete)   │
                              │                                │
                              └──► REVIEW (verify output)      │
                                        │                      │
                                        ├──► APPROVED         │
                                        │        │             │
                                        │        └──► COMPLETED │
                                        │                        │
                                        └──► REJECTED          │
                                                 │              │
                                                 └──► RUNNING  │
                                                              │
                              COMPLETED ──────────────────────┘
                                   │
                              ARCHIVED
```

## Transition Rules

| From | To | Requires |
|------|----|----------|
| CREATED | UNDERSTANDING | CEO intent analysis |
| CREATED | CANCELLED | Founder decision |
| UNDERSTANDING | PLANNING | Work package decomposition |
| UNDERSTANDING | WAITING | Insufficient context |
| PLANNING | DELEGATED | Capability check passed |
| PLANNING | BLOCKED | No capable Runtime found |
| DELEGATED | RUNNING | Runtime accepted |
| DELEGATED | WAITING | Runtime busy |
| RUNNING | REVIEW | Execution complete |
| RUNNING | FAILED | Cannot complete |
| RUNNING | WAITING | Needs additional input |
| REVIEW | APPROVED | Verification passed |
| REVIEW | REJECTED | Verification failed |
| APPROVED | COMPLETED | Final confirmation |
| COMPLETED | ARCHIVED | 30 days elapsed |
| FAILED | ARCHIVED | After reflection recorded |
| CANCELLED | ARCHIVED | After reason documented |

## Evidence Requirements

| Transition | Minimum Evidence |
|-----------|-----------------|
| Any → COMPLETED | Reflection report + Evidence items |
| Any → FAILED | Failure reason + affected work packages |
| RUNNING → REVIEW | All work packages completed |
| REVIEW → APPROVED | QA verification (if applicable) |
