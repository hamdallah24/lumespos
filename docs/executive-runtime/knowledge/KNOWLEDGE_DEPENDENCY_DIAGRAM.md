<!--
  EPIC R — Phase 12: Knowledge Dependency Diagram
  Sources: All EKS documents, EROS_DEPENDENCY_DIAGRAM.md,
           ArchitectureRegistry, all knowledge system code
  DO NOT EDIT MANUALLY.
-->

# Knowledge Dependency Diagram

**Version:** 1.0.0  
**Status:** STABLE  

---

## Top-Level Dependency Flow

```
Knowledge Foundation
     │
     ▼
Organization Knowledge
     │
     ▼
Executive Knowledge
     │
     ▼
Framework Knowledge
     │
     ▼
Decision Knowledge
     │
     ▼
Playbook Knowledge
     │
     ▼
Prompt Knowledge
     │
     ▼
Memory Knowledge
     │
     ▼
Execution (Runtime)
```

---

## Detailed Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          KNOWLEDGE FOUNDATION                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Philosophy   │  │  Constitution │  │  North Star   │  │ Architecture   │ │
│  │  & Covenant   │──▶│  (6 Principles)│──▶│  (Objectives)  │──▶│ Rules (ADRs)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘ │
│         │                  │                                                  │
│         ▼                  ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │                    FoundationProvider                             │        │
│  │  (loads from .ai/foundation/, caches 5min, truncates to budget)  │        │
│  └──────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORGANIZATION KNOWLEDGE                             │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Identity    │  │  Directives   │  │ Capabilities  │  │  Delegation    │ │
│  │  (identity.ts)│──▶│(runtime-domain)│──▶│(capability-  │──▶│ Matrix         │ │
│  │  9 roles      │  │ per-role     │  │ domain.ts)   │  │ (delegation-   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  │ domain.ts)     │ │
│                                                         └────────────────┘ │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │               Organization Kernel (kernel/)                       │        │
│  │  (heartbeat, lifecycle, checkpoint, recovery, event bus)         │        │
│  └──────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTIVE KNOWLEDGE                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    7 Executive SPECs + PLAYBOOKs                      │   │
│  │  CEO       CTO       CFO       CMO       CAIO       CKO       COO    │   │
│  │  (v1.0.0)  (v1.1.0)  (v1.0.0)  (v1.0.0)  (v1.0.0)  (v1.0.0) (v3.0.1)│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │            Collaboration Model (21 pairs)                        │        │
│  │  Each pair: Purpose, Owner, Decision Authority, Escalation,      │        │
│  │  Conflict Resolution, Shared Context, Approval Flow, Flow        │        │
│  └──────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRAMEWORK KNOWLEDGE                               │
│                                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ EROS     │ │ EPF      │ │ ECP-044  │ │ ECP-045  │ │ ECP-046          │ │
│  │(29 docs) │ │(11 layers)│ │(Learning)│ │(Intell.) │ │(Governance)      │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │
│         │                  │                  │                              │
│         ▼                  ▼                  ▼                              │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │              Executive Mental Model Library (46 models)           │        │
│  │  CEO(6)  CTO(10)  CFO(5)  COO(5)  CMO(4)  CAIO(7)  CKO(5)  ALL(4)     │
│  └──────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DECISION KNOWLEDGE                                │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  Decision Model      │  │  Confidence Model    │  │  Risk Model      │  │
│  │  (7-Stage Lifecycle) │  │  (5-factor weighted) │  │  (4 Levels)      │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │  Decision History    │  │  Evidence Sources    │  │  Rollback Map    │  │
│  │  (intelligence/)     │──▶│  (8 sources, graded) │──▶│  (compensation   │  │
│  │                      │  │                      │  │   actions)       │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLAYBOOK KNOWLEDGE                                │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  7 Executive PLAYBOOKs — operational procedures per executive       │     │
│  │  CEO: 4 procedures  CTO: 4  CFO: 3  CMO: 3  CAIO: 3  CKO: 4  COO:5│     │
│  └────────────────────────────────────────────────────────────────────┘     │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐        │
│  │            COO 18 EXECUTION_ACTIONS (operational SOPs)            │        │
│  │  add_product, add_stock, reduce_stock, produce, add_expense, etc.│        │
│  └──────────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROMPT KNOWLEDGE                                  │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  GLOBAL SYSTEM PROMPT (v1.0.0) — shared by all 7 executives        │     │
│  │  Layer 0: Core Principles, Ethics, Anti-Hallucination, Security,   │     │
│  │  Knowledge Usage, Runtime Boundaries, Streaming, Error Policy      │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│         │                                                                   │
│         ▼                                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  7 Executive SYSTEM_PROMPTs (Layers 1-10 per executive)            │     │
│  │  CEO(v1.0.0)  CTO(v1.1.0)  CFO(v1.0.0)  CMO(v1.0.0)              │     │
│  │  CAIO(v1.0.0)  CKO(v1.0.0)  COO(v3.0.1)                          │     │
│  └────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MEMORY KNOWLEDGE                                  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        5 Knowledge Storage Systems                    │   │
│  │                                                                       │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │   │
│  │  │ knowledge-platform│  │  learning/       │  │  intelligence/    │ │   │
│  │  │ KnowledgeBlocks   │  │  KnowledgeNodes  │  │  OrgMemoryNodes   │ │   │
│  │  │ (semantic/episode │  │  (PATTERN/INSIGHT│  │  (2+ source val.) │ │   │
│  │  │  /procedural)     │  │  /SOLUTION/      │  │                   │ │   │
│  │  └──────────────────┘  │  WARNING)         │  └────────────────────┘ │   │
│  │                         └──────────────────┘                         │   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │   │
│  │  │ ai/runtime/      │  │ knowledge/       │  │ governance/       │ │   │
│  │  │ KnowledgeCards   │  │ KnowledgeBackbone│  │ AuditEngine       │ │   │
│  │  │ (RAW→ARCHIVED)   │  │ (unified access) │  │ (immutable logs)    │ │   │
│  │  └──────────────────┘  └──────────────────┘  └────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXECUTION (RUNTIME)                               │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  RuntimeFacade (13 methods) + ExecutiveDispatchRegistry (4 methods)  │   │
│  │  + GovernanceProvider + KnowledgeProvider + AuditEngine              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                  EIOS Pipeline (11 Stages + 6 Observers)              │   │
│  │  event_validation → business_intelligence → decision_context → ...  │   │
│  │  → executive_runtime                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                Executive.execute() → ExecutiveDecision                │   │
│  │  → KnowledgeProvider.ingestEpisode() → LearningEngine.cycle()         │   │
│  │  → Feedback loop (Knowledge Foundation ← Learning Outcome)           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dependency Chain by Executive

### CEO Knowledge Chain
```
Foundation → Identity(CEO) → Directives(CEO) → Capabilities(CEO: 7)
→ Collaboration(CEO↔All) → SPEC(v1.0.0) → PLAYBOOK → SYSTEM_PROMPT(v1.0.0)
→ ExecutiveMemory(CEO) → KnowledgeProvider → Decision
```

### CTO Knowledge Chain
```
Foundation → Identity(CTO) → Directives(CTO) → Capabilities(CTO: 6)
→ Collaboration(CTO↔CEO, CTO↔CAIO, CTO↔CKO) → SPEC(v1.1.0) → PLAYBOOK
→ SYSTEM_PROMPT(v1.1.0) → MissionContextRegistry → KnowledgeEvolution
→ EvidenceCollector → Decision
```

### CFO Knowledge Chain
```
Foundation → Identity(CFO) → Directives(CFO) → Capabilities(CFO: 4 → 7 in prompt)
→ Collaboration(CFO↔CEO, CFO↔COO) → SPEC(v1.0.0) → PLAYBOOK
→ SYSTEM_PROMPT(v1.0.0) → KnowledgeProvider(searchAll) → Decision
```

### COO Knowledge Chain
```
Foundation → Identity(COO) → Directives(COO) → Capabilities(COO: 4)
→ Collaboration(COO↔CEO, COO↔CKO) → SPEC(v3.0.0) → PLAYBOOK(v3.0)
→ SYSTEM_PROMPT(v3.0.1) → 18 EXECUTION_ACTIONS → GovernanceProvider
→ BriefGenerator → executeOperation() → Decision
```

### CMO Knowledge Chain
```
Foundation → Identity(CMO) → Capabilities(CMO: 4 → 6 in prompt)
→ Collaboration(CMO↔CEO, CMO↔CKO) → SPEC(v1.0.0) → PLAYBOOK
→ SYSTEM_PROMPT(v1.0.0) → KnowledgeProvider(searchAll) → Decision
```

### CAIO Knowledge Chain
```
Foundation → Identity(CAIO) → Capabilities(CAIO: 4 → 5 in prompt)
→ Collaboration(CAIO↔CEO, CAIO↔CKO, CAIO↔CTO) → SPEC(v1.0.0) → PLAYBOOK
→ SYSTEM_PROMPT(v1.0.0) → RuntimeFacade.health() → KnowledgeProvider.getStats()
→ BriefGenerator → Decision
```

### CKO Knowledge Chain
```
Foundation → Identity(CKO) → Capabilities(CKO: 5 → 6 in prompt)
→ Collaboration(CKO↔ALL executives) → SPEC(v1.0.0) → PLAYBOOK
→ SYSTEM_PROMPT(v1.0.0) → ConsultantRuntime / CouncilSessionManager
→ KnowledgeProvider → LearningEngine → Decision
```

---

## Cross-System Dependencies

```
Knowledge Backbone (knowledge/)
  depends_on:
    - MissionContextRegistry (mission/)
    - ArtifactRepository
    - ContextManager (memory/)
    - DecisionHistory (intelligence/)
    - OrganizationalMemory (intelligence/)

Learning Engine (learning/)
  depends_on:
    - ExperienceEngine → ReflectionEngine → KnowledgeEngine
    → KnowledgeGraph → MemoryIndex → RetrievalEngine
  feeds_into:
    - ExecutiveMemory
    - KnowledgeQueue → KnowledgeManager → KnowledgeCards

Knowledge Pipeline (ai/runtime/knowledge/)
  depends_on:
    - KnowledgeQueue (mission events → artifacts)
    - KnowledgeCard lifecycle
    - Deduplicator, Contradiction Detector, Ranker, Promoter
  feeds_into:
    - ConsultantCache (L1-L4)
    - FoundationProposal (FOUNDATION_CANDIDATE → ADR)

Knowledge Platform (knowledge-platform/)
  depends_on:
    - SemanticStore, EpisodeStore, ProceduralStore
    - LearningEngine (confidence adjust, promote, deprecate)
  feeds_into:
    - KnowledgeProvider (facade for all executives)

Organizational Intelligence (intelligence/)
  depends_on:
    - OrganizationalMemory (2+ source validation)
    - KnowledgeFusion (cross-executive)
    - ConsensusEngine
    - ExecutiveReputation
  feeds_into:
    - GovernanceEngine audit

Governance (governance/)
  depends_on:
    - PolicyEngine (registration + evaluation)
    - ComplianceEngine (8 rules)
    - RiskEngine (4 categories)
    - QualityEngine (organization scoring)
    - ImprovementEngine (plans)
  feeds_into:
    - GovernanceReport
    - ExecutiveAudit
```

---

## Dependency Rules

1. **No circular dependencies** — The dependency graph MUST remain acyclic
2. **Downward flow only** — Upper layers depend on lower layers, not vice versa
3. **Foundation is root** — No dependency depends on Foundation; Foundation depends on nothing
4. **Knowledge systems are independent** — Each knowledge system (platform, learning, intelligence, governance) has its own dependency tree
5. **KnowledgeBackbone unifies** — `KnowledgeBackbone` is the only module that spans multiple knowledge systems (for strategic CEO queries)
6. **Runtime is terminal** — Execution is the final consumer of all knowledge
