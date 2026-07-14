# Cognitive Engine

## API

```typescript
class CognitiveEngine {
  async think(options: ThinkOptions): Promise<ThinkResult>
}

interface ThinkOptions {
  role: ExecutiveRole;
  query: string;
  context?: Record<string, unknown>;
  sessionId?: string;
}

interface ThinkResult {
  decision: ExecutiveDecision;
  recommendation: ExecutiveRecommendation;
  trace: CognitiveTrace;
}
```

## Usage

```typescript
import { CognitiveEngine } from "../executive-runtime/cognition";

const engine = new CognitiveEngine();
const result = await engine.think({
  role: "CTO",
  query: "Should we migrate from monolith to microservices?",
  context: { teamSize: 15, currentTech: "Node.js" },
});

console.log(result.decision.chosenAlternative.label);
console.log(`Confidence: ${result.decision.confidence.overall}/100`);
console.log(`Recommendation: ${result.decision.confidence.recommendation}`);
```

## Architecture

```
CognitiveEngine.think()
    │
    ▼
  build ExecutiveQuestion
    │
    ▼
  get ThinkingProfile (preferences)
    │
    ▼
  runPipeline(question, context)
    │
    ▼
  return { decision, recommendation, trace }
```

## Thread Safety

The CognitiveEngine is stateless — all state lives in CognitiveContext
passed through the pipeline. A single engine instance can handle
concurrent `think()` calls.
