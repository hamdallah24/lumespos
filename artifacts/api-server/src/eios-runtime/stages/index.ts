import { PipelineStageRegistry } from "../internal/runtime-metadata/PipelineStageRegistry";
import { PipelineGraphRegistry } from "../internal/runtime-metadata/PipelineGraphRegistry";
import { defineStage } from "../contracts/Manifest";
import { parseComponentId } from "../contracts/ComponentId";
import { NorthStarProvider } from "../../north-star/providers/NorthStarProvider";
import { StrategyProvider } from "../../strategy-engine/providers";
import { StrategySimulatorProvider } from "../../strategy-simulator";
import { ContextProvider } from "../../decision-context/ContextProvider";
import { PlanProvider } from "../../execution-planner/providers";
import { WorkflowRuntimeProvider } from "../../workflow-runtime";
import { BriefGenerator } from "../../executive-runtime/core";
import { KnowledgeProvider } from "../../knowledge-platform/providers";
import { ExecutiveDispatchRegistry } from "../public/ExecutiveDispatchRegistry";
import { PipelineProfileRegistry } from "../internal/runtime-metadata/PipelineProfileRegistry";

const CORE_NS = "eios.core";

// Helper to create a manifest
function stageManifest(name: string, deps: string[]) {
  return defineStage({
    id: parseComponentId(`${CORE_NS}:stage:${name}@1.0.0`),
    name,
    description: `${name} stage`,
    dependencies: deps.map(d => parseComponentId(`${CORE_NS}:stage:${d}@1.0.0`)),
    capabilities: [],
    tags: ["core"],
    checksum: name,
    schemaVersion: { major: 1, minor: 0, patch: 0 },
    deprecated: false,
    replacement: null,
    metadata: { timeout: 5000, retries: 2 },
  });
}

function makeStageId(name: string) {
  return parseComponentId(`${CORE_NS}:stage:${name}@1.0.0`);
}

// --- Register all stages ---

PipelineStageRegistry.register({
  id: makeStageId("event_validation"),
  manifest: stageManifest("event_validation", []),
  execute: async (ctx) => ({ correlationId: ctx.correlationId, stageId: makeStageId("event_validation"), patches: {}, timestamp: "" }),
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("business_intelligence"),
  manifest: stageManifest("business_intelligence", []),
  execute: async (ctx) => ({ correlationId: ctx.correlationId, stageId: makeStageId("business_intelligence"), patches: {}, timestamp: "" }),
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("decision_context"),
  manifest: stageManifest("decision_context", ["business_intelligence"]),
  execute: async (ctx) => {
    const ctx2 = ContextProvider.generate();
    return { correlationId: ctx.correlationId, stageId: makeStageId("decision_context"), patches: { decisionContext: ctx2 }, timestamp: "" };
  },
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("decision_engine"),
  manifest: stageManifest("decision_engine", ["decision_context"]),
  execute: async (ctx) => ({
    correlationId: ctx.correlationId, stageId: makeStageId("decision_engine"),
    patches: { situations: [], situationCount: 0 }, timestamp: "",
  }),
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("north_star"),
  manifest: stageManifest("north_star", ["decision_engine"]),
  execute: async (ctx) => {
    const strategies = ctx.read<any[]>("strategies") || [];
    for (const s of strategies) {
      const ev = NorthStarProvider.evaluateStrategy(s.direction);
      s.northStarScore = ev.score;
    }
    return { correlationId: ctx.correlationId, stageId: makeStageId("north_star"), patches: { strategies }, timestamp: "" };
  },
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("strategy_simulator"),
  manifest: stageManifest("strategy_simulator", ["north_star"]),
  execute: async (ctx) => ({
    correlationId: ctx.correlationId, stageId: makeStageId("strategy_simulator"), patches: {}, timestamp: "",
  }),
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("strategy_engine"),
  manifest: stageManifest("strategy_engine", ["strategy_simulator"]),
  execute: async (ctx) => ({
    correlationId: ctx.correlationId, stageId: makeStageId("strategy_engine"), patches: {}, timestamp: "",
  }),
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("execution_planner"),
  manifest: stageManifest("execution_planner", ["strategy_engine"]),
  execute: async (ctx) => ({
    correlationId: ctx.correlationId, stageId: makeStageId("execution_planner"), patches: {}, timestamp: "",
  }),
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("workflow_runtime"),
  manifest: stageManifest("workflow_runtime", ["execution_planner"]),
  execute: async (ctx) => {
    const plans = ctx.read<any[]>("plans") || [];
    for (const plan of plans) {
      WorkflowRuntimeProvider.startWorkflow(plan, { autoRollbackOnFailure: true });
    }
    return { correlationId: ctx.correlationId, stageId: makeStageId("workflow_runtime"), patches: {}, timestamp: "" };
  },
  timeout: 10000, retries: 1,
});

function resolveExecutiveRole(ctx: any): string {
  const profileId = ctx.read("profileId") ?? "";
  if (profileId.includes("executive")) return "CEO";
  if (profileId.includes("analytics")) return "CFO";
  if (profileId.includes("planning")) return "CTO";
  if (profileId.includes("simulation")) return "CAIO";
  if (profileId.includes("replay")) return "CKO";
  if (profileId.includes("query")) return "CEO";
  return "COO";
}

PipelineStageRegistry.register({
  id: makeStageId("brief_generator"),
  manifest: stageManifest("brief_generator", ["workflow_runtime"]),
  execute: async (ctx) => {
    const role = resolveExecutiveRole(ctx);
    const brief = BriefGenerator.generate({
      role,
      situations: ctx.read<any[]>("situations") || [],
      objectives: ctx.read<any[]>("strategies") || [],
      plans: PlanProvider.getAll(),
      knowledge: KnowledgeProvider.searchAll(""),
    });
    return { correlationId: ctx.correlationId, stageId: makeStageId("brief_generator"), patches: { brief, executiveRole: role }, timestamp: "" };
  },
  timeout: 5000, retries: 2,
});

PipelineStageRegistry.register({
  id: makeStageId("executive_runtime"),
  manifest: stageManifest("executive_runtime", ["brief_generator"]),
  execute: async (ctx) => {
    const brief = ctx.read<any>("brief");
    const role = ctx.read<string>("executiveRole") || "COO";
    if (brief) {
      const decision = await ExecutiveDispatchRegistry.dispatch(role, brief, {});
      return { correlationId: ctx.correlationId, stageId: makeStageId("executive_runtime"), patches: { executiveDecision: decision }, timestamp: "" };
    }
    return { correlationId: ctx.correlationId, stageId: makeStageId("executive_runtime"), patches: {}, timestamp: "" };
  },
  timeout: 5000, retries: 2,
});

// --- Register DAG edges ---
PipelineGraphRegistry.dependsOn(makeStageId("decision_context"), makeStageId("business_intelligence"));
PipelineGraphRegistry.dependsOn(makeStageId("decision_engine"), makeStageId("decision_context"));
PipelineGraphRegistry.dependsOn(makeStageId("north_star"), makeStageId("decision_engine"));
PipelineGraphRegistry.dependsOn(makeStageId("strategy_simulator"), makeStageId("north_star"));
PipelineGraphRegistry.dependsOn(makeStageId("strategy_engine"), makeStageId("strategy_simulator"));
PipelineGraphRegistry.dependsOn(makeStageId("execution_planner"), makeStageId("strategy_engine"));
PipelineGraphRegistry.dependsOn(makeStageId("workflow_runtime"), makeStageId("execution_planner"));
PipelineGraphRegistry.dependsOn(makeStageId("brief_generator"), makeStageId("workflow_runtime"));
PipelineGraphRegistry.dependsOn(makeStageId("executive_runtime"), makeStageId("brief_generator"));
