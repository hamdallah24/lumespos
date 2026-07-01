---
id: runtime-organization-standard-v1
title: Runtime Organization Standard
domain: governance
artifact_type: standard
owner: Founder & CTO
status: Active
version: 1.0.0
stability: locked
last_updated: 2026-07-01
knowledge_level: governing
context_priority: critical
loading_strategy: always
depends_on:
  - founder-philosophy-v1
  - founder-covenant-v1
  - constitution-v1
referenced_by:
  - cto-directive-v1
  - ceo-directive-v1
consumers:
  - All Runtimes
  - CEO
  - CTO
  - Organization Graph
tags: [governance, standard, runtime, lifecycle, mandatory]
purpose: |
  Defines the standard lifecycle and documentation requirements for every Runtime
  in the Engineering OS. Six layers: Identity → Governance → Capability →
  Operation → Observation → Evolution. Every Runtime must follow this standard.
---

# Runtime Organization Standard

## Purpose

Every Runtime in the Engineering OS — present and future — must follow this standard. It defines the lifecycle, documentation requirements, maturity model, and organizational structure for every Runtime.

## 6-Layer Lifecycle

```
IDENTITY        ← Directive + Contract ("Who am I?")
    ↓
GOVERNANCE      ← Policies, Scope, Trust ("What rules do I follow?")
    ↓
CAPABILITY      ← Tools, Authority, Delegation, Knowledge Scope ("What can I do?")
    ↓
OPERATION       ← Playbook, Session Boot, Task Lifecycle ("How do I work?")
    ↓
OBSERVATION     ← Metrics, Health, Trust, Mission Status, Current Load, Evidence Links
    ↓
EVOLUTION       ← Reflection, Knowledge Evolution, ADR, Playbook Update
```

---

## Layer 1 — Identity

Answers: **"Who am I?"**

### Required Documents:
- **Executive Directive** — `foundation/{RUNTIME}_EXECUTIVE_DIRECTIVE.md`
- **Program Contract** — `workspace/contracts/{RUNTIME}_PROGRAM_CONTRACT.md`

### Required Fields in Executive Directive:
- Mission statement
- Authority level (A/B/C — see below)
- Reports To
- Delegates To
- Forbidden actions
- Kernel services used

### Authority Levels:
| Level | Meaning |
|-------|---------|
| A | Executive — can delegate to B-level. Runtime: CEO only. |
| B | Director — can delegate to C-level. Runtime: CTO, COO, CFO. |
| C | Operator — executes tasks. Cannot delegate. Runtime: QA, DevOps, Research. |

---

## Layer 2 — Governance

Answers: **"What rules do I follow?"**

### Required:
- Policy compliance
- Authorization scope
- Mission scope
- Trust boundary
- Decision authority

### Extension Rule:
> Lower-level documents may extend higher-level documents. Lower-level documents may never weaken higher-level documents.

Example: A Playbook may add detail to a Directive, but may not contradict it.

---

## Layer 3 — Capability

Answers: **"What can I do?"**

### Required:
- Supported tasks (what this Runtime can execute)
- Tool access (which kernel tools are available)
- Knowledge scope (which knowledge domains accessible)
- Memory scope (session, project, or organization)
- Delegation rules (who can be delegated to)

---

## Layer 4 — Operation

Answers: **"How do I work?"**

### Required Documents:
- **Playbook** — `playbooks/{RUNTIME}_PLAYBOOK.md`

### Required Sections:
1. Session Boot Protocol — reading order, context loading, startup checklist
2. Task Execution Lifecycle — from receipt to completion
3. Output Templates — standard formats for reports, proposals, ADRs
4. Escalation Rules — when to seek Founder or CEO approval
5. Handoff Protocol — format for delegating to other Runtimes

---

## Layer 5 — Observation

Answers: **"How am I evaluated?"**

### Required Documents:
- **Metrics** — `runtime/metrics/{RUNTIME}_METRICS.md`

### Required Metrics:
- Task completion rate
- Decision accuracy (via Reflection)
- Response time
- Trust score
- Mission success rate
- Health status
- Evidence links (recent decisions with proof)

---

## Layer 6 — Evolution

Answers: **"How do I improve?"**

### Required:
- Reflection reports
- Knowledge evolution proposals
- ADRs for significant decisions
- Playbook updates
- Lessons learned catalog

---

## Runtime Maturity Model

| Level | Name | Requirements |
|-------|------|-------------|
| **L0** | Identity | Directive + Contract exist |
| **L1** | Governed | Policy + Scope defined |
| **L2** | Operational | Playbook + Session Boot |
| **L3** | Observable | Metrics + Health tracking |
| **L4** | Learning | Reflection + ADR + Evolution |
| **L5** | Autonomous | Self-improving, evidence-driven, Founder-verified |

---

## Runtime Registry Format

Every Runtime must be registered in `runtime/registry/RUNTIME_REGISTRY.md`:

| Runtime | Parent | Unit | Level | Delegates | Maturity |
|---------|--------|------|-------|-----------|----------|

## New Runtime Checklist

When onboarding a new Runtime, complete all items:

- [ ] Executive Directive created
- [ ] Program Contract created
- [ ] Playbook created (can start as "Planned")
- [ ] Metrics document created (can start as "Planned")
- [ ] Registered in RUNTIME_REGISTRY.md
- [ ] PROJECT_CONTEXT.md updated
- [ ] FOUNDATION_INDEX.md updated

---

## Current Runtimes

| Runtime | Maturity | Next Action |
|---------|----------|------------|
| CEO | L2 | Playbook + Metrics |
| CTO | L2 | Playbook + Metrics |
| COO | L0 | Directive + Contract |
| CFO | L0 | Directive + Contract |
| QA | L0 | Directive + Contract |
| DevOps | L0 | Directive + Contract |
| Research | L0 | Directive + Contract |
