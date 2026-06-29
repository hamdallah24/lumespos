---
id: op-model-v1
title: AI Operating Model
domain: foundation
artifact_type: model
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: mature
last_updated: 2026-06-29
last_reviewed: 2026-06-29
review_trigger:
  - OnArchitectureChange
  - Monthly
knowledge_level: governing
context_priority: high
depends_on:
  - north-star-v1
  - constitution-v1
  - project-context-v1
referenced_by:
  - cto-directive-v1
  - foundation-index-v1
  - all playbooks
  - all runtime specs
consumers:
  - All AI Agents
  - CTO
  - Runtime
  - AgentRouter
  - Planner
loading_strategy: conditional
tags:
  - foundation
  - operating-model
  - execution
  - workflow
  - lifecycle
purpose: |
  Define how AI agents execute work: the lifecycle from task receipt to completion,
  the decision framework, the proposal workflow, and the rules governing all agent behavior.
  This is the operating system for the agents — not just documentation.
---

# AI Operating Model

## 1. Why I Exist

Principles are useless without execution. The CONSTITUTION defines *what* agents must uphold. This document defines *how* they do it — the lifecycle, the decision tree, the proposal workflow, and the exit criteria for every task type.

## 2. Who Uses Me

Every AI agent reads this document before executing any task. The Runtime orchestrator implements this lifecycle. The Planner uses this decision framework.

## 3. Who Depends On Me

| Consumer | Why |
|----------|-----|
| **CTO_EXECUTION_DIRECTIVE** | Must operate within this model |
| **All Playbooks** | Must follow the lifecycle defined here |
| **Runtime specs** | Must implement the workflows defined here |

## 4. What Happens if I Change

A change to the Operating Model triggers:
- Review of all playbooks for updated workflows
- Review of CTO_EXECUTION_DIRECTIVE for constraint changes
- Review of Runtime specs for implementation updates

## 5. What Is Not My Responsibility

- I do not define specific agent missions. That belongs to individual directives.
- I do not define coding standards. That belongs to STANDARDS.
- I do not define architecture decisions. That belongs to ADRs.
- I do not define tool implementations. That belongs to SYSTEMS and RUNTIME.

---

## Agent Execution Lifecycle

Every agent task follows this lifecycle. No task skips stages without explicit Founder approval.

```
┌─────────────────────────────────────────────────────┐
│                  TASK RECEIVED                       │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STAGE 1: Context Loading                             │
│ • Read Foundation (always)                           │
│ • Read relevant domain docs (conditional)             │
│ • Load task-specific context from repo               │
│ • Check shared context for agent-to-agent notes       │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STAGE 2: Analysis                                    │
│ • Understand the request                             │
│ • Identify affected Knowledge Assets                 │
│ • Determine required tools (READ_TOOLS vs DEVOPS)    │
│ • Detect if this is a simple or complex task          │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STAGE 3: Planning                                    │
│ • For simple tasks: direct response                  │
│ • For complex tasks: create proposal in WORKSPACE     │
│ • State confidence level                             │
│ • Identify what is known vs unknown                  │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STAGE 4: Proposal (if complex)                       │
│ • Describe the change                                │
│ • List affected assets                               │
│ • Provide rationale linked to Foundation              │
│ • Submit for approval                                │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STAGE 5: Execution (after approval)                  │
│ • Implement the change                               │
│ • Run validation                                     │
│ • Update affected Knowledge Assets                   │
│ • Run Quality Review checklist                       │
└───────────────────────┬─────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STAGE 6: Completion                                  │
│ • Self-review against Definition of Excellence       │
│ • Document what was done and why                     │
│ • Update Knowledge Graph relationships               │
│ • Signal completion to Founder                       │
└─────────────────────────────────────────────────────┘
```

## Decision Framework

When an agent is unsure how to proceed, consult sources in this exact order:

### Primary Sources (systematic)

| Priority | Source | When |
|----------|--------|------|
| 1 | Foundation documents | Always — loaded first |
| 2 | Relevant GOVERNANCE or STANDARDS | Domain-specific tasks |
| 3 | Relevant SPECS or ARCHITECTURE | Technical implementation |
| 4 | Relevant PLAYBOOKS | Operational procedures |
| 5 | Relevant ADRs | Historical decisions |

### Escalation Rules

| Situation | Action |
|-----------|--------|
| Ambiguity exists in Foundation | Escalate to Founder — do not interpret |
| Missing documentation | Create proposal for new Knowledge Asset |
| Conflicting documents | Flag both, report inconsistency, wait for resolution |
| Novel situation with no guidance | Apply Constitution principles, document decision as ADR |

## Proposal Workflow

Any change to `.ai/` structure, Foundation assets, governance, or architecture requires a proposal.

```
1. Create proposal in workspace/proposals/
2. Include: problem, solution, affected assets, rationale, confidence
3. Submit for Founder review
4. Await explicit approval (never assume)
5. After approval: implement, validate, update Knowledge Graph
```

Proposals are not optional. Silent changes to the Engineering OS are prohibited.

## Knowledge Evolution Workflow

```
Code Change
    ↓
Impact Analysis (which Knowledge Assets are affected?)
    ↓
Proposal (if Foundation or Architecture change)
    ↓
Approval
    ↓
Update Knowledge Assets (metadata, content, relationships)
    ↓
Validate (run Quality Review checklist)
    ↓
Commit
    ↓
Knowledge Graph updated
```

## Agent Collaboration Rules

1. **Single Source of Truth**: All agents work from `.ai/`. No agent maintains its own separate knowledge base.
2. **Shared Context**: Agents communicate through `shared_context` database table. Write summaries of important findings.
3. **No Overlap**: Each agent has a defined scope. If scope overlaps, escalate.
4. **Proposal Required**: Cross-agent changes require a proposal with both agents listed as reviewers.

## Exit Criteria per Task Type

| Task Type | Exit Criteria |
|-----------|--------------|
| **Answer question** | Response is complete, accurate, sourced from Foundation or codebase |
| **Fix bug** | Fix verified, tests pass, affected docs updated |
| **Add feature** | Feature works, docs updated, ADR created if architecture changed |
| **Proposal** | All 5 Foundation Asset Rule questions answered, Founder approved |
| **Audit/Review** | Report in WORKSPACE, all findings actionable, confidence stated |

## Confidence Scale

Agents must state confidence on every significant claim:

| Level | Meaning |
|-------|---------|
| **Certain (>95%)** | Verified against source code or Foundation |
| **High (80-95%)** | Strong evidence, minor risk of error |
| **Moderate (60-80%)** | Reasonable inference, some gaps |
| **Low (<60%)** | Significant uncertainty — escalate or research more |
