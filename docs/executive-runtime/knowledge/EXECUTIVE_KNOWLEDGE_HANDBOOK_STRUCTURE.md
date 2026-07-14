<!--
  EPIC R — Phase 13: Executive Knowledge Handbook Structure
  Sources: EXECUTIVE_RUNTIME_HANDBOOK.md, EROS_DOCUMENTATION_INDEX.md,
           ALL EKS documents created in EPIC R Phases 1-12
  DO NOT EDIT MANUALLY.
-->

# Executive Knowledge Handbook Structure

**Version:** 1.0.0  
**Status:** STABLE  

---

## Directory Structure

```
docs/executive-knowledge/
├── README.md                           # Entry point for EKS
├── EXECUTIVE_KNOWLEDGE_HANDBOOK.md     # This document — overview + usage guide
├── KNOWLEDGE_CONSTITUTION.md           # Core principles, ethics, rules
├── EXECUTIVE_KNOWLEDGE_TAXONOMY.md     # 15-branch hierarchical taxonomy
├── KNOWLEDGE_CLASSIFICATION.md         # 5-dimensional classification system
├── KNOWLEDGE_LIFECYCLE.md              # 12-stage lifecycle (Acquire → Retire)
├── KNOWLEDGE_VALIDATION.md             # 9 validation rules + flow
├── EXECUTIVE_MENTAL_MODEL_LIBRARY.md   # 46 mental models by executive
├── EXECUTIVE_FRAMEWORK_LIBRARY.md      # 29 frameworks by executive
├── KNOWLEDGE_RETRIEVAL_MODEL.md        # 8-stage retrieval pipeline
├── KNOWLEDGE_COMPOSITION_ENGINE.md     # 10-layer composition order
├── KNOWLEDGE_QUALITY_MODEL.md          # 9 quality dimensions + scoring
├── KNOWLEDGE_DEPENDENCY_DIAGRAM.md     # Dependency graph + rules
├── KNOWLEDGE_GOVERNANCE.md             # Knowledge-specific governance rules
├── KNOWLEDGE_RUNTIME.md               # Runtime integration + service interfaces
├── KNOWLEDGE_INDEX.md                  # Master knowledge index
│
├── knowledge-files/                    # Original audit-level documents
│   ├── EXECUTIVE_KNOWLEDGE_AUDIT.md    # Phase 1: 15 findings
│   └── KNOWLEDGE_OWNERSHIP_MATRIX.md   # Phase 2: Ownership per domain
│
└── legacy/                             # Pre-EKS knowledge documents (superseded)
    └── (moved from old locations)
```

---

## Document Descriptions

### 01: README.md
**Purpose:** Entry point for anyone (human or AI) approaching EKS
**Contents:**
- What is EKS? (1-paragraph definition)
- How to use this handbook
- Quick start: "I need to find knowledge about X"
- Relationship to EROS, EIOS, EPF
- File index

### 02: EXECUTIVE_KNOWLEDGE_HANDBOOK.md
**Purpose:** Complete executive-level overview of the knowledge system
**Contents:**
- Knowledge System Architecture (diagram)
- All 6 subsystems and their relationships
- Key interfaces (KnowledgeProvider, KnowledgeBackbone, etc.)
- Data flow from acquisition to execution
- Ownership and governance model
- Migration guide (from pre-EKS to EKS)

### 03: KNOWLEDGE_CONSTITUTION.md
**Purpose:** Immutable principles for knowledge handling
**Contents:**
- 10 Knowledge Principles (based on audit findings)
- Knowledge Ethics (accuracy, honesty, attribution, privacy)
- Knowledge Sovereignty (domain boundaries)
- Knowledge Purity (no direct modification of other executives' knowledge)
- Knowledge Transparency (all knowledge is traceable)
- Anti-Hallucination rules for knowledge (stronger than prompt level)
- Conflict resolution hierarchy

### 04: EXECUTIVE_KNOWLEDGE_TAXONOMY.md
**Purpose:** Hierarchical classification of all knowledge
**Contents:**
- 15 top-level branches
- Full tree depth (3-5 levels)
- Classification rules
- Cross-reference to EROS 7 knowledge types
- Usage examples

### 05: KNOWLEDGE_CLASSIFICATION.md
**Purpose:** 5-dimensional knowledge classification
**Contents:**
- Immutability (Immutable/Stable/Dynamic/Ephemeral)
- Source (12 source types with confidence weights)
- Validation (9 validation levels)
- Persistence (5 retention classes)
- Access (6 access levels)
- Classification matrix with examples

### 06: KNOWLEDGE_LIFECYCLE.md
**Purpose:** Complete knowledge lifecycle from acquisition to retirement
**Contents:**
- 12-stage lifecycle diagram
- Each stage: purpose, inputs, process, outputs, owner
- State machine diagram
- Transition rules between stages
- Feedback loop (learning feeds back into acquisition)

### 07: KNOWLEDGE_VALIDATION.md
**Purpose:** 9 validation rules for all knowledge
**Contents:**
- Evidence (EVD): levels, acceptable types, minimum requirements
- Confidence (CNF): calculation formula, thresholds, adjustment rules
- Source (SRC): metadata requirements, chain preservation
- Version (VER): versioning rules, conflict resolution
- Owner (OWN): ownership rules, change procedures
- Expiration (EXP): default TTLs, expiration actions
- Priority (PRI): 5-level priority, assignment rules
- Dependency (DEP): types, validation, acyclicity
- Conflict (CFL): detection algorithm, resolution hierarchy
- Validation flow diagram
- Override rules

### 08: EXECUTIVE_MENTAL_MODEL_LIBRARY.md
**Purpose:** 46 mental models organized by executive
**Contents:**
- Model index with IDs, types, complexity
- Per-executive model sections
- Each model: Type, Usage, ERP Context, Trigger, Evidence
- 4 shared models (Composition, SSOT, Least Privilege, Defense in Depth)

### 09: EXECUTIVE_FRAMEWORK_LIBRARY.md
**Purpose:** 29 frameworks organized by executive and system
**Contents:**
- Framework index with IDs, owners, status
- CEO frameworks (SWOT, OKR, Lean Canvas, Porter, McKinsey, Balanced Scorecard)
- CTO frameworks (C4, DDD, ADR, RFC, Engineering Standards)
- CFO frameworks (COSO, GAAP/IFRS, Zero-Based Budgeting, ABC)
- COO frameworks (ISO 9001, ITIL)
- Shared frameworks (SMART, RACI, EPF, EROS, ECP-044/045/046, EKS)
- Implementation status per framework

### 10: KNOWLEDGE_RETRIEVAL_MODEL.md
**Purpose:** 8-stage retrieval pipeline
**Contents:**
- Pipeline diagram
- Each stage: purpose, logic, inputs, outputs
- Intent analysis (10 intent types)
- Capability check (GovernanceProvider.canExecute())
- Knowledge domain selection (taxonomy mapping)
- Priority assessment (4 levels)
- Executive routing (5 routing patterns)
- Knowledge layer selection (12 layers)
- Evidence collection (8 evidence sources)
- Reasoning and decision (synthesis formula)
- Retrieval API reference
- Optimization rules

### 11: KNOWLEDGE_COMPOSITION_ENGINE.md
**Purpose:** 10-layer deterministic composition order
**Contents:**
- Composition order (Foundation → Organization → Executive → Runtime → Memory → Conversation → Temporary → External → User → Prompt)
- Layer definitions (source, cache, cost, inclusion rules)
- Composition algorithm (TypeScript pseudocode)
- Token budget allocation by executive
- 10 composition rules
- Composition validation
- 3 use case examples (CEO strategic, COO operational, CAIO health)

### 12: KNOWLEDGE_QUALITY_MODEL.md
**Purpose:** 9-dimension quality measurement
**Contents:**
- Quality dimensions with weights
- Each dimension: levels, scoring algorithm, rules
- Overall quality score formula
- Quality levels (EXCELLENT/GOOD/ACCEPTABLE/POOR/UNACCEPTABLE)
- Quality gates by decision level
- Knowledge quality report format
- Quality alerts and triggers

### 13: KNOWLEDGE_DEPENDENCY_DIAGRAM.md
**Purpose:** Full dependency graph of all knowledge systems
**Contents:**
- Top-level flow diagram (Foundation → Organization → Executive → Framework → Decision → Playbook → Prompt → Memory → Execution)
- Detailed dependency graph (ASCII art)
- Per-executive knowledge chains
- Cross-system dependencies
- 6 dependency rules

### 14: KNOWLEDGE_GOVERNANCE.md
**Purpose:** Knowledge-specific governance rules
**Contents:**
- Knowledge compliance rules (extending ECP-046)
- Knowledge audit requirements
- Knowledge quality thresholds
- Knowledge risk categories
- Knowledge improvement cycle
- Integration with governance/governance-engine.ts

### 15: KNOWLEDGE_RUNTIME.md
**Purpose:** Runtime integration and service interfaces
**Contents:**
- All external service interfaces (KnowledgeProvider, FoundationProvider, etc.)
- Runtime integration points (pipeline stages, observers)
- Cache configuration
- Error handling and fallback
- Performance characteristics

### 16: KNOWLEDGE_INDEX.md
**Purpose:** Master index of ALL knowledge documents
**Contents:**
- Every EKS document with version, status, date
- Every EROS document with knowledge relevance
- Source documents cross-reference
- ADR references
- Code-to-document mapping
- Search index

---

## Document Relationships

```
                    ┌─────────────────────┐
                    │   README.md          │  ← Entry point
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │ KNOWLEDGE_HANDBOOK   │  ← Overview + architecture
                    └─────────┬───────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────────┐ ┌───────────────┐ ┌──────────────────┐
│ KNOWLEDGE        │ │ KNOWLEDGE     │ │ KNOWLEDGE        │
│ CONSTITUTION     │ │ TAXONOMY      │ │ CLASSIFICATION   │
│ (principles)     │ │ (hierarchy)   │ │ (dimensions)     │
└────────┬─────────┘ └───────┬───────┘ └────────┬─────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────┐
          │        KNOWLEDGE LIFECYCLE       │
          │  (12-stage: Acquire → Retire)    │
          └────────────────┬─────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌────────────────┐ ┌──────────────┐ ┌──────────────┐
│ KNOWLEDGE      │ │ KNOWLEDGE    │ │ KNOWLEDGE    │
│ VALIDATION     │ │ RETRIEVAL    │ │ COMPOSITION  │
│ (9 rules)      │ │ (8 stages)   │ │ (10 layers)  │
└────────┬───────┘ └──────┬───────┘ └──────┬───────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
                          ▼
          ┌──────────────────────────────────┐
          │          KNOWLEDGE QUALITY       │
          │  (9 dimensions + scoring)        │
          └────────────────┬─────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌────────────────┐ ┌──────────────┐ ┌──────────────┐
│ KNOWLEDGE      │ │ KNOWLEDGE    │ │ KNOWLEDGE    │
│ GOVERNANCE     │ │ RUNTIME      │ │ INDEX        │
│ (rules + audit)│ │ (intefaces)  │ │ (master list) │
└────────────────┘ └──────────────┘ └──────────────┘
```

---

## Implementation Phases

| Phase | Documents | Depends On | Target Date |
|-------|-----------|------------|-------------|
| P1 — Foundation | Constitution, Taxonomy, Classification, Lifecycle | EPIC R Phase 3-6 | Current |
| P2 — Quality | Validation, Quality Model, Governance | P1 | Current |
| P3 — Retrieval | Retrieval Model, Composition Engine | P1 | Current |
| P4 — Reference | Mental Model Library, Framework Library, Dependency Diagram | P1-P2 | Current |
| P5 — Integration | Handbook, Runtime, Index | P1-P4 | Current |
| P6 — Migration | README, Legacy archive | P5 | Next sprint |

---

## Legacy Migration

Files to be moved from old locations to `docs/executive-knowledge/legacy/`:

| Current Location | New Location | Reason |
|-----------------|-------------|--------|
| `docs/executive-runtime/EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md` | Superseded by EKS docs | Replaced by more detailed EKS documents |
| (Potential) old knowledge docs | `legacy/` | Preservation of historical reasoning |
