# CKO v1 Dependency Classification

> Generated: Phase 2 — Classification
> Directive: T7.0 Controlled Demolition

---

## 1 — Runtime Dependencies (Direct Code Coupling)

These are direct imports of CKO modules by executive runtimes. Each arrow means "imports from."

```
CEO
 ├── consultantRuntime (programs/consultant) → translateToTargets()
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode(), getLatestEpisodes()

CTO
 ├── consultantRuntime (programs/consultant) → analyze()
 ├── consultantDiscovery (programs/consultant) → file search
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode()

COO
 ├── consultantDomain (programs/consultant) → advisor, domain analysis
 ├── getCKOAdvisory() → inline CKO advisory function
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode(), searchAll(), getBestPractices()

CFO
 ├── consultantRuntime (programs/consultant) → analyze()
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode()

CMO
 ├── consultantRuntime (programs/consultant) → analyze()
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode()

CAIO
 ├── consultantRuntime (programs/consultant) → analyze()
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode(), searchAll(), getStats()

CHRO
 ├── consultantRuntime (programs/consultant) → analyze()
 └── KnowledgeProvider (knowledge-platform) → ingestEpisode(), searchAll()

CKO (self)
 ├── consultantRuntime → analyze()
 ├── councilSessionManager → getAll()
 ├── KnowledgeProvider → ingestEpisode(), searchAll(), getStats()
 └── CognitiveEngine, MemoryProvider, BriefGenerator → advisory pipeline

Infrastructure
 ├── index.ts (root)
 │    ├── ckoRuntime → ExecutiveDispatchRegistry.register()
 │    ├── consultantScheduler → start()
 │    └── KnowledgeProvider → processEpisodeOutcomes(), runMaintenance()
 ├── ai/runtime/registry.ts → consultantRuntime → register()
 ├── eios-runtime/stages/index.ts → KnowledgeProvider → searchAll()
 ├── learning/unified-learning-layer.ts → KnowledgeProvider, CouncilLearningProvider
 └── learning-integration/ → KnowledgeProvider, CouncilLearningProvider
```

---

## 2 — Prompt Dependencies (LLM Context Injection)

These inject CKO advisory or knowledge context into LLM prompts.

```
Prompt Assembly
 ├── CKO Advisory (programs/consultant → analyze())
 │    ├── CTO: "📋 FILE DARI CKO" + "## CKO Advisory"
 │    ├── COO: "## CKO Advisory — Pengetahuan Organisasi"
 │    ├── CEO: consultantRuntime.translateToTargets() → enriched message
 │    └── CFO/CMO/CAIO/CHRO: consultantRuntime.analyze() → advisory text
 ├── Knowledge Context (KnowledgeProvider)
 │    ├── CTO: KnowledgeProvider.searchAll() → context blocks
 │    ├── COO: KnowledgeProvider.searchAll() + getBestPractices()
 │    ├── CAIO: KnowledgeProvider.searchAll() + getStats()
 │    └── CHRO: KnowledgeProvider.searchAll()
 ├── Foundation Injection (semantic-engine.ts)
 │    └── "[CKO ADVISORY]" → enhancedMessage prefix
 └── Mission Background (mission-background-engine.ts)
      └── "📌 TARGET ANALISIS DARI CKO" → enriched CT​O message
```

---

## 3 — Infrastructure Dependencies (Registry / Identity / Routing)

These reference CKO as a string literal for registration, routing, or configuration.

```
Registry (ai/runtime)
 ├── organization-engine.ts: { runtime: "CKO", ... }
 ├── identity.ts: CKO: { role: "CKO", ... }
 ├── runtime-domain.ts: CKO → "cko-directive", domain rules
 ├── capability-domain.ts: CKO capabilities
 ├── application-runtime-adapter.ts: register("CKO", ...)
 └── production-readiness.ts: "cko-directive" in foundation IDs

Governance
 ├── governance-types.ts: ExecutiveRole includes "CKO"
 ├── PermissionEngine.ts: CKO permissions
 └── GovernanceProvider: CKO hard-coded

Memory System
 ├── MemoryProvider.ts: CKO gets GLOBAL scope
 ├── decision-hook.ts: CKO gets GLOBAL scope
 ├── config.ts: CKO token budget
 ├── ForgettingPolicy.ts: CKO multiplier (2.0)
 ├── MemoryRecord.ts: ExecutiveScope includes "CKO"
 ├── ValidationEngine.ts: scope includes "CKO"
 └── MemoryCertification.ts: scope includes "CKO"

EIOS Runtime
 ├── executives/index.ts: { name: "CKO", ... }
 ├── stages/index.ts: profile → "CKO" routing
 └── ExecutiveIntegrityAuditor.ts: "CKO" in expected roles

Routing
 └── routes/ai.ts: @CKO mention regex

Verification
 ├── RuntimeVerifier.ts: "CKO" in executives array
 ├── IntegrationScore.ts: "CKO" in executives array
 └── FinalCertification.ts: "CKO" in executives array
```

---

## 4 — Hidden Dependencies (Implicit / Indirect)

These are not direct imports but create behavioral coupling.

| Type | Location | Description |
|------|----------|-------------|
| Dynamic Import | `index.ts:229` | `import("./programs/consultant")` — loads consultantScheduler at boot |
| Dynamic Import | `index.ts:159` | `import("./knowledge-platform/providers")` — loads KnowledgeProvider for maintenance |
| Type Reference | `CEOProgram.ts:21` | `CKOTargets` type from consultant — affects CEO delegation flow |
| Type Field | `mission-engine.ts:49,74,309` | `ckoTargets` field in Mission interface — structural coupling |
| Variable | `mission-background-engine.ts:121,133-135` | `mission.ckoTargets` — inline target injection |
| Parameter | `semantic-engine.ts:46,48-49` | `ckoTargets` parameter — prompt injection |
| Log Prefix | Multiple consultant files | `[CKO]` — operational coupling |
| Pipeline Array | `CTOProgram.ts:266`, `CKOProgram.ts` et al | Pipeline trace includes "CKO" — test assertions depend on this |
| Config | `CTO.config.ts:6` | Pipeline stage includes "CKO" |
| Dependency Array | `COOProgram.ts:536`, `CKOProgram.ts:205` | `dependencies: ["CKO", ...]` |
| Observation | `observability/types.ts:12` | `consultedCKO: boolean` — telemetry shape |
| Comment | `operational-truth/types.ts:65` | `// via KnowledgeProvider` — documents coupling |
| Comment | `learning/learning-engine.ts:69` | `// Bridge: register as knowledge card for CKO/Consultant` |

---

## 5 — Test Dependencies (Coupling via Mocks + Assertions)

These tests will fail if CKO is removed without updating them.

| Test File | Coupling Type | Impact if CKO Removed |
|-----------|---------------|----------------------|
| `cko-scan-live.test.ts` | Full CKO integration test | Must delete entirely |
| `executive-runtime.test.ts` | Imports ckoRuntime + asserts name | Import fails |
| `knowledge-memory.test.ts` | All KnowledgeProvider tests | All assertions fail |
| `learning-stabilization.test.ts` | KnowledgeProvider + councilSessionManager | Import + assertions fail |
| `learning-activation.test.ts` | KnowledgeProvider + councilSessionManager | Import + assertions fail |
| `council-learning.test.ts` | CouncilSession tests | Import fails |
| `unified-learning.test.ts` | KnowledgeProvider import | Import fails |
| `ceo-runtime-qa.test.ts` | "CKO" in role array | Needs array removal |
| `executive-memory-validation.test.ts` | "CKO" in role array, memory test | Needs removal |
| `ceo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock | Mocks obsolete |
| `cto-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock, pipeline assertion | Mocks + assertion fail |
| `coo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock, getCKOAdvisory mock | Mocks + assertion fail |
| `cfo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock, pipeline assertion | Mocks + assertion fail |
| `cmo-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock, pipeline assertion | Mocks + assertion fail |
| `caio-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock, pipeline assertion | Mocks + assertion fail |
| `chro-integration.test.ts` | consultantRuntime mock + KnowledgeProvider mock, pipeline assertion | Mocks + assertion fail |

---

## 6 — Documentation Dependencies (Informational)

All `.ai/` and `docs/` references are informational. These will be cleaned in Phase 7 (Final Deletion).

| Location | Count |
|----------|-------|
| `.ai/runtime/` | 6 files |
| `.ai/registry/` | 4 files |
| `.ai/generated/prompt/` | 1 file |
| `.ai/generated/executive/` | 1 file |
| `.ai/generated/knowledge/` | 5+ files |
| `.ai/audit/` | 25+ files |
| `docs/executive-runtime/executives/CKO/` | 3 files |
| `docs/executive-runtime/` | 15+ files |
| `docs/archive/` | 5+ files |
| `docs/` root | 5+ files |

---

## Classification Key

```
● Runtime Dependency  — Must decouple (code will break)
● Prompt Dependency   — Must clean (prompt injection)
● Infrastructure     — Must update (registry/identity/routing)
○ Hidden             — Must find and remove
○ Test               — Must update/delete
○ Documentation      — Must delete
```
