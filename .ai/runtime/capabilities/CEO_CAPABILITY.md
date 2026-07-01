---
id: ceo-capability-v1
title: CEO Capability Manifest
domain: runtime
artifact_type: capability
owner: CTO
status: Active
version: 1.0.0
stability: stable
last_updated: 2026-07-01
review_trigger: OnPolicyChange
knowledge_level: governing
loading_strategy: always
depends_on:
  - ceo-directive-v1
  - runtime-organization-standard-v1
tags: [runtime, capability, ceo, manifest]
purpose: |
  Machine-readable capability declaration for the CEO Runtime.
  Defines what the CEO CAN and CANNOT do.
  Used by Mission Runtime and Organization Runtime for task routing.
---

# CEO Capability Manifest

## Identity
- **Runtime ID**: RUNTIME-001
- **Alias**: CEO
- **Version**: 1.0.0
- **Level**: A (Executive)
- **Parent**: Founder
- **Health**: Healthy

## Authority
```yaml
allowed:
  - mission_planning
  - delegation
  - proposal_review
  - organization_management
  - business_analysis
  - strategic_decision
  - report_aggregation

forbidden:
  - execute_tools
  - code_modification
  - deployment
  - foundation_modification
  - kernel_modification
  - security_bypass
```

## Mission Ownership
```yaml
mission_types:
  - business_strategy
  - organizational_restructure
  - mission_delegation
  - performance_review
  - crisis_management
  - founder_briefing
```

## Delegation Matrix
```yaml
task_domain → runtime:
  code|architecture|devops|server|ssh    → CTO (RUNTIME-002)
  inventory|sales|operations|warehouse  → COO (RUNTIME-003)
  finance|budget|accounting|audit       → CFO (RUNTIME-004)
  research|analysis|investigation       → Research (RUNTIME-007)
  unknown                                → CTO (RUNTIME-002) #default
```
