---
id: adr-013-founder-sovereignty-v1
title: ADR-013 — Founder Sovereignty Layer (Sprint 6)
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
review_trigger:
  - OnPolicyChange
knowledge_level: governing
context_priority: critical
depends_on: []
referenced_by: []
consumers:
  - CTO, Founder
loading_strategy: on-demand
tags:
  - adr, sprint-6, governance, sovereignty
purpose: |
  Sprint 6: Founder Sovereignty Layer — 6 governance/security components,
  4 Engineering Laws. No AI agent may modify the Engineering OS without
  Founder approval.
---

# ADR-013: Founder Sovereignty Layer

## Context

Milestones 1-3 built capability. The system now has 16 runtime components, observability, health monitoring, and circuit breakers. But nothing prevents an AI agent from modifying the Engineering OS without approval. A governance gap exists between capability and control.

## Decisions

### 6 Governance/Security Components

1. **Authority Gate** — proposals auto-reject if critical risk without founder flag, PENDING if requires founder, auto-approve low/medium non-Foundation. No execution without gate pass.

2. **Constitutional Validator** — checks every proposal against CONSTITUTION.md, North Star, and governance rules. 5 constitutional rules enforced programmatically.

3. **Proposal Ledger** — immutable audit trail. 1000 entries, queryable by author/type. Every proposal recorded with decision + timestamp.

4. **Evolution Budget** — rate limits agent proposals per type per week. Architecture: 3, Knowledge: 10, Governance: 2, Security: 2, Code: 5.

5. **Classification System** — 5-level security: PUBLIC → INTERNAL → CONFIDENTIAL → SECRET → FOUNDER_ONLY. Pattern-based auto-classification on content.

6. **LLM Provider** — abstraction layer. `deepseekProvider` is the default. `setProvider()` swaps the active LLM without changing business logic.

### 4 Engineering Laws

Law #002-#005 added to CONSTITUTION.md:
- #002: Founder Sovereignty — no permanent modification without approval
- #003: External Model Neutrality — LLMs recommend, never define Foundation
- #004: Evidence Before Evolution — verifiable evidence required
- #005: Human Override — every workflow must have a kill switch

## Status

Accepted and implemented in Sprint 6 (`ab69d636`). 16+6=22 registered components.
