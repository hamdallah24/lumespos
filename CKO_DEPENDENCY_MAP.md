# CKO v1 Dependency Map

> Generated: Phase 1 — Discovery
> Directive: T7.0 Controlled Demolition

---

## Overview

Total CKO v1 code footprint across the repository:

| Layer | Files | References |
|-------|-------|------------|
| Source Code (src/) | ~45 files | 200+ direct imports/usages |
| Test Files (tests/) | ~20 files | 80+ references |
| Documentation (.ai/) | ~40 files | 500+ references |
| Documentation (docs/) | ~35 files | 400+ references |
| Tooling (tools/) | 3 files | 5 references |
| Frontend (pos-app/) | 1 file | 1 reference |

---

## A — Source Code Dependencies

### A1 — CKO Executive Runtime

**Location:** `artifacts/api-server/src/executive-runtime/executives/CKO/`

| File | Role |
|------|------|
| `CKOProgram.ts` | Main CKO runtime — wraps consultantRuntime, calls KnowledgeProvider, councilSessionManager |
| `CKO.config.ts` | CKO configuration constants |
| `index.ts` | Re-exports CKO_CONFIG and ckoRuntime |

**Imported by:**
- `executive-runtime/executives/index.ts` — re-exports `* from "./CKO"`
- `executive-runtime/index.ts` — re-exports `* from "./executives/CKO"`
- `index.ts` (root) — imports `ckoRuntime`, registers `{ role: "CKO", decide: ckoRuntime.decide }`, starts CKO scheduler

### A2 — Consultant Program (CKO Core)

**Location:** `artifacts/api-server/src/programs/consultant/`

| File | Role |
|------|------|
| `index.ts` | Public API — exports all CKO components |
| `consultant-runtime.ts` | Core CKO runtime: analyze(), translateToTargets(), maintenance(), identity() |
| `consultant-provider.ts` | Advisor, domain analysis, CKOTargets interface, file selection |
| `consultant-discovery.ts` | Project file map, keyword matching, alias search, LLM file selection |
| `consultant-scheduler.ts` | Daily CKO maintenance scheduler |
| `consultant-cache.ts` | Strategic cache building |
| `consultant-health.ts` | Health monitoring |
| `consultant-kpi.ts` | KPI tracking |
| `consultant-report.ts` | Report generation |
| `consultant-schema.ts` | Data schemas for findings/recommendations |
| `consultant-types.ts` | Type definitions |

**Imported by (8 executive programs + 2 infrastructure files):**

| File | Import | Usage |
|------|--------|-------|
| `index.ts` (root) | `consultantScheduler` | Starts CKO scheduler on boot |
| `ai/runtime/registry.ts` | `consultantRuntime` | Registers in runtime registry |
| `executives/CEO/CEOProgram.ts` | `consultantRuntime`, `CKOTargets` | `translateToTargets()` in delegation |
| `executives/CTO/CTOProgram.ts` | `consultantRuntime`, `consultantDiscovery` | `analyze()` for advisory + file selection |
| `executives/COO/COOProgram.ts` | `consultantDomain` | Domain advisory |
| `executives/CFO/CFOProgram.ts` | `consultantRuntime` | `analyze()` for advisory |
| `executives/CMO/CMOProgram.ts` | `consultantRuntime` | `analyze()` for advisory |
| `executives/CAIO/CAIOProgram.ts` | `consultantRuntime` | `analyze()` for advisory |
| `executives/CHRO/CHROProgram.ts` | `consultantRuntime` | `analyze()` for advisory |
| `ai/runtime/knowledge/index.ts` | `consultantCache` | Re-exports |

### A3 — Knowledge Platform (CKO Knowledge Store)

**Location:** `artifacts/api-server/src/knowledge-platform/`

| File | Role |
|------|------|
| `providers/KnowledgeProvider.ts` | Central knowledge singleton — ingestion, search, maintenance |
| `providers/index.ts` | Re-export |
| `episode/EpisodeStore.ts` | Episode storage |
| `episode/EpisodeIngester.ts` | Episode ingestion |
| `episode/EpisodeQuery.ts` | Episode query |
| `semantic/SemanticStore.ts` | Semantic block storage |
| `semantic/SemanticIngester.ts` | Semantic ingestion |
| `semantic/SemanticQuery.ts` | Semantic query |
| `procedural/ProceduralStore.ts` | Procedural knowledge storage |
| `procedural/ProceduralIngester.ts` | Procedural ingestion |
| `procedural/ProceduralQuery.ts` | Procedural query |
| `learning/LearningEngine.ts` | Learning outcomes processing |
| `learning/PatternPromoter.ts` | Pattern promotion |
| `learning/DeprecationEngine.ts` | Deprecation logic |
| `learning/ConfidenceAdjuster.ts` | Confidence scoring |
| `core/KnowledgeBase.ts` | In-memory knowledge base |
| `core/types.ts` | Type definitions |
| `index.ts` | Initialization |

**Imported by (ALL 8 executive programs + infrastructure):**

| File | Location | Usage |
|------|----------|-------|
| `index.ts` (root) | `knowledge-platform/providers` | Dynamic import — `processEpisodeOutcomes()`, `runMaintenance()` |
| `eios-runtime/stages/index.ts` | `knowledge-platform/providers` | `searchAll()` for context |
| `learning-integration/adapters/kp-learning-adapter.ts` | `knowledge-platform/providers` | Full API — search, ingest, outcome, maintenance |
| `learning/unified-learning-layer.ts` | `knowledge-platform/providers` | Full API — search, ingest, domain query |
| `executives/CEO/CEOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()`, `getLatestEpisodes()` |
| `executives/CTO/CTOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()`, `searchAll()` |
| `executives/COO/COOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()`, `searchAll()`, `getBestPractices()` |
| `executives/CFO/CFOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()` |
| `executives/CMO/CMOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()` |
| `executives/CAIO/CAIOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()`, `searchAll()`, `getStats()` |
| `executives/CHRO/CHROProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()`, `searchAll()` |
| `executives/CKO/CKOProgram.ts` | `knowledge-platform/providers` | `ingestEpisode()`, `searchAll()`, `getStats()` |
| `operational-truth/types.ts` | n/a (comment) | `knowledge: [], // via KnowledgeProvider` |

### A4 — Executive Council (CKO Council System)

**Location:** `artifacts/api-server/src/executive-council/`

| File | Role |
|------|------|
| `core/CouncilSession.ts` | CouncilSession + CouncilSessionManager |
| `core/CouncilOrchestrator.ts` | Council orchestration |
| `core/ConsensusDetector.ts` | Consensus detection |
| `core/EscalationEngine.ts` | Escalation logic |
| `core/PositionCollector.ts` | Position collection |
| `providers/CouncilProvider.ts` | Council provider API |
| `learning/CouncilLearningProvider.ts` | Council learning |
| `learning/CouncilLearningEngine.ts` | Council learning engine |
| `learning/CouncilPatternDetector.ts` | Pattern detection |
| `learning/CouncilOutcomeTracker.ts` | Outcome tracking |
| `ai-debate/DebateFacilitator.ts` | Debate facilitation |
| `ai-debate/ArgumentAnalyzer.ts` | Argument analysis |
| `ai-debate/CompromiseFinder.ts` | Compromise finding |

**Imported by:**
- `executives/CKO/CKOProgram.ts` — `councilSessionManager.getAll()`
- `learning/unified-learning-layer.ts` — `CouncilLearningProvider`
- `learning-integration/adapters/council-learning-adapter.ts` — `CouncilLearningProvider`

### A5 — String Literal / Type / Registry References

**Files referencing "CKO" as a string/type literal:**

| File | Usage |
|------|-------|
| `governance/governance-types.ts` | `ExecutiveRole` type union member |
| `governance/core/PermissionEngine.ts` | Permissions key |
| `ai/runtime/organization-engine.ts` | Runtime registry entry + routing logic |
| `ai/runtime/identity.ts` | Identity map key + role |
| `ai/runtime/foundation/domains/runtime-domain.ts` | Directive mapping + domain rules |
| `ai/runtime/foundation/domains/capability-domain.ts` | Capability entry |
| `ai/runtime/application-runtime-adapter.ts` | Registration string |
| `ai/runtime/mission-engine.ts` | `ckoTargets` field type |
| `ai/runtime/mission-background-engine.ts` | `mission.ckoTargets` usage |
| `ai/runtime/semantic-engine.ts` | `ckoTargets` parameter + `[CKO ADVISORY]` prompt inject |
| `ai/runtime/observability/types.ts` | `consultedCKO` field |
| `ai/runtime/production-readiness.ts` | `cko-directive` string |
| `ai/runtime/knowledge/knowledge-governor.ts` | `consultantCache` import |
| `ai/runtime/knowledge/consultant-cache.ts` | Consultant cache builder |
| `executive-runtime/verification/RuntimeVerifier.ts` | Executives array |
| `executive-runtime/verification/IntegrationScore.ts` | Executives array |
| `executive-runtime/verification/FinalCertification.ts` | Executives array |
| `executive-runtime/memory-provider/MemoryProvider.ts` | CKO-scoped queries |
| `executive-runtime/memory-provider/decision-hook.ts` | CKO-scoped decisions |
| `executive-runtime/memory-provider/config.ts` | Token budget config |
| `executive-runtime/memory/policy/ForgettingPolicy.ts` | Multiplier config |
| `executive-runtime/memory/models/MemoryRecord.ts` | ExecutiveScope type |
| `executive-runtime/memory/engine/ValidationEngine.ts` | Scope validation |
| `executive-runtime/memory/audit/MemoryCertification.ts` | Scope certification |
| `executive-runtime/index.ts` | Re-export + log string |
| `executive-runtime/executives/index.ts` | Re-export |
| `eios-runtime/stages/index.ts` | Profile routing |
| `eios-runtime/executives/index.ts` | Executive listing |
| `eios-runtime/internal/runtime-governance/ExecutiveIntegrityAuditor.ts` | Expected roles |
| `routes/ai.ts` | @mention regex |
| `learning/learning-engine.ts` | Comment |

### A6 — Variables (cko- prefixed)

| Variable | File | Role |
|----------|------|------|
| `ckoTargets` | `CEOProgram.ts`, `semantic-engine.ts`, `mission-engine.ts`, `mission-background-engine.ts` | CKO file/entity/domain targets |
| `ckoText` | `CTOProgram.ts`, `CMOProgram.ts`, `CFOProgram.ts`, `CAIOProgram.ts`, `CHROProgram.ts` | CKO advisory text |
| `ckoResult` | `CTOProgram.ts`, `CMOProgram.ts`, `CFOProgram.ts`, `CAIOProgram.ts`, `CHROProgram.ts` | CKO analyze result |
| `ckoFiles` | `CTOProgram.ts` | CKO file selection |
| `ckoAdvisory` | `COOProgram.ts` | CKO advisory string |
| `ckoRuntime` | `index.ts`, `application-runtime-adapter.ts` | CKO runtime object |
| `CKO_CONFIG` | `CKOProgram.ts`, `index.ts` | CKO configuration |
| `CKO_TOKEN_BUDGET` | `config.ts` | Memory token budget constant |
| `getCKOAdvisory()` | `COOProgram.ts` | COO-specific CKO advisory function |

---

## B — Test Dependencies

| File | CKO References |
|------|----------------|
| `tests/cko-scan-live.test.ts` | Full CKO discovery integration test |
| `tests/unit/executive-runtime.test.ts` | CKO runtime import + assertion |
| `tests/unit/knowledge-memory.test.ts` | KnowledgeProvider tests |
| `tests/unit/learning-stabilization.test.ts` | KnowledgeProvider + councilSessionManager |
| `tests/unit/learning-activation.test.ts` | KnowledgeProvider + councilSessionManager |
| `tests/unit/council-learning.test.ts` | CouncilSession tests |
| `tests/unit/unified-learning.test.ts` | KnowledgeProvider test |
| `tests/ceo-runtime-qa.test.ts` | Executive role array includes CKO |
| `tests/executive-memory-validation.test.ts` | Executive role array includes CKO |
| `tests/ceo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock |
| `tests/cto-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock |
| `tests/coo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock + getCKOAdvisory mock |
| `tests/cfo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock |
| `tests/cmo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock |
| `tests/caio-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock |
| `tests/chro-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock |

---

## C — Infrastructure Dependencies

### C1 — AI Runtime (`.ai/`)

| File | CKO Content |
|------|-------------|
| `.ai/runtime/cko-directive.md` | CKO directive definition |
| `.ai/runtime/registry/RUNTIME_REGISTRY.md` | CKO runtime registry (RUNTIME-014) |
| `.ai/generated/prompt/cko-prompt.json` | CKO system prompt |
| `.ai/generated/executive/cko-directive.directive.json` | Compiled CKO directive |
| `.ai/registry/prompt.json` | `cko-prompt` registry entry |
| `.ai/registry/executive.json` | `cko-directive` registry entry |
| `.ai/registry/manifest.json` | `cko-prompt` + `cko-directive` hashes |
| `.ai/registry/dependency-graph.json` | `cko-system-prompt`, `cko-playbook`, `cko-executive-spec` entries |
| `.ai/audit/*.md` | ~25 audit files with extensive CKO references |

### C2 — Documentation (`docs/`)

| File | CKO Content |
|------|-------------|
| `docs/executive-runtime/executives/CKO/EXECUTIVE_SPEC.md` | CKO executive specification |
| `docs/executive-runtime/executives/CKO/PLAYBOOK.md` | CKO playbook |
| `docs/executive-runtime/executives/CKO/SYSTEM_PROMPT.md` | CKO system prompt |
| `docs/executive-runtime/*.md` | ~15 files with CKO references |
| `docs/executive-runtime/prompts/*.md` | ~5 files with CKO references |
| `docs/executive-runtime/knowledge/*.md` | ~5 files with KnowledgeProvider references |
| `docs/executive-runtime/cognition/*.md` | ~5 files with CKO references |
| `docs/archive/*.md` | ~5 files with CKO references |

### C3 — Tooling (`tools/`)

| File | CKO Reference |
|------|---------------|
| `tools/dgps/src/compiler/directive-compiler.ts` | "CKO" in EXECUTIVES array |
| `tools/dgps/src/scanner/scanner.ts` | CKO path regex patterns |
| `tools/dgps/src/commands/verify-runtime.ts` | "cko" in EXECUTIVES array |

### C4 — Frontend (`pos-app/`)

| File | CKO Reference |
|------|---------------|
| `pages/eng-os.tsx` | `CKO: Brain` icon mapping |

---

## D — Dependency Chain Summary

```
index.ts (root)
 ├── ckoRuntime (executives/CKO)
 │    ├── consultantRuntime (programs/consultant)
 │    │    ├── consultant-provider.ts (CKOTargets, advisor)
 │    │    ├── consultant-discovery.ts (keyword/alias/file search)
 │    │    ├── consultant-scheduler.ts
 │    │    ├── consultant-cache.ts
 │    │    ├── consultant-health.ts
 │    │    ├── consultant-kpi.ts
 │    │    └── consultant-report.ts
 │    ├── councilSessionManager (executive-council)
 │    │    ├── CouncilSession.ts
 │    │    ├── CouncilOrchestrator.ts
 │    │    ├── ConsensusDetector.ts
 │    │    ├── EscalationEngine.ts
 │    │    ├── PositionCollector.ts
 │    │    ├── CouncilProvider.ts
 │    │    ├── CouncilLearningProvider.ts
 │    │    ├── CouncilLearningEngine.ts
 │    │    └── DebateFacilitator.ts
 │    └── KnowledgeProvider (knowledge-platform)
 │         ├── providers/KnowledgeProvider.ts
 │         ├── episode/ (3 files)
 │         ├── semantic/ (3 files)
 │         ├── procedural/ (3 files)
 │         ├── learning/ (4 files)
 │         └── core/ (2 files)
 ├── CEOProgram.ts
 │    ├── consultantRuntime.translateToTargets()
 │    └── KnowledgeProvider.ingestEpisode()
 ├── CTOProgram.ts
 │    ├── consultantRuntime.analyze()
 │    ├── consultantDiscovery
 │    └── KnowledgeProvider.ingestEpisode()
 ├── COOProgram.ts
 │    ├── consultantDomain
 │    ├── getCKOAdvisory()
 │    └── KnowledgeProvider.ingestEpisode()
 ├── CFOProgram.ts
 │    ├── consultantRuntime.analyze()
 │    └── KnowledgeProvider.ingestEpisode()
 ├── CMOProgram.ts
 │    ├── consultantRuntime.analyze()
 │    └── KnowledgeProvider.ingestEpisode()
 ├── CAIOProgram.ts
 │    ├── consultantRuntime.analyze()
 │    └── KnowledgeProvider.ingestEpisode()
 ├── CHROProgram.ts
 │    ├── consultantRuntime.analyze()
 │    └── KnowledgeProvider.ingestEpisode()
 └── consultantScheduler (programs/consultant)
```
