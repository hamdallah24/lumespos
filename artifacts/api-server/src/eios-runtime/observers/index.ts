import { ObserverRegistry } from "../internal/runtime-metadata/ObserverRegistry";
import { defineObserver } from "../contracts/Manifest";
import { parseComponentId } from "../contracts/ComponentId";
import { ExecutiveMemoryProvider } from "../../executive-memory";
import { DigitalTwinProvider } from "../../digital-twin";
import { SelfEvolutionProvider } from "../../self-evolution";
import { CommunicationProvider } from "../../communication-runtime/providers";
import { IntegrationManager } from "../../learning-integration/IntegrationManager";

const NS = "eios.core";

function obsId(name: string) {
  return parseComponentId(`${NS}:observer:${name}@1.0.0`);
}

function obsManifest(name: string) {
  return defineObserver({
    id: obsId(name), name, description: `${name} observer`,
    dependencies: [], capabilities: [], tags: ["core"],
    checksum: name, schemaVersion: { major: 1, minor: 0, patch: 0 },
    deprecated: false, replacement: null, metadata: {},
  });
}

ObserverRegistry.register({
  id: obsId("executive_memory"),
  manifest: obsManifest("executive_memory"),
  subscribe: "decision.made",
  deliveryMode: "ExactlyOnce",
  priority: 100,
  handle: async (event) => {
    const { decision } = event.payload as any;
    if (decision) ExecutiveMemoryProvider.recordDecision(decision);
  },
});

ObserverRegistry.register({
  id: obsId("knowledge_learning"),
  manifest: obsManifest("knowledge_learning"),
  subscribe: "decision.made",
  deliveryMode: "Buffered",
  priority: 200,
  handle: async (event) => {
    const { decision } = event.payload as any;
    if (decision) {
      IntegrationManager.ingest({
        content: decision.description || decision.title || "",
        executive: decision.executive || "unknown",
        domain: decision.domain || "general",
        outcome: "success",
        metadata: { eventId: decision.id || `d-${Date.now()}`, title: decision.title, eventType: "decision" },
      });
      IntegrationManager.provideFeedback({
        decisionId: decision.id || `d-${Date.now()}`,
        executive: decision.executive || "unknown",
        domain: decision.domain || "general",
        outcome: "success",
        confidence: decision.confidence ?? 80,
        summary: decision.title || "",
      });
    }
  },
});

ObserverRegistry.register({
  id: obsId("council_learning"),
  manifest: obsManifest("council_learning"),
  subscribe: "council.resolved",
  deliveryMode: "ExactlyOnce",
  priority: 150,
  handle: async (event) => {
    const { session } = event.payload as any;
    if (session) {
      IntegrationManager.ingest({
        content: session.title || "",
        executive: "council",
        domain: "governance",
        outcome: (session.outcome === "success" ? "success" : "partial") as any,
        metadata: { sessionId: session.id, resolution: session.resolution },
      });
    }
  },
});

ObserverRegistry.register({
  id: obsId("digital_twin"),
  manifest: obsManifest("digital_twin"),
  subscribe: "pipeline.started",
  deliveryMode: "FireAndForget",
  priority: 50,
  handle: async (_event) => {
    DigitalTwinProvider.sync({
      cashAvailable: 0, revenue: 0, expenses: 0, grossMargin: 0,
      stockCoverageDays: 0, activeBranches: 0, activeEmployees: 0,
      customerSatisfaction: 0, updatedAt: new Date().toISOString(),
    });
  },
});

ObserverRegistry.register({
  id: obsId("self_evolution"),
  manifest: obsManifest("self_evolution"),
  subscribe: "pipeline.completed",
  deliveryMode: "FireAndForget",
  priority: 500,
  handle: async (_event) => {
    SelfEvolutionProvider.propose({
      title: `Evolution proposal ${Date.now()}`,
      description: "Automated evolution proposal based on pipeline execution",
      proposedAction: "create_doc",
      target: "evolution.md",
      rationale: "System self-improvement",
      risk: "low",
    });
  },
});

ObserverRegistry.register({
  id: obsId("communication"),
  manifest: obsManifest("communication"),
  subscribe: "brief.generated",
  deliveryMode: "FireAndForget",
  priority: 300,
  handle: async (_event) => {
    CommunicationProvider.dispatch({
      channel: "notification",
      recipient: "founder",
      content: "Pipeline execution completed",
    });
  },
});
