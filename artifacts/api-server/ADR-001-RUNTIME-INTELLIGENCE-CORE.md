# ADR-001 — Runtime Intelligence Core (RIC)

**Status**: Proposed

**Date**: 2026-07-16

**Author**: Principal AI Operating System Architect

---

## Context

The Runtime Intelligence Engine (RIE) was originally designed as a heuristic orchestration layer to produce a `RuntimeContext` consumed by Executive Runtimes. The T8.1 audit revealed that RIE is structurally a rule-based classifier:

- 52 regex patterns across 7 modules
- 25-entry hardcoded file index with keyword scoring
- 37 hardcoded domain rules with magic-number weights
- 9 static plan templates selected by keyword matching
- 8 memory type patterns triggered by keyword inclusion
- 6 metadata path prefixes matched via `String.startsWith()`
- Confidence as a weighted average of heuristic module scores

The system exhibits **cascading heuristic errors**, **duplicated classification logic**, **brittle routing**, and **no semantic understanding**. Adding capabilities requires manual maintenance of pattern lists and lookup tables. The architecture does not scale with business complexity.

Concurrently, the Executive Runtimes (CEO, CTO, CFO, COO, CMO, CHRO, CAIO) have grown to perform their own intent detection, domain detection, file searching, tool selection, and metadata resolution — bypassing RIE entirely in some paths. This violates the single-responsibility principle and creates multiple sources of truth.

## Decision

Replace the Runtime Intelligence Engine (RIE) with the **Runtime Intelligence Core (RIC)** — a three-layer cognitive architecture:

```
Understanding Engine    (LLM — understands WHAT the user wants)
        │
Retrieval Planner       (LLM — determines WHAT data is needed)
        │
Grounding Layer         (Deterministic — fetches the data)
        │
Runtime Context Builder (Assembles results → RuntimeContext)
        │
Executive Runtime       (Pure reasoning per persona)
```

### Key architectural decisions

1. **Two cognitive blocks, not nine LLM calls**. Understanding and Planning each get one LLM call. Grounding is zero AI. Total: 2 LLM calls per request, not 9.

2. **Grounding Layer is 100% deterministic**. All data access goes through providers (OperationalTruth, Memory, Knowledge, Metadata, Repository, Filesystem, GitHub, SQL). No AI reasoning in data retrieval.

3. **Executive Runtime no longer classifies, searches, or selects**. It receives a complete `RuntimeContext` and reasons only according to its persona. Intent, domain, entities, tool selection, file selection, metadata resolution, planning, and confidence are all pre-computed by RIC.

4. **Regex exists only as LLM confidence fallback** (confidence < 0.60). Never as primary decision mechanism.

5. **Repository index is auto-generated at startup** from actual filesystem scanning. No hardcoded file lists.

6. **Tool selection uses a Tool Catalog with semantic descriptions**, not keyword-to-tool lookup tables.

7. **Planning is a reasoned execution graph**, not a template selection.

## Consequences

### Positive

- **Single source of truth for understanding** — all executives read from one `RuntimeContext` produced by one pipeline
- **Single source of truth for facts** — Grounding Layer provides deterministic, auditable data access
- **Executive Runtimes become pure reasoning layers** — dramatically simpler, easier to maintain, no duplicated logic
- **Scalable architecture** — new executives, domains, tools, or data sources can be added without modifying the cognitive pipeline
- **Deterministic data access** — Grounding Layer can be unit-tested independently of AI
- **Reduced technical debt** — removes 52 regex patterns, 37 domain rules, 25 hardcoded file entries, 9 plan templates, magic number weights
- **Explainability** — `reasoningTrace` and confidence breakdown provide audit trail for every decision

### Negative

- **LLM dependency** — if the LLM provider is unavailable, Understanding and Planning fail (mitigation: cached fallbacks, offline mode)
- **Latency increase** — from ~10ms (regex) to ~500-3000ms (2 LLM calls + grounding)
- **API cost** — 2 LLM calls per request instead of zero (mitigation: caching, fast mode for simple queries)
- **Migration complexity** — requires careful parallel-run strategy to avoid downtime
- **New failure modes** — JSON parsing errors, LLM hallucinations, schema validation failures (all mitigated with retry logic and fallbacks)

### Neutral

- Folder structure will be renamed from `runtime-intelligence/` to `runtime-intelligence-core/` (conceptual; physical path may remain to reduce git noise)
- Existing RIE modules will be removed after migration: `intent/`, `domain/`, old `repository/`, old `tool/`, old `planning/`, old `memory/`, old `metadata/`
- All 7 executives require RIE mode updates (already partially done in T8.0)

## Compliance

All future intelligence-related decisions must route through RIC. No executive, tool, or service may:
- Perform its own intent classification
- Select tools by keyword matching
- Search filesystem independently
- Determine domain via regex
- Resolve metadata by path prefix

Violations should be flagged and rejected in code review.

## References

- T8.1 RIE Audit Report
- T8.2 SRIE Architecture Proposal (precursor)
- T9.0 Directive — Runtime Intelligence Core
