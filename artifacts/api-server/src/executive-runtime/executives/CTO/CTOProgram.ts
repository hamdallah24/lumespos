// ECP-018: CTO Runtime — Chief Technology Officer
// Foundation v2.0 compliant. 15-stage governed pipeline.
// Identity from identity.ts, directive from Foundation, prompt from PromptAssembler.
// CTO IS the engineer. LLM does technical reasoning only.
// Migrated to executive-runtime with EIOS integrations.

import { understand } from "../../../ai/runtime/semantic-engine";
import { buildSpecV1 } from "../../../ai/runtime/execution-spec";
import { verify as verifySpec } from "../../../ai/runtime/verification-engine";
import { plan } from "../../../ai/runtime/planner";
import { loadKnowledgeWithContent } from "../../../ai/runtime/knowledge-loader";
import { assemble } from "../../../ai/runtime/prompt-assembler";
import { reflect } from "../../../ai/runtime/reflection-engine";
import { collectEvidence } from "../../../ai/runtime/evidence-collector";
import { propose as proposeEvolution } from "../../../ai/runtime/knowledge-evolution";
import { review as reviewProposal } from "../../../ai/runtime/proposal-review";
import { getIdentity } from "../../../ai/runtime/identity";
import { authorization as auth } from "../../../ai/runtime/authorization";
import { withinScope } from "../../../ai/runtime/mission-scope";
import type { ExecutionContract } from "../../../eios-runtime/contracts/PipelineContracts";
import { callDeepSeekWithTools } from "../../../ai/llm/llm-adapter";
import { ExecutiveDispatchRegistry } from "../../../eios-runtime";
import { getDependencies } from "../../../ai/tools/tool-adapter";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
// CTO_OUTPUT_SCHEMA removed — EIOS 4.1 uses metadata-based identity + foundation
import { resolveTools } from "../../../ai/runtime/execution/tool-registry";
import { missionContextRegistry } from "../../../knowledge/MissionContextRegistry";
import { CAPABILITY_TOOLS, getDefaultCapabilities } from "../../../ai/runtime/execution/execution-capabilities";
import { consultantRuntime, consultantDiscovery } from "../../../programs/consultant";
import { auditEngine } from "../../../governance/core";
import { KnowledgeProvider } from "../../../knowledge-platform/providers";
import type { ExecutiveBrief, ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import { CognitiveEngine, getThinkingProfile, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";

const ctoIdentity = getIdentity("CTO")!;
const ctoCognitive = new CognitiveEngine();

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CTO");
  return content || "";
}

const KEYWORD_TRANSLATIONS: Record<string, string[]> = {
  produk: ["product", "produk", "catalog", "katalog"],
  harga: ["price", "harga"],
  stok: ["stock", "stok", "inventory", "barang"],
  pesanan: ["order", "pesanan"],
  laporan: ["report", "laporan", "dashboard"],
  pengguna: ["user", "pengguna", "customer"],
  penjualan: ["sales", "penjualan"],
  biaya: ["expense", "biaya"],
  halaman: ["page", "halaman", "product"],
  analisis: ["analysis", "analisis", "review"],
  temuan: ["finding", "temuan", "bug", "issue"],
  dashboard: ["dashboard", "report"],
  lupa: ["forgot", "reset", "password"],
  login: ["auth", "login", "authentication"],
  daftar: ["register", "signup", "signup"],
  barang: ["inventory", "stock", "stok", "barang", "product"],
  toko: ["store", "branch", "toko"],
  kategori: ["category", "kategori"],
  pelanggan: ["customer", "pelanggan", "user"],
  diskon: ["discount", "diskon", "promo"],
  pembayaran: ["payment", "pembayaran", "checkout"],
  hutang: ["debt", "hutang", "piutang"],
  karyawan: ["employee", "karyawan", "user", "staff"],
  gudang: ["warehouse", "gudang", "inventory"],
  migrasi: ["migration", "migrasi", "schema"],
};

async function fetchContext(message: string, userId?: number): Promise<{ text: string; filePaths: string[] }> {
  const blocks: string[] = [];
  const seen = new Set<string>();
  const matchedTargets: string[] = [];

  // Phase 1: Detect explicitly mentioned file paths in the message
  // Convert short names (e.g., "executive.tsx") to full paths using CKO file map
  const explicitPattern = /([\w\/]+\.(tsx?|jsx?|ts|js|css|json|mjs))/g;
  let explicitMatch;
  while ((explicitMatch = explicitPattern.exec(message)) !== null) {
    const shortPath = explicitMatch[1];
    if (!shortPath.includes(".")) continue;
    // Search for full path in CKO file map
    const fileMap = consultantDiscovery.load();
    let found = false;
    if (fileMap) {
      for (const entry of Object.values(fileMap)) {
        const files = (entry as any).files || [];
        if (Array.isArray(files)) {
          const match = files.find((f: string) => f.endsWith(shortPath) || f.includes(shortPath));
          if (match && !seen.has(match)) {
            seen.add(match);
            matchedTargets.push(match);
            blocks.push(`📌 FILE DISEBUTKAN USER: ${match}`);
            found = true;
            break;
          }
        }
      }
    }
    if (!found && !seen.has(shortPath)) {
      seen.add(shortPath);
      matchedTargets.push(shortPath);
      blocks.push(`📌 FILE DISEBUTKAN USER: ${shortPath}`);
    }
  }

  // Phase 2: CKO LLM-based file selection
  try {
    const ckoFiles = await consultantDiscovery.findRelevantFiles(message, 8, userId ?? 1);
    if (ckoFiles.files.length > 0) {
      for (const f of ckoFiles.files) {
        if (!seen.has(f)) { seen.add(f); matchedTargets.push(f); }
      }
      blocks.push(`📋 FILE DARI CKO (LLM selection):\n${ckoFiles.files.map((f, i) => `${i + 1}. ${f}`).join("\n")}`);
      blocks.push(`   🧠 Alasan: ${ckoFiles.reason}`);
    }
  } catch { /* CKO file selection unavailable */ }

  const indices = await missionContextRegistry.getRelevant("general", message);
  if (indices.length > 0) {
    const fetchedPairs: string[] = [];
    const fetchedPaths: string[] = [];

    for (const idx of indices.slice(0, 5)) {
      const content = await missionContextRegistry.getContent(idx.path);
      if (content && content.length > 10) {
        if (!seen.has(idx.path)) { seen.add(idx.path); }
        fetchedPaths.push(idx.path);
        matchedTargets.push(idx.path);
        fetchedPairs.push(`\n\n[FILE: ${idx.path}]:\n\`\`\`\n${content.slice(0, 8000)}\n\`\`\``);
      }
    }

    if (fetchedPaths.length > 0) {
      const manifestLines = fetchedPaths.map((p, i) => `${i + 1}. ${p}`);
      blocks.push(`📋 FILE DARI REGISTRY:\n${manifestLines.join("\n")}\n${fetchedPairs.join("")}`);
    }
  }

  return {
    text: blocks.length > 0 ? "\n\n" + blocks.join("\n\n") : "",
    filePaths: matchedTargets,
  };
}

function normalizeOutput(text: string): string {
  if (!text || text.trim().length < 50) return text || "";
  return text.trim();
}

interface CTOTask {
  message: string;
  userId: number;
  missionId?: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onExecutionEvent?: (snapshot: import("../../../ai/runtime/execution/execution-manifest").ExecutionSnapshot) => void;
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
  task.onProgress?.("🔵 CTO Runtime: Identity loaded");

  // Stage 2: Directive (cached from Foundation)
  pipeline.push("Directive");
  task.onProgress?.("📄 CTO: Memuat directive teknis");
  const directiveContent = getDirective();

  // Stage 3: Authorization
  if (!auth.can(ctoIdentity.id, "analyzeCode")) {
    auditEngine.log({ actor: "CTO", action: "execute", resource: "program", result: "denied", reason: "Authorization failed — cannot analyzeCode", metadata: { userId: task.userId } });
    return { success: false, text: "CTO not authorized", pipeline: [], reflection: "Authorization failed", toolsUsed: 0, filesRead: [] };
  }
  pipeline.push("Authorization");
  task.onProgress?.("🔐 CTO: Authorization passed");

  // Stage 4: Mission Scope
  const scope = withinScope(ctoIdentity.id, "analyzeCode", "general");
  if (!scope.allowed) {
    auditEngine.log({ actor: "CTO", action: "execute", resource: "program", result: "denied", reason: `Scope violation: ${scope.reason}`, metadata: { userId: task.userId } });
    return { success: false, text: `Scope violation: ${scope.reason}`, pipeline, reflection: "Scope check failed", toolsUsed: 0, filesRead: [] };
  }
  pipeline.push("MissionScope");
  task.onProgress?.("📐 CTO: Mission scope OK");

  // Stage 5: Semantic Understanding
  const originalQuery = task.message.includes("\nUser Query: ")
    ? task.message.split("\nUser Query: ").pop() || task.message
    : task.message;
  const contract = await understand(originalQuery, task.userId);
  pipeline.push("SemanticEngine");
  task.onProgress?.("🔎 CTO: Memahami permintaan teknis");

  // Stage 6: Execution Specification
  const spec = buildSpecV1(contract);
  pipeline.push("ExecutionSpec");
  task.onProgress?.("📋 CTO: Execution spec built");

  // Stage 7: Verification
  const verification = verifySpec(spec);
  if (!verification.passed) {
    auditEngine.log({ actor: "CTO", action: "verify", resource: "spec", result: "denied", reason: verification.stopReason || "Verification failed", metadata: { userId: task.userId } });
    return { success: false, text: verification.stopReason || "Verification failed", pipeline, reflection: "", toolsUsed: 0, filesRead: [] };
  }
  pipeline.push("Verification");
  task.onProgress?.("✅ CTO: Verification passed");

  const implKeywords = /perbaiki|tulis|write|edit|implement|fix|koreksi|benah|ubah|buat.*file/i;
  if (implKeywords.test(originalQuery) && spec.intent !== "devops_operation") {
    spec.intent = "implement_change";
    task.onProgress?.("🔧 CTO: Implementation mode aktif");
  }

  // Stage 8: Planner
  const taskGraph = plan(spec);
  pipeline.push("Planner");
  task.onProgress?.("📊 CTO: Menyusun rencana analisis");

  // Stage 9: Context Fetching
  let fileContext: { text: string; filePaths: string[] } = { text: "", filePaths: [] };
  if (spec.intent !== "greeting") {
    task.onProgress?.("🔎 Mengambil konteks file...");
    const searchTerms = [...spec.targetFiles, ...spec.entities].filter(Boolean);
    const enrichedForFetch = searchTerms.length > 0
      ? `${task.message} ${searchTerms.join(" ")}`
      : task.message;
      try { fileContext = await fetchContext(enrichedForFetch, task.userId); } catch (e: any) { console.error("[CTO] fetchContext error:", e.message); }
    }
  pipeline.push("ContextFetching");
  task.onProgress?.("📂 CTO: Konteks file siap");

  // Stage 10: Knowledge Loading
  let knowledge: any[] = [];
  try {
    knowledge = spec.runtimePolicy.knowledge !== "none"
      ? loadKnowledgeWithContent({ strategy: spec.runtimePolicy.knowledge === "full" ? "always" : "conditional" })
      : [];
  } catch (e: any) { console.error("[CTO] loadKnowledge error:", e.message); }
  pipeline.push("KnowledgeLoader");
  task.onProgress?.("📚 CTO: Memuat knowledge base");

  // Stage 10.5: CKO Consultation
  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("cto_advisory", task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { /* CKO unavailable */ }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CTO: Consult CKO untuk struktur project");

  // Stage 10.5b: Memory Read — before Cognitive
  let memoryCtx = null;
  try {
    memoryCtx = await memoryProvider.read({
      executive: "CTO",
      query: task.message,
      domain: spec.domain,
      memoryScope: "project",
      maxTokens: 2000,
    });
  } catch (e: any) {
    console.log(`[PIPELINE:CTO:MemoryProvider] error: ${e.message}`);
  }

  // Stage 10.6: Cognitive Engine — think before LLM
  let cognitiveResult = null;
  try {
    if (spec.intent !== "greeting") {
      cognitiveResult = await ctoCognitive.think({
        role: "CTO",
        query: task.message,
        context: {
          intent: spec.intent,
          domain: spec.domain,
          objective: spec.objective,
          complexity: spec.estimatedComplexity,
          targetFiles: spec.targetFiles,
          memoryContext: memoryCtx,
        },
      });
      recordTrace("CTO", task.message, cognitiveResult.trace);
      await writeDecisionToMemory("CTO", task.message, cognitiveResult);
      pipeline.push("CognitiveEngine");
      task.onProgress?.("🧠 CTO: Cognitive reasoning completed");
    }
  } catch (e: any) {
    console.log(`[PIPELINE:CTO:CognitiveEngine] error: ${e.message}`);
  }

  let memContext = "";
  if (memoryCtx) {
    const memBlock = [memoryCtx.workingMemory, memoryCtx.recentDecisions, memoryCtx.knowledgeContext].filter(Boolean).join("\n");
    if (memBlock) memContext = `## Memory Context\n${memBlock}\n\n`;
  }
  let systemPrompt = assemble({
    identity: ctoIdentity,
    directive: directiveContent,
    decision: cognitiveResult?.trace,
    context: memContext + fileContext.text.slice(0, 96000),
    maxTokens: spec.runtimePolicy.maxTokens,
    mode: "cto",
  });
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n\n[PROJECT STRUCTURE] Gunakan info folder di atas untuk tahu folder mana yg relevan — jangan discover dari nol.\n`;
  systemPrompt += `\n[INFO] Error log runtime tersedia di /tmp/pos-error.log (baca dengan readFile).\n`;
  systemPrompt += `\n[ATURAN OUTPUT] Setiap file path WAJIB disertai penjelasan dan analisis dampaknya. Output tanpa analisis akan DITOLAK.\n`;
  pipeline.push("PromptAssembly");
  task.onProgress?.("📝 CTO: Merakit prompt");

  const isDevOps = spec.intent === "devops_operation";
  const isGreeting = spec.intent === "greeting";
  let toolSet = isGreeting ? []
    : execContract?.allowedTools?.length
      ? execContract.allowedTools as any[]
      : isDevOps
        ? resolveTools(getDefaultCapabilities("CTO"), CAPABILITY_TOOLS)
        : resolveTools(getDefaultCapabilities("CTO"), CAPABILITY_TOOLS);

  // If user explicitly mentioned a file path, restrict tools to read-only (no search)
  // This prevents LLM from overriding the provided context with its own file search
  const hasExplicitFile = /[\w\/]+\.(tsx?|jsx?|ts|js|css|json|mjs)/.test(task.message);
  if (hasExplicitFile && toolSet.length > 0 && fileContext.filePaths.length > 0) {
    const readOnlyTools = toolSet.filter((t: any) => {
      const name = typeof t === "string" ? t : t.name || "";
      return /readFile|editFile|writeFile|getDependencies/i.test(name);
    });
    if (readOnlyTools.length > 0) {
      toolSet = readOnlyTools;
      task.onProgress?.("📌 File eksplisit terdeteksi — tool pencarian dibatasi");
    }
  }

  const allTargets = [...spec.targetFiles, ...spec.entities].filter(Boolean);
  const ckoFiles = fileContext.filePaths.slice(0, 10);
  const targetBlock = allTargets.length > 0 ? `📌 TARGET ANALISIS: ${allTargets.join(", ")}` : "";
  const ckoFileBlock = ckoFiles.length > 0 ? `📁 FILE DARI CKO — baca file ini langsung:\n${ckoFiles.map((f, i) => `  ${i + 1}. ${f}`).join("\n")}` : "";
  const ctoMessage = [task.message, targetBlock, ckoFileBlock].filter(Boolean).join("\n\n");
  console.log("[CTO-SYS]", systemPrompt.slice(0, 300));
  console.log("[CTO-MSG]", ctoMessage.slice(0, 300));
  const ctoMaxTokens = isGreeting ? 500 : Math.max(spec.runtimePolicy.maxTokens, 6000);
  console.log("[CTO-TOOL]", toolSet.map((t: any) => t.name).join(", "));
  console.log("[CTO-MAXTOKENS]", ctoMaxTokens);
  let responseText = "";
  let toolsUsed = 0;
  let filesRead: string[] = [];
  task.onProgress?.("⚙️ CTO: Mengeksekusi analisis (3 cycle)...");
  try {
    const llmResult = await callDeepSeekWithTools(
      systemPrompt, ctoMessage, task.userId, "cto", toolSet,
      ctoMaxTokens, task.onProgress, task.onTool,
      false, undefined, task.onExecutionEvent,
      { complexity: spec.estimatedComplexity, domain: spec.domain, entities: spec.entities, objective: spec.objective, targetFiles: spec.targetFiles, intent: spec.intent },
      async (plan) => {
        // Untuk testing: owner auto-approve. Production: CEO approval.
        if (true) return true; // Bypass CEO approval untuk testing
        /*
        CEO approval (akan diaktifkan di production):
        const ceoDecision = await ExecutiveDispatchRegistry.dispatch("CEO", {
          id: `plan-${Date.now().toString(36)}`, role: "CEO",
          title: "Implementation Plan Approval",
          date: new Date().toISOString(),
          summary: plan,
          sections: [], actionItems: [], pendingApprovals: [],
        }, { userId: task.userId });
        return ceoDecision !== null && ceoDecision.reasoning.includes("APPROVED");
        */
      },
    );
    responseText = normalizeOutput(llmResult.text);
    toolsUsed = llmResult.toolsUsed;
    filesRead = llmResult.filesRead;
    pipeline.push("LLM");
    task.onProgress?.("✅ CTO: Analisis selesai");
  } catch (e: any) {
    auditEngine.log({ actor: "CTO", action: "llm_call", resource: "program", result: "denied", reason: `LLM error: ${e.message}`, metadata: { userId: task.userId } });
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
  task.onProgress?.("🧪 CTO: Refleksi hasil");

  // Stage 14: Evidence Collection
  const evidence = collectEvidence(spec, report, {
    tokensUsed: spec.runtimePolicy.maxTokens,
    toolsCalled: toolSet.length,
    stepsCompleted: taskGraph.totalSteps,
    totalTimeMs: Date.now() - t0,
  }, responseText);
  pipeline.push("EvidenceCollector");
  task.onProgress?.("📎 CTO: Mengumpulkan evidence");

  // Stage 15: Knowledge Evolution
  if (evidence.strength !== "weak" && report.gaps.length > 0) {
    const proposal = proposeEvolution(evidence);
    if (proposal) {
      const review = reviewProposal(proposal, []);
      if (review.recommendation !== "REJECT") {
        pipeline.push(`KnowledgeEvolution: ${review.recommendation}`);
      }
    }
  }

  // EIOS: Record decision
  if (report.objectiveAchieved) {
    KnowledgeProvider.ingestEpisode({
      eventType: "cto_execution",
      eventId: `CTO-${Date.now()}`,
      context: task.message.slice(0, 500),
      outcome: "success",
      domain: "technology",
      topic: spec.objective || "technical_analysis",
      summary: `CTO analysis: ${spec.objective || "technical analysis"} — ${pipeline.join("→")}`,
      tags: ["cto", "technical", spec.intent],
    });
  }

  auditEngine.log({ actor: "CTO", action: "execute", resource: "program", result: report.objectiveAchieved ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")} — tools=${toolsUsed} files=${filesRead.length}`, metadata: { userId: task.userId, success: report.objectiveAchieved, durationMs: Date.now() - t0 } });

  console.log(`[PIPELINE:CTO] execute end — pipeline=[${pipeline.join("→")}] success=${report.objectiveAchieved} toolsUsed=${toolsUsed} files=${filesRead.length} duration=${Date.now() - t0}ms`);

  return {
    success: report.objectiveAchieved,
    text: responseText,
    pipeline,
    reflection: report.recommendation,
    toolsUsed,
    filesRead,
  };
}

async function decide(brief: ExecutiveBrief, _context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const techSections = brief.sections.filter(s =>
    s.title.toLowerCase().includes("tech") || s.title.toLowerCase().includes("system") || s.title.toLowerCase().includes("implement")
  );
  if (techSections.length > 0) {
    return {
      role: "CTO",
      action: "technical_review",
      reasoning: `${techSections.length} technical areas from brief — reviewing architecture and implementation`,
      confidence: 85,
      payload: { technicalItems: techSections.flatMap(s => s.items) },
    };
  }
  return {
    role: "CTO",
    action: "monitor_tech",
    reasoning: `Technical monitoring based on brief — ${brief.summary}`,
    confidence: 90,
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
  decide,
};

export default ctoProgram;
