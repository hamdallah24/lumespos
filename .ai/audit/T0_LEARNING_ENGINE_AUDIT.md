# T.0 — Phase 6: Learning Engine Audit

## Two LearningEngine Implementations

### LearningEngine #1 — Organizational Learning (`src/learning/learning-engine.ts`)

| Attribute | Value |
|-----------|-------|
| Class | `LearningEngine` (line 16) |
| Singleton | `learningEngine` (line 132) |
| Pipeline | `Experience → Reflection → Knowledge → Graph → Index → Memory` |
| Cycle method | `cycle(missionId, objective, executive, execId, outcome)` |

**Consumers:**
| Consumer | File | How |
|----------|------|-----|
| executive-collaboration | `organization/executive-collaboration.ts:200` | `learningEngine.cycle()` after multi-executor sessions |
| quality-engine | `governance/quality-engine.ts:16` | `learningEngine.stats()` |
| executive-auditor | `governance/executive-auditor.ts:6` | Import only (unused call) |
| knowledge-fusion | `intelligence/knowledge-fusion.ts:7` | Import only (unused call) |

**BROKEN IMPORT in `index.ts`:**
```typescript
// Line 128 — WRONG PATH
const { learningEngine } = await import("./ai/runtime/learning/learning-engine");
```
Path `src/ai/runtime/learning/` does NOT exist. The daily scheduled `"learning-cycle"` will ALWAYS fail. Error is silently swallowed by try/catch at line 131.

---

### LearningEngine #2 — Knowledge Platform (`src/knowledge-platform/learning/LearningEngine.ts`)

| Attribute | Value |
|-----------|-------|
| Class | `LearningEngine` (same class name, different module) |
| Singleton | `learningEngine` (line 76) |
| Methods | `processOutcome()`, `runMaintenance()` |
| Features | Confidence adjustment (+10 success, -20 failure), pattern promotion (5+ successes), deprecation (3+ failures or confidence <30) |

**Consumers:**
| Consumer | File | How |
|----------|------|-----|
| KnowledgeProvider | `knowledge-platform/providers/KnowledgeProvider.ts` | Calls `processOutcome()` and `runMaintenance()` |
| knowledge-platform index | `knowledge-platform/index.ts` | Initializes event listener |

**Status: ALIVE** — actively called when all 8 executives use `KnowledgeProvider.ingestEpisode()`

---

## Reflection Engine Implementations

### ReflectionEngine #1 — Learning (`src/learning/reflection-engine.ts`)

- Class: `ReflectionEngine` (line 18)
- Method: `reflect(experience)` → produces `Reflection` with strengths, weaknesses, improvements, patterns
- Called within `learningEngine.cycle()` (line 56)
- **No external callers** — only used internally by LearningEngine #1

### ReflectionEngine #2 — AI Runtime (`src/ai/runtime/reflection-engine.ts`)

- Function: `reflect(spec, response, { tokensUsed, ... })` → `ExecutionReport`
- Called by **CTO only** — `CTOProgram.ts:343` (Stage 13)
- Registered in runtime component registry (`registry.ts:38`)

### ReflectionEngine #3 — Council Pattern Detector

- `executive-council/learning/CouncilPatternDetector.ts` — detects escalation trends, alignment
- Called via `CouncilLearningEngine` → `CouncilLearningProvider`

---

## Sub-Engine Audit

| Engine | File | Alive? | Called By |
|--------|------|:------:|-----------|
| **LearningEngine** (#1) | `learning/learning-engine.ts` | ⚠ Partial | executive-collaboration, quality-engine — BROKEN scheduled cycle |
| **LearningEngine** (#2) | `knowledge-platform/learning/LearningEngine.ts` | ✓ Yes | KnowledgeProvider (ingestEpisode → processOutcome) |
| **ReflectionEngine** (#1) | `learning/reflection-engine.ts` | ⚠ Partial | Only within LearningEngine#1 cycle |
| **ReflectionEngine** (#2) | `ai/runtime/reflection-engine.ts` | ✓ Yes | CTO pipeline Stage 13 |
| **ExperienceEngine** | `learning/experience-engine.ts` | ⚠ Partial | Only within LearningEngine#1 cycle |
| **KnowledgeEngine** | `learning/knowledge-engine.ts` | ⚠ Partial | Only within LearningEngine#1 cycle |
| **RetrievalEngine** | `learning/retrieval-engine.ts` | ✗ **DEAD** | No callers found |
| **CrossExecutiveLearning** | `intelligence/cross-executive-learning.ts` | ✓ Yes | OrganizationIntelligence |
| **ImprovementEngine** | `governance/improvement-engine.ts` | ✓ Yes | governance-engine |
| **CouncilLearningEngine** | `executive-council/learning/` | ✓ Yes | EIOS observer |
| **PatternDetector** | `executive-memory/PatternDetector.ts` | ✓ Yes | ExecutiveMemoryProvider |

---

## Key Findings

1. **Two `LearningEngine` classes** with identical singleton export name (`learningEngine`) in different packages — works but confusing.

2. **RetrievalEngine is dead code** — instantiated, exported, but never imported or called by any module.

3. **Broken import** in `index.ts:128` — daily scheduled learning cycle silently fails.

4. **CTO is the only executive with reflection in pipeline.** 7 other executives never reflect on past outcomes.

5. **executive-auditor.ts** and **knowledge-fusion.ts** import `learningEngine` but never call it — unused imports.

6. **Learning is post-mission, not real-time.** The primary LearningEngine only processes after a mission completes (executive-collaboration) or on a scheduled daily cycle (which is broken).
