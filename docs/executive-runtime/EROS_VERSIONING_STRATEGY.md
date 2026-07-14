# EROS Versioning Strategy

**Version:** 1.0.0  
**Last Updated:** 2026-07-13

---

## Versioning Model

EROS follows **Semantic Versioning** (MAJOR.MINOR.PATCH) with a documentation-specific interpretation.

### Version Format
```
EROS v{MAJOR}.{MINOR}.{PATCH}
```

### Version Components

| Component | When to Increment | Example |
|-----------|-------------------|---------|
| **MAJOR** | Breaking changes to Executive Constitution, Runtime boundaries, or dispatch model | 2.0.0 |
| **MINOR** | New executive added, new capability, new protocol format | 1.1.0 |
| **PATCH** | Corrections, clarifications, non-breaking updates | 1.0.1 |

---

## Version Rules

### Rule 1: EROS Version = Highest Document Version
The EROS version is the maximum of all individual document versions.

### Rule 2: All Documents Share the Same MAJOR.MINOR
All documents within a release must share the same MAJOR.MINOR version. Only PATCH can differ between documents.

### Rule 3: Breaking Changes Require MAJOR Bump
Breaking changes include:
- Changes to Core Principles in the Constitution
- Changes to dispatch or communication protocols
- Changes to runtime boundaries (adding/removing routes)
- Changes to executive roles or responsibilities
- Changes to capability ownership (who owns what)

### Rule 4: Additive Changes Require MINOR Bump
Additive changes include:
- New executive added
- New capability added
- New collaboration pair documented
- New communication format
- New knowledge type

### Rule 5: Corrections Require PATCH Bump
Patch changes include:
- Typo fixes
- Clarifications
- Examples added
- Formatting improvements
- Updated source references

---

## Version Lifecycle

```
DRAFT → REVIEW → STABLE → DEPRECATED → ARCHIVED
```

| Stage | Description | Version Suffix |
|-------|-------------|----------------|
| DRAFT | Under development, may change | `vX.Y.Z-draft` |
| REVIEW | Under review by stakeholders | `vX.Y.Z-rc.N` |
| STABLE | Released and in use | `vX.Y.Z` |
| DEPRECATED | Superseded but still valid | `vX.Y.Z-deprecated` |
| ARCHIVED | No longer in use, historical only | `vX.Y.Z-archived` |

---

## Document Headers

Every EROS document MUST include:

```markdown
# Document Title
**Version:** X.Y.Z
**Status:** STABLE | DRAFT | DEPRECATED
**Last Updated:** YYYY-MM-DD
```

---

## Changelog Convention

Each document MAY include a version history table at the end:

```markdown
## Version History
| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-13 | Initial version |
```

---

## Cross-Document Consistency

When updating:
1. **Update the specific document** — Bump its version
2. **Update the Documentation Index** — Record the new version
3. **Update cross-references** — Ensure all documents reference the same concepts consistently
4. **Check for contradictions** — No document should contradict another

### Consistency Checklist
- [ ] Capabilities listed in SPEC match Capability Matrix
- [ ] Delegation rules in SPEC match Collaboration Model
- [ ] Communication formats in SPEC match Communication Protocol
- [ ] Decision thresholds in SPEC match Decision Model
- [ ] Restrictions in SPEC match Handbook and Constitution
- [ ] Knowledge types in SPEC match Knowledge Architecture
- [ ] Prompt structure in SPEC matches System Prompt Blueprint

---

## Release Process

```
1. Version bump decision (MAJOR/MINOR/PATCH)
2. Update all affected documents
3. Cross-reference consistency check
4. Update Documentation Index
5. Update all document version headers
6. Create changelog entry
7. Tag release in repository: "erosion-v{MAJOR}.{MINOR}.{PATCH}"
8. Notify stakeholders
```

---

## Current Version

| Component | Version | Status |
|-----------|---------|--------|
| EROS Overall | 1.0.0 | STABLE |
| Executive Runtime Handbook | 1.0.0 | STABLE |
| Executive Operating Model | 1.0.0 | STABLE |
| Executive Constitution | 1.0.0 | STABLE |
| Executive Collaboration Model | 1.0.0 | STABLE |
| Executive Capability Matrix | 1.0.0 | STABLE |
| Executive Decision Model | 1.0.0 | STABLE |
| Executive Communication Protocol | 1.0.0 | STABLE |
| Executive Knowledge Architecture | 1.0.0 | STABLE |
| System Prompt Blueprint | 1.0.0 | STABLE |
| Documentation Index | 1.0.0 | STABLE |
| Versioning Strategy | 1.0.0 | STABLE |
| Maintenance Guide | 1.0.0 | STABLE |
| Dependency Diagram | 1.0.0 | STABLE |
| Governance Matrix | 1.0.0 | STABLE |
| Executive Summary | 1.0.0 | STABLE |

| Executive SPEC | Version | Status |
|----------------|---------|--------|
| CEO Specification | 1.0.0 | STABLE |
| CTO Specification | 1.0.0 | STABLE |
| CFO Specification | 1.0.0 | STABLE |
| CMO Specification | 1.0.0 | STABLE |
| CAIO Specification | 1.0.0 | STABLE |
| CKO Specification | 1.0.0 | STABLE |
| COO Specification | 1.0.0 | STABLE |

| Executive Playbook | Version | Status |
|-------------------|---------|--------|
| CEO Playbook | 1.0.0 | STABLE |
| CTO Playbook | 1.0.0 | STABLE |
| CFO Playbook | 1.0.0 | STABLE |
| CMO Playbook | 1.0.0 | STABLE |
| CAIO Playbook | 1.0.0 | STABLE |
| CKO Playbook | 1.0.0 | STABLE |
| COO Playbook | 1.0.0 | STABLE |
