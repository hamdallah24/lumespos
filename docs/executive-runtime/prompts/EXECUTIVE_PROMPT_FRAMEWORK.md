# Executive Prompt Framework (EPF)

**Version:** 1.0.0  
**Status:** STABLE  
**Last Updated:** 2026-07-13

---

## 1. Purpose

The Executive Prompt Framework (EPF) defines the architecture, composition, inheritance, and lifecycle of all System Prompts used by the 7 AI Executives (CEO, CTO, CFO, CMO, CAIO, CKO, COO).

EPF replaces all hand-written, organically grown prompts with a modular, deterministic, versioned framework derived entirely from EROS documentation.

---

## 2. Prompt Layers

```
┌────────────────────────────────────────────────────────────┐
│  LAYER 0: GLOBAL SYSTEM PROMPT                             │
│  Shared by ALL executives. Never changes per role.         │
│  Contains: Constitution, Safety Rules, Runtime Boundaries, │
│  Communication Protocol, Audit Rules, Knowledge Rules      │
├────────────────────────────────────────────────────────────┤
│  LAYER 1: EXECUTIVE CONSTITUTION                           │
│  Role-specific interpretation of the Constitution.         │
│  Contains: Role-specific ethics, authority limits,         │
│  decision scope, escalation rules                          │
├────────────────────────────────────────────────────────────┤
│  LAYER 2: EXECUTIVE IDENTITY                               │
│  Who the executive is. Derived from EXECUTIVE_SPEC.md.     │
│  Contains: Role, mission, vision, primary objective        │
├────────────────────────────────────────────────────────────┤
│  LAYER 3: EXECUTIVE CAPABILITIES                           │
│  What the executive can do. Derived from Capability Matrix │
│  and EXECUTIVE_SPEC.md.                                    │
│  Contains: Capability list, governance gates, delegation   │
├────────────────────────────────────────────────────────────┤
│  LAYER 4: DECISION RULES                                   │
│  How the executive makes decisions. Derived from Decision  │
│  Model and EXECUTIVE_SPEC.md.                              │
│  Contains: Confidence thresholds, decision lifecycle,      │
│  risk assessment                                           │
├────────────────────────────────────────────────────────────┤
│  LAYER 5: COMMUNICATION FORMAT                             │
│  How the executive communicates. Derived from              │
│  Communication Protocol and EXECUTIVE_SPEC.md.             │
│  Contains: Response format, language, style, signature     │
├────────────────────────────────────────────────────────────┤
│  LAYER 6: EXECUTION PROTOCOL                               │
│  How the executive executes. Derived from PLAYBOOK.md.     │
│  Contains: Pipeline stages, tool usage, verification       │
├────────────────────────────────────────────────────────────┤
│  LAYER 7: COLLABORATION RULES                              │
│  How the executive collaborates. Derived from              │
│  Collaboration Model.                                      │
│  Contains: Delegation targets, escalation paths, approval  │
├────────────────────────────────────────────────────────────┤
│  LAYER 8: OUTPUT FORMATTING                                │
│  How output is structured. Derived from Communication      │
│  Protocol and EXECUTIVE_SPEC.md.                           │
│  Contains: Schema, minimum length, required elements       │
├────────────────────────────────────────────────────────────┤
│  LAYER 9: FAILURE HANDLING                                 │
│  What to do when things go wrong. Derived from PLAYBOOK.md.│
│  Contains: Recovery strategies, error categories,          │
│  escalation on failure                                     │
├────────────────────────────────────────────────────────────┤
│  LAYER 10: SAFETY RULES                                    │
│  Hard constraints. Derived from Constitution + Handbook.   │
│  Contains: Forbidden patterns, anti-hallucination,         │
│  security rules, output limits                             │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Layer Independence

Each layer MUST be:
- **Independent** — No cross-layer imports at composition time
- **Replaceable** — A layer can be swapped without affecting others
- **Versionable** — Each layer has its own semantic version
- **Testable** — Each layer can be validated independently

Layer dependencies are ONE-WAY only:
```
Layer 0 ← Layer 1 ← Layer 2 ← ... ← Layer 10
```
Higher layers may reference lower layers, but lower layers NEVER reference higher layers.

---

## 4. Prompt Composition

The final System Prompt for any executive is built by:

```
SYSTEM_PROMPT(executive) =
    Layer 0: GLOBAL
  + Layer 1: CONSTITUTION(executive)
  + Layer 2: IDENTITY(executive)
  + Layer 3: CAPABILITIES(executive)
  + Layer 4: DECISION_RULES(executive)
  + Layer 5: COMMUNICATION(executive)
  + Layer 6: EXECUTION(executive)
  + Layer 7: COLLABORATION(executive)
  + Layer 8: OUTPUT(executive)
  + Layer 9: FAILURE(executive)
  + Layer 10: SAFETY(executive)
```

Each layer is a deterministic function: `Layer(executive_role) → string`.

---

## 5. Inheritance Hierarchy

```
GLOBAL_SYSTEM_PROMPT.md (Layer 0)
    │
    ├── CEO_SYSTEM_PROMPT.md (Layers 1-10 for CEO)
    ├── CTO_SYSTEM_PROMPT.md (Layers 1-10 for CTO)
    ├── CFO_SYSTEM_PROMPT.md (Layers 1-10 for CFO)
    ├── CMO_SYSTEM_PROMPT.md (Layers 1-10 for CMO)
    ├── CAIO_SYSTEM_PROMPT.md (Layers 1-10 for CAIO)
    ├── CKO_SYSTEM_PROMPT.md (Layers 1-10 for CKO)
    └── COO_SYSTEM_PROMPT.md (Layers 1-10 for COO)
```

Inheritance is **composition-based**, not class-based. Each executive prompt fully resolves all layers at authoring time. There is NO runtime concatenation of separate layer files.

---

## 6. Deterministic Generation

The final prompt is generated by:
1. Start with Layer 0 (GLOBAL) verbatim
2. For each Layer N (1-10), select the executive-specific content
3. Concatenate in order
4. No editing, no skipping, no reordering

```
generate_prompt(executive) = READ(GLOBAL) + CONTENT(executive, constitution)
    + CONTENT(executive, identity) + ... + CONTENT(executive, safety)
```

This is the **Prompt Composition Engine** (see PROMPT_COMPOSITION_ENGINE.md).

---

## 7. Source Mapping

Every section in the final prompt is traceable to exactly ONE source document:

| Layer | Source Document | Section |
|-------|----------------|---------|
| 0 | EXECUTIVE_CONSTITUTION.md | Core Principles, Ethics, Security |
| 0 | EXECUTIVE_RUNTIME_HANDBOOK.md | Dependency Rules, Runtime Boundaries |
| 0 | EXECUTIVE_COMMUNICATION_PROTOCOL.md | Audit section |
| 0 | EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md | Memory Access Patterns |
| 1 | EXECUTIVE_SPEC.md | Authority, Decision Scope, Non Scope |
| 1 | EXECUTIVE_CONSTITUTION.md | Escalation Rules (role-specific) |
| 2 | EXECUTIVE_SPEC.md | Mission, Vision, Primary Objective |
| 3 | EXECUTIVE_SPEC.md | Capabilities |
| 3 | EXECUTIVE_CAPABILITY_MATRIX.md | Governance Gates |
| 4 | EXECUTIVE_SPEC.md | Decision Scope |
| 4 | EXECUTIVE_DECISION_MODEL.md | Confidence Thresholds, Decision Lifecycle |
| 5 | EXECUTIVE_SPEC.md | Communication Style |
| 5 | EXECUTIVE_COMMUNICATION_PROTOCOL.md | Response Format |
| 6 | PLAYBOOK.md | Thinking Process, Decision Tree, Workflow |
| 7 | EXECUTIVE_COLLABORATION_MODEL.md | Interaction Pairs |
| 7 | EXECUTIVE_SPEC.md | Delegation Rules, Escalation Rules |
| 8 | EXECUTIVE_SPEC.md | Outputs section |
| 8 | EXECUTIVE_COMMUNICATION_PROTOCOL.md | Success/Failure Report format |
| 9 | PLAYBOOK.md | Recovery Strategy |
| 10 | EXECUTIVE_SPEC.md | Restrictions |
| 10 | EXECUTIVE_RUNTIME_HANDBOOK.md | Forbidden Dependencies |

---

## 8. Versioning

Each prompt follows Semantic Versioning per PROMPT_VERSIONING.md.

| Component | Version |
|-----------|---------|
| EPF Framework | 1.0.0 |
| GLOBAL_SYSTEM_PROMPT | 1.0.0 |
| CEO_SYSTEM_PROMPT | 1.0.0 |
| CTO_SYSTEM_PROMPT | 1.0.0 |
| CFO_SYSTEM_PROMPT | 1.0.0 |
| CMO_SYSTEM_PROMPT | 1.0.0 |
| CAIO_SYSTEM_PROMPT | 1.0.0 |
| CKO_SYSTEM_PROMPT | 1.0.0 |
| COO_SYSTEM_PROMPT | 1.0.0 |

---

## 9. Validation Rules

Every prompt MUST pass:
1. **No contradictions** — Rules in different layers must not conflict
2. **No duplicates** — Same rule must not appear in multiple layers
3. **Constitution alignment** — Must respect all Constitution rules
4. **Runtime boundary** — Must not reference `eios-runtime/internal/*`
5. **Capability consistency** — Capabilities must match Capability Matrix
6. **Source traceability** — Every section must trace to EROS documentation

---

## 10. Maintenance

- Update GLOBAL when Constitution changes
- Update executive-specific layers when SPEC changes
- Update execution layer when PLAYBOOK changes
- NEVER modify a prompt directly — always update the source document and regenerate
