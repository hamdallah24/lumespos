# GAP ANALYSIS — Between documentation and runtime adoption

## Gap 1: Foundation Loader — .ai/ Directory Missing

**Severity**: CRITICAL — P0
**Scope**: Foundation Loader, Knowledge Graph, Knowledge Loader, Prompt Assembler
**Detail**: `foundation-loader.ts` reads from `.ai/` directory which does not exist. This cascading failure means:
- Foundation Loader returns empty assets
- Knowledge Graph has zero nodes
- Knowledge Loader returns no content
- Prompt Assembler injects empty Foundation Context
- Runtime Domain cannot find directives
- Capability Domain silently falls back to hardcoded values
**Fix**: Create `.ai/` directory structure with YAML frontmatter in markdown files, OR reconfigure foundation-loader to read from `docs/executive-runtime/`

## Gap 2: No YAML Frontmatter in Documentation

**Severity**: CRITICAL — P0
**Scope**: All 70+ docs in `docs/executive-runtime/`
**Detail**: Foundation Loader requires YAML frontmatter with `id` field. None of the 70+ docs have this. Even if `.ai/` were created, the docs would not be loaded.
**Fix**: Add YAML frontmatter to all runtime-relevant documents

## Gap 3: Cognitive Engine NOT Wired to Runtime

**Severity**: CRITICAL — P0
**Scope**: `src/executive-runtime/cognition/` vs `src/executive-runtime/index.ts`
**Detail**: `executive-runtime/index.ts` exports from `core/` and `executives/` but NOT from `cognition/`. No executive program imports or uses `CognitiveEngine.think()`. The entire cognitive layer exists as dead code.
**Fix**: Wire CognitiveEngine into executive-runtime/index.ts and integrate into CEOProgram, CTOProgram, etc.

## Gap 4: Mental Model Library — Dual Canonical (46 vs 20)

**Severity**: HIGH — P1
**Scope**: EKS doc (46 models) vs ECS TypeScript (20 models)
**Detail**: `EXECUTIVE_MENTAL_MODEL_LIBRARY.md` defines 46 mental models. `MentalModelSelector.ts` implements only 20. The doc and code are both treated as canonical but disagree.
**Fix**: Reconcile — either add all 46 models to TypeScript, or reduce doc to match implementation.

## Gap 5: Framework Library — Dual Canonical (29 vs 27)

**Severity**: HIGH — P1
**Scope**: EKS doc (29 frameworks) vs ECS TypeScript (27 frameworks)
**Detail**: `EXECUTIVE_FRAMEWORK_LIBRARY.md` defines 29 frameworks. `FrameworkSelector.ts` implements 27. Missing 2 frameworks.
**Fix**: Reconcile — add missing 2 frameworks to TypeScript.

## Gap 6: Capability Domain Missing 6 Executives

**Severity**: HIGH — P1
**Scope**: `capability-domain.ts`
**Detail**: Capability matrix hardcoded for CEO (6), CTO (7), COO (4) only. CFO, CMO, CAIO, CKO, CHRO, CIO have zero capabilities in the code. `EXECUTIVE_CAPABILITY_MATRIX.md` has the full matrix but is not consumed.
**Fix**: Add capabilities for all 9 roles (7 executives + CHRO + CIO) to capability-domain.ts

## Gap 7: Runtime Domain Missing 3 Executives

**Severity**: HIGH — P1
**Scope**: `runtime-domain.ts`
**Detail**: `ROLE_DIRECTIVE_MAP` only has CEO, CTO, COO, CFO. CMO, CAIO, CKO have no directives, authority levels, or forbidden actions.
**Fix**: Add CMO, CAIO, CKO to runtime-domain.ts

## Gap 8: Identity Missing CAIO and CKO

**Severity**: HIGH — P1
**Scope**: `identity.ts`
**Detail**: `IDENTITIES` map has CTO, COO, CEO, Founder, Chat, CFO, CMO, CHRO, CIO but NOT CAIO or CKO.
**Fix**: Add CAIO and CKO identities.

## Gap 9: ADR Dual Sets (ADR-001 through ADR-008 overlapping)

**Severity**: HIGH — P1
**Scope**: `Point-Of-Sale/docs/architecture/` vs `Point-Of-Sale/artifacts/api-server/docs/architecture/`
**Detail**: Two sets of ADRs using ADR-001 through ADR-008 with different content. This creates ambiguity about which is canonical.
**Fix**: Rename Set A to WADR-001 through WADR-008 (Working ADR).

## Gap 10: Knowledge Taxonomy Not Used

**Severity**: MEDIUM — P2
**Scope**: `EXECUTIVE_KNOWLEDGE_TAXONOMY.md` vs `knowledge-graph.ts`
**Detail**: The 15-branch taxonomy defined in the knowledge doc is not used by the knowledge graph. Graph domains come from .ai/ YAML, not from taxonomy.
**Fix**: Map knowledge-graph domains to taxonomy branches.

## Gap 11: Knowledge Lifecycle Doc ≠ Implementation

**Severity**: MEDIUM — P2
**Scope**: `KNOWLEDGE_LIFECYCLE.md` vs `knowledge-lifecycle.ts`
**Detail**: Doc defines 12-stage lifecycle (Acquire → Validate → ... → Retire). `knowledge-lifecycle.ts` implements different logic.
**Fix**: Align implementation with documented lifecycle.

## Gap 12: Knowledge Retrieval Model Not Implemented

**Severity**: MEDIUM — P2
**Scope**: `KNOWLEDGE_RETRIEVAL_MODEL.md` vs `knowledge-loader.ts`
**Detail**: Doc defines 8-stage retrieval pipeline (Intent → Capability → ... → Decision). `knowledge-loader.ts` implements simple strategy-based filtering.
**Fix**: Implement retrieval pipeline matching the document.

## Gap 13: Communication Protocol Not Enforced

**Severity**: MEDIUM — P2
**Scope**: `EXECUTIVE_COMMUNICATION_PROTOCOL.md`
**Detail**: Document defines communication rules between executives. No runtime component enforces these rules.
**Fix**: Create a Communication Governor that validates inter-executive messages.

## Gap 14: EvidenceBuilder Uses Simulation

**Severity**: LOW — P3
**Scope**: `EvidenceBuilder.ts`
**Detail**: Evidence sets are generated with simulated availability. Real knowledge sources are not connected.
**Fix**: Wire EvidenceBuilder to Knowledge Loader and RuntimeFacade.

## Gap 15: ConfidenceEngine Static Weights

**Severity**: LOW — P3
**Scope**: `ConfidenceEngine.ts`
**Detail**: Factor weights are hardcoded (0.3, 0.25, 0.15, etc.). Not configurable per executive.
**Fix**: Make weights configurable via ThinkingProfile.

---

## Gap Summary

| # | Gap | Severity | Priority | Area | Effort |
|---|---|---|---|---|---|
| 1 | .ai/ directory missing | CRITICAL | P0 | Foundation | 1 day |
| 2 | No YAML frontmatter in docs | CRITICAL | P0 | Foundation | 2 days |
| 3 | Cognitive Engine not wired | CRITICAL | P0 | ECS | 1 day |
| 4 | Mental Model dual canonical (46 vs 20) | HIGH | P1 | EKS/ECS | 0.5 day |
| 5 | Framework dual canonical (29 vs 27) | HIGH | P1 | EKS/ECS | 0.5 day |
| 6 | Capability missing 6 executives | HIGH | P1 | Runtime | 0.5 day |
| 7 | Runtime Domain missing 3 executives | HIGH | P1 | Runtime | 0.5 day |
| 8 | Identity missing CAIO + CKO | HIGH | P1 | Runtime | 0.5 day |
| 9 | ADR dual sets (Set A vs Set B) | HIGH | P1 | ADR | 0.25 day |
| 10 | Knowledge taxonomy not used | MEDIUM | P2 | EKS | 1 day |
| 11 | Lifecycle doc ≠ implementation | MEDIUM | P2 | EKS | 1 day |
| 12 | Retrieval model not implemented | MEDIUM | P2 | EKS | 2 days |
| 13 | Communication protocol not enforced | MEDIUM | P2 | EROS | 2 days |
| 14 | EvidenceBuilder simulated | LOW | P3 | ECS | 1 day |
| 15 | Confidence weights static | LOW | P3 | ECS | 0.5 day |

**Total Gaps: 15 | Critical: 3 | High: 6 | Medium: 4 | Low: 2**
