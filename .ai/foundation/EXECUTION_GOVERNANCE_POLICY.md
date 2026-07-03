---
id: execution-governance-policy-v1
title: Execution Governance Policy
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
  - engineering-os-architecture-v1
tags: [foundation, policy, execution, governance]
purpose: |
  Defines execution governance rules for the Execution Governor.
  Budget allocation, anti-loop thresholds, completion criteria,
  confidence gates, and global safety boundaries.
---

# Execution Governance Policy

## Confidence Gates

Thresholds enforced by Verification Engine and Governor.

| Gate | Value | Description |
|------|-------|-------------|
| `stop` | 40 | Confidence below this → execution blocked. Ask Founder. |
| `warn` | 60 | Confidence below this → proceed with caution logged. |
| `execute` | 80 | Confidence above this → direct execution, no approval needed. |

## Global Safety Budget

Absolute caps. No execution may exceed these limits.

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxTokens` | 80000 | Maximum tokens per execution session |
| `maxTools` | 200 | Maximum tool calls per execution session |
| `maxTimeMs` | 900000 | Maximum time per execution (15 minutes) |
| `maxIdleCycles` | 12 | Maximum cycles without progress before forced stop |

## Execution Budget Matrix

Per-complexity allocation. Governor reads complexity from ExecutionSpec.

| Complexity | maxTokens | maxTools | maxTimeMs | maxIdleCycles |
|-----------|-----------|----------|-----------|---------------|
| `simple` | 5000 | 5 | 30000 | 2 |
| `medium` | 12000 | 20 | 120000 | 4 |
| `complex` | 30000 | 60 | 300000 | 6 |
| `critical` | 60000 | 120 | 600000 | 8 |

## Anti-Loop Policy

| Complexity | Threshold | Description |
|-----------|-----------|-------------|
| `simple` | 3 | After 3 identical consecutive tool calls → force strategy advance |
| `medium` | 4 | Same |
| `complex` | 6 | Same |
| `critical` | 8 | Same |

## Evidence Thresholds

Minimum evidence cycles before marking a goal complete.

| Complexity | Threshold |
|-----------|-----------|
| `simple` | 1 |
| `medium` | 2 |
| `complex` | 3 |
| `critical` | 4 |

## Completion Weights

How completion percentage is calculated.

| Factor | Weight |
|--------|--------|
| `executionProgress` | 0.70 |
| `assignmentProgress` | 0.30 |

## Scheduler Configuration

### Weights

| Factor | Weight |
|--------|--------|
| `currentLoad` | 0.35 |
| `capabilityScore` | 0.25 |
| `latency` | 0.15 |
| `health` | 0.15 |
| `affinity` | 0.10 |

### Constraints

| Parameter | Value |
|-----------|-------|
| `maxLoadBeforeSkip` | 80 |
| `maxQueueDepth` | 10 |

## Task Execution Limits

For task-oriented execution (non-streaming, batch mode).

| Parameter | Value |
|-----------|-------|
| `maxToolCalls` | 15 |
| `maxIterations` | 30 |
| `maxSameAction` | 3 |

---

*This policy follows Foundation Canonical Specification v1.0. Changes require ADR + Founder approval for stability levels locked and above.*
