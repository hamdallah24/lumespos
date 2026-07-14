# EROS Documentation Index

**Version:** 1.0.0  
**Last Updated:** 2026-07-13

---

## Directory Structure

```
docs/executive-runtime/
│
├── EXECUTIVE_RUNTIME_HANDBOOK.md           # Phase 1 — Runtime architecture reference
├── EXECUTIVE_OPERATING_MODEL.md            # Phase 2 — Full executive lifecycle
├── EXECUTIVE_CONSTITUTION.md               # Phase 3 — Core principles and rules
├── EXECUTIVE_COLLABORATION_MODEL.md        # Phase 5 — All executive pair interactions
├── EXECUTIVE_CAPABILITY_MATRIX.md          # Phase 6 — Capability ownership and sharing
├── EXECUTIVE_DECISION_MODEL.md             # Phase 7 — Decision lifecycle and rules
├── EXECUTIVE_COMMUNICATION_PROTOCOL.md     # Phase 8 — Message formats and protocols
├── EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md     # Phase 11 — Knowledge types and flow
├── SYSTEM_PROMPT_BLUEPRINT.md              # Phase 10 — System prompt structure template
├── EROS_DOCUMENTATION_INDEX.md             # ← YOU ARE HERE
├── EROS_VERSIONING_STRATEGY.md             # Versioning rules
├── EROS_MAINTENANCE_GUIDE.md               # Maintenance procedures
├── EROS_DEPENDENCY_DIAGRAM.md              # Dependency visualization
├── EROS_GOVERNANCE_MATRIX.md               # Governance rules per executive
├── EROS_EXECUTIVE_SUMMARY.md               # Executive summary of EROS
│
└── executives/
    ├── CEO/
    │   ├── EXECUTIVE_SPEC.md               # Phase 4 — CEO specification
    │   └── PLAYBOOK.md                     # Phase 9 — CEO playbook
    ├── CTO/
    │   ├── EXECUTIVE_SPEC.md               # Phase 4 — CTO specification
    │   └── PLAYBOOK.md                     # Phase 9 — CTO playbook
    ├── CFO/
    │   ├── EXECUTIVE_SPEC.md               # Phase 4 — CFO specification
    │   └── PLAYBOOK.md                     # Phase 9 — CFO playbook
    ├── CMO/
    │   ├── EXECUTIVE_SPEC.md               # Phase 4 — CMO specification
    │   └── PLAYBOOK.md                     # Phase 9 — CMO playbook
    ├── CAIO/
    │   ├── EXECUTIVE_SPEC.md               # Phase 4 — CAIO specification
    │   └── PLAYBOOK.md                     # Phase 9 — CAIO playbook
    ├── CKO/
    │   ├── EXECUTIVE_SPEC.md               # Phase 4 — CKO specification
    │   └── PLAYBOOK.md                     # Phase 9 — CKO playbook
    └── COO/
        ├── EXECUTIVE_SPEC.md               # Phase 4 — COO specification
        └── PLAYBOOK.md                     # Phase 9 — COO playbook
```

---

## Document Map

### Core Documents (required reading for all)
| Document | Pages | Reading Time | Priority |
|----------|-------|-------------|----------|
| EXECUTIVE_RUNTIME_HANDBOOK.md | ~25 | 15 min | ★★★★★ |
| EXECUTIVE_CONSTITUTION.md | ~15 | 10 min | ★★★★★ |
| EXECUTIVE_OPERATING_MODEL.md | ~15 | 10 min | ★★★★☆ |

### Architecture Documents
| Document | Primary Audience | Priority |
|----------|-----------------|----------|
| EXECUTIVE_COLLABORATION_MODEL.md | All executives | ★★★★☆ |
| EXECUTIVE_CAPABILITY_MATRIX.md | Engineers, Architects | ★★★★☆ |
| EXECUTIVE_DECISION_MODEL.md | All executives | ★★★★☆ |
| EXECUTIVE_DEPENDENCY_DIAGRAM.md | Engineers | ★★★☆☆ |
| EXECUTIVE_GOVERNANCE_MATRIX.md | Governance | ★★★☆☆ |

### Protocol Documents
| Document | Primary Audience | Priority |
|----------|-----------------|----------|
| EXECUTIVE_COMMUNICATION_PROTOCOL.md | All executives | ★★★★☆ |
| EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md | CKO, CAIO, Engineers | ★★★★☆ |
| SYSTEM_PROMPT_BLUEPRINT.md | Prompt Engineers | ★★★★★ |

### Executive-Specific Documents
| Executive | SPEC | PLAYBOOK |
|-----------|------|----------|
| CEO | EXECUTIVE_SPEC.md | PLAYBOOK.md |
| CTO | EXECUTIVE_SPEC.md | PLAYBOOK.md |
| CFO | EXECUTIVE_SPEC.md | PLAYBOOK.md |
| CMO | EXECUTIVE_SPEC.md | PLAYBOOK.md |
| CAIO | EXECUTIVE_SPEC.md | PLAYBOOK.md |
| CKO | EXECUTIVE_SPEC.md | PLAYBOOK.md |
| COO | EXECUTIVE_SPEC.md | PLAYBOOK.md |

### Operational Documents
| Document | Purpose |
|----------|---------|
| EROS_VERSIONING_STRATEGY.md | Versioning rules for EROS documentation |
| EROS_MAINTENANCE_GUIDE.md | How to maintain EROS documents |
| EROS_EXECUTIVE_SUMMARY.md | High-level summary of EROS |

---

## Reading Paths

### For Human Engineers
1. EXECUTIVE_RUNTIME_HANDBOOK.md (understand architecture)
2. EXECUTIVE_CONSTITUTION.md (understand rules)
3. EXECUTIVE_OPERATING_MODEL.md (understand lifecycle)
4. Relevant EXECUTIVE_SPEC.md (understand specific executive)
5. Relevant PLAYBOOK.md (understand execution patterns)

### For AI Engineers / Prompt Engineers
1. SYSTEM_PROMPT_BLUEPRINT.md (understand prompt structure)
2. EXECUTIVE_CONSTITUTION.md (understand rules)
3. All EXECUTIVE_SPEC.md (understand executive roles)
4. All PLAYBOOK.md (understand thinking processes)
5. EXECUTIVE_COMMUNICATION_PROTOCOL.md (understand message formats)

### For CTO Agent / System Architect
1. EXECUTIVE_RUNTIME_HANDBOOK.md (understand architecture)
2. EROS_DEPENDENCY_DIAGRAM.md (understand dependencies)
3. EROS_GOVERNANCE_MATRIX.md (understand governance)
4. EXECUTIVE_CAPABILITY_MATRIX.md (understand capability model)
5. EXECUTIVE_COLLABORATION_MODEL.md (understand collaboration)
6. EROS_MAINTENANCE_GUIDE.md (understand maintenance)

### For Executive Runtime (AI)
1. EXECUTIVE_CONSTITUTION.md (behavioral rules)
2. EXECUTIVE_SPEC.md (role-specific definition)
3. PLAYBOOK.md (execution patterns)
4. EXECUTIVE_COMMUNICATION_PROTOCOL.md (protocols)
5. EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md (memory)

---

## Cross-Reference Table

| Concept | Primary Document | Secondary |
|---------|-----------------|-----------|
| Architecture | EXECUTIVE_RUNTIME_HANDBOOK.md | EIOS_ARCHITECTURE.md |
| Lifecycle | EXECUTIVE_OPERATING_MODEL.md | EXECUTIVE_RUNTIME_HANDBOOK.md |
| Principles | EXECUTIVE_CONSTITUTION.md | EXECUTIVE_DECISION_MODEL.md |
| Dispatch | EXECUTIVE_RUNTIME_HANDBOOK.md | ExecutiveDispatchRegistry source |
| Decision | EXECUTIVE_DECISION_MODEL.md | EXECUTIVE_CONSTITUTION.md |
| Delegation | EXECUTIVE_COLLABORATION_MODEL.md | EXECUTIVE_DECISION_MODEL.md |
| Communication | EXECUTIVE_COMMUNICATION_PROTOCOL.md | EXECUTIVE_SPEC.md |
| Capabilities | EXECUTIVE_CAPABILITY_MATRIX.md | EXECUTIVE_SPEC.md |
| Knowledge | EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md | KnowledgePlatform source |
| System Prompts | SYSTEM_PROMPT_BLUEPRINT.md | All SPECs + PLAYBOOKs |
| Governance | EROS_GOVERNANCE_MATRIX.md | GovernanceProvider source |
| Dependencies | EROS_DEPENDENCY_DIAGRAM.md | EXECUTIVE_RUNTIME_HANDBOOK.md |
| Maintenance | EROS_MAINTENANCE_GUIDE.md | All documents |
| Versioning | EROS_VERSIONING_STRATEGY.md | All documents |

---

## Related External Documents

| Document | Location | Relationship |
|----------|----------|-------------|
| EIOS_ARCHITECTURE.md | `docs/EIOS_ARCHITECTURE.md` | Runtime Core architecture (FROZEN) |
| EPIC-O-FINAL-DELIVERABLE.md | `docs/EPIC-O-FINAL-DELIVERABLE.md` | Runtime Core freeze report |
| ADR-001 through ADR-008 | `docs/architecture/` | Architecture Decision Records |
| Source: ExecutiveDispatchRegistry | `src/eios-runtime/public/ExecutiveDispatchRegistry.ts` | Dispatch implementation |
| Source: RuntimeFacade | `src/eios-runtime/internal/runtime-security/RuntimeFacade.ts` | Facade implementation |
| Source: PipelineContracts | `src/eios-runtime/contracts/PipelineContracts.ts` | Type contracts |
