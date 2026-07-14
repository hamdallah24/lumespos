# EROS Maintenance Guide

**Version:** 1.0.0  
**Last Updated:** 2026-07-13

---

## 1. Document Ownership

| Document | Owner | Review Frequency |
|----------|-------|-----------------|
| EXECUTIVE_RUNTIME_HANDBOOK.md | Runtime Architect | Quarterly or on Runtime changes |
| EXECUTIVE_OPERATING_MODEL.md | Runtime Architect | Quarterly |
| EXECUTIVE_CONSTITUTION.md | Governance Lead | Semi-annually |
| EXECUTIVE_COLLABORATION_MODEL.md | Runtime Architect | Quarterly or on collaboration changes |
| EXECUTIVE_CAPABILITY_MATRIX.md | Runtime Architect | On capability changes |
| EXECUTIVE_DECISION_MODEL.md | Runtime Architect | Quarterly |
| EXECUTIVE_COMMUNICATION_PROTOCOL.md | Runtime Architect | On protocol changes |
| EXECUTIVE_KNOWLEDGE_ARCHITECTURE.md | CKO + CAIO | Quarterly |
| SYSTEM_PROMPT_BLUEPRINT.md | Prompt Engineer | On prompt requirement changes |
| execs/{ROLE}/EXECUTIVE_SPEC.md | Executive Owner | On role changes |
| execs/{ROLE}/PLAYBOOK.md | Executive Owner | On execution pattern changes |
| EROS_DOCUMENTATION_INDEX.md | Runtime Architect | On any document change |
| EROS_VERSIONING_STRATEGY.md | Runtime Architect | Semi-annually |
| EROS_MAINTENANCE_GUIDE.md | Runtime Architect | Annually |
| EROS_DEPENDENCY_DIAGRAM.md | Runtime Architect | On dependency changes |
| EROS_GOVERNANCE_MATRIX.md | Governance Lead | On governance changes |
| EROS_EXECUTIVE_SUMMARY.md | Runtime Architect | On MAJOR version changes |

---

## 2. Consistency Validation

Run these checks when any EROS document changes:

### Automated Checks
- [ ] No duplicate executive role definitions
- [ ] All capability names match across documents
- [ ] All eventType values match across documents
- [ ] All KPI names are consistent
- [ ] All document versions match the current release version

### Manual Checks
- [ ] Executive SPEC restrictions are consistent with Constitution
- [ ] Delegation rules in SPEC match Collaboration Model
- [ ] Communication formats match Communication Protocol
- [ ] Capability matrix matches all SPECs
- [ ] Decision thresholds match Decision Model
- [ ] Knowledge types match Knowledge Architecture
- [ ] Prompt blueprint sections match all SPECs

---

## 3. Update Procedures

### Adding a New Executive
1. Create `executives/{ROLE}/` directory
2. Write `EXECUTIVE_SPEC.md` from template (see SYSTEM_PROMPT_BLUEPRINT.md)
3. Write `PLAYBOOK.md` from template
4. Update `EXECUTIVE_COLLABORATION_MODEL.md` — add interaction pairs
5. Update `EXECUTIVE_CAPABILITY_MATRIX.md` — add capabilities
6. Update `EXECUTIVE_RUNTIME_HANDBOOK.md` — add to executive list
7. Update `EROS_GOVERNANCE_MATRIX.md` — add governance rules
8. Update `EROS_DEPENDENCY_DIAGRAM.md` — add dependencies
9. Update `EROS_DOCUMENTATION_INDEX.md` — add to index
10. Bump MINOR version

### Updating an Existing Executive
1. Update `EXECUTIVE_SPEC.md` with changes
2. Update `PLAYBOOK.md` if execution patterns change
3. Check consistency with all other documents
4. Bump PATCH version (or MINOR if capabilities change)

### Changing Core Principles
1. Update `EXECUTIVE_CONSTITUTION.md`
2. Review all SPECs for alignment
3. Review all PLAYBOOKs for alignment
4. Update `SYSTEM_PROMPT_BLUEPRINT.md` if prompt structure changes
5. Bump MAJOR version

### Adding a Capability
1. Update `EXECUTIVE_CAPABILITY_MATRIX.md`
2. Update the owning executive's `EXECUTIVE_SPEC.md`
3. Update the owning executive's `PLAYBOOK.md` if relevant
4. Add to `EXECUTIVE_COLLABORATION_MODEL.md` if shared
5. Bump MINOR version

### Deprecating a Document
1. Mark header as `DEPRECATED`
2. Add deprecation notice at top: "This document is deprecated. See {replacement}."
3. Update Documentation Index
4. Add to archive
5. No version bump needed

---

## 4. Review Schedule

| Review Type | Frequency | Participants |
|-------------|-----------|--------------|
| Consistency audit | Monthly | Runtime Architect |
| Executive alignment | Quarterly | All executive owners |
| Constitution review | Semi-annually | Governance Lead |
| Full EROS audit | Annually | Runtime Architect + Governance Lead |
| Prompt blueprint review | On prompt changes | Prompt Engineer |

---

## 5. Tooling

Recommended tools for EROS maintenance:
- **Markdown linter** — For consistent formatting
- **Link checker** — For broken cross-references
- **Diff tool** — For version comparison
- **Table validator** — For consistent table structures

---

## 6. Common Maintenance Tasks

### Task: Verify Document Versions Match
Check all `**Version:**` headers in all documents match the current EROS version.

### Task: Update All Dates
When making changes, update `**Last Updated:**` in all affected documents.

### Task: Validate Cross-References
Ensure all `see {document}` references point to existing documents.

### Task: Sync Capability Matrix
When a capability is added/removed from an executive's SPEC, the Capability Matrix must be updated.

### Task: Sync Collaboration Pairs
When a new collaboration pair is documented, ensure it's added to both executives' SPEC Interaction Matrix.

### Task: Archive Deprecated Content
Move deprecated content to `docs/executive-runtime/archive/` with a clear deprecation notice.

---

## 7. Conflict Resolution

If two EROS documents contradict:
1. **Executive Constitution** takes precedence over all other documents
2. **Executive Runtime Handbook** takes precedence over operational documents
3. **EXECUTIVE_SPEC.md** takes precedence over PLAYBOOK.md for the same executive
4. **EXECUTIVE_COLLABORATION_MODEL.md** takes precedence over individual SPEC interaction matrices
5. **Source code** (implementation) takes precedence over documentation in case of contradiction (but this should be rare — documentation should match implementation)

Document the conflict resolution in the affected documents' changelogs.

---

## 8. Quality Criteria

Every EROS document must meet these quality criteria:

| Criterion | Standard |
|-----------|----------|
| Architecture-first | Every document must reference the architecture layer model |
| Runtime-aware | Every document must respect Runtime Core boundaries |
| Governance-driven | Constraints and rules must be explicitly stated |
| Maintainable | Tables, lists, and structured formats preferred over prose |
| Human-readable | Clear language, logical flow, appropriate for the audience |
| AI-readable | Structured formats, explicit field names, consistent schemas |
| Versionable | Version header, changelog, consistent versioning |
| Self-consistent | No internal contradictions, cross-references validated |
