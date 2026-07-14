<!--
  EPIC R — Phase 7: Executive Framework Library
  Sources: All EROS documents, governance, learning, intelligence code
  DO NOT EDIT MANUALLY.
-->

# Executive Framework Library

**Version:** 1.0.0  
**Status:** STABLE  

---

## Framework Index

| ID | Framework | Owner | Type | Status |
|----|-----------|-------|------|--------|
| FW-001 | SWOT Analysis | CEO | Strategic | Documented |
| FW-002 | OKR Framework | CEO | Strategic | Referenced |
| FW-003 | Lean Canvas | CEO | Strategic | Referenced |
| FW-004 | Porter's Five Forces | CEO | Strategic | Referenced |
| FW-005 | McKinsey MECE Principle | CEO | Strategic | Referenced |
| FW-006 | Balanced Scorecard | CEO | Strategic | Referenced |
| FW-007 | C4 Model | CTO | Architecture | Documented |
| FW-008 | Domain-Driven Design | CTO | Architecture | Documented |
| FW-009 | ADR (Architecture Decision Record) | CTO | Architecture | Implemented |
| FW-010 | RFC Process | CTO | Engineering | Implemented |
| FW-011 | Engineering Standards | CTO | Engineering | Referenced |
| FW-012 | COSO Framework | CFO | Financial | Referenced |
| FW-013 | GAAP/IFRS | CFO | Financial | Referenced |
| FW-014 | Zero-Based Budgeting | CFO | Financial | Referenced |
| FW-015 | ABC (Activity-Based Costing) | CFO | Financial | Referenced |
| FW-016 | ISO 9001 | COO | Quality | Referenced |
| FW-017 | ITIL | COO | Operations | Referenced |
| FW-018 | S.M.A.R.T. Goals | ALL | Strategy | Referenced |
| FW-019 | RACI Matrix | ALL | Management | Referenced |
| FW-020 | Eisenhower Matrix | CEO | Priority | Referenced |
| FW-021 | MoSCoW Method | CTO | Priority | Referenced |
| FW-022 | EPF v1.0 (Executive Prompt Framework) | SYSTEM | Framework | Implemented |
| FW-023 | EROS v1.0 (Executive Runtime OS) | SYSTEM | Framework | Implemented |
| FW-024 | ECP-044 Learning Framework | SYSTEM | Learning | Implemented |
| FW-025 | ECP-045 Intelligence Framework | SYSTEM | Intelligence | Implemented |
| FW-026 | ECP-046 Governance Framework | SYSTEM | Governance | Implemented |
| FW-027 | ECP-035 Kernel Framework | SYSTEM | Kernel | Implemented |
| FW-028 | EKS (Executive Knowledge System) | CKO | Knowledge | Documenting (this EPIC) |
| FW-029 | EIOS Pipeline Framework | SYSTEM | Runtime | Implemented |

---

## CEO Frameworks

### FW-001: SWOT Analysis
- **Type:** Strategic Analysis
- **Purpose:** Evaluate Strengths, Weaknesses, Opportunities, Threats
- **ERP Context:** CEO uses SWOT when evaluating strategic direction or organizational change
- **Source:** EXECUTIVE_SPEC: strategic-decision capability
- **Trigger:** Strategic planning, organizational assessment, major decisions

### FW-002: OKR Framework (Objectives and Key Results)
- **Type:** Strategic Planning
- **Purpose:** Set and track measurable goals
- **ERP Context:** CEO sets OKRs for each executive, tracks progress via knowledge episodes
- **Source:** EXECUTIVE_SPEC: mission-planning, strategic-planning
- **Trigger:** Quarterly/annual planning, mission creation

### FW-003: Lean Canvas
- **Type:** Business Model
- **Purpose:** One-page business model documentation
- **ERP Context:** CEO uses Lean Canvas for new initiatives or business model evaluation
- **Source:** EXECUTIVE_SPEC: business-analysis

### FW-004: Porter's Five Forces
- **Type:** Competitive Strategy
- **Purpose:** Analyze competitive environment
- **ERP Context:** CEO evaluates market positioning via CMO collaboration
- **Source:** COLLABORATION_MODEL: CEO-CMO pair

### FW-005: McKinsey MECE (Mutually Exclusive, Collectively Exhaustive)
- **Type:** Problem Structuring
- **Purpose:** Break down problems without overlap or gaps
- **ERP Context:** CEO applies MECE when delegating complex problems across executives
- **Source:** EXECUTIVE_SPEC: strategic-decision

### FW-006: Balanced Scorecard
- **Type:** Performance Measurement
- **Purpose:** Financial, Customer, Internal Process, Learning & Growth
- **ERP Context:** CEO monitors executive KPIs across all 4 perspectives
- **Source:** EXECUTIVE_SPEC: report-aggregation

### FW-020: Eisenhower Matrix
- **Type:** Priority
- **Purpose:** Urgent vs Important quadrants
- **ERP Context:** CEO classifies missions by urgency and importance for delegation
- **Source:** PLAYBOOK: priority setting (normal/high/critical)

---

## CTO Frameworks

### FW-007: C4 Model (Context, Container, Component, Code)
- **Type:** Architecture Visualization
- **Purpose:** Hierarchical software architecture diagrams
- **ERP Context:** CTO uses C4 for architecture documentation and review
- **Source:** EXECUTIVE_SPEC: architecture-review

### FW-008: Domain-Driven Design (DDD)
- **Type:** Software Design
- **Purpose:** Align software model with business domain
- **ERP Context:** CTO evaluates whether code follows DDD principles (entities, value objects, aggregates, bounded contexts)
- **Source:** EXECUTIVE_SPEC: architecture-review
- **Evidence in Code:** `knowledge-platform/`, `governance/`, `learning/` follow bounded context patterns

### FW-009: ADR (Architecture Decision Record)
- **Type:** Decision Documentation
- **Purpose:** Capture architecture decisions with context and consequences
- **ERP Context:** CTO follows ADR format for all architecture decisions. 16 ADRs exist across 2 sets.
- **Source:** EXECUTIVE_SPEC: architecture-review, proposal-generation
- **Code Reference:** `src/knowledge/ArchitectureRegistry.ts` — 9 frozen architecture rules

### FW-010: RFC Process (Request for Comments)
- **Type:** Engineering Process
- **Purpose:** Collaborative design review
- **ERP Context:** CTO uses RFC process for major technical changes (e.g., RFC-012 Phase 10C)
- **Source:** EXECUTIVE_SPEC: proposal-generation
- **Evidence:** KnowledgeBackbone.ts references "RFC-012 Phase 10C"

### FW-011: Engineering Standards
- **Type:** Quality
- **Purpose:** Code quality, testing, documentation standards
- **ERP Context:** CTO enforces standards during code analysis
- **Source:** EXECUTIVE_SPEC: code-analysis
- **Evidence:** 9 test files, 47 tests, vitest, TypeScript

### FW-021: MoSCoW Method (Must have, Should have, Could have, Won't have)
- **Type:** Priority
- **Purpose:** Requirement prioritization
- **ERP Context:** CTO uses MoSCoW when planning implementation backlog
- **Source:** PLAYBOOK: implementation planning

---

## CFO Frameworks

### FW-012: COSO Framework (Committee of Sponsoring Organizations)
- **Type:** Internal Control
- **Purpose:** Enterprise risk management, internal controls
- **ERP Context:** CFO applies COSO principles for financial governance
- **Source:** EXECUTIVE_SPEC: financial-analysis

### FW-013: GAAP/IFRS (Accounting Standards)
- **Type:** Financial Reporting
- **Purpose:** Standardized financial reporting
- **ERP Context:** CFO ensures financial data follows accounting standards
- **Source:** EXECUTIVE_SPEC: financial-analysis

### FW-014: Zero-Based Budgeting
- **Type:** Budgeting
- **Purpose:** Build budget from zero each period
- **ERP Context:** CFO evaluates budgets from zero-base rather than incremental
- **Source:** EXECUTIVE_SPEC: budget-review

### FW-015: ABC (Activity-Based Costing)
- **Type:** Costing
- **Purpose:** Assign costs to activities and products
- **ERP Context:** CFO calculates true product cost by attributing overhead based on activities
- **Source:** SYSTEM_PROMPT (expanded): cost-analysis

---

## COO Frameworks

### FW-016: ISO 9001 (Quality Management)
- **Type:** Quality
- **Purpose:** Quality management system requirements
- **ERP Context:** COO aligns SOPs with quality management principles
- **Source:** EXECUTIVE_SPEC: operational execution

### FW-017: ITIL (Information Technology Infrastructure Library)
- **Type:** Service Management
- **Purpose:** IT service management best practices
- **ERP Context:** COO applies ITIL principles to operational service delivery
- **Source:** Derived from operational context

---

## Shared Frameworks

### FW-018: S.M.A.R.T. Goals (Specific, Measurable, Achievable, Relevant, Time-bound)
- **Type:** Goal Setting
- **Purpose:** Create effective goals
- **ERP Context:** All executives define KPIs using SMART criteria
- **Evidence:** All EXECUTIVE_SPECs include measurable KPIs with targets

### FW-019: RACI Matrix (Responsible, Accountable, Consulted, Informed)
- **Type:** Responsibility Assignment
- **Purpose:** Clarify roles and responsibilities
- **ERP Context:** EROS COLLABORATION_MODEL defines RACI-like patterns for 21 pairs
- **Evidence:** COLLABORATION_MODEL: each pair defines Owner and Decision Authority

### FW-022: EPF v1.0 (Executive Prompt Framework)
- **Type:** Prompt Architecture
- **Purpose:** Deterministic, layer-based system prompt generation
- **Status:** Implemented STABLE
- **Components:** 11 layers (GLOBAL + 10 per-executive), Composition Engine, Blueprint, Inheritance, Versioning
- **Source:** `docs/executive-runtime/prompts/EXECUTIVE_PROMPT_FRAMEWORK.md`

### FW-023: EROS v1.0 (Executive Runtime Operating System)
- **Type:** Documentation Framework
- **Purpose:** SSOT for all executive behavior documentation
- **Status:** Implemented STABLE
- **Components:** 29 documents across Handbook, Constitution, Decision Model, Capability Matrix, Collaboration Model, Communication Protocol, Knowledge Architecture, SPECs, PLAYBOOKs
- **Source:** `docs/executive-runtime/`

### FW-024: ECP-044 Learning Framework
- **Type:** Learning Architecture
- **Purpose:** Experience → Reflection → Knowledge synthesis cycle
- **Status:** Implemented in `src/learning/`
- **Components:** ExperienceEngine, ReflectionEngine, KnowledgeEngine, KnowledgeGraph, MemoryIndex, RetrievalEngine, ExecutiveMemory
- **Source:** `src/learning/`

### FW-025: ECP-045 Intelligence Framework
- **Type:** Organizational Intelligence
- **Purpose:** Multi-source validation, cross-executive learning, consensus
- **Status:** Implemented in `src/intelligence/`
- **Components:** OrganizationalMemory, KnowledgeFusion, CrossExecutiveLearning, ConsensusEngine, ExecutiveReputation, DecisionHistory
- **Source:** `src/intelligence/`

### FW-026: ECP-046 Governance Framework
- **Type:** Organizational Governance
- **Purpose:** Policy enforcement, compliance, risk, quality, improvement
- **Status:** Implemented in `src/governance/`
- **Components:** GovernanceEngine, PolicyEngine, ComplianceEngine, RiskEngine, QualityEngine, ImprovementEngine, ExecutiveAuditor
- **Source:** `src/governance/`

### FW-027: ECP-035 Kernel Framework
- **Type:** System Kernel
- **Purpose:** Central nervous system, lifecycle, heartbeat, recovery
- **Status:** FROZEN in `src/kernel/`
- **Components:** OrganizationKernel, KernelRegistry, KernelEventBus, KernelLifecycle, KernelHeartbeat, KernelCheckpoint, KernelRecovery, KernelScheduler
- **Source:** `src/kernel/`

### FW-028: EKS (Executive Knowledge System)
- **Type:** Knowledge Architecture
- **Purpose:** Unified knowledge management across all executives
- **Status:** Being defined (this EPIC)
- **Components:** Knowledge Audit, Ownership Matrix, Taxonomy, Classification, Lifecycle, Mental Models, Framework Library, Retrieval Model, Composition Engine, Validation Rules, Quality Model, Dependency Diagram, Handbook
- **Source:** `docs/executive-runtime/knowledge/`

### FW-029: EIOS Pipeline Framework
- **Type:** Runtime Pipeline
- **Purpose:** 11-stage event processing pipeline with observers and triggers
- **Status:** FROZEN in `src/eios-runtime/`
- **Components:** PipelineEngine, PipelineScheduler, PipelineContext, PipelineAudit, 11 stages, 6 observers, 7 profiles, 11 triggers
- **Source:** `docs/EIOS_ARCHITECTURE.md`, `src/eios-runtime/`
