import { PipelineProfileRegistry } from "../internal/runtime-metadata/PipelineProfileRegistry";
import { defineProfile } from "../contracts/Manifest";
import { parseComponentId } from "../contracts/ComponentId";

const NS = "eios.core";

function profileId(name: string) {
  return parseComponentId(`${NS}:profile:${name}@1.0.0`);
}

function makeProfile(name: string, desc: string, intents: string[]) {
  return defineProfile({
    id: profileId(name), name, description: desc,
    dependencies: [], capabilities: [], tags: ["core"],
    checksum: name, schemaVersion: { major: 1, minor: 0, patch: 0 },
    deprecated: false, replacement: null, metadata: {},
  });
}

PipelineProfileRegistry.register({
  id: profileId("business"),
  manifest: makeProfile("business", "Full business decision pipeline", []),
  intents: ["business_operation", "inventory_change", "sales_event", "financial_event"],
  tags: ["full", "decision"],
});

PipelineProfileRegistry.register({
  id: profileId("query"),
  manifest: makeProfile("query", "Fast query response pipeline", []),
  intents: ["founder_query", "status_check", "simple_question"],
  tags: ["fast", "read-only"],
});

PipelineProfileRegistry.register({
  id: profileId("planning"),
  manifest: makeProfile("planning", "Strategy planning pipeline", []),
  intents: ["planning_request", "strategy_session", "long_term_plan"],
  tags: ["planning", "strategy"],
});

PipelineProfileRegistry.register({
  id: profileId("executive"),
  manifest: makeProfile("executive", "Executive-only decision pipeline", []),
  intents: ["executive_command", "ceo_directive", "emergency_action"],
  tags: ["executive", "high-priority"],
});

PipelineProfileRegistry.register({
  id: profileId("analytics"),
  manifest: makeProfile("analytics", "Data analysis pipeline", []),
  intents: ["data_analysis", "report_generation", "metric_review"],
  tags: ["analytics", "data"],
});

PipelineProfileRegistry.register({
  id: profileId("simulation"),
  manifest: makeProfile("simulation", "What-if simulation pipeline", []),
  intents: ["what_if", "simulation_run", "scenario_analysis"],
  tags: ["simulation", "what-if"],
});

PipelineProfileRegistry.register({
  id: profileId("replay"),
  manifest: makeProfile("replay", "Pipeline replay from audit log", []),
  intents: ["pipeline_replay", "debug_run", "audit_replay"],
  tags: ["replay", "audit"],
});
