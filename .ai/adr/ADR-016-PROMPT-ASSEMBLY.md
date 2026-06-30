---
id: adr-016-prompt-assembly-v1
title: ADR-016 — Context Package & Prompt Assembly (Sprint 7.3)
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
tags: [adr, sprint-7.3, prompt-assembler, context-package]
purpose: |
  Sprint 7.3: Formal ContextPackage contract, Prompt Assembler as consumer.
  Foundation→Loader→Builder→Assembler pipeline complete.
---

# ADR-016: Context Package & Prompt Assembly

## Context

Context Builder (Sprint 7.2) returned internal types. Prompt Assembler did not exist. Pipeline was: Loader → Builder → raw string → LLM. This coupled the Builder to LLM-specific formatting.

## Decision

**Introduce ContextPackageV1 as formal interface contract between Builder and all consumers. Prompt Assembler is one consumer.**

Pipeline now:
```
Foundation Loader → Context Builder → ContextPackageV1 → Prompt Assembler → system prompt → LLM
```

ContextPackageV1 (CONTEXT_PACKAGE_SPEC.md):
- `version: "1.0"` — versioned contract
- `meta` — mode, generation timestamp, asset counts
- `budget` — token allocation breakdown
- `assets[]` — ContextAssetV1 with truncation info
- `instructions[]` — mode-specific guardrails

Future consumers (Action Builder, Retrieval Builder, Knowledge Graph Builder) consume the same package.

## Milestone 2: Foundation Integration — 100% Complete

```
Foundation Loader      ✅ Sprint 7.1
Context Builder        ✅ Sprint 7.2
Context Package Spec   ✅ Sprint 7.3
Prompt Assembler       ✅ Sprint 7.3
```

Pipeline: Foundation docs → Loader → ContextPackageV1 → Assembler → System Prompt → LLM.

## Status

Accepted and implemented in Sprint 7.3 (`83a82a57`).
