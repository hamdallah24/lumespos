# ADR-006: Governance Ownership

**Status:** Accepted
**Date:** 2026-07-13
**Owner:** Chief Runtime Engineer

## Context
Two governance directories: `governance/` (organization governance, 20 files) and `runtime-governance/` (runtime governance, 17 files). Name collisions on `PolicyEngine` and `GovernanceReport`.

## Problem
Without clear boundary, governance concerns leak between runtime and organization layers.

## Decision
Runtime Governance (EIOS runtime-governance/) owns: runtime lifecycle validation, registry integrity, dependency validation, manifest validation, policy structural integrity, event wiring integrity, capability integrity, runtime self-healing. Organization Governance (World A governance/) owns: business policies, executive performance, quality metrics, risk assessment, compliance rules, improvement plans, permissions, approval chains.

Boundary: runtime-governance validates HOW the infrastructure runs; governance validates WHAT the organization does.

## Alternatives Considered
- Merge into single governance: Different concerns (infrastructure vs business). Would create coupling.
- Make governance/ extend runtime-governance/: Inheritance mismatch. Rejected.

## Consequences
- Root `PolicyEngine` renamed to `OrgPolicyEngine` to resolve collision
- `GovernanceReport` name collision documented (no actual conflict — different packages)
- Both governance systems coexist with clear boundary
