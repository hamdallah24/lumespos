# Foundation Specification — v1.0.0 (LOCKED)

---
status: Active
owner: Founder & CTO
version: 1.0.0
last_updated: 2026-06-29
reviewed_by: Founder
approved_by: Founder
---

## Amendment Log

| Version | Date | Change |
|---------|------|--------|
| 0.1.0 | 2026-06-29 | Initial Foundation Specification |
| 0.2.0 | 2026-06-29 | Phase 2.5 — Metadata upgraded to Knowledge Asset Metadata |
| 1.0.0 | 2026-06-29 | LOCKED — added GOVERNING level, consumers, loading_strategy, Knowledge Graph terminology, Engineering Law #001 |

---

## Engineering Law #001

> **Every Knowledge Asset must justify its existence.**
>
> If a file cannot answer:
> - Why do I exist?
> - Who uses me?
> - What breaks if I am deleted?
>
> then it does not deserve to exist.

---

## Core Principle

**We are not managing files. We are managing Knowledge Assets.**

Every `.md` file in `.ai/` is a node in the **Engineering Knowledge Graph**. Metadata is the connective tissue that transforms a flat collection of markdown into a navigable, queryable, evolvable knowledge network.

---

## 1. Knowledge Asset Metadata — Engineering OS Standard

Every Knowledge Asset in the Engineering OS must carry this frontmatter:

```yaml
---
# ── Identity ──
id: <unique slug, e.g., "north-star-v1">
title: <human-readable title>
domain: <primary knowledge domain, see §1.1>
artifact_type: <see §1.2>

# ── Governance ──
owner: <role or agent responsible>
status: Draft | Proposal | Approved | Active | Deprecated | Superseded
version: <semver x.y.z>
stability: unstable | stable | locked
maturity: seed | growing | mature | evergreen

# ── Lifecycle ──
last_updated: <ISO date>
last_reviewed: <ISO date>
review_trigger:
  - OnCodeChange | OnArchitectureChange | OnPolicyChange
  - ManualReview
  - Quarterly | BiMonthly | Monthly
  - MajorRelease

# ── Relationships ──
knowledge_level: foundational | governing | canonical | operational | reference | experimental | archived
context_priority: critical | high | normal | low

depends_on:
  - <id of upstream knowledge asset, or []>

referenced_by:
  - <id of downstream knowledge asset>

consumers:
  - <agent or engine that reads this asset>
  - <e.g., CTO, COO, ContextEngine, MemoryEngine>

# ── Execution ──
loading_strategy: always | conditional | on-demand | manual

# ── Discovery ──
tags:
  - <lowercase, kebab-case>
  - <domain-specific>

purpose: |
  <1-3 sentence statement of why this knowledge asset exists>
---
```

### 1.1 Domain Taxonomy

| Domain | Scope |
|--------|-------|
| `foundation` | North Star, Constitution, Project Context, Operating Model, Directive |
| `governance` | Policies, standards, rules, compliance |
| `architecture` | System design, component maps, data flow |
| `systems` | Engine blueprints (knowledge, context, memory, planning) |
| `runtime` | Execution flow, agent registry, context loading |
| `specs` | Technical specifications, contracts, schemas |
| `playbook` | Operational workflows, how-to guides |
| `adr` | Architecture decision records |
| `knowledge` | Lessons learned, patterns, research |
| `catalog` | Indexes: agents, tools, prompts, models, services |
| `workspace` | Audits, proposals, reviews, experiments |
| `meta` | Templates, migration tracking, system health |

### 1.2 Artifact Type Taxonomy

| Type | Description | Example |
|------|-------------|---------|
| `vision` | Long-term direction, immutable mission | NORTH_STAR.md |
| `constitution` | Governing principles and rules | CONSTITUTION.md |
| `context` | Current state of the project | PROJECT_CONTEXT.md |
| `model` | How things work (operating model) | AI_OPERATING_MODEL.md |
| `directive` | Agent-specific contract | CTO_EXECUTION_DIRECTIVE.md |
| `policy` | Rule that must be followed | governance/*.md |
| `standard` | Normative specification | standards/*.md |
| `architecture` | System design document | architecture/*.md |
| `blueprint` | Engine conceptual design | systems/*.md |
| `spec` | Technical contract | specs/*.md |
| `playbook` | Operational workflow | playbooks/*.md |
| `adr` | Architecture decision record | adr/ADR-*.md |
| `pattern` | Reusable knowledge | knowledge/*.md |
| `index` | Catalog / navigation | catalog/*.md, README.md |
| `report` | Audit, review, analysis output | workspace/audits/*.md |
| `proposal` | Change proposal | workspace/proposals/*.md |
| `runtime` | Execution specification | runtime/*.md |

### 1.3 Knowledge Level

| Level | Meaning | Context Loader behavior |
|-------|---------|------------------------|
| `foundational` | Root knowledge — everything depends on this | Always loaded |
| `governing` | Rules that control system behavior (Constitution, policies) | Always loaded |
| `canonical` | Authoritative reference — rarely changes | Loaded when domain is active |
| `operational` | Day-to-day working knowledge | Loaded on task start |
| `reference` | Look-up material — on-demand only | Loaded only when queried |
| `experimental` | Work in progress — not yet trusted | Skipped by default |
| `archived` | Historical record — preserved, not active | Never loaded (except audits) |

Example mapping:
```
foundational: NORTH_STAR
governing:    CONSTITUTION
canonical:    PROJECT_CONTEXT, AI_OPERATING_MODEL, CTO_EXECUTION_DIRECTIVE
operational:  PLAYBOOK/*
reference:    ADR/*, SPECS/*
```

### 1.4 Review Trigger (replaces review_cycle)

| Trigger | Description |
|---------|-------------|
| `OnCodeChange` | Review when related source code changes |
| `OnArchitectureChange` | Review when architecture documents change |
| `OnPolicyChange` | Review when governance changes |
| `ManualReview` | Human-initiated review |
| `Quarterly` | Scheduled quarterly review |
| `BiMonthly` | Every 2 months |
| `Monthly` | Every month |
| `MajorRelease` | Review before v2.0, v3.0, etc. |

A Knowledge Asset may have multiple triggers.

### 1.5 Field Rationale (full — 19 fields)

| Field | Why |
|-------|-----|
| `id` | Machine-readable unique identifier — used for cross-reference. Stable across renames. |
| `title` | Human-readable label |
| `domain` | Which knowledge domain this asset belongs to — enables domain-scoped queries |
| `artifact_type` | What kind of asset this is — enables type-filtered operations |
| `owner` | Accountability — who maintains and approves changes |
| `status` | Lifecycle stage — prevents agents from acting on outdated assets |
| `version` | Semver, needed for dependency resolution and rollback |
| `stability` | Whether this asset is safe to depend on (unstable may change anytime) |
| `maturity` | How evolved this asset is — seed assets may have gaps |
| `last_updated` | Stale detection |
| `last_reviewed` | When was this last verified for accuracy |
| `review_trigger` | Event-based triggers replacing static time-based cycles |
| `knowledge_level` | Prioritization for Context Engine token budget management |
| `context_priority` | Within same knowledge_level, which assets are more critical |
| `depends_on` | Upstream dependencies using `id` — what must be loaded first |
| `referenced_by` | Downstream impact using `id` — what breaks if this changes |
| `consumers` | Agents and engines that consume this asset — enables impact analysis |
| `loading_strategy` | Tells Context Engine when/how to load: always | conditional | on-demand | manual |
| `tags` | Free-form discovery markers |
| `purpose` | Every Knowledge Asset must justify its existence |

### 1.6 Loading Strategy

| Strategy | Description |
|----------|-------------|
| `always` | Loaded for every request, every time. For foundational/governing assets. |
| `conditional` | Loaded when the relevant agent or domain is active |
| `on-demand` | Loaded only when explicitly queried by an agent |
| `manual` | Only loaded via explicit human instruction |

### 1.7 Validation Rules

1. Every `.md` file in `.ai/` MUST have Knowledge Asset frontmatter.
2. `id` must be unique across the entire `.ai/` directory.
3. `status` must be one of the defined enum values.
4. `domain`, `artifact_type`, `knowledge_level`, `loading_strategy` must be from defined taxonomies.
5. `depends_on` must reference existing asset `id`s (no broken links).
6. `referenced_by` must be bidirectional (if A references B, B lists A).
7. `consumers` must list valid agent names or engine names.
8. `version` must follow semver.
9. `stability: locked` assets require Founder approval for any change.

---

## 2. Foundation Documents — Specification

### 2.1 FOUNDATION_INDEX.md

| Field | Value |
|-------|-------|
| **id** | `foundation-index-v1` |
| **domain** | `foundation` |
| **artifact_type** | `index` |
| **knowledge_level** | `foundational` |
| **context_priority** | `critical` |
| **stability** | `locked` |
| **review_trigger** | `OnFoundationChange`, `Quarterly` |
| **consumers** | All agents, ContextEngine, MemoryEngine |
| **loading_strategy** | `always` |
| **Purpose** | Explain the relationship between all 6 Foundation documents. Serves as the entry point for new agents and humans. |
| **Audience** | All AI agents, all human contributors. Read first on any new onboarding. |
| **Responsibilities** | (1) Map document dependencies visually and textually. (2) Provide reading order. (3) Link to each Foundation document. (4) Explain the lifecycle of Foundation documents. |
| **Required Sections** | Reading Order, Dependency Map, Document Summaries (1 paragraph each), Lifecycle Overview |
| **Depends On** | `north-star-v1`, `constitution-v1`, `project-context-v1`, `op-model-v1`, `cto-directive-v1` |
| **Referenced By** | `readme-v1`, `cto-directive-v1` |
| **Tags** | `foundation`, `index`, `onboarding`, `meta-document` |

---

### 2.2 NORTH_STAR.md

| Field | Value |
|-------|-------|
| **id** | `north-star-v1` |
| **domain** | `foundation` |
| **artifact_type** | `vision` |
| **knowledge_level** | `foundational` |
| **context_priority** | `critical` |
| **stability** | `locked` |
| **review_trigger** | `ManualReview`, `Annually` |
| **consumers** | All agents, CTO, COO, ContextEngine, Planner |
| **loading_strategy** | `always` |
| **Purpose** | Define the permanent, unchanging mission of the Lume's Engineering OS. |
| **Audience** | All AI agents, all human contributors, future investors/stakeholders. |
| **Responsibilities** | (1) State the founding vision. (2) Define the problem the project solves. (3) Define success criteria. (4) Set the long-term direction (5-10+ year horizon). (5) Connect to current PROJECT_CONTEXT. |
| **Required Sections** | Founding Vision, Problem Statement, Success Definition, Long-Term Direction, Relationship to Current Development, Inspirational Closing |
| **Depends On** | [] (root document — depends on nothing) |
| **Referenced By** | `foundation-index-v1`, `constitution-v1`, `project-context-v1`, `op-model-v1`, `cto-directive-v1` |
| **Tags** | `foundation`, `vision`, `mission`, `north-star`, `immutable` |

---

### 2.3 AI_OPERATING_MODEL.md

| Field | Value |
|-------|-------|
| **id** | `op-model-v1` |
| **domain** | `foundation` |
| **artifact_type** | `model` |
| **knowledge_level** | `governing` |
| **context_priority** | `high` |
| **stability** | `stable` |
| **review_trigger** | `OnArchitectureChange`, `Monthly` |
| **consumers** | All agents, CTO, Runtime, AgentRouter, Planner |
| **loading_strategy** | `conditional` |
| **Purpose** | Define how AI agents execute work: the lifecycle from task receipt to completion, the decision framework used, and the rules governing all agent behavior. |
| **Audience** | All AI agents (CTO, COO, Code Generator, Review Agent, future agents). |
| **Responsibilities** | (1) Define agent execution lifecycle. (2) Define decision framework (expanded from Constitution Chapter 5). (3) Define context loading sequence. (4) Define proposal workflow. (5) Define knowledge evolution flow. |
| **Required Sections** | Agent Execution Lifecycle, Decision Framework (expanded), Context Loading Protocol, Proposal Workflow, Knowledge Evolution Workflow, Agent Collaboration Rules, Exit Criteria per Task Type |
| **Depends On** | `north-star-v1`, `constitution-v1`, `project-context-v1` |
| **Referenced By** | `cto-directive-v1`, `foundation-index-v1`, playbooks (all), runtime (all) |
| **Tags** | `foundation`, `operating-model`, `execution`, `workflow`, `lifecycle` |

---

### 2.4 CTO_EXECUTION_DIRECTIVE.md

| Field | Value |
|-------|-------|
| **id** | `cto-directive-v1` |
| **domain** | `foundation` |
| **artifact_type** | `directive` |
| **knowledge_level** | `canonical` |
| **context_priority** | `critical` |
| **stability** | `stable` |
| **review_trigger** | `OnPolicyChange`, `Monthly` |
| **consumers** | CTO (primary), Founder (oversight) |
| **loading_strategy** | `conditional` |
| **Purpose** | Define the CTO Agent's specific mission, authority boundary, output format, constraints, and success metrics. This is the CTO's contract with the Founder. |
| **Audience** | CTO Agent primary audience. Founder for oversight. Other agents for collaboration boundaries. |
| **Responsibilities** | (1) State CTO's mission in 1 sentence. (2) Define authority scope (what CTO can and cannot do). (3) Define output format requirements. (4) Define constraints (anti-hallucination, verification rules, no silent changes). (5) Define success metrics. (6) Define escalation path. |
| **Required Sections** | Mission Statement, Authority & Boundaries, Output Format (code format, review format, proposal format), Constraints & Rules, Success Metrics, Escalation Path, Relationship to Other Agents |
| **Depends On** | `north-star-v1`, `constitution-v1`, `op-model-v1`, `project-context-v1` |
| **Referenced By** | `foundation-index-v1`, `playbooks/cto-playbook` |
| **Tags** | `foundation`, `cto`, `directive`, `contract`, `authority` |

---

### 2.5 README.md

| Field | Value |
|-------|-------|
| **id** | `readme-v1` |
| **domain** | `foundation` |
| **artifact_type** | `index` |
| **knowledge_level** | `foundational` |
| **context_priority** | `critical` |
| **stability** | `stable` |
| **review_trigger** | `OnChange` |
| **consumers** | All agents, ContextEngine |
| **loading_strategy** | `always` |
| **Purpose** | Navigation index for the entire `.ai/` Engineering OS. First file read by any agent. |
| **Audience** | All AI agents, all human contributors. |
| **Responsibilities** | (1) List all folders with 1-line description. (2) Provide reading order for new agents. (3) Link to Foundation. (4) Explain Engineering OS philosophy. (5) Point to key entry points. |
| **Required Sections** | What is `.ai/`?, Directory Map, Reading Order, Quick Start for New Agents, Philosophy Statement, Key Entry Points |
| **Depends On** | `foundation-index-v1`, all folder indices (as they exist) |
| **Referenced By** | Every agent that reads the repo |
| **Tags** | `foundation`, `index`, `navigation`, `onboarding` |

---

## 3. Foundation Knowledge Graph

This is not just a dependency chain — it is a multi-dimensional Knowledge Graph. Each edge has a type: `depends_on` (must read), `governs` (controls behavior), `implements` (makes concrete), `references` (cross-links).

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
                    ┌─────┼─────┐
                    ↓     ↓     ↓
               RUNTIME  PLAYBOOKS  CATALOG
                    ↓     ↓     ↓
                    SPECS (from codebase)
```

### Consumer Impact Map

```
NORTH_STAR          → CTO, COO, ContextEngine, Planner
CONSTITUTION        → CTO, COO, CodeGenerator, ReviewAgent, GovernanceEngine
PROJECT_CONTEXT     → CTO, ContextEngine, RepositoryScanner, MemoryEngine
AI_OPERATING_MODEL  → CTO, Runtime, AgentRouter, Planner
CTO_DIRECTIVE       → CTO (primary), Founder (oversight)
```

### Reading Order for New Agents

1. README.md — understand the OS (`loading_strategy: always`)
2. FOUNDATION_INDEX.md — understand relationships (`loading_strategy: always`)
3. NORTH_STAR.md — understand mission (`loading_strategy: always`)
4. CONSTITUTION.md — understand principles (`loading_strategy: always`)
5. PROJECT_CONTEXT.md — understand current state (`loading_strategy: conditional`)
6. AI_OPERATING_MODEL.md — understand how to work (`loading_strategy: conditional`)
7. CTO_EXECUTION_DIRECTIVE.md — if you are CTO (`loading_strategy: conditional`)

---

## 4. Review Checklist (updated for Phase 2.5)

Before approving this specification, verify:

- [x] Metadata schema covers all necessary fields [17 fields]
- [x] Metadata schema includes `id`, `domain`, `artifact_type`, `knowledge_level`, `context_priority`
- [x] `review_cycle` replaced with event-based `review_trigger`
- [x] Domain taxonomy covers all 12 domains in `.ai/`
- [x] Artifact type taxonomy covers all 17 types
- [x] Knowledge levels define Context Loader behavior
- [x] Each Foundation document has a clear, non-overlapping purpose
- [x] Dependency map is acyclic and logical (now extends beyond Foundation)
- [x] Reading order makes sense for new agents
- [x] Versioning strategy is practical
- [x] Review triggers are realistic
- [x] Asset IDs are proposed for all Foundation documents

---

## 5. Next Steps After Approval

1. **Phase 2.5 Complete:** Foundation Specification v1.0 locked with Knowledge Asset Metadata
2. **Add frontmatter** to existing CONSTITUTION.md and PROJECT_CONTEXT.md using new schema
3. **Write** FOUNDATION_INDEX.md, NORTH_STAR.md, AI_OPERATING_MODEL.md, CTO_EXECUTION_DIRECTIVE.md, README.md
4. **Validate**: all `depends_on` IDs resolve, all frontmatter fields present, taxonomy values correct
5. **Submit** for Founder review (Phase 3 — Foundation Synchronization)
6. After approval → Phase 4 (Repository Audit)
