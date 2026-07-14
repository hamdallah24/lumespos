# Executive Cognitive System (ECS) Handbook

## What is ECS?

The Executive Cognitive System is a deterministic reasoning layer
that sits between the Prompt Framework and the Knowledge System.

It defines **how** executives think — not what they know.

## Architecture Position

```
Kernel
  │
  ▼
EIOS Runtime (FROZEN)
  │
  ▼
Executive Runtime (EROS)
  │
  ▼
Executive Prompt Framework
  │
  ▼
Executive Cognitive System ◄──── YOU ARE HERE
  │
  ▼
Executive Knowledge System
  │
  ▼
Future Memory Engine
```

## Core Principles

1. **Determinism** — Same input always produces same output
2. **Immutability** — All contracts are readonly
3. **Traceability** — Every decision has a full cognitive trace
4. **No Runtime Dependency** — ECS never imports eios-runtime/internal/*
5. **Separation of Concerns** — Thinking (ECS) vs Knowing (EKS) vs Acting (Prompt)

## Module Structure

```
src/executive-runtime/cognition/
├── CognitiveContracts.ts         ← All contracts
├── ThinkingMode.ts               ← 49 thinking modes (7 per executive)
├── MentalModelSelector.ts        ← 20 mental models
├── FrameworkSelector.ts          ← 27 frameworks
├── ReasoningStrategy.ts          ← 9 strategy templates
├── EvidenceBuilder.ts            ← Multi-source evidence
├── ConfidenceEngine.ts           ← 5-factor confidence
├── DecisionPattern.ts            ← Decision structuring
├── CognitivePipeline.ts          ← 9-step pipeline
├── CognitiveEngine.ts            ← Public orchestration API
├── ExecutiveThinkingProfiles.ts  ← 7 executive profiles
└── index.ts                      ← Public exports
```

## Key Files

| File | Phase | Lines |
|---|---|---|
| CognitiveContracts.ts | 1 | ~200 |
| ThinkingMode.ts | 2 | ~240 |
| MentalModelSelector.ts | 3 | ~200 |
| FrameworkSelector.ts | 4 | ~260 |
| ReasoningStrategy.ts | 5 | ~150 |
| EvidenceBuilder.ts | 6 | ~80 |
| ConfidenceEngine.ts | 7 | ~110 |
| DecisionPattern.ts | 8 | ~100 |
| CognitivePipeline.ts | 9 | ~130 |
| CognitiveEngine.ts | 10 | ~60 |
| ExecutiveThinkingProfiles.ts | 11 | ~120 |
| index.ts | — | ~40 |
