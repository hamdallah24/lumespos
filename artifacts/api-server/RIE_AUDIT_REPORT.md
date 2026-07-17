# RIE Decision Engine — Comprehensive Audit Report

**Directive**: T8.1 — Audit whether RIE uses genuine AI/semantic reasoning or regex/keyword heuristic classification

**Date**: 2026-07-16

**Scope**: All 10 intelligence modules in `src/runtime-intelligence/` + orchestrator + types

---

## Phase 1 — Decision Flow Map

The RIE produces a unified `RuntimeContext` via `RuntimeIntelligence.assemble(input)`. The flow is:

```
input.executionEvent
  │
  ├─▶ IntentIntelligence.execute()      ──▶ intent (keyword/regex patterns)
  ├─▶ DomainIntelligence.execute()      ──▶ domain (37 rule-based regex patterns)
  ├─▶ KnowledgeIntelligence.execute()   ──▶ knowledgeBlocks (fetches from UnifiedLearningLayer)
  ├─▶ MetadataIntelligence.execute()    ──▶ metadataGraph (string matching on EIOS paths)
  ├─▶ RepositoryIntelligence.execute()  ──▶ relevantFiles (25-entry hardcoded index, keyword scoring)
  ├─▶ OperationalIntelligence.execute() ──▶ operationalData (wraps OperationalTruthProvider)
  ├─▶ PlanningIntelligence.execute()    ──▶ executionPlan (9 hardcoded plan templates, keyword match)
  ├─▶ MemoryIntelligence.execute()      ──▶ memoryContext (8 pattern types, keyword match)
  ├─▶ ToolIntelligence.execute()        ──▶ suggestedTools (domain → tool lookup table + keyword match)
  └─▶ ConfidenceEngine.execute()       ──▶ confidence, moduleConfidences (weighted average of 10 module confidences)
```

**Depends-on** (orchestrator enforces this or we do it manually which could accidentally break at runtime):
- `DomainIntelligence` must run before `ToolIntelligence`
- `IntentIntelligence` must run before `MemoryIntelligence`
- All others are independent

**Each module's entry**: `execute(input: { executionEvent, ... }): Promise<ModuleResultType>`
**Each module's exit**: Returns an object pushed into the final `RuntimeContext` union.

---

## Phase 2 — Regex & Keyword Detection Sweep

| Module | File | Regex Use | Keyword/String Matching | Score |
|---|---|---|---|---|
| IntentIntelligence | `intent/IntentIntelligence.ts` | **15 regex patterns** (`.test()`) | — | **100% regex** |
| DomainIntelligence | `domain/DomainIntelligence.ts` | **37 regex rules** (`.test()`, scoring) | — | **100% regex** |
| KnowledgeIntelligence | `knowledge/KnowledgeIntelligence.ts` | None directly | Calls external LLM-powered service | 0% regex |
| MetadataIntelligence | `metadata/MetadataIntelligence.ts` | None (but uses `startsWith` on EIOS paths) | `String.startsWith()` on 6 path prefixes | **100% string match** |
| RepositoryIntelligence | `repository/RepositoryIntelligence.ts` | None (uses `.includes()` for keyword scoring) | `.includes()` on 5 keyword lists | **100% string match** |
| OperationalIntelligence | `operational/OperationalIntelligence.ts` | None | Wraps OperationalTruthProvider (external) | 0% regex |
| PlanningIntelligence | `planning/PlanningIntelligence.ts` | None (uses `.includes()` for keyword match) | `.includes()` on 9 plan templates | **100% string match** |
| MemoryIntelligence | `memory/MemoryIntelligence.ts` | None (uses `.includes()` for keyword match) | `.includes()` on 8 memory type patterns | **100% string match** |
| ToolIntelligence | `tool/ToolIntelligence.ts` | None (uses `.includes()` for keyword match) | `.includes()` on domain + message matching | **100% string match** |
| ConfidenceEngine | `confidence/ConfidenceEngine.ts` | None | Weighted average of module confidences (all heuristic) | 0% regex |

**Total**: 52 regex patterns + extensive keyword/string matching across 7/10 modules.
**3 modules** (KnowledgeIntelligence, OperationalIntelligence, ConfidenceEngine) make external or mathematical decisions — but their inputs come from regex-keyword modules.

---

## Phase 3 — Intent Intelligence Deep Dive

**File**: `intent/IntentIntelligence.ts`

### Decision mechanism
15 `RegexPattern` entries in a `PATTERNS` constant. Each has:
- `pattern: RegExp` (e.g., `/what is/i`, `/how (do|can|would)/i`, `/list/i`, `/create/i`)
- `intentType: string` (e.g., `"explain"`, `"how_to"`, `"enumerate"`, `"generate"`)
- `confidenceBoost: number` (0.1–0.3)

### Algorithm
```typescript
for (const entry of PATTERNS) {
  if (entry.pattern.test(message)) {
    result.intentType = entry.intentType;
    result.confidence += entry.confidenceBoost;
  }
}
```

### Heuristic fallback
If **no pattern matches**, defaults to `{ intentType: "conversational", confidence: 0.3 }`.

### Verdict
**Purely regex-based classification.** No LLM, no embeddings, no semantic understanding. Cannot distinguish "how to file taxes" from "how to boil water" — both match `/how (do|can|would)/i` and get `intentType: "how_to"` with identical confidence.

---

## Phase 4 — Domain Intelligence Deep Dive

**File**: `domain/DomainIntelligence.ts`

### Decision mechanism
37 hardcoded `DomainRule` entries. Each has:
- `pattern: RegExp` (e.g., `/sales|revenue|income/i`, `/inventory|stock|supply/i`, `/employee|hiring|payroll/i`)
- `domain: string` (e.g., `"sales"`, `"inventory"`, `"hr"`)
- `weight: number` (0.3–1.0)

### Algorithm
```typescript
for (const rule of RULES) {
  if (rule.pattern.test(message)) {
    scores.set(rule.domain, (scores.get(rule.domain) || 0) + rule.weight);
  }
}
```
Results sorted by score descending. Top result becomes primary domain.

### Heuristic fallback
If no rule matches, defaults to `{ domain: "general", confidence: 0.3 }`.

### Verdict
**Purely regex-based scoring.** No LLM, no embeddings, no semantic understanding, no graph traversal, no hierarchical domain reasoning. A message containing both "sales" and "employee" will score for both independently with no awareness that these might be related.

---

## Phase 5 — Repository Intelligence Deep Dive

**File**: `repository/RepositoryIntelligence.ts`

### Decision mechanism
A hardcoded array of **25 file entries**. Each entry has:
- `path: string` (relative file path)
- `keywords: string[]` (2–7 keywords)
- `importance: number` (0.3–1.0)

### Algorithm
```typescript
const messageLower = message.toLowerCase();
for (const entry of FILE_INDEX) {
  const score = entry.keywords.reduce((acc, kw) =>
    acc + (messageLower.includes(kw.toLowerCase()) ? 1 : 0), 0
  );
  if (score > 0) {
    results.push({ ...entry, score, matchReason: keywords_matched.join(', ') });
  }
}
```
Results sorted by score * importance descending.

### No real repository scanning
This is a **static file index** — it does not actually read the filesystem, parse project structure, or use any code understanding. The 25 entries must be manually maintained.

### Verdict
**Hardcoded keyword-indexed file lookup.** No AST parsing, no dependency graph analysis, no semantic code search, no embeddings. Adding a new file means manually adding an entry.

---

## Phase 6 — Tool Intelligence Deep Dive

**File**: `tool/ToolIntelligence.ts`

### Decision mechanism
A `DOMAIN_TOOL_MAP` that maps each domain to 2–5 tool names.

### Algorithm
```typescript
const domainTools = DOMAIN_TOOL_MAP[domain] || [];
const keywordTools = TOOL_KEYWORDS.filter(([keyword]) =>
  message.includes(keyword)
).map(([, tool]) => tool);
// Merge, deduplicate, return
```

### Verdict
**Domain lookup table + message keyword matching.** No LLM reasoning for tool selection. No awareness of tool capabilities, parameters, or suitability beyond pre-programmed mappings.

---

## Phase 7 — Memory Intelligence Deep Dive

**File**: `memory/MemoryIntelligence.ts`

### Decision mechanism
8 `MEMORY_TYPE_PATTERNS` entries. Each maps an intent (from IntentIntelligence) or a keyword to a memory type.

### Algorithm
```typescript
const matchedPatterns = MEMORY_TYPE_PATTERNS.filter(p =>
  p.triggers.intents?.includes(intent) ||
  p.triggers.keywords?.some(k => message.includes(k))
);
```

### Verdict
**Keyword + intent lookup.** No memory decay, no relevance ranking, no embedding-based similarity. Memory types are pre-selected based on simple keyword presence.

---

## Phase 8 — Planning Intelligence Deep Dive

**File**: `planning/PlanningIntelligence.ts`

### Algorithm
9 plan templates. Selection is keyword-based:
```typescript
const matchedPlan = PLANS.find(p =>
  p.triggers.domains?.includes(dominantDomain) ||
  p.triggers.keywords?.some(k => message.includes(k))
) || FALLBACK_PLAN;
```

### Verdict
**Static plan template selection.** No LLM-generated plans, no dynamic planning, no DAG/topological planning. Returns a pre-written template with a confidence score.

---

## Phase 9 — Anti-Pattern Detection

### Anti-patterns found across RIE

| Anti-Pattern | Module(s) | Severity | Description |
|---|---|---|---|
| **Hardcoded thresholds everywhere** | All | High | Confidence values (0.3, 0.5, 0.7, 0.9), weights (0.3–1.0), importance (0.3–1.0) are magic numbers with no calibration methodology |
| **No semantic understanding** | Intent, Domain, Repository, Memory, Planning, Tool | Critical | All decisions are `regex.test()` or `string.includes()` — zero real comprehension |
| **No embeddings** | All 10 | Critical | No vector embeddings, no similarity search, no semantic distance |
| **No LLM call for reasoning** | All 10 | Medium | Only KnowledgeIntelligence calls an LLM-capable service; all other modules use heuristics |
| **Static file index** | Repository | High | 25 hardcoded entries — cannot discover new files |
| **Regex pattern overlap** | Intent, Domain | Medium | Multiple patterns may match same input; order-dependent scoring |
| **No confidence calibration** | ConfidenceEngine | Medium | Weighted average is arbitrary (0.6 tool, 0.4 knowledge, 0.3 intent...) with no empirical basis |
| **No training data** | All 10 | Critical | No ML models, no training sets, no fine-tuning — all weights are guesses |
| **Brittle fallbacks** | Intent, Domain | Low | Default `"conversational"` or `"general"` with 0.3 confidence — no graceful degradation |

---

## Phase 10 — Final Verdict

### Summary Judgment

**RIE is a regex/keyword-based heuristic decision engine, NOT an AI/semantic reasoning system.**

| Criterion | RIE | Modern AI Equivalent | Gap |
|---|---|---|---|
| Intent Classification | 15 regex `.test()` patterns | LLM prompt classification / embedding classifier | No semantic understanding |
| Domain Detection | 37 regex weight-scored rules | Few-shot LLM classification / hierarchical taxonomy | No contextual reasoning |
| File Retrieval | 25-entry hardcoded index, keyword scoring | Embedding-based semantic code search (e.g., Sourcegraph, GPT-index) | Cannot discover new files |
| Tool Selection | Domain lookup table + keyword match | LLM tool-calling / ReAct agent | No reasoning about capability fit |
| Memory Selection | 8 pattern intent/keyword match | RAG / embedding similarity | No relevance ranking |
| Planning | 9 static plan templates, keyword match | LLM plan generation / tree-of-thought | No dynamic planning |
| Confidence | Weighted average of heuristic scores | Model confidence scores / calibration curves | Arbitrary weights, no empirical basis |
| Entity Extraction | None | NER models / LLM extraction | Cannot extract entities at all |
| Sentiment Analysis | None | Sentiment models / LLM | No sentiment awareness |
| User Intent Understanding | Regex pattern match | Full conversation context LLM | No context awareness |

### What RIE does well
- **Fast**: Regex is O(n) on message length
- **Deterministic**: Same input always produces same output
- **Zero-cost**: No API calls to LLMs (except KnowledgeIntelligence)
- **Simple**: Easy to debug and extend with new patterns

### What RIE does NOT do
- **Semantic reasoning**: Does not understand meaning, only keyword presence
- **Learn from feedback**: No training, no weight adjustment
- **Handle ambiguity**: Multiple matching patterns produce merged results with no disambiguation
- **Contextual awareness**: Each request is independent; no conversation state beyond what MemoryIntelligence tries to approximate
- **Entity/relationship extraction**: Cannot identify "the client" vs "the vendor" in a message

### Recommendation

If the goal is a **semantic intelligence layer**, the RIE needs:
1. **Replace regex classification** with LLM-based few-shot classification for intent and domain
2. **Replace static file index** with embedding-based retrieval (e.g., `@opencode/qdrant` or `langchain` vector stores)
3. **Replace tool lookup** with LLM function-calling (tool descriptions → LLM selects best tool)
4. **Replace confidence heuristics** with model confidence scores from actual classifiers
5. **Add entity extraction** via NER model or LLM extraction prompt

If the goal is a **fast heuristic pre-classifier** (e.g., routing layer before LLM), the RIE is fit-for-purpose but should:
- Be renamed from "Intelligence" to "Classifier" or "Router" (no semantic intelligence)
- Document that all 52 regex patterns are rules, not AI
- Remove the word "semantic" from RepositoryIntelligence's file index

---

*Report generated by T8.1 Audit — all findings sourced from source code in `src/runtime-intelligence/`*
