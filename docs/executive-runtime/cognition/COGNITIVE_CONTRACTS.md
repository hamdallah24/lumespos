# Cognitive Contracts — Executive Cognitive System

| Contract | Type | Description |
|---|---|---|
| ExecutiveQuestion | Interface | Input question from executive |
| ExecutiveIntent | Interface | Parsed intent with problem type |
| ExecutiveThinkingMode | Interface | Selected thinking mode |
| ExecutiveReasoningPlan | Interface | Multi-step reasoning plan |
| ExecutiveEvidence | Interface (EvidenceSet) | Collected evidence |
| ExecutiveDecision | Interface | Decision with alternatives |
| ExecutiveConfidence | Interface (ConfidenceReport) | Confidence with factors |
| ExecutiveRecommendation | Interface | Final recommendation |

## Immutability

All contracts use `readonly` modifiers on all properties. No contract depends on
Runtime Core internals (`eios-runtime/internal/*`).

## Dependency Chain

```
ExecutiveQuestion → ExecutiveIntent → ThinkingModeSelection →
MentalModelRef[] → FrameworkRef[] → ReasoningPlan →
EvidenceSet → ConfidenceReport → ExecutiveDecision →
ExecutiveRecommendation
```

## Public Exports

Exported from `src/executive-runtime/cognition/CognitiveContracts.ts`

- `ExecutiveRole` — union type
- `ProblemType` — union type
- `EvidenceSource` — union type
- `CognitiveStatus` — union type
- All interfaces listed above
