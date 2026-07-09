// ECP-018: CTO Runtime — Chief Technology Officer
// Foundation v2.0 compliant. 12-stage governed pipeline.
// Identity from identity.ts, directive from Foundation, prompt from PromptAssembler.
// CTO IS the engineer. LLM does technical reasoning only.

import { understand } from "../runtime/semantic-engine";
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
import { consultantRuntime, consultantDiscovery } from "../../programs/consultant";

const ctoIdentity = getIdentity("CTO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CTO");
  return content || "";
}

// Indonesian → English keyword translation untuk CKO file map lookup
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

async function fetchContext(message: string): Promise<{ text: string; filePaths: string[] }> {
  const blocks: string[] = [];
  const seen = new Set<string>();
  const matchedTargets: string[] = [];

  // Translate Indonesian keywords to English for file map lookup
  function translateKeywords(msg: string): string[] {
    const words = msg.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    const translated = new Set<string>();
    for (const w of words) {
      translated.add(w);
      const mapping = KEYWORD_TRANSLATIONS[w];
      if (mapping) mapping.forEach(t => translated.add(t));
    }
    return [...translated];
  }

  // 1. Try CKO file map local index first (always available, no GitHub needed)
  try {
    const fileMap = consultantDiscovery.load();
    if (fileMap) {
      const keywords = translateKeywords(message);
      const matchedFiles: string[] = [];
      for (const kw of keywords) {
        const entry = fileMap[kw];
        if (entry) {
          for (const f of entry.files) {
            if (!seen.has(f)) { seen.add(f); matchedFiles.push(f); matchedTargets.push(f); }
          }
        }
      }
      if (matchedFiles.length > 0) {
        blocks.push(`📋 FILE INDEX LOKAL (CKO):\n${matchedFiles.map((f, i) => `${i + 1}. ${f}`).join("\n")}`);
      }
    }
  } catch { /* CKO map unavailable */ }

  // 2. MissionContextRegistry (GitHub-based, cached)
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

/** Minimum guard — hanya tolak output kosong/terlalu pendek, tanpa wrapping template */
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
  task.onProgress?.("🔵 CTO Runtime: Identity loaded");

  // Stage 2: Directive (cached from Foundation)
  pipeline.push("Directive");
  task.onProgress?.("📄 CTO: Memuat directive teknis");
  const directiveContent = getDirective();

  // Stage 3: Authorization
  if (!auth.can(ctoIdentity.id, "analyzeCode")) {
    return { success: false, text: "CTO not authorized", pipeline: [], reflection: "Authorization failed" };
  }
  pipeline.push("Authorization");
  task.onProgress?.("🔐 CTO: Authorization passed");

  // Stage 4: Mission Scope
  const scope = withinScope(ctoIdentity.id, "analyzeCode", "general");
  if (!scope.allowed) {
    return { success: false, text: `Scope violation: ${scope.reason}`, pipeline, reflection: "Scope check failed" };
  }
  pipeline.push("MissionScope");
  task.onProgress?.("📐 CTO: Mission scope OK");

  // Stage 5: Semantic Understanding — use original user query, not enriched CEO mission
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
    return { success: false, text: verification.stopReason || "Verification failed", pipeline, reflection: "" };
  }
  pipeline.push("Verification");
  task.onProgress?.("✅ CTO: Verification passed");

  // Detect implementation request — override intent so ExecutionPipeline registers onImplPlan tool
  const implKeywords = /perbaiki|tulis|write|edit|implement|fix|koreksi|benah|ubah|buat.*file/i;
  if (implKeywords.test(originalQuery) && spec.intent !== "devops_operation") {
    spec.intent = "implement_change";
    task.onProgress?.("🔧 CTO: Implementation mode aktif");
  }

  // Stage 8: Planner
  const taskGraph = plan(spec);
  pipeline.push("Planner");
  task.onProgress?.("📊 CTO: Menyusun rencana analisis");

  // Stage 9: Context Fetching (file refs + search + manifest)
  let fileContext: { text: string; filePaths: string[] } = { text: "", filePaths: [] };
  if (spec.intent !== "greeting") {
    task.onProgress?.("🔎 Mengambil konteks file...");
    const searchTerms = [...spec.targetFiles, ...spec.entities].filter(Boolean);
    const enrichedForFetch = searchTerms.length > 0
      ? `${task.message} ${searchTerms.join(" ")}`
      : task.message;
      try { fileContext = await fetchContext(enrichedForFetch); } catch (e: any) { console.error("[CTO] fetchContext error:", e.message); }
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

  // Stage 10.5: CKO Consultation — project structure + Foundation context
  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("cto_advisory", task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { /* CKO unavailable */ }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CTO: Consult CKO untuk struktur project");

  // ECP-039: NO toolRules — Governor provides strategy via ExecutionContract
  let systemPrompt = assemble({
    identity: ctoIdentity,
    directive: directiveContent,
    outputSchema: CTO_OUTPUT_SCHEMA,
    context: fileContext.text.slice(0, 96000),
    maxTokens: spec.runtimePolicy.maxTokens,
    mode: "cto",
  });
  // CKO Advisory: project structure
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n\n[PROJECT STRUCTURE] Gunakan info folder di atas untuk tahu folder mana yg relevan — jangan discover dari nol.\n`;
  systemPrompt += `\n[ATURAN OUTPUT] JANGAN PERNAH output hanya daftar file path. Setiap file path WAJIB disertai penjelasan MENGAPA dan analisis dampaknya. Output MINIMAL 500 karakter. Output tanpa analisis akan DITOLAK.\n`;
  pipeline.push("PromptAssembly");
  task.onProgress?.("📝 CTO: Merakit prompt");

  const isDevOps = spec.intent === "devops_operation";
  const isGreeting = spec.intent === "greeting";
  const toolSet = isGreeting ? []
    : execContract?.allowedTools?.length
      ? execContract.allowedTools as any[]
      : isDevOps
        ? resolveTools(getDefaultCapabilities("CTO"), CAPABILITY_TOOLS)
        : resolveTools(getDefaultCapabilities("CTO"), CAPABILITY_TOOLS);

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
    responseText = normalizeOutput(llmResult.text);
    toolsUsed = llmResult.toolsUsed;
    filesRead = llmResult.filesRead;
    pipeline.push("LLM");
    task.onProgress?.("✅ CTO: Analisis selesai");
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
