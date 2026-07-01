---
id: foundation-index-v1
title: Foundation Index
domain: foundation
artifact_type: index
owner: CTO
status: Active
version: 1.1.0
stability: locked
maturity: mature
last_updated: 2026-06-30
last_reviewed: 2026-06-30
review_trigger:
  - OnFoundationChange
  - Quarterly
knowledge_level: foundational
context_priority: critical
depends_on:
  - founder-philosophy-v1
  - founder-covenant-v1
  - north-star-v1
  - constitution-v1
  - project-context-v1
  - op-model-v1
  - cto-directive-v1
referenced_by:
  - readme-v1
  - cto-directive-v1
consumers:
  - All AI Agents
  - ContextEngine
  - MemoryEngine
loading_strategy: always
tags:
  - foundation
  - index
  - onboarding
  - meta-document
purpose: |
  Explain the relationship between all Foundation Knowledge Assets.
  Current: Engineering OS v1.0 FROZEN. Phase 2 Programs active.
  Mission Runtime (MOAO), Organization Graph, CEO+CTO Programs on kernel.
---

# Foundation Index

## Reading Order

For new agents and humans — read in this order:

```
1. README.md         ← Entry point — understand what .ai/ is
2. NORTH_STAR.md     ← Root — understand why we exist
3. CONSTITUTION.md   ← Principles — understand how to think
4. PROJECT_CONTEXT.md ← State — understand where we are now
5. AI_OPERATING_MODEL ← Execution — understand how to work
6. CTO_EXECUTION_DIRECTIVE ← Contract — understand CTO's role
```

## Knowledge Graph

```
NORTH_STAR (vision)
    │ governs
    ↓
CONSTITUTION (principles)
    │ governs
    ↓
PROJECT_CONTEXT (current state)
    │ depends_on
    ↓
AI_OPERATING_MODEL (execution)
    │ governs
    ↓
CTO_EXECUTION_DIRECTIVE (contract)
    │
    ├── implements → RUNTIME
    ├── references → PLAYBOOKS
    └── cataloged → CATALOG
```

## Current State

Engineering OS v1.0 kernel FROZEN as of June 30, 2026:
- **46 components** registered, 7-layer certification PASS
- **3 Programs** on kernel: CEO Runtime (A), CTO Runtime (B), Mission Runtime
- **Organization Graph**: 13 runtimes in RUNTIME_REGISTRY.md, 3 active (Level A: CEO, Level B: CTO, COO)
- **9 Engineering Laws**, 19 ADRs, 16.5 sprints completed
- **Foundation Governance Hierarchy**: 11-level priority chain with Extension Rule
- **Runtime Organization Standard**: 6-layer lifecycle, L0-L5 maturity model

## Document Summaries

### FOUNDER_PHILOSOPHY.md — `founder-philosophy-v1`
**What:** The Root Foundation — 8 immutable principles, decision matrix, Foundation hierarchy.
**When to read:** Before everything else. This is the root of all Engineering OS decisions.
**Stability:** Immutable. Only Founder may modify.
**Keywords:** root, immutable, philosophy, principles, legacy

### FOUNDER_COVENANT.md — `founder-covenant-v1`
**What:** The Immutable Promise — 8 Covenants, "what promises shall never be broken."
**When to read:** After Philosophy, before North Star. Every proposal must pass Covenant check.
**Stability:** Immutable. Only Founder may modify.
**Keywords:** covenant, promise, immutable, humanity, governance

### NORTH_STAR.md — `north-star-v1`
**What:** The permanent, unchanging mission. Why Lume's exists.
**When to read:** First, before anything else.
**Stability:** Locked. Changes require Founder + annual review.
**Keywords:** vision, mission, founding, immutable

### CONSTITUTION.md — `constitution-v1`
**What:** Governing principles and rules for all AI agents. 10 chapters covering values, engineering ethics, decision framework, and behavior.
**When to read:** After North Star. Before any task.
**Stability:** Locked. Changes require Founder.
**Keywords:** principles, governance, ethics, law

### PROJECT_CONTEXT.md — `project-context-v1`
**What:** Current operational state: active sprint, priorities, known challenges, tech direction, agent inventory.
**When to read:** After Constitution. Updated as project evolves.
**Stability:** Stable. Changes with project progress.
**Keywords:** context, status, sprint, roadmap, current

### AI_OPERATING_MODEL.md — `op-model-v1`
**What:** How agents execute work: lifecycle, decision framework, proposal workflow, exit criteria, confidence scale.
**When to read:** After understanding the current state. Before executing any task.
**Stability:** Stable. Changes on architecture update.
**Keywords:** execution, workflow, lifecycle, proposal, decision

### CTO_EXECUTION_DIRECTIVE.md — `cto-directive-v1`
**What:** CTO's contract: mission, authority boundaries, output formats, constraints, success metrics.
**When to read:** Only if you are the CTO Agent. Others: reference only.
**Stability:** Stable. Changes on policy update.
**Keywords:** cto, directive, authority, contract, constraints

### CEO_EXECUTION_DIRECTIVE.md — `ceo-directive-v1`
**What:** CEO's contract: Strategic Director. Delegates to CTO/COO/CFO. Never executes tools.
**When to read:** Only if you are the CEO Agent. Others: reference only.
**Stability:** Stable. Changes on policy update.
**Keywords:** ceo, directive, authority, delegation, strategic

## Foundation Lifecycle

```
v1.0    ← Current (June 2026)
    ↓
v1.1    ← Minor update (new constraint, updated context)
    ↓
v2.0    ← Major revision (new document, restructured relationships)
```

All Foundation changes must follow the Proposal Workflow (AI_OPERATING_MODEL.md). No file moves without migration plan. No deletes without deprecation period.

## Consumer Impact Map

| Change in... | Review required in... |
|-------------|----------------------|
| NORTH_STAR | CONSTITUTION, PROJECT_CONTEXT, OP_MODEL, CTO_DIRECTIVE |
| CONSTITUTION | PROJECT_CONTEXT, OP_MODEL, CTO_DIRECTIVE, all playbooks |
| PROJECT_CONTEXT | CTO_DIRECTIVE, ROADMAP |
| OP_MODEL | CTO_DIRECTIVE, all playbooks, all runtime specs |
| CTO_DIRECTIVE | (self-contained — impacts only CTO) |
