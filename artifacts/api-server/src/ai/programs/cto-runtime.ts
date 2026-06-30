// Phase 2: CTO Runtime — built on Engineering OS kernel
// Uses kernel services. Does not bypass governance.
import { understand } from "../runtime/semantic-engine";
import { buildSpecV1 } from "../runtime/execution-spec";
import { verify as verifySpec } from "../runtime/verification-engine";
import { plan } from "../runtime/planner";
import { loadKnowledgeWithContent } from "../runtime/knowledge-loader";
import { buildFoundationContext } from "../runtime/context-builder";
import { assembleSystemPrompt } from "../runtime/prompt-assembler";
import { reflect } from "../runtime/reflection-engine";
import { collectEvidence } from "../runtime/evidence-collector";
import { propose as proposeEvolution } from "../runtime/knowledge-evolution";
import { review as reviewProposal } from "../runtime/proposal-review";
import { getIdentity } from "../runtime/identity";
import { authorization as auth } from "../runtime/authorization";
import { withinScope } from "../runtime/mission-scope";
import { getMultiTrust, rateDimension } from "../runtime/multi-trust";
import { callDeepSeekWithTools } from "../../routes/ai-helpers";
import { READ_TOOLS, DEVOPS_TOOLS } from "../../routes/ai-helpers";

const ctoIdentity = getIdentity("CTO")!;

interface CTOTask {
  message: string;
  userId: number;
  onProgress?: (msg: string) => void;
}

interface CTOResult {
  success: boolean;
  text: string;
  pipeline: string[];
  reflection: string;
}

/** CTO Runtime — execute a technical task through the kernel */
async function execute(task: CTOTask): Promise<CTOResult> {
  const pipeline: string[] = [];
  const t0 = Date.now();

  // Gate 1: Identity + Authorization
  if (!auth.can(ctoIdentity.id, "analyzeCode")) {
    return { success: false, text: "CTO not authorized", pipeline: [], reflection: "Authorization failed" };
  }
  pipeline.push("Authorization");

  // Gate 2: Mission Scope
  const scope = withinScope(ctoIdentity.id, "analyzeCode", "general");
  if (!scope.allowed) {
    return { success: false, text: `Scope violation: ${scope.reason}`, pipeline, reflection: "Scope check failed" };
  }
  pipeline.push("MissionScope");

  // Stage 1: Semantic Understanding
  const contract = await understand(task.message);
  pipeline.push("SemanticEngine");

  // Stage 2: Execution Specification
  const spec = buildSpecV1(contract);
  pipeline.push("ExecutionSpec");

  // Stage 3: Verification
  const verification = verifySpec(spec);
  if (!verification.passed) {
    return { success: false, text: verification.stopReason || "Verification failed", pipeline, reflection: "" };
  }
  pipeline.push("Verification");

  // Stage 4: Planner
  const taskGraph = plan(spec);
  pipeline.push("Planner");

  // Stage 5: Knowledge Loading
  const knowledge = spec.runtimePolicy.knowledge !== "none"
    ? loadKnowledgeWithContent({ strategy: spec.runtimePolicy.knowledge === "full" ? "always" : "conditional" })
    : [];
  pipeline.push("KnowledgeLoader");

  // Stage 6: Context Building
  const ctxPkg = buildFoundationContext(knowledge, "cto", spec.runtimePolicy.maxTokens);
  pipeline.push("ContextBuilder");

  // Stage 7: Prompt Assembly
  const systemPrompt = assembleSystemPrompt(ctxPkg, "cto");
  pipeline.push("PromptAssembler");

  // Stage 8: LLM Execution
  const isDevOps = spec.intent === "devops_operation";
  const toolSet = isDevOps ? DEVOPS_TOOLS
    : spec.intent === "greeting" ? [] : READ_TOOLS;

  let responseText: string;
  try {
    responseText = await callDeepSeekWithTools(
      systemPrompt, task.message, task.userId, "cto", toolSet,
      spec.runtimePolicy.maxTokens, task.onProgress,
    );
    pipeline.push("LLM");
  } catch (e: any) {
    return { success: false, text: `LLM error: ${e.message}`, pipeline, reflection: "" };
  }

  // Stage 9: Reflection
  const report = reflect(spec, responseText, {
    tokensUsed: spec.runtimePolicy.maxTokens,
    toolsCalled: toolSet.length,
    stepsCompleted: taskGraph.totalSteps,
    totalTimeMs: Date.now() - t0,
  });
  pipeline.push("Reflection");

  // Stage 10: Evidence Collection
  const evidence = collectEvidence(spec, report, {
    tokensUsed: spec.runtimePolicy.maxTokens,
    toolsCalled: toolSet.length,
    stepsCompleted: taskGraph.totalSteps,
    totalTimeMs: Date.now() - t0,
  }, responseText);
  pipeline.push("EvidenceCollector");

  // Stage 11: Knowledge Evolution (if gaps found)
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

/** Health check — verify all kernel dependencies are available */
function health() {
  return {
    status: "healthy" as const,
    uptime: 0,
    dependencies: [
      "SemanticEngine", "ExecutionSpecificationV1", "VerificationEngine",
      "Planner", "KnowledgeLoader", "ContextBuilder", "PromptAssembler",
      "LLM", "ReflectionEngine", "EvidenceCollector", "KnowledgeEvolution",
    ],
    version: "1.0.0",
    custom: {
      pipeline: "Authorization → Scope → Semantic → Spec → Verify → Plan → Knowledge → Context → Prompt → LLM → Reflect → Evidence → Evolve",
      kernelServicesUsed: 11,
    },
  };
}

export const ctoProgram = {
  name: "CTOProgram",
  version: "1.0.0",
  capabilities: [
    "code-analysis", "implementation", "architecture-review",
    "devops", "proposal-generation", "knowledge-evolution",
  ],
  dependencies: [
    "SemanticEngine", "Planner", "KnowledgeRuntime", "LLM",
    "ReflectionEngine", "EvidenceCollector",
  ],

  execute,
  health,
};

export default ctoProgram;
