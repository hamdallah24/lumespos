// CTO Agent v1.0 — Production (Sprint 10)
// Full pipeline: Intent → Capability → Knowledge → Context → Prompt → LLM → Render
// Single entry point. Registered component. Foundation-driven.

import { classifyIntent } from "../runtime/intent-classifier";
import { checkCapability } from "../runtime/capability-engine";
import { loadKnowledgeWithContent, knowledgeLoader } from "../runtime/knowledge-loader";
import { buildFoundationContext } from "../runtime/context-builder";
import { assembleSystemPrompt, promptAssembler } from "../runtime/prompt-assembler";
import { foundationLoader } from "../runtime/foundation-loader";
import { knowledgeGraph, buildGraph } from "../runtime/knowledge-graph";
import { knowledgeMetrics, collect } from "../runtime/knowledge-metrics";
import { productionReadiness } from "../runtime/production-readiness";

// LLM integration from existing helpers
import { callDeepSeekWithTools } from "../../routes/ai-helpers";
import { READ_TOOLS, DEVOPS_TOOLS } from "../../routes/ai-helpers";

interface CTORequest {
  message: string;
  userId: number;
  mode?: "cto";
  onProgress?: (msg: string) => void;
  onStream?: (delta: string) => void;
}

interface CTOResponse {
  text: string;
  intent: ReturnType<typeof classifyIntent>;
  capability: ReturnType<typeof checkCapability>;
  graphStats: ReturnType<typeof buildGraph>["stats"];
  metrics: ReturnType<typeof collect>;
  pipeline: string[];  // trace of components used
}

/** CTO Agent — execute a request through the full Engineering OS pipeline */
async function execute(req: CTORequest): Promise<CTOResponse> {
  const pipeline: string[] = [];

  // Stage 1: Intent Classification
  const intent = classifyIntent(req.message);
  pipeline.push("IntentClassifier");

  // Stage 2: Capability Check
  const capability = checkCapability(intent);
  pipeline.push("CapabilityEngine");

  // Stage 3: Knowledge Loading
  const knowledge = loadKnowledgeWithContent({ strategy: "always" });
  pipeline.push("KnowledgeLoader");

  // Stage 4: Context Building
  const ctxPkg = buildFoundationContext(knowledge, "cto", 4000);
  pipeline.push("ContextBuilder");

  // Stage 5: Prompt Assembly
  const systemPrompt = assembleSystemPrompt(ctxPkg, "cto");
  pipeline.push("PromptAssembler");

  // Stage 6: LLM Execution
  const toolSet = intent.suggestedToolSet === "DEVOPS_TOOLS" ? DEVOPS_TOOLS
    : intent.suggestedToolSet === "NONE" ? [] : READ_TOOLS;

  let responseText = "";
  try {
    responseText = await callDeepSeekWithTools(
      systemPrompt, req.message, req.userId, "cto", toolSet, 3000,
      req.onProgress,
    );
  } catch (e: any) {
    responseText = `Error: ${e.message || "CTO execution failed"}`;
  }
  pipeline.push("LLM");

  // Stage 7: Post-execution metrics
  const graph = buildGraph();
  const metrics = collect();
  pipeline.push("Metrics");

  return {
    text: responseText || "(no response)",
    intent,
    capability,
    graphStats: graph.stats,
    metrics,
    pipeline,
  };
}

/** Check if CTO Agent is healthy */
function health() {
  const readiness = productionReadiness.test ? productionReadiness.test() : { ready: true, passed: 0, failed: 0 };
  const graph = buildGraph();
  const metrics = collect();

  return {
    status: readiness.ready ? ("healthy" as const) : ("degraded" as const),
    uptime: 0,
    dependencies: ["IntentClassifier", "KnowledgeLoader", "ContextBuilder", "PromptAssembler", "LLM"],
    version: "1.0.0",
    custom: {
      pipeline: "Intent → Capability → Knowledge → Context → Prompt → LLM → Render",
      graphNodes: graph.stats.totalNodes,
      knowledgeCoverage: metrics.coverage.coveragePercent,
      brokenRefs: metrics.validation.brokenRefs,
      readinessStatus: readiness.ready ? "READY" : "NOT READY",
    },
  };
}

// ── Export as Component ──

export const ctoAgent = {
  name: "CTOAgent",
  version: "1.0.0",
  capabilities: [
    "intent-classification",
    "capability-gating",
    "knowledge-loading",
    "context-building",
    "prompt-assembly",
    "llm-execution",
    "code-analysis",
    "devops-operations",
    "foundation-driven",
  ],
  dependencies: [
    "IntentClassifier",
    "CapabilityEngine",
    "KnowledgeLoader",
    "ContextBuilder",
    "PromptAssembler",
    "LLM",
  ],

  execute,
  health,
};

export default ctoAgent;
