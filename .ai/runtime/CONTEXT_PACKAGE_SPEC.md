# Context Package Specification v1.0

> Status: Active
> Contract between: Context Builder → Prompt Assembler
> Version: 1.0.0
> Schema: application/json-compatible

## Purpose

Define the formal interface between the Context Builder and all downstream consumers (Prompt Assembler, Action Builder, Retrieval Builder, etc.). This package is the single carrier of Foundation-derived context through the pipeline.

## Schema

```typescript
interface ContextPackageV1 {
  version: "1.0";
  meta: {
    mode: string;                    // "cto" | "bisnis" | "chat"
    generatedAt: string;             // ISO timestamp
    totalAssets: number;
    truncatedAssets: number;
  };
  budget: {
    total: number;                   // max tokens
    used: number;                    // consumed
    remaining: number;               // available
  };
  assets: ContextAssetV1[];
  instructions: string[];            // mode-specific guardrails
}

interface ContextAssetV1 {
  id: string;                        // e.g., "constitution-v1"
  title: string;
  domain: string;
  knowledge_level: string;
  context_priority: string;
  content: string;                   // full or truncated
  truncated: boolean;
  originalLength: number;
}
```

## Version Compatibility

| Version | Status | Consumers |
|---------|--------|-----------|
| 1.0 | Active | Prompt Assembler (Sprint 7.3), Future: Action Builder, Retrieval Builder |

## Validation Rules

1. `version` must be `"1.0"`
2. `meta.totalAssets` must equal `assets.length + meta.truncatedAssets`
3. `budget.used` + `budget.remaining` = `budget.total`
4. Every `asset.id` must be unique within the package

## Consumers

### Prompt Assembler (Sprint 7.3)
Converts ContextPackageV1 → system prompt string. Format:
```
[ASSET: {id}] {title} ({knowledge_level})\n{content}\n---
```

### Future Consumers
- **Action Builder**: Converts to action commands for non-LLM agents
- **Retrieval Builder**: Converts to vector retrieval queries
- **Knowledge Graph Builder**: Converts to graph traversal instructions

## Non-Goals
- Does not define LLM-specific formatting (Prompt Assembler's responsibility)
- Does not define injection strategy (order, truncation, prioritization)
- Does not define per-provider adaptations (LLM Provider's responsibility)
