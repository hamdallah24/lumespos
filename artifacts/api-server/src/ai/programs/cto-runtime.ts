// ECP-018: CTO Runtime — Chief Technology Officer
// Foundation v2.0 compliant. 12-stage governed pipeline.
// Identity from identity.ts, directive from Foundation, prompt from PromptAssembler.
// CTO IS the engineer. LLM does technical reasoning only.

import { understand } from "../runtime/semantic-engine";
import { buildSpecV1 } from "../runtime/execution-spec";
import { verify as verifySpec } from "../runtime/verification-engine";
import { plan } from "../runtime/planner";
import { loadKnowledgeWithContent } from "../runtime/knowledge-loader";
import { buildFoundationContext } from "../runtime/context-builder";
import { assemble } from "../runtime/prompt-assembler";
import { reflect } from "../runtime/reflection-engine";
import { collectEvidence } from "../runtime/evidence-collector";
import { propose as proposeEvolution } from "../runtime/knowledge-evolution";
import { review as reviewProposal } from "../runtime/proposal-review";
import { getIdentity } from "../runtime/identity";
import { authorization as auth } from "../runtime/authorization";
import { withinScope } from "../runtime/mission-scope";
import type { ExecutionContract } from "../runtime/execution/execution-manifest";
import { callDeepSeekWithTools } from "../llm/llm-adapter";
import { getDependencies } from "../tools/tool-adapter";
import { getFoundationProvider } from "../runtime/foundation";
import { CTO_OUTPUT_SCHEMA } from "../../routes/ai-prompts";
import { resolveTools } from "../runtime/execution/tool-registry";
import { missionContextRegistry } from "../../knowledge/MissionContextRegistry";
import { CAPABILITY_TOOLS, getDefaultCapabilities } from "../runtime/execution/execution-capabilities";

const ctoIdentity = getIdentity("CTO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CTO");
  return content || "";
}

/** Auto-fetch relevant files from the repository for context — via MissionContextRegistry */
async function fetchContext(message: string): Promise<string> {
  const indices = await missionContextRegistry.getRelevant("general", message);
  if (indices.length === 0) return "";

  const fetchedPairs: string[] = [];
  const fetchedPaths: string[] = [];

  for (const idx of indices.slice(0, 5)) {
    const content = await missionContextRegistry.getContent(idx.path);
    if (content && content.length > 10) {
      fetchedPaths.push(idx.path);
      fetchedPairs.push(`\n\n[FILE: ${idx.path}]:\n\`\`\`\n${content.slice(0, 2000)}\n\`\`\``);
    }
  }

  if (fetchedPaths.length > 0) {
    const depResults = await Promise.all(fetchedPaths.map(async (p) => ({ p, deps: await getDependencies(p) })));
    const manifestLines = fetchedPaths.map((p, i) => `${i + 1}. ${p}`);
    return `\n\n📋 FILE YANG TERSEDIA:\n${manifestLines.join("\n")}\n` + fetchedPairs.join("");
  }
  return "";
}

interface CTOTask {
  message: string;
  userId: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("../runtime/execution/execution-manifest").ExecutionSnapshot) => void;
}

interface CTOResult {
  success: boolean;
  text: string;
  pipeline: string[];
  reflection: string;
}

async function execute(task: CTOTask, execContract?: ExecutionContract): Promise<CTOResult> {
  const pipeline: string[] = [];
  const t0 = Date.now();

  // Stage 1: Identity
  pipeline.push("Identity");

  // Stage 2: Directive (cached from Foundation)
  pipeline.push("Directive");
  const directiveContent = getDirective();

  // Stage 3: Authorization
  if (!auth.can(ctoIdentity.id, "analyzeCode")) {
    return { success: false, text: "CTO not authorized", pipeline: [], reflection: "Authorization failed" };
  }
  pipeline.push("Authorization");

  // Stage 4: Mission Scope
  const scope = withinScope(ctoIdentity.id, "analyzeCode", "general");
  if (!scope.allowed) {
    return { success: false, text: `Scope violation: ${scope.reason}`, pipeline, reflection: "Scope check failed" };
  }
  pipeline.push("MissionScope");

  // Stage 5: Semantic Understanding
  const contract = await understand(task.message, task.userId);
  pipeline.push("SemanticEngine");

  // Stage 6: Execution Specification
  const spec = buildSpecV1(contract);
  pipeline.push("ExecutionSpec");

  // Stage 7: Verification
  const verification = verifySpec(spec);
  if (!verification.passed) {
    return { success: false, text: verification.stopReason || "Verification failed", pipeline, reflection: "" };
  }
  pipeline.push("Verification");

  // Stage 8: Planner
  const taskGraph = plan(spec);
  pipeline.push("Planner");

  // Stage 9: Context Fetching (file refs + search + manifest)
  let fileContext = "";
  if (spec.intent !== "greeting") {
    task.onProgress?.("🔎 Mengambil konteks file...");
    fileContext = await fetchContext(task.message);
  }
  pipeline.push("ContextFetching");

  // Stage 10: Knowledge Loading
  const knowledge = spec.runtimePolicy.knowledge !== "none"
    ? loadKnowledgeWithContent({ strategy: spec.runtimePolicy.knowledge === "full" ? "always" : "conditional" })
    : [];
  pipeline.push("KnowledgeLoader");

  // ECP-039: NO toolRules — Governor provides strategy via ExecutionContract
  const systemPrompt = assemble({
    identity: ctoIdentity,
    directive: directiveContent,
    outputSchema: CTO_OUTPUT_SCHEMA,
    context: fileContext.slice(0, 3000),      // ADR-010: cap file context to prevent context overflow
    maxTokens: spec.runtimePolicy.maxTokens,
    mode: "cto",
  });
  pipeline.push("PromptAssembly");

  // ECP-039 Sprint 2: Tools from Governor Contract. No hardcoded decisions.
  // Contract resolved via: capabilities (Governor) → Tool Registry → ToolDef[]
  const isDevOps = spec.intent === "devops_operation";
  const isGreeting = spec.intent === "greeting";
  const toolSet = isGreeting ? []
    : execContract?.allowedTools?.length
      ? execContract.allowedTools as any[]
      : isDevOps
        ? resolveTools(getDefaultCapabilities("CTO"), CAPABILITY_TOOLS)
        : resolveTools(getDefaultCapabilities("CTO"), CAPABILITY_TOOLS);
  let responseText: string;
  try {
    responseText = await callDeepSeekWithTools(
      systemPrompt, task.message, task.userId, "cto", toolSet,
      spec.runtimePolicy.maxTokens, task.onProgress, task.onTool,
      false, undefined, task.onExecutionEvent,
      { complexity: spec.estimatedComplexity, domain: spec.domain, entities: spec.entities, objective: spec.objective },
    );
    pipeline.push("LLM");
  } catch (e: any) {
    return { success: false, text: `LLM error: ${e.message}`, pipeline, reflection: "" };
  }

  // Stage 13: Reflection
  const report = reflect(spec, responseText, {
    tokensUsed: spec.runtimePolicy.maxTokens,
    toolsCalled: toolSet.length,
    stepsCompleted: taskGraph.totalSteps,
    totalTimeMs: Date.now() - t0,
  });
  pipeline.push("Reflection");

  // Stage 14: Evidence Collection
  const evidence = collectEvidence(spec, report, {
    tokensUsed: spec.runtimePolicy.maxTokens,
    toolsCalled: toolSet.length,
    stepsCompleted: taskGraph.totalSteps,
    totalTimeMs: Date.now() - t0,
  }, responseText);
  pipeline.push("EvidenceCollector");

  // Stage 15: Knowledge Evolution (if gaps found)
  if (evidence.strength !== "weak" && report.gaps.length > 0) {
    const proposal = proposeEvolution(evidence);
    if (proposal) {
      const review = reviewProposal(proposal, []);
      if (review.recommendation !== "REJECT") {
        pipeline.push(`KnowledgeEvolution: ${review.recommendation}`);
      }
    }
  }

  return {
    success: report.objectiveAchieved,
    text: responseText,
    pipeline,
    reflection: report.recommendation,
  };
}

function health() {
  return {
    status: "healthy" as const,
    uptime: 0,
    dependencies: [
      "IdentityRuntime", "AuthorizationRuntime", "Directive",
      "SemanticEngine", "ExecutionSpecificationV1", "VerificationEngine",
      "Planner", "KnowledgeLoader", "ContextBuilder", "PromptAssembler",
      "LLM", "ReflectionEngine", "EvidenceCollector", "KnowledgeEvolution",
    ],
    version: "1.1.0",
    custom: {
      pipeline: "Identity → Directive → Auth → Scope → Semantic → Spec → Verify → Plan → Context → Knowledge → Prompt → LLM → Reflect → Evidence → Evolve",
      kernelServicesUsed: 15,
    },
  };
}

export const ctoProgram = {
  name: "CTOProgram",
  version: "1.1.0",
  capabilities: [
    "code-analysis", "implementation", "architecture-review",
    "devops", "proposal-generation", "knowledge-evolution",
  ],
  dependencies: [
    "IdentityRuntime", "AuthorizationRuntime", "FoundationLoader",
    "SemanticEngine", "Planner", "KnowledgeRuntime", "PromptAssembler",
    "LLM", "ReflectionEngine", "EvidenceCollector",
  ],
  execute,
  health,
};

export default ctoProgram;
