# Foundation Specification — Phase 2

---
status: Proposal
owner: CTO
version: 0.1.0
last_updated: 2026-06-29
reviewed_by: Pending
approved_by: Pending
---

## 1. Metadata Schema — Engineering OS Standard

Every document in the Engineering OS must carry this frontmatter:

```yaml
---
title: <document title, unique within its folder>
owner: <role or agent responsible>
status: Draft | Proposal | Approved | Active | Deprecated | Superseded
version: <semver x.y.z>
last_updated: <ISO date>

purpose: |
  <1-3 sentence statement of why this document exists>

depends_on:
  - <file path relative to .ai/, or null[]>

referenced_by:
  - <file path of documents that reference this one>

review_cycle: Weekly | Biweekly | Monthly | Quarterly | Annually | OnChange
---
```

### Field Rationale

| Field | Why |
|-------|-----|
| `title` | Unique identifier for indexing and cross-reference |
| `owner` | Accountability — who maintains and approves changes |
| `status` | Lifecycle stage — prevents agents from acting on outdated docs |
| `version` | Semver, needed for dependency resolution and rollback |
| `last_updated` | Stale detection — triggers review_cycle check |
| `purpose` | Every document must justify its existence |
| `depends_on` | Upstream dependencies — what must be read first |
| `referenced_by` | Downstream impact — what breaks if this doc changes |
| `review_cycle` | Scheduled maintenance — prevents documentation rot |

### Validation Rules

1. Every `.md` file in `.ai/` MUST have frontmatter.
2. `status` must be one of the defined enum values.
3. `depends_on` must reference existing files (no broken links).
4. `referenced_by` must be bidirectional (if A references B, B lists A).
5. `version` must follow semver.

---

## 2. Foundation Documents — Specification

### 2.1 FOUNDATION_INDEX.md

| Field | Value |
|-------|-------|
| **Purpose** | Explain the relationship between all 6 Foundation documents. Serves as the entry point for new agents and humans. |
| **Audience** | All AI agents, all human contributors. Read first on any new onboarding. |
| **Responsibilities** | (1) Map document dependencies visually and textually. (2) Provide reading order. (3) Link to each Foundation document. (4) Explain the lifecycle of Foundation documents. |
| **Required Sections** | Reading Order, Dependency Map, Document Summaries (1 paragraph each), Lifecycle Overview |
| **Depends On** | All 5 other Foundation documents |
| **Referenced By** | README.md, CTO_EXECUTION_DIRECTIVE.md |
| **Review Cycle** | OnChange (any Foundation doc change triggers review) |
| **Versioning** | Follows max version of any referenced doc |

---

### 2.2 NORTH_STAR.md

| Field | Value |
|-------|-------|
| **Purpose** | Define the permanent, unchanging mission of the Lume's Engineering OS. Why the project exists, what problem it solves, and what success looks like. |
| **Audience** | All AI agents, all human contributors, future investors/stakeholders. |
| **Responsibilities** | (1) State the founding vision. (2) Define the problem the project solves. (3) Define success criteria. (4) Set the long-term direction (5-10+ year horizon). (5) Connect to current PROJECT_CONTEXT. |
| **Required Sections** | Founding Vision, Problem Statement, Success Definition, Long-Term Direction, Relationship to Current Development, Inspirational Closing |
| **Depends On** | [] (root document — depends on nothing) |
| **Referenced By** | FOUNDATION_INDEX.md, CONSTITUTION.md, PROJECT_CONTEXT.md, AI_OPERATING_MODEL.md, CTO_EXECUTION_DIRECTIVE.md |
| **Review Cycle** | Annually (by design, should rarely change) |
| **Versioning** | Starts at v1.0.0. Major version only for significant strategic pivot. |

---

### 2.3 AI_OPERATING_MODEL.md

| Field | Value |
|-------|-------|
| **Purpose** | Define how AI agents execute work: the lifecycle from task receipt to completion, the decision framework used, and the rules governing all agent behavior. |
| **Audience** | All AI agents (CTO, COO, Code Generator, Review Agent, future agents). |
| **Responsibilities** | (1) Define agent execution lifecycle. (2) Define decision framework (expanded from Constitution Chapter 5). (3) Define context loading sequence. (4) Define proposal workflow. (5) Define knowledge evolution flow. |
| **Required Sections** | Agent Execution Lifecycle, Decision Framework (expanded), Context Loading Protocol, Proposal Workflow, Knowledge Evolution Workflow, Agent Collaboration Rules, Exit Criteria per Task Type |
| **Depends On** | NORTH_STAR.md, CONSTITUTION.md, PROJECT_CONTEXT.md |
| **Referenced By** | CTO_EXECUTION_DIRECTIVE.md, PLAYBOOK/*, RUNTIME/* |
| **Review Cycle** | Monthly |
| **Versioning** | Starts at v1.0.0. Minor: new workflow. Major: architecture change. |

---

### 2.4 CTO_EXECUTION_DIRECTIVE.md

| Field | Value |
|-------|-------|
| **Purpose** | Define the CTO Agent's specific mission, authority boundary, output format, constraints, and success metrics. This is the CTO's contract with the Founder. |
| **Audience** | CTO Agent primary audience. Founder for oversight. Other agents for collaboration boundaries. |
| **Responsibilities** | (1) State CTO's mission in 1 sentence. (2) Define authority scope (what CTO can and cannot do). (3) Define output format requirements. (4) Define constraints (anti-hallucination, verification rules, no silent changes). (5) Define success metrics. (6) Define escalation path. |
| **Required Sections** | Mission Statement, Authority & Boundaries, Output Format (code format, review format, proposal format), Constraints & Rules, Success Metrics, Escalation Path, Relationship to Other Agents |
| **Depends On** | NORTH_STAR.md, CONSTITUTION.md, AI_OPERATING_MODEL.md, PROJECT_CONTEXT.md |
| **Referenced By** | FOUNDATION_INDEX.md, PLAYBOOK/CTO_PLAYBOOK.md, RUNTIME/agent-registry.md |
| **Review Cycle** | Monthly |
| **Versioning** | Starts at v1.0.0. Minor: new constraint. Major: scope change. |

---

### 2.5 README.md

| Field | Value |
|-------|-------|
| **Purpose** | Navigation index for the entire `.ai/` Engineering OS. First file read by any agent. |
| **Audience** | All AI agents, all human contributors. |
| **Responsibilities** | (1) List all folders with 1-line description. (2) Provide reading order for new agents. (3) Link to Foundation. (4) Explain Engineering OS philosophy. (5) Point to key entry points. |
| **Required Sections** | What is `.ai/?`, Directory Map, Reading Order, Quick Start for New Agents, Philosophy Statement, Key Entry Points |
| **Depends On** | FOUNDATION_INDEX.md, all folder README files (if they exist) |
| **Referenced By** | Every agent that reads the repo |
| **Review Cycle** | OnChange (any new folder or removed folder triggers review) |
| **Versioning** | Starts at v1.0.0. Minor: new section. Major: restructure. |

---

## 3. Foundation Dependency Map

```
NORTH_STAR.md          ← Root. Depends on nothing.
    ↓
CONSTITUTION.md        ← Derived from North Star. Depends on North Star.
    ↓
PROJECT_CONTEXT.md     ← Derived from North Star + Constitution.
    ↓                     Depends on both.
AI_OPERATING_MODEL.md  ← Execution layer. Depends on North Star + 
    ↓                     Constitution + Project Context.
CTO_EXECUTION_DIRECTIVE ← Agent contract. Depends on North Star + 
    ↓                        Constitution + Operating Model + Project Context.
FOUNDATION_INDEX.md    ← Meta-document. Depends on all 5 above.
    ↓
README.md              ← Navigation. Depends on Foundation Index.
```

### Reading Order for New Agents

1. README.md (understand the OS)
2. FOUNDATION_INDEX.md (understand Foundation relationships)
3. NORTH_STAR.md (understand mission)
4. CONSTITUTION.md (understand principles)
5. PROJECT_CONTEXT.md (understand current state)
6. AI_OPERATING_MODEL.md (understand how to work)
7. CTO_EXECUTION_DIRECTIVE.md (if you are CTO)

---

## 4. Review Checklist

Before approving this specification, verify:

- [ ] Metadata schema covers all necessary fields
- [ ] Metadata schema is extensible (add fields without breaking)
- [ ] Each Foundation document has a clear, non-overlapping purpose
- [ ] Dependency map is acyclic and logical
- [ ] Reading order makes sense for new agents
- [ ] Versioning strategy is practical
- [ ] Review cycles are realistic

---

## 5. Next Steps After Approval

1. Generate each Foundation document using the specifications above
2. Add metadata frontmatter to existing CONSTITUTION.md and PROJECT_CONTEXT.md
3. Write FOUNDATION_INDEX.md
4. Write NORTH_STAR.md
5. Write AI_OPERATING_MODEL.md
6. Write CTO_EXECUTION_DIRECTIVE.md
7. Write README.md
8. Validate: all `depends_on` references resolve, all metadata is present
9. Submit for Founder review
10. After approval → Phase 3 (Foundation Synchronization)
