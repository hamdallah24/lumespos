# Decision Pattern Reference

## Structure

Every executive decision follows this structure:

```
ExecutiveDecision
├── role: ExecutiveRole
├── question: string
├── chosenAlternative: DecisionAlternative
├── alternatives: DecisionAlternative[] (2-3)
├── reasoning: string
├── risks: string[]
├── confidence: ConfidenceReport
│   ├── overall: number (0-100)
│   ├── factors: ConfidenceFactor[]
│   ├── missingInfo: string[]
│   ├── contradictions: string[]
│   └── recommendation: "proceed" | "caution" | "defer" | "escalate"
├── evidence: EvidenceSet
│   ├── items: EvidenceItem[]
│   ├── coverage: number (%)
│   └── gaps: string[]
├── plan: ReasoningPlan
└── timestamp: string
```

## DecisionAlternative

| Field | Description |
|---|---|
| id | Unique identifier |
| label | Short name (e.g. "conservative-approach-1") |
| description | Natural language description |
| pros | List of advantages |
| cons | List of disadvantages |
| estimatedImpact | Expected impact description |
| risk | "Low" | "Medium" | "High" |

## Decision Styles per Executive

| Role | Style | Risk Appetite | Confidence Threshold |
|---|---|---|---|
| CEO | vision-driven | high | 65 |
| CTO | analytical | moderate | 75 |
| CFO | conservative | low | 80 |
| CMO | creative | moderate | 70 |
| CAIO | experimental | moderate | 70 |
| CKO | structured | low | 80 |
| COO | execution-focused | low | 75 |

## Recommendation Logic

| Confidence | Gaps | Recommendation |
|---|---|---|
| >= 80 | 0 | proceed |
| >= 60 | any | caution |
| >= 40 | > 3 | defer |
| < 40 | any | escalate |
