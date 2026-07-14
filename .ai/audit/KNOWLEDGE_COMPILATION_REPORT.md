# Knowledge Compilation Report
## EPIC S.9.5 — Phase 3
**Date:** 2026-07-14

---

## Loading Architecture

```
knowledge-loader.ts
  │
  ├─ loadKnowledge() → buildGraph() → foundationLoader.load()
  │                                        │
  │                                        ▼
  │                              .ai/registry/knowledge.json
  │                              .ai/generated/knowledge/*.json
  │
  └─ loadKnowledgeWithContent() → foundationLoader.load() (for full content)
```

**Verdict: Knowledge Loader reads NO markdown directly. All reads go through FoundationLoader → registry.**

---

## Per-Asset Audit

| Knowledge Asset | Registered? | Compiled JSON Exists? | Loaded via FoundationLoader? | Consumed by Runtime Code? | Status |
|---|---|---|---|---|---|
| Mental Models | ✅ | ✅ | ✅ | ❌ (hardcoded in MentalModelSelector.ts) | ⚠️ UNUSED |
| Framework Library | ✅ | ✅ | ✅ | ❌ (hardcoded in FrameworkSelector.ts) | ⚠️ UNUSED |
| Knowledge Taxonomy | ✅ | ✅ | ✅ | ❌ (doc-only) | ⚠️ PASSIVE |
| Knowledge Handbook | ✅ | ✅ | ✅ | ❌ (doc-only) | ⚠️ PASSIVE |
| Knowledge Architecture | ❌ | ❌ | ❌ | ❌ | ❌ ORPHAN |
| Knowledge Lifecycle | ✅ | ✅ | ✅ | ✅ (separate runtime impl) | ✅ PASS |
| Capability Matrix | ✅ | ✅ | ✅ | ❌ (doc-only) | ⚠️ PASSIVE |
| Decision Models | ❌ | ❌ | ❌ | ❌ | ❌ ORPHAN |

---

## Orphan Assets

### Knowledge Architecture (`executive-knowledge-architecture`)
- Referenced in `dependency-graph.json` but:
  - NOT registered in knowledge.json or foundation.json
  - NOT compiled (no file in `.ai/generated/`)
  - NOT loaded at runtime
- **Impact:** No runtime impact — asset is simply absent

### Decision Models (`executive-decision-model`)
- Same status as Knowledge Architecture
- Referenced in `dependency-graph.json` but never compiled or registered

---

## Cognitive Bypass: Hardcoded Selectors

### MentalModelSelector.ts — HARDCODED 20 models
- Compiled Mental Model Library documents **46 models**
- Runtime selector uses a hardcoded array of **20 models**
- **Gap:** The compiled asset is never consulted by the Cognitive Pipeline

### FrameworkSelector.ts — HARDCODED 25 frameworks
- Compiled Framework Library documents **29 frameworks**
- Runtime selector uses a hardcoded array of **25 frameworks**
- **Gap:** The compiled asset is never consulted by the Cognitive Pipeline

---

## Consumer Metadata Gap
All 42 assets in `knowledge.json` have `"consumer": []` — no asset declares which runtime component consumes it. Makes static traceability impossible.
