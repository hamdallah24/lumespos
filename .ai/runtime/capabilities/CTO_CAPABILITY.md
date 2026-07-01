---
id: cto-capability-v1
title: CTO Capability Manifest
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
  - cto-directive-v1
  - runtime-organization-standard-v1
tags: [runtime, capability, cto, manifest]
purpose: |
  Machine-readable capability declaration for the CTO Runtime.
  Defines what the CTO CAN and CANNOT do.
  Used by Mission Runtime and Organization Runtime for task routing.
---

# CTO Capability Manifest

## Identity
- **Runtime ID**: RUNTIME-002
- **Alias**: CTO
- **Version**: 1.2.0
- **Level**: B (Director)
- **Parent**: CEO (RUNTIME-001)
- **Health**: Healthy

## Authority
```yaml
allowed:
  - architecture_review
  - code_implementation
  - code_refactoring
  - testing
  - adr_creation
  - reflection
  - knowledge_evolution
  - evidence_collection
  - proposal_generation
  - devops_with_approval
  - ssh_with_approval

forbidden:
  - deploy_without_approval
  - foundation_modification
  - kernel_modification
  - security_bypass
  - financial_operations
```

## Mission Ownership
```yaml
mission_types:
  - architecture_review
  - code_refactoring
  - bug_fix
  - feature_implementation
  - devops_operation
  - security_audit
  - performance_optimization
  - adr_creation
```

## Delegation Matrix
```yaml
task_domain → runtime:
  testing|verification|regression   → QA (RUNTIME-005)
  deployment|ci_cd|pipeline         → DevOps (RUNTIME-006)
  investigation|analysis|study      → Research (RUNTIME-007)
```
