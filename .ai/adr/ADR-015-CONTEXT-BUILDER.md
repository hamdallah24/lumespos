---
id: adr-015-context-builder-v1
title: ADR-015 — Context Builder (Sprint 7.2)
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
review_trigger: OnArchitectureChange
knowledge_level: reference
tags: [adr, sprint-7.2, context-builder]
purpose: |
  Sprint 7.2: Separated Context Builder from Foundation Loader.
  Loader produces Knowledge Assets, Builder assembles Context Package.
  No prompt knowledge in either — Prompt Assembler is Sprint 7.3+.
---

# ADR-015: Context Builder

## Context

Foundation Loader (Sprint 7.1) produced prompt strings directly. This coupled the data layer (loading Foundation docs) with the presentation layer (formatting for LLM). Blueprint specifies separate components: Loader → Context Builder → Prompt Assembler.

## Decision

**Create `runtime/context-builder.ts` — decoupled from Foundation Loader.**

Context Builder takes `KnowledgeAsset[]` in, produces `ContextPackage` out:
- `buildContext(assets, options)` — filters by `loading_strategy`, `domain`, `artifact_type`
- Sorts by `context_priority` (critical > high > normal > low), then `knowledge_level` (foundational > governing > canonical > ...)
- Allocates token budget proportionally. Truncates large assets instead of omitting them.
- Returns `{ assets, sections, totalTokens, budget }`

Integration: `callDeepSeekWithTools` now pipes: `foundationLoader.load()` → `buildFoundationContext()` → `formatContextAsString()` → system prompt.

Foundation Loader no longer generates prompts. Context Builder has no knowledge of LLMs, system prompts, or presentation format. That responsibility belongs to Prompt Assembler (future sprint).

## Consequences
- ✅ Loader → Context Builder → Prompt Assembler pipeline independent
- ✅ Future agents (COO, CEO, Robot) can use Context Builder without prompt format
- ✅ Domain filtering enables per-mode context (CTO gets Foundation, COO gets business docs)
- ✅ Fallback to hardcoded prompt preserved

## Status

Accepted and implemented in Sprint 7.2 (`efdfcf5c`).
