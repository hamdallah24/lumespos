---
id: mission-standard-v1
title: Mission Standard
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
  - mission-runtime-v1
tags: [runtime, mission, standard, foundation-freeze]
purpose: |
  Standard contract for all Engineering OS missions.
  Every mission must conform to this schema.
---

# Mission Standard

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique mission ID — `M-{n}` |
| `title` | string | Human-readable title |
| `owner` | Runtime_ID | Responsible Runtime (e.g., RUNTIME-002) |
| `sponsor` | Runtime_ID | Who requested (e.g., RUNTIME-001 or Founder) |
| `priority` | normal\|high\|critical | Urgency level |
| `status` | MissionState | Current state |
| `workPackages` | WorkPackage[] | Sub-tasks |
| `evidence` | EvidenceItem[] | Collected proof |
| `reflection` | ReflectionReport | Post-execution evaluation |
| `createdAt` | ISO timestamp | When created |
| `completedAt` | ISO timestamp? | When completed |
| `delegatedTo` | Runtime_ID[] | Runtimes assigned |

## Work Package

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | `WP-{mission}-{index}` |
| `title` | string | Package title |
| `domain` | string | frontend\|backend\|testing\|deploy\|research |
| `assignedTo` | Runtime_ID? | Who took this |
| `status` | pending\|assigned\|in_progress\|completed\|blocked |
| `result` | string? | Output |
| `evidence` | string? | Proof |
| `dependsOn` | string[] | Package IDs that block this |

## Priority Rules

| Priority | SLA | Escalation |
|----------|-----|-----------|
| critical | <5 min | Immediate CEO notification |
| high | <30 min | CEO review at next cycle |
| normal | <4 hours | Standard routing |
