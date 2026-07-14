# ADOPTION ROADMAP — Closing the gap between documentation and runtime

## Phase 1: Foundation (Week 1) — P0 Critical

| Step | Action | Effort | Dependencies | Owner |
|---|---|---|---|---|
| 1.1 | Create `.ai/` directory structure: `foundation/`, `runtime/`, `adr/` | 2h | — | EROS |
| 1.2 | Add YAML frontmatter to GLOBAL_SYSTEM_PROMPT.md with `id: global-system-prompt-v1` | 1h | 1.1 | Prompt |
| 1.3 | Add YAML frontmatter to all 7 executive SYSTEM_PROMPT.md files | 3h | 1.1 | Prompt |
| 1.4 | Add YAML frontmatter to EXECUTIVE_CONSTITUTION.md | 1h | 1.1 | EROS |
| 1.5 | Add YAML frontmatter to EXECUTIVE_CAPABILITY_MATRIX.md | 1h | 1.1 | EROS |
| 1.6 | Copy or symlink relevant docs into `.ai/` directories | 2h | 1.2-1.5 | EROS |
| 1.7 | Wire CognitiveEngine into executive-runtime/index.ts | 2h | — | ECS |
| 1.8 | Add `cognition/` export to executive-runtime/index.ts | 1h | 1.7 | ECS |
| **Phase 1 Total** | | **13h** | | |

### Verification
- `foundationLoader.load()` returns > 5 assets
- `knowledgeGraph.build().stats.totalNodes > 0`
- `promptAssembler.assemble()` includes Foundation Context with content

---

## Phase 2: Identity & Directives (Week 2) — P1 High

| Step | Action | Effort | Dependencies | Owner |
|---|---|---|---|---|
| 2.1 | Add CAIO identity to identity.ts | 0.5h | — | Runtime |
| 2.2 | Add CKO identity to identity.ts | 0.5h | — | Runtime |
| 2.3 | Add CMO, CAIO, CKO to runtime-domain.ts ROLE_DIRECTIVE_MAP | 1h | — | Runtime |
| 2.4 | Add authority/forbidden/required/delegate for CMO, CAIO, CKO | 2h | 2.3 | Runtime |
| 2.5 | Add capabilities for CFO, CMO, CAIO, CKO, CHRO, CIO to capability-domain.ts | 2h | — | Runtime |

**Phase 2 Total** | | **6h** | | |

### Verification
- `getIdentity("CAIO")` returns valid identity
- `getIdentity("CKO")` returns valid identity
- `runtimeDomain.directive("CMO")` returns non-null
- `capabilityDomain.getForRole("CFO").length > 0`

---

## Phase 3: Knowledge Adoption (Weeks 3-4) — P1+P2 Medium

| Step | Action | Effort | Dependencies | Owner |
|---|---|---|---|---|
| 3.1 | Reconcile Mental Model Library (add missing 26 models to ECS TypeScript) | 4h | — | ECS |
| 3.2 | Reconcile Framework Library (add missing 2 frameworks to ECS TypeScript) | 1h | — | ECS |
| 3.3 | Rename ADR Set A → WADR-001 through WADR-008 | 1h | — | EIOS |
| 3.4 | Map knowledge-graph domains to taxonomy branches | 3h | 1.1 | EKS |
| 3.5 | Align knowledge-lifecycle.ts with KNOWLEDGE_LIFECYCLE.md | 4h | — | EKS |
| 3.6 | Implement retrieval pipeline from KNOWLEDGE_RETRIEVAL_MODEL.md | 8h | 3.4 | EKS |
| 3.7 | Add YAML frontmatter to relevant knowledge docs | 2h | 1.1 | EKS |

**Phase 3 Total** | | **23h** | | |

### Verification
- `getAllMentalModels().length === 46`
- `getAllFrameworks().length === 29`
- No ADR number collisions
- `knowledgeGraph.build()` nodes classified by taxonomy

---

## Phase 4: Cognitive Integration (Week 5) — P2+P3

| Step | Action | Effort | Dependencies | Owner |
|---|---|---|---|---|
| 4.1 | Integrate CognitiveEngine into CEOProgram.ts | 4h | 1.7, 1.8 | ECS |
| 4.2 | Integrate CognitiveEngine into CTOProgram.ts | 4h | 4.1 | ECS |
| 4.3 | Integrate into remaining 5 executive programs | 10h | 4.1 | ECS |
| 4.4 | Wire EvidenceBuilder to Knowledge Loader | 4h | 3.6 | ECS |
| 4.5 | Make ConfidenceEngine weights configurable per profile | 2h | — | ECS |
| 4.6 | Create Communication Governor for protocol enforcement | 8h | — | EROS |

**Phase 4 Total** | | **32h** | | |

### Verification
- `CognitiveEngine.think({role: "CTO", query: "..."})` called during executive execution
- Evidence sets contain real knowledge data
- Confidence weights differ per executive

---

## Roadmap Summary

| Phase | Focus | Duration | Effort | Gaps Closed | Impact |
|---|---|---|---|---|---|
| 1 | Foundation Loader + Cognitive Wiring | Week 1 | 13h | 3 critical | Enables knowledge flow |
| 2 | Identity & Directives | Week 2 | 6h | 3 high | Full executive coverage |
| 3 | Knowledge Adoption | Weeks 3-4 | 23h | 4 high + medium | Knowledge drives runtime |
| 4 | Cognitive Integration | Week 5 | 32h | 1 medium + 2 low | ECS active in all executives |
| **Total** | | **5 weeks** | **74h** | **15 gaps** | |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| .ai/ directory creation conflicts with VPS deployment | Medium | High | Add .ai/ to .gitignore, use symlinks |
| Cognitive Engine integration breaks existing executive flow | Medium | High | Add fallback: existing behavior preserved if engine errors |
| Knowledge taxonomy mapping causes graph restructure | Low | Medium | Add taxonomy as metadata field, don't change existing domains |
| 46 mental models cause pipeline slowdown | Low | Medium | Lazy-load model definitions, keep selection algorithm O(n) |

## Success Criteria

After this roadmap:
- [ ] Foundation Loader returns real assets
- [ ] Knowledge Graph contains 50+ nodes
- [ ] All 7 executives have identity + directives + capabilities
- [ ] Cognitive Engine is wired to all 7 executive programs
- [ ] Single canonical source for mental models (46) and frameworks (29)
- [ ] No ADR number collisions
- [ ] Knowledge taxonomy drives graph classification
- [ ] Adoption score ≥ 80% (currently 30%)
