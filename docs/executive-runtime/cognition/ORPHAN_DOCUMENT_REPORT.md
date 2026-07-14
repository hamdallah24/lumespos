# ORPHAN DOCUMENT REPORT — Documentation Without Runtime Consumers

## Criteria

A document is an **orphan** if:
- No runtime code reads it (no loader, no composer, no executor)
- No import/reference in any .ts file
- Only exists as a human-readable .md file

A document is **Human Only** if:
- It's a playbook, handbook, guide, or operator reference
- NOT intended for runtime consumption

---

## Total Documents: 96

| Classification | Count | Percentage |
|---|---|---|
| **Runtime Orphans** | 35 | 36% |
| **Human Only** (by design) | 12 | 12% |
| **Developer Only** | 31 | 32% |
| **Runtime Adopted** | 18 | 19% |

---

## Runtime Orphans (35 docs — have NO runtime consumer but SHOULD)

### Knowledge System (6 docs)
| # | Document | Should Be Consumed By | Gap |
|---|---|---|---|
| K1 | EXECUTIVE_KNOWLEDGE_TAXONOMY.md | Knowledge Engine (knowledge-graph.ts) | Taxonomy not used for graph classification |
| K2 | KNOWLEDGE_LIFECYCLE.md | Knowledge Engine (knowledge-lifecycle.ts) | Lifecycle doc ≠ lifecycle.ts code |
| K3 | KNOWLEDGE_VALIDATION_RULES.md | Knowledge Governor (knowledge-governor.ts) | Validation rules not enforced |
| K4 | KNOWLEDGE_QUALITY_MODEL.md | Knowledge Metrics (knowledge-metrics.ts) | Quality model not measured |
| K5 | KNOWLEDGE_RETRIEVAL_MODEL.md | Knowledge Loader (knowledge-loader.ts) | 8-stage pipeline not implemented |
| K6 | KNOWLEDGE_CLASSIFICATION.md | Knowledge Graph (knowledge-graph.ts) | 5D classification not used |

### Cognitive System (3 docs)
| # | Document | Should Be Consumed By | Gap |
|---|---|---|---|
| CG1 | COGNITIVE_CONTRACTS.md | Cognitive Engine | Doc is human reference; TS code is runtime |
| CG2 | COGNITIVE_ENGINE.md | Cognitive Engine | Doc is human reference |
| CG3 | COGNITIVE_PIPELINE.md | Cognitive Pipeline | Doc is human reference |

### Executive References (6 docs)
| # | Document | Should Be Consumed By | Gap |
|---|---|---|---|
| R1 | EXECUTIVE_OPERATING_MODEL.md | Executive Runtime | No loader for operating model |
| R2 | EXECUTIVE_DECISION_MODEL.md | DecisionPattern.ts | Decision model not formalized |
| R3 | EXECUTIVE_COMMUNICATION_PROTOCOL.md | Collaboration Runtime | Protocol not enforced |
| R6 | EXECUTIVE_COLLABORATION_MODEL.md | Collaboration Runtime | Not loaded |
| R7 | EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md | Knowledge Engine | Not loaded |
| R10 | PROMPT_INHERITANCE.md | Prompt Assembler | Inheritance rules not implemented |

### Blueprints (5 docs)
| # | Document | Should Be Consumed By | Gap |
|---|---|---|---|
| B1 | SYSTEM_PROMPT_BLUEPRINT.md | Prompt System | Blueprint not driving implementation |
| B2 | PROMPT_BLUEPRINT.md | Prompt System | Blueprint not driving implementation |
| B3 | PROMPT_COMPOSITION_ENGINE.md | Prompt Assembler | Composition not implemented as doc |
| B4 | COGNITIVE_PIPELINE.md | Cognitive Pipeline | Doc ≠ TS code (doc is reference) |
| B5 | KNOWLEDGE_COMPOSITION_ENGINE.md | Knowledge Engine | Not implemented |

### Specs (7 docs)
| # | Document | Should Be Consumed By | Gap |
|---|---|---|---|
| S1-S7 | All EXECUTIVE_SPECs | Executive Runtime | Not loaded by FS; info partly in config.ts |

### Guides (3 docs)
| # | Document | Should Be Consumed By | Gap |
|---|---|---|---|
| G1 | EROS_MAINTENANCE_GUIDE.md | Operator | Human only |
| G3 | PROMPT_VERSIONING.md | Prompt System | Versioning not enforced by loader |
| G2 | EROS_VERSIONING_STRATEGY.md | Executive Runtime | Not enforced |

### Other (6 docs)
| # | Document | Gap |
|---|---|---|
| O1 | EXECUTIVE_PROMPT_FRAMEWORK.md | Framework description, not consumed |
| O2 | PROJECT_CONTEXT.md | Misplaced — should be root; .ai/ expected by loader |
| O3 | EXECUTIVE_CONFIGURATION.md | Config mirrored in config.ts but doc not loaded |
| O5 | EIOS_EVENT_CATALOG.md | Event catalog not enforced by event system |
| O6 | audit-checklist.md | Human reference |
| O7 | module-registry.md | Registry not driven by this doc |

---

## Human Only (12 docs — by design, NOT orphans)

| # | Document | Reason |
|---|---|---|
| H1 | EXECUTIVE_RUNTIME_HANDBOOK.md | Human operator handbook |
| H3 | EXECUTIVE_COGNITIVE_HANDBOOK.md | Human reference |
| PL1-PL7 | All 7 PLAYBOOKs | Operator instructions per executive |
| G4 | EIOS_OPERATIONS_GUIDE.md | Operations manual |
| R12 | EROS_DOCUMENTATION_INDEX.md | Doc index for humans |

---

## Developer Only (31 docs — used for development reference)

Includes all prompt framework docs (PROMPT_AUDIT, PROMPT_BLUEPRINT, etc.),
all ADR-001-008, all audit reports, all EIOS docs, all architecture docs.

These are intentionally Developer Only and do NOT need runtime adoption,
but represent **documentation debt** that should be tracked.

---

## Critical Orphans (demand immediate adoption)

| # | Document | Reason for Critical |
|---|---|---|
| K1 | EXECUTIVE_KNOWLEDGE_TAXONOMY.md | Core knowledge structure NOT driving graph |
| K5 | KNOWLEDGE_RETRIEVAL_MODEL.md | Core retrieval logic NOT implemented |
| M1 | EXECUTIVE_CAPABILITY_MATRIX.md | 3/7 executives missing from code |
| R3 | EXECUTIVE_COMMUNICATION_PROTOCOL.md | Collaboration protocol NOT enforced |
| L1/L3 | Mental Model duplicate | EKS has 46, ECS has 20 — divergent truths |

## Summary

| Status | Count |
|---|---|
| Runtime Orphans (should be adopted) | 35 |
| Human Only (by design) | 12 |
| Developer Only (reference) | 31 |
| Runtime Adopted | 18 |
| **Total** | **96** |
