# Lume's Everywhere AI

**Fresh. Fast. Everywhere.**

---

## Vision

Lume's Everywhere AI is an AI Engineering Platform designed to build, orchestrate, and continuously evolve the Lume's digital ecosystem through standardized multi-agent architecture, context-driven intelligence, and engineering workflows.

---

## Purpose

The `.ai` directory serves as the single source of truth for all AI agents. It contains architecture, standards, specifications, playbooks, and engineering knowledge to ensure every AI agent works consistently, collaboratively, and according to the same principles.

> *Stronger Team Built Through Connection.*

---

## AI Reading Order

When an AI agent initialises, it must process information in this exact sequence—never randomly:

1. `README.md`
2. `ROADMAP.md`
3. `CONSTITUTION.md`
4. `PROJECT_CONTEXT.md`
5. `architecture/`
6. `standards/`
7. `specs/`
8. `playbooks/`
9. Task / User Request
10. Execute

---

## Folder Explanation

| Directory | Purpose |
|-----------|---------|
| `architecture/` | System design, component maps, and structural decisions |
| `specs/` | Implementation contracts—exactly what must be built |
| `playbooks/` | Standard operating procedures for each AI agent |
| `adr/` | Architecture Decision Records—all major project decisions |

---

## AI Rules

- AI **MUST NOT** invent architecture
- AI **MUST NOT** invent requirements
- AI **MUST NOT** invent APIs
- AI **MUST NOT** invent databases
- AI **MUST NOT** invent features
- Roadmap provides direction.

- Current Sprint provides execution.

- Architecture provides design.

- Constitution provides principles.

**If uncertain → Ask. Never assume.**  
This principle drastically reduces hallucination.

---

## Documentation Priority

When two documents conflict, the higher-priority source always wins:

1. **Constitution**
2. **Architecture**
3. **Specification**
4. **Playbook**
5. **Task**

*Example:* If a playbook says “React 18” but the architecture says “React 19”, follow the architecture.

---

## Workflow

Every engineering task follows this pipeline:
