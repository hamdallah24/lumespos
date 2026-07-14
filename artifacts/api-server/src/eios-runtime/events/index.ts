import { EventRegistry } from "../internal/runtime-metadata/EventRegistry";
import { parseComponentId } from "../contracts/ComponentId";

const NS = "eios.core";

function eventId(name: string) {
  return parseComponentId(`${NS}:event:${name}@1.0.0`);
}

EventRegistry.register({
  id: eventId("pipeline.started"),
  schema: { correlationId: "string", trigger: "string", timestamp: "string" },
  retention: "7d", category: "system",
  producer: [eventId("pipeline.started")],
  consumer: [parseComponentId(`${NS}:observer:digital_twin@1.0.0`)],
});

EventRegistry.register({
  id: eventId("pipeline.completed"),
  schema: { correlationId: "string", success: "boolean", durationMs: "number" },
  retention: "7d", category: "system",
  producer: [eventId("pipeline.completed")],
  consumer: [parseComponentId(`${NS}:observer:self_evolution@1.0.0`)],
});

EventRegistry.register({
  id: eventId("pipeline.error"),
  schema: { correlationId: "string", error: "string", stage: "string" },
  retention: "7d", category: "system",
  producer: [eventId("pipeline.error")],
  consumer: [],
});

EventRegistry.register({
  id: eventId("stage.completed"),
  schema: { correlationId: "string", stageId: "string", durationMs: "number" },
  retention: "7d", category: "system",
  producer: [eventId("stage.completed")],
  consumer: [],
});

EventRegistry.register({
  id: eventId("stage.failed"),
  schema: { correlationId: "string", stageId: "string", error: "string" },
  retention: "7d", category: "system",
  producer: [eventId("stage.failed")],
  consumer: [],
});

EventRegistry.register({
  id: eventId("decision.made"),
  schema: { decision: "object" },
  retention: "forever", category: "business",
  producer: [parseComponentId(`${NS}:stage:executive_runtime@1.0.0`)],
  consumer: [
    parseComponentId(`${NS}:observer:executive_memory@1.0.0`),
    parseComponentId(`${NS}:observer:knowledge_learning@1.0.0`),
  ],
});

EventRegistry.register({
  id: eventId("council.resolved"),
  schema: { session: "object" },
  retention: "forever", category: "business",
  producer: [parseComponentId(`${NS}:core:CouncilOrchestrator@1.0.0`)],
  consumer: [parseComponentId(`${NS}:observer:council_learning@1.0.0`)],
});

EventRegistry.register({
  id: eventId("brief.generated"),
  schema: { brief: "object", role: "string" },
  retention: "7d", category: "system",
  producer: [parseComponentId(`${NS}:stage:brief_generator@1.0.0`)],
  consumer: [parseComponentId(`${NS}:observer:communication@1.0.0`)],
});
