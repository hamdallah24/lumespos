# ADR-008: Governance Layer

**Status:** ACCEPTED
**Date:** ECP-045–ECP-046
**Supersedes:** No governance system

## Context

After building Execution, Organization, Learning, and Collective Intelligence layers, the organization needed a self-governing layer that audits, evaluates, and improves itself.

## Decision

| Layer | ECP | Modules |
|-------|-----|---------|
| Collective Intelligence | ECP-045 | ConsensusEngine, KnowledgeFusion, ExecutiveReputation, DecisionHistory, CrossExecutiveLearning, OrganizationIntelligence |
| Governance | ECP-046 | GovernanceEngine, ArchitectureAuditor, ExecutiveAuditor, QualityEngine, PolicyEngine, ImprovementEngine, RiskEngine, ComplianceEngine |

## Rules

1. `GovernanceEngine.audit()` is the **single** governance orchestrator
2. `PolicyEngine` is the **single** policy source — no magic numbers
3. All audit, quality, risk, and improvement decisions flow through Governance Engine
4. Governance sits **above** all other layers — audits downward

## Dependencies

Governance → Collective Intelligence → Learning → Organization → Execution → LLM → Tools

## Violations

Hardcoded thresholds outside `policy-engine.ts` = Architecture Compliance FAIL.
