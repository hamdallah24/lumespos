# Cognitive Pipeline

## Pipeline Flow

```
Question
    │
    ▼
[1] Intent Resolution ─────────── determineProblemType() + buildIntent()
    │                                                           │
    ▼                                                           ▼
[2] Thinking Mode Selection ───── selectThinkingModes(role, query, problemType)
    │
    ▼
[3] Mental Model Selection ───── selectMentalModels(role, problemType, query)
    │
    ▼
[4] Framework Selection ──────── selectFrameworks(role, problemType, query)
    │
    ▼
[5] Reasoning Plan ───────────── buildReasoningPlan(intent, mode, models, frameworks)
    │
    ▼
[6] Evidence Building ────────── buildEvidenceSet(questionId, intent, context)
    │
    ▼
[7] Confidence Calculation ───── calculateConfidence(evidence, intent, plan)
    │
    ▼
[8] Decision Generation ──────── generateDecision(role, question, intent, evidence, confidence, plan)
    │
    ▼
[9] Recommendation ───────────── ExecutiveRecommendation
```

## Determinism

Each step is deterministic given the same input. No runtime internals are
accessed — the pipeline consumes only public contracts and cognitive context.

## Step Details

| Step | Input | Output | Function |
|---|---|---|---|
| 1 | ExecutiveQuestion | ExecutiveIntent | determineProblemType + buildIntent |
| 2 | query, role, problemType | ThinkingModeSelection[] | selectThinkingModes |
| 3 | role, problemType, query | MentalModelRef[] | selectMentalModels |
| 4 | role, problemType, query | FrameworkRef[] | selectFrameworks |
| 5 | intent, mode, models, frameworks | ReasoningPlan | buildReasoningPlan |
| 6 | questionId, intent, context | EvidenceSet | buildEvidenceSet |
| 7 | evidence, intent, plan | ConfidenceReport | calculateConfidence |
| 8 | role, question, intent, evidence, confidence, plan | ExecutiveDecision | generateDecision |
| 9 | decision | ExecutiveRecommendation | — |

## Tracing

Every pipeline execution produces a `CognitiveTrace` with per-step timing,
status, and output summary.
