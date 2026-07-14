# DOCUMENT CONSUMER MATRIX — Who reads what

## Consumer Types

| Code | Consumer | Description |
|---|---|---|
| PC | Prompt Composer | Prompt Assembler + Foundation Loader (runtime) |
| CE | Cognitive Engine | CognitivePipeline (runtime, src/executive-runtime/cognition/) |
| KE | Knowledge Engine | Knowledge Loader + Knowledge Graph (runtime) |
| ER | Executive Runtime | Executive programs (CEOProgram, CTOProgram, etc.) |
| RF | RuntimeFacade | EIOS public API (eios-runtime/public/) |
| DV | Developer | Human reading docs for understanding |
| HO | Human Only | Documents intended for human operators |
| NO | Nobody | No identified consumer |

---

## Consumer Matrix (96 documents)

| # | Document | Category | Consumer(s) | Status |
|---|---|---|---|---|
| H1 | EXECUTIVE_RUNTIME_HANDBOOK | Handbook | HO | Human Only |
| H2 | EXECUTIVE_KNOWLEDGE_HANDBOOK_STRUCTURE | Handbook | DV | Developer Only (implementation guide) |
| H3 | EXECUTIVE_COGNITIVE_HANDBOOK | Handbook | HO | Human Only |
| C1 | EXECUTIVE_CONSTITUTION | Constitution | DV, HO | Human + Developer |
| B1 | SYSTEM_PROMPT_BLUEPRINT | Blueprint | DV | Developer Only |
| B2 | PROMPT_BLUEPRINT | Blueprint | DV | Developer Only |
| B3 | PROMPT_COMPOSITION_ENGINE | Blueprint | DV | Developer Only |
| B4 | COGNITIVE_PIPELINE | Blueprint | CE | Runtime *(CognitivePipeline.ts implements it)* |
| B5 | KNOWLEDGE_COMPOSITION_ENGINE | Blueprint | KE | Runtime *(Knowledge Loader reference)* |
| S1-S7 | EXECUTIVE_SPEC (all 7) | Spec | PC, ER | Runtime *(used by Prompt Assembler fields)* |
| P1 | GLOBAL_SYSTEM_PROMPT | Prompt | PC | Runtime *(used by Prompt Assembler)* |
| P2-P8 | SYSTEM_PROMPT (per executive) | Prompt | PC | Runtime *(role-specific prompt injection)* |
| A1 | ADR-009 (knowledge unification) | ADR | DV | Developer Only (PROPOSED) |
| A2-A9 | ADR-001 through ADR-008 (Set A) | ADR | DV, RF | Runtime *(architecture decisions adopted)* |
| K1 | EXECUTIVE_KNOWLEDGE_TAXONOMY | Knowledge | DV | Developer Only (not loaded by FS) |
| K2 | KNOWLEDGE_LIFECYCLE | Knowledge | DV | Developer Only |
| K3 | KNOWLEDGE_VALIDATION_RULES | Knowledge | DV | Developer Only |
| K4 | KNOWLEDGE_QUALITY_MODEL | Knowledge | DV | Developer Only |
| K5 | KNOWLEDGE_RETRIEVAL_MODEL | Knowledge | DV | Developer Only |
| K6 | KNOWLEDGE_CLASSIFICATION | Knowledge | DV | Developer Only |
| CG1 | COGNITIVE_CONTRACTS | Cognitive | DV | Developer Only |
| CG2 | COGNITIVE_ENGINE | Cognitive | DV | Developer Only |
| CG3 | COGNITIVE_PIPELINE | Cognitive | DV | Developer Only |
| PL1-PL7 | PLAYBOOK (all 7) | Playbook | HO | Human Only (operator instructions) |
| M1 | EXECUTIVE_CAPABILITY_MATRIX | Matrix | PC, ER | Runtime *(partially — only CEO, CTO, COO in code)* |
| M2 | EROS_GOVERNANCE_MATRIX | Matrix | DV, ER | Developer + Partial Runtime |
| M3 | KNOWLEDGE_OWNERSHIP_MATRIX | Matrix | DV | Developer Only |
| M4 | EPIC_S_FINAL_REPORT | Matrix | DV | Developer Only |
| L1 | EXECUTIVE_MENTAL_MODEL_LIBRARY | Library | CE | Runtime *(MentalModelSelector)* |
| L2 | EXECUTIVE_FRAMEWORK_LIBRARY | Library | CE | Runtime *(FrameworkSelector)* |
| L3 | MENTAL_MODEL_LIBRARY (cognition) | Library | CE | Runtime *(duplicates L1)* |
| L4 | FRAMEWORK_LIBRARY (cognition) | Library | CE | Runtime *(duplicates L2)* |
| L5 | THINKING_MODE_REFERENCE | Library | CE | Runtime *(ThinkingMode.ts)* |
| R1 | EXECUTIVE_OPERATING_MODEL | Reference | HO | Human Only |
| R2 | EXECUTIVE_DECISION_MODEL | Reference | HO | Human Only |
| R3 | EXECUTIVE_COMMUNICATION_PROTOCOL | Reference | HO | Human Only |
| R4 | EROS_EXECUTIVE_SUMMARY | Reference | HO | Human Only |
| R5 | EROS_DEPENDENCY_DIAGRAM | Reference | DV | Developer Only |
| R6 | EXECUTIVE_COLLABORATION_MODEL | Reference | HO | Human Only |
| R7 | EXECUTIVE_KNOWLEDGE_ARCHITECTURE | Reference | DV | Developer Only |
| R8 | KNOWLEDGE_DEPENDENCY_DIAGRAM | Reference | DV | Developer Only |
| R9 | PROMPT_VALIDATION | Reference | DV | Developer Only |
| R10 | PROMPT_INHERITANCE | Reference | DV | Developer Only |
| R11 | DECISION_PATTERN_REFERENCE | Reference | CE | Runtime *(DecisionPattern.ts)* |
| R12 | EROS_DOCUMENTATION_INDEX | Reference | HO | Human Only |
| R13 | EIOS_API_REFERENCE | Reference | DV | Developer Only |
| R14 | EIOS_ARCHITECTURE | Reference | DV | Developer Only |
| G1 | EROS_MAINTENANCE_GUIDE | Guide | HO | Human Only |
| G2 | EROS_VERSIONING_STRATEGY | Guide | DV | Developer Only |
| G3 | PROMPT_VERSIONING | Guide | DV | Developer Only |
| G4 | EIOS_OPERATIONS_GUIDE | Guide | HO | Human Only |
| AR1 | EXECUTIVE_KNOWLEDGE_AUDIT | Audit | DV | Developer Only |
| AR2 | FINAL_AUDIT_REPORT (EKS) | Audit | DV | Developer Only |
| AR3 | PROMPT_AUDIT | Audit | DV | Developer Only |
| AR4 | FINAL_REPORT (ECS) | Audit | DV | Developer Only |
| AR5 | EIOS_ARCHITECTURE | Report | DV | Developer Only |
| AR6 | EIOS_v4.1_IMPLEMENTATION | Report | DV | Developer Only |
| I1 | PROMPT_INDEX | Index | DV | Developer Only |
| I2 | EROS_DOCUMENTATION_INDEX | Index | HO | Human Only |
| O1 | EXECUTIVE_PROMPT_FRAMEWORK | Framework | DV | Developer Only |
| O2 | PROJECT_CONTEXT | Context | DV | Developer Only *(misplaced — should be root)* |
| O3 | EXECUTIVE_CONFIGURATION | Config | DV | Developer Only |
| O4 | GOVERNANCE_POLICIES | Policy | DV | Developer Only |
| O5 | EIOS_EVENT_CATALOG | Catalog | DV | Developer Only |
| O6 | audit-checklist.md | Checklist | DV | Developer Only |
| O7 | module-registry.md | Registry | DV | Developer Only |
| E1 | ARCHITECTURE.md (in execution/) | Architecture | DV | Developer Only |
| E2 | MISSION_AUTHORITY.md | Reference | DV | Developer Only |

---

## Summary by Consumer

| Consumer | Document Count | Percentage |
|---|---|---|
| **Runtime** (PC + CE + KE + ER + RF) | 19 | 20% |
| **Developer Only** (DV) | 50 | 52% |
| **Human Only** (HO) | 12 | 12% |
| **Human + Developer** (HO+DV) | 1 | 1% |
| **Nobody** (NO) | 14 | 15% |

## Key Findings

1. **66% of documents are Human or Developer Only** — not consumed by runtime
2. **Only 20% are Runtime consumers** — documents actually read by running code
3. **All 6 Knowledge documents (K1-K6) are Developer Only** — Knowledge System docs are NOT consumed by runtime; they exist as blueprints
4. **All 3 Cognitive document docs (CG1-CG3) are Developer Only** — docs are separate from the TypeScript implementation
5. **All 7 Playbooks (PL1-PL7) are Human Only** — never read by runtime
6. **Both mental model libraries (L1, L3) and framework libraries (L2, L4) are duplicates** — they exist in both EKS and ECS, with ECS version being the one actually compiled into TypeScript
7. **All 8 SYSTEM_PROMPT files are Runtime** — consumed by Prompt Assembler
7. **capability-domain.ts (runtime) has a HARDCODED matrix** — only covers CEO, CTO, COO — ignores the full EXECUTIVE_CAPABILITY_MATRIX.md document (M1)
8. **runtime-domain.ts has a HARDCODED directive map** — only covers CEO, CTO, COO, CFO — ignores CMO, CAIO, CKO
