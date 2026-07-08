// ECP-018: CTO Runtime — Chief Technology Officer
// Foundation v2.0 compliant. 12-stage governed pipeline.
// Identity from identity.ts, directive from Foundation, prompt from PromptAssembler.
// CTO IS the engineer. LLM does technical reasoning only.

import { buildSpecV1 } from "../runtime/execution-spec";
import { verify as verifySpec } from "../runtime/verification-engine";
import { plan } from "../runtime/planner";
import { loadKnowledgeWithContent } from "../runtime/knowledge-loader";
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
import { ceoRuntime } from "./ceo-runtime";
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
      fetchedPairs.push(`\n\n[FILE: ${idx.path}]:\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``);
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
  missionId?: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("../runtime/execution/execution-manifest").ExecutionSnapshot) => void;
}

interface CTOResult {
  success: boolean;
  text: string;
  pipeline: string[];
  reflection: string;
  toolsUsed: number;
  filesRead: string[];
}

async function execute(task: CTOTask, execContract?: ExecutionContract): Promise<CTOResult> {
  const pipeline: string[] = [];
  const t0 = Date.now();
  console.log(`[PIPELINE:CTO] execute start — message="${(task.message||"").slice(0, 80)}" userId=${task.userId} missionId=${task.missionId}`);

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

  // Stage 5: Semantic Understanding — skip LLM, extract from message directly (CEO already parsed semantics)
  const originalQuery = task.message.includes("\nUser Query: ")
    ? task.message.split("\nUser Query: ").pop() || task.message
    : task.message;
  const lower = originalQuery.toLowerCase();
  const extractedEntities: string[] = [];
  const extractedTargets: string[] = [];
  // Simple keyword extraction — no LLM call
  for (const kw of ["inventory", "stok", "produk", "product", "dashboard", "order", "pesanan", "shift", "user", "pengguna", "expense", "biaya", "laporan", "report", "api", "auth", "database", "schema", "migration"]) {
    if (lower.includes(kw)) extractedEntities.push(kw);
  }
  // Extract any file-like patterns
  const fileMatches = originalQuery.match(/(?:[\w./-]+\.(ts|tsx|js|jsx|json|css|html|sql|md))/g);
  if (fileMatches) extractedTargets.push(...fileMatches);
  const contract: import("../runtime/semantic-engine").SemanticContract = {
    intent: "analyze_code",
    problem: originalQuery.slice(0, 100),
    domain: extractedEntities.includes("inventory") ? "inventory" : extractedEntities.includes("product") || extractedEntities.includes("produk") ? "products" : "general",
    entities: extractedEntities,
    targetFiles: extractedTargets,
    confidence: extractedEntities.length > 0 ? 85 : 70,
    risk: "low",
    requiredCapabilities: ["readFiles", "searchCode"],
    missingContext: [],
  };
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
    const searchTerms = [...spec.targetFiles, ...spec.entities].filter(Boolean);
    const enrichedForFetch = searchTerms.length > 0
      ? `${task.message} ${searchTerms.join(" ")}`
      : task.message;
    fileContext = await fetchContext(enrichedForFetch);
  }
  pipeline.push("ContextFetching");

  // Stage 10: Knowledge Loading
  const knowledge = spec.runtimePolicy.knowledge !== "none"
    ? loadKnowledgeWithContent({ strategy: spec.runtimePolicy.knowledge === "full" ? "always" : "conditional" })
    : [];
  pipeline.push("KnowledgeLoader");

  // ECP-039: NO toolRules — Governor provides strategy via ExecutionContract
  let systemPrompt = assemble({
    identity: ctoIdentity,
    directive: directiveContent,
    outputSchema: CTO_OUTPUT_SCHEMA,
    context: fileContext.slice(0, 96000),     // 1M context aman untuk 96K chars file content
    maxTokens: spec.runtimePolicy.maxTokens,
    mode: "cto",
  });
  // Tegaskan: output harus analisis, bukan daftar file
  systemPrompt += `\n[ATURAN OUTPUT] JANGAN PERNAH output hanya daftar file path. Setiap file path WAJIB disertai penjelasan MENGAPA dan analisis dampaknya. Output tanpa analisis akan DITOLAK.\n`;
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

  // Enrich CTO message with target files + entities so it knows what to search for
  const allTargets = [...spec.targetFiles, ...spec.entities].filter(Boolean);
  const ctoMessage = allTargets.length > 0
    ? `${task.message}\n\n📌 TARGET ANALISIS: ${allTargets.join(", ")}\n${spec.targetFiles.length > 0 ? `FILE SPESIFIK: ${spec.targetFiles.join(", ")} — baca file ini langsung.` : ""}\nBaca file-file yang relevan dengan target di atas. Jangan membaca file di luar target.`
    : task.message;
  console.log("[CTO-SYS]", systemPrompt.slice(0, 300));
  console.log("[CTO-MSG]", ctoMessage.slice(0, 300));
  // CTO needs minimum 6000 tokens for tool-calling tasks
  const ctoMaxTokens = isGreeting ? 500 : Math.max(spec.runtimePolicy.maxTokens, 6000);
  console.log("[CTO-TOOL]", toolSet.map((t: any) => t.name).join(", "));
  console.log("[CTO-MAXTOKENS]", ctoMaxTokens);
  let responseText = "";
  let toolsUsed = 0;
  let filesRead: string[] = [];
  try {
    const llmResult = await callDeepSeekWithTools(
      systemPrompt, ctoMessage, task.userId, "cto", toolSet,
      ctoMaxTokens, task.onProgress, task.onTool,
      false, undefined, task.onExecutionEvent,
      { complexity: spec.estimatedComplexity, domain: spec.domain, entities: spec.entities, objective: spec.objective, targetFiles: spec.targetFiles },
      async (plan) => {
        const ceoResult = await ceoRuntime.execute({
          message: `[CEO APPROVAL] CTO mengajukan Implementation Plan:\n\n${plan}\n\nSetujui atau tolak.`,
          userId: task.userId,
          onProgress: task.onProgress,
          onTool: task.onTool,
          onExecutionEvent: task.onExecutionEvent,
        });
        return ceoResult.success && ceoResult.text.includes("APPROVED");
      },
    );
    responseText = llmResult.text;
    toolsUsed = llmResult.toolsUsed;
    filesRead = llmResult.filesRead;
    pipeline.push("LLM");
  } catch (e: any) {
    return { success: false, text: `LLM error: ${e.message}`, pipeline, reflection: "", toolsUsed: 0, filesRead: [] };
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

  console.log(`[PIPELINE:CTO] execute end — pipeline=[${pipeline.join("→")}] success=${report.objectiveAchieved} toolsUsed=${toolsUsed} filesRead=${filesRead.length} duration=${Date.now() - t0}ms`);

  return {
    success: report.objectiveAchieved,
    text: responseText,
    pipeline,
    reflection: report.recommendation,
    toolsUsed,
    filesRead,
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
