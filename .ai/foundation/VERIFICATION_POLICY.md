---
id: verification-policy-v1
title: Verification Policy
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
  - execution-governance-policy-v1
tags: [foundation, policy, verification, evidence, approval]
purpose: |
  Defines verification rules for the Verification Engine.
  Evidence requirements, domain registry, approval rules,
  confidence calculation, and trust score thresholds.
---

# Verification Policy

## Domain Registry

Valid domains recognized by the system. Any intent outside these domains is treated as `general`.

```
inventory
products
architecture
devops
business
knowledge
general
governance
security
runtime
```

## Confidence Calculation

### Domain Confidence Minimums

| Domain | Minimum Confidence | Reason |
|--------|-------------------|--------|
| `architecture` | 70 | Structural changes need high confidence |
| `devops` | 75 | Server operations need high confidence |
| `security` | 85 | Security changes need very high confidence |
| `governance` | 90 | Governance changes need maximum confidence |
| `inventory` | 60 | Operational changes can proceed with moderate confidence |
| `products` | 60 | Same |
| `business` | 60 | Same |
| `knowledge` | 50 | Knowledge queries can proceed with low confidence |
| `general` | 40 | General queries have lowest barrier |

## Amplification Rules

| Condition | Action |
|-----------|--------|
| Confidence < `stop` gate | Execution blocked. Ask Founder. |
| Confidence < `warn` gate | Proceed with warning logged to journal. |
| Confidence >= `execute` gate | Direct execution, no approval needed. |
| Entity extraction failed | Drop confidence by 10 points. |
| Missing context detected | Drop confidence by 5 points per missing item. |
| Greeting detected | Confidence auto-set to 99, bypass verification. |

## Approval Rules

| Intent | Approval Required |
|--------|------------------|
| `implement_change` touching Foundation | Founder approval required |
| `implement_change` touching Security | Founder approval required |
| `devops_operation` (deploy, restart) | Founder approval required |
| `business_action` (migrate data) | Owner confirmation required |
| `analyze_code` | No approval required |
| `knowledge_query` | No approval required |
| `greeting` | No approval required |

## Evidence Requirements

| Action | Evidence Required |
|--------|------------------|
| `editCode` | File path + code diff |
| `deploy` | Deployment log + success confirmation |
| `ssh` | SSH command + output log |
| `pricing` | Price change reason + audit trail |
| `migrate` | Source + target branch IDs + item counts |

## Trust Score Thresholds

| Threshold | Meaning |
|-----------|---------|
| 90+ | Trusted — full autonomy |
| 70-89 | Reliable — monitor but allow |
| 50-69 | Watch — require additional evidence |
| Below 50 | Untrusted — block all actions, escalate |

---

*This policy follows Foundation Canonical Specification v1.0. Changes require ADR.*
