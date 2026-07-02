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
import { getMultiTrust, rateDimension } from "../runtime/multi-trust";
import { callDeepSeekWithTools, fetchGitHubFile, searchRepoFiles, getDependencies } from "../../routes/ai-helpers";
import { READ_TOOLS, DEVOPS_TOOLS } from "../../routes/ai-helpers";
import { foundationLoader } from "../runtime/foundation-loader";
import { CTO_OUTPUT_SCHEMA, TOOL_RULES } from "../../routes/ai-prompts";

const ctoIdentity = getIdentity("CTO")!;

let _cachedDirective: string | null = null;
function getDirective(): string {
  if (_cachedDirective) return _cachedDirective;
  const assets = foundationLoader.load();
  const directive = assets.find(a => a.id === "cto-directive-v1");
  _cachedDirective = directive?.content || "";
  return _cachedDirective;
}

/** Auto-fetch relevant files from the repository for context */
async function fetchContext(message: string): Promise<string> {
  const fetchedPairs: string[] = [];
  const fetchedPaths: string[] = [];

  const fileRefs = message.match(/(\w+\.[a-z]{2,4})/gi);
  if (fileRefs) {
    const refResults = await Promise.all(fileRefs.slice(0, 3).map(async (ref) => {
      const paths = [
        `artifacts/pos-app/src/components/${ref}`,
        `artifacts/pos-app/src/${ref}`,
        `artifacts/api-server/src/routes/${ref}`,
        `artifacts/api-server/src/${ref}`,
        `artifacts/api-server/src/middlewares/${ref}`,
        ref,
      ];
      const results = await Promise.all(paths.map(p => fetchGitHubFile(p, "main")));
      for (let i = 0; i < results.length; i++) {
        if (results[i].content) return { path: paths[i], content: results[i].content };
      }
      return null;
    }));
    for (const r of refResults) {
      if (r) {
        fetchedPaths.push(r.path);
        fetchedPairs.push(`\n\n[FILE: ${r.path}]:\n\`\`\`\n${r.content.slice(0, 2500)}\n\`\`\``);
      }
    }
  }

  const relevantPaths = await searchRepoFiles(message);
  const seen = new Set(fetchedPaths);
  const unseen = relevantPaths.filter(p => !seen.has(p));
  const need = Math.min(8 - fetchedPairs.length, unseen.length);
  if (need > 0) {
    const targets = unseen.slice(0, need);
    const searchResults = await Promise.all(targets.map(p => fetchGitHubFile(p, "main")));
    for (let i = 0; i < searchResults.length && fetchedPairs.length < 8; i++) {
      const r = searchResults[i];
      if (r.content && r.content.length > 10) {
        fetchedPaths.push(targets[i]);
        fetchedPairs.push(`\n\n[FILE: ${targets[i]}]:\n\`\`\`\n${r.content.slice(0, 2000)}\n\`\`\``);
      }
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
}

interface CTOResult {
  success: boolean;
  text: string;
  pipeline: string[];
  reflection: string;
}

async function execute(task: CTOTask): Promise<CTOResult> {
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
  const contract = await understand(task.message);
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

  // Stage 11: Prompt Assembly (PromptAssembler — NO persona)
  const systemPrompt = assemble({
    identity: ctoIdentity,
    directive: directiveContent,
    outputSchema: CTO_OUTPUT_SCHEMA,
    toolRules: TOOL_RULES,
    context: fileContext,
    maxTokens: spec.runtimePolicy.maxTokens + 2000,
    mode: "cto",
  });
  pipeline.push("PromptAssembly");

  // Stage 12: LLM Execution
  const isDevOps = spec.intent === "devops_operation";
  const toolSet = isDevOps ? DEVOPS_TOOLS
    : spec.intent === "greeting" ? [] : READ_TOOLS;

  let responseText: string;
  try {
    responseText = await callDeepSeekWithTools(
      systemPrompt, task.message, task.userId, "cto", toolSet,
      spec.runtimePolicy.maxTokens, task.onProgress, task.onTool,
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
