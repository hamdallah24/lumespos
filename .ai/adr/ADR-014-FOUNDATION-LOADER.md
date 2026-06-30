---
id: adr-014-foundation-loader-v1
title: ADR-014 — Foundation Loader (Sprint 7.1)
domain: adr
artifact_type: adr
owner: CTO
status: Active
version: 1.0.0
stability: stable
maturity: seed
last_updated: 2026-06-30
last_reviewed: 2026-06-30
review_trigger: OnArchitectureChange
knowledge_level: reference
tags: [adr, sprint-7.1, foundation-loader]
purpose: |
  Sprint 7.1: Foundation Loader replaces hardcoded system prompt with
  dynamically-loaded Foundation documents. YAML metadata parser,
  topological dependency resolver, context budget allocator.
---

# ADR-014: Foundation Loader

## Context

System prompt was hardcoded in `ai-prompts.ts` (BANG_ORCHESTRATOR, 137 lines string). Foundation docs existed as `.ai/*.md` files with rich metadata but were never consumed by the runtime. Founder directive: "changes to CONSTITUTION.md must change AI behavior without code changes."

## Decision

**Build Foundation Loader in `ai/runtime/foundation-loader.ts` (269 lines)**

Three subsystems:
1. **Metadata Parser** — zero-dependency YAML frontmatter parser. Works with `id`, `title`, `domain`, `knowledge_level`, `loading_strategy`, `depends_on`, `context_priority`, `consumers`, `stability`, `version`.
2. **Dependency Resolver** — topological sort on `depends_on` graph. Priority-ordered: foundational → governing → canonical → operational → reference → experimental → archived.
3. **Context Builder** — allocates token budget by `context_priority`. `loading_strategy: always` assets loaded first, `conditional` and `on-demand` on request.

Integration: `callDeepSeekWithTools` now calls `foundationLoader.getFoundationPrompt(4000)` instead of `BANG_ORCHESTRATOR.slice(0, 4000)`. Hardcoded prompt remains as fallback if loader fails.

## Consequences

### Positive
- Founder can now change AI behavior by editing `CONSTITUTION.md` — no code changes needed
- System prompt is always up-to-date with Foundation
- Dependency ordering ensures NORTH_STAR loads before CONSTITUTION, etc.
- Token budget allocated by context_priority — critical assets get more tokens

### Negative
- Server must have file access to `.ai/` directory (works in both VPS and dev)
- Hardcoded BANG_ORCHESTRATOR still exists as fallback — should be removed in Sprint 7.4 (Prompt Assembler)

## Status

Accepted and implemented in Sprint 7.1 (`af843791`).
