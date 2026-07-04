# ADR-007: Learning Layer

**Status:** ACCEPTED
**Date:** ECP-044
**Supersedes:** No structured learning system

## Context

Executives needed to learn from past missions and retrieve relevant knowledge for future ones.

## Decision

| Module | Owner | Responsibility |
|--------|-------|---------------|
| `LearningEngine` | learning-engine.ts | Full cycle orchestrator (single owner) |
| `ExperienceEngine` | experience-engine.ts | Execution → Experience (scored 0-100) |
| `ReflectionEngine` | reflection-engine.ts | Experience → Reflection (7 evaluation questions) |
| `KnowledgeEngine` | knowledge-engine.ts | Reflection → KnowledgeNodes (merge + domain) |
| `KnowledgeGraph` | knowledge-graph.ts | Graph storage: add, search, traverse, autoLink |
| `MemoryIndex` | memory-index.ts | Searchable index: domain/type/keyword/executive |
| `KnowledgeQueue` | knowledge-queue.ts | Async processing queue |
| `RetrievalEngine` | retrieval-engine.ts | Context-aware retrieval before reasoning |
| `ExecutiveMemory` | executive-memory.ts | Per-executive isolated memory (7 scopes) |

## Rules

1. `LearningEngine.cycle()` is the **single** learning orchestrator
2. Executive memory is **isolated** — never shared directly
3. Knowledge is stored as a **graph**, not text
4. Retrieval happens **before** reasoning, not after

## Dependencies

Learning Layer → Execution Foundation → LLM Adapter

## Violations

Cross-executive memory sharing = Architecture Compliance FAIL.
