---
id: trust-policy-v1
title: Trust Policy
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
  - verification-policy-v1
tags: [foundation, policy, trust, reputation, scoring]
purpose: |
  Defines trust scoring rules for the Trust Engine.
  Dimension weights, initial scores, decay, recovery,
  evidence weighting, and consistency factors.
---

# Trust Policy

## Dimension Weights

How trust score is calculated from dimensions.

| Dimension | Weight | Description |
|-----------|--------|-------------|
| `technicalAccuracy` | 0.30 | Code quality, bug rate |
| `deploymentReliability` | 0.25 | Deployment success rate |
| `proposalQuality` | 0.20 | Proposal acceptance rate |
| `securityCompliance` | 0.15 | Policy violations |
| `communication` | 0.05 | Collaboration quality |
| `responseTime` | 0.05 | Speed rating |

## Initial Scores

Baseline trust for new Runtimes.

| Dimension | Score |
|-----------|-------|
| `technicalAccuracy` | 85 |
| `deploymentReliability` | 85 |
| `proposalQuality` | 85 |
| `communication` | 85 |
| `securityCompliance` | 100 |
| `responseTime` | 80 |

## Thresholds

| Score Range | Trust Level | Behavior |
|------------|-------------|----------|
| 90+ | Trusted | Full autonomy. No additional evidence required. |
| 70-89 | Reliable | Monitor but allow. Standard evidence rules apply. |
| 50-69 | Watch | Require additional evidence for all actions. |
| Below 50 | Untrusted | Block all actions. Escalate to CEO/Founder. |

## Decay Rules

| Event | Score Change |
|-------|-------------|
| Task failure | -2 on `technicalAccuracy` |
| Deployment failure | -5 on `deploymentReliability` |
| Proposal rejected | -3 on `proposalQuality` |
| Security violation | -10 on `securityCompliance` |
| No activity for 7 days | -1 on `responseTime` per day |
| Maximum decay per event | Score may not drop below 10 |

## Recovery Rules

| Event | Score Change |
|-------|-------------|
| Task completed successfully | +1 on `technicalAccuracy` (max 95) |
| Deployment successful | +2 on `deploymentReliability` (max 95) |
| Proposal accepted | +2 on `proposalQuality` (max 95) |
| Evidence validated by Founder | +3 on all dimensions (max 95) |
| Maximum recovery per event | Score may not exceed 100 |

## Evidence Weighting

| Evidence Type | Weight |
|--------------|--------|
| Tool output (direct) | 0.40 |
| Reflection report | 0.25 |
| Journal (execution history) | 0.20 |
| Mission completion | 0.10 |
| Founder feedback | 0.05 |

## Consistency Factor

How much a Runtime's decisions vary.

| Variance | Description |
|----------|-------------|
| 0% | Perfectly consistent (unrealistic — may indicate rigidity) |
| 1-10% | Healthy consistency — trusted |
| 11-25% | Moderate variance — acceptable with explanation |
| 26-50% | High variance — flag for review |
| 50%+ | Erratic — untrusted |

## History Window

Trust scores calculated over a rolling window.

| Parameter | Value |
|-----------|-------|
| Window size | 20 events |
| Oldest event aged out | After 21st event |
| Minimum events for score | 3 |

---

*This policy follows Foundation Canonical Specification v1.0. Changes require ADR.*
