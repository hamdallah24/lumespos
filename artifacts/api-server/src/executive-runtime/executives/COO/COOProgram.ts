import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { consultantDomain } from "../../../programs/consultant";
import { executeOperation } from "../../../routes/ai-business";
import { callDeepSeek } from "../../../ai/llm/llm-adapter";
import { BriefGenerator, type ExecutiveBrief } from "../../core";
import { ApprovalFormatter } from "../../core";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import { GovernanceProvider } from "../../../governance/providers";
import { PlanProvider } from "../../../execution-planner/providers";
import { CommunicationProvider } from "../../../communication-runtime/providers";
import { KnowledgeProvider } from "../../../knowledge-platform/providers";
import { auditEngine } from "../../../governance/core";
import { CognitiveEngine, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";
import { db, branchesTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const COO_IDENTITY = getIdentity("COO")!;
const cooCognitive = new CognitiveEngine();

const COO_EXECUTION_SCHEMA = `## Format Output

1. **RESPONSE** — Jelaskan dalam bahasa Indonesia natural apa yang akan kamu lakukan dan kenapa.
   Bicaralah sebagai Direktur Operasional yang profesional dan percaya diri.

2. **JSON ACTION** — Lampirkan aksi dalam blok kode json setelah RESPONSE.

Contoh:
{Saya akan update harga Es Kopi jadi Rp15.000 karena harga bahan naik. Untuk varian Large tidak terpengaruh karena pakai update_variant_price.}

\`\`\`json
{"action":"update_variant_price","params":{"productName":"Es Kopi","variantName":"Regular","price":15000}}
\`\`\`

Jika butuh banyak aksi:
\`\`\`json
{"actions":[{"action":"add_stock","params":{"itemName":"Gula","qty":5,"unit":"kg"}},{"action":"add_expense","params":{"description":"Beli gula","amount":75000}}]}
\`\`\`

Untuk aksi lintas cabang, tambahkan params.branchId:
\`\`\`json
{"action":"get_sales_summary","params":{"period":"today","branchId":0}}
\`\`\`
branchId=0 berarti semua cabang. branchId=1,2,3... berarti cabang spesifik.

Untuk daftar cabang:
\`\`\`json
{"action":"list_branches","params":{}}
\`\`\`

Catatan: RESPONSE WAJIB minimal 2 kalimat dengan konteks bisnis. Jangan cuma "oke selesai".`;

const EXECUTION_ACTIONS = ["add_product", "add_product_with_variants_and_recipe", "add_variant", "update_variant_price", "update_price", "deactivate_product", "add_stock", "reduce_stock", "correct_stock", "loss_correction", "produce", "add_ingredient", "add_semi_finished", "add_recipe_by_name", "update_recipe", "add_expense", "change_role", "migrate_branch", "list_branches", "get_sales_summary", "get_top_products", "get_inventory_status", "get_products", "get_expenses", "get_shift_audit"];

const COO_BRIEF_PROMPT = `# Identitas
Kamu adalah **Direktur Operasional (COO)** Lume's Everywhere.

# Wewenang
- Menyetujui/menolak keputusan operasional
- Memonitor progres eksekusi
- Berkomunikasi dengan Founder dan staff
- Mencatat pelajaran yang dipelajari
- Mengakses data operasional melalui Tool Runtime

# BATASAN KETAT
- Kamu TIDAK BISA mengubah harga tanpa approval
- Kamu TIDAK BISA mengubah resep tanpa approval
- Kamu TIDAK BOLEH mengarang data operasional
- Kamu TIDAK BOLEH membuat estimasi penjualan
- Kamu TIDAK BOLEH membuat nama produk
- Kamu TIDAK BOLEH membuat angka transaksi fiktif

# Sumber Data
Seluruh data operasional HARUS berasal dari Tool Runtime (get_sales_summary, get_inventory_status, get_products, get_expenses).
Jika tool mengembalikan data kosong, katakan "Data tidak tersedia".
Jangan pernah mengisi data dengan asumsi atau pengetahuan umum.

# Yang Kamu Terima
{OPERATIONAL_CONTEXT} — data operasional real-time hari ini.

# Tugasmu Hari Ini
Dari data di atas:
1. Situasi mana yang perlu keputusan?
2. Approval mana yang menunggu?
3. Progres apa yang perlu dimonitor?
4. Apa yang perlu dilaporkan ke Founder?`;

const COO_INTENT_PROMPT = `Klasifikasikan pesan user ke salah satu intent berikut. Output HANYA JSON, tidak ada teks lain.

Intent:
- approve — user menyetujui/menolak keputusan operasional (contoh: "setujui transfer", "tolak", "oke lanjut")
- status — user tanya kondisi bisnis, situasi terkini, progress (contoh: "gimana kabar hari ini", "apa yang terjadi", "progress mana")
- action — user minta tindakan operasional (contoh: "tambah stok", "produksi", "transfer", "list_branches")
- question — user tanya pengetahuan umum, best practice, atau saran strategis
- branch — user ingin ganti cabang atau bertanya tentang cabang tertentu (contoh: "lihat cabang bandung", "ganti ke cabang 2", "apa aja cabangnya")
- none — HANYA jika user murni ngobrol tanpa intent di atas

Untuk intent "action", kamu BISA set params.branchId untuk override cabang (0 = semua cabang).
Untuk intent "branch", set action="list_branches" untuk daftar cabang, atau action="switch_branch" dengan params.branchId.

Contoh output:
{"intent":"approve","situationId":"...","optionId":"approve"}
{"intent":"status","query":"situasi apa yang perlu perhatian"}
{"intent":"status","query":"penjualan hari ini bagaimana"}
{"intent":"status","query":"tampilkan ringkasan penjualan"}
{"intent":"status","query":"cek stok bahan baku"}
{"intent":"status","query":"bagaimana kondisi operasional"}
{"intent":"action","action":"add_stock","params":{"itemName":"Gula","qty":5,"unit":"kg","branchId":0}}
{"intent":"action","action":"list_branches","params":{}}
{"intent":"branch","action":"list_branches","params":{}}
{"intent":"question","query":"bagaimana cara handle stok kritis"}
{"intent":"none"}`;

interface ExecutiveTask {
  message: string;
  userId: number;
  branchId?: number;
  onProgress?: (msg: string) => void;
}

interface ExecutiveResult {
  success: boolean;
  text: string;
  pipeline: string[];
}

async function getBranchContext(branchId: number): Promise<string> {
  try {
    const branches = await db
      .select({ id: branchesTable.id, name: branchesTable.name, location: branchesTable.location })
      .from(branchesTable)
      .orderBy(branchesTable.id);
    if (branches.length === 0) return "";
    const active = branches.find(b => b.id === branchId);
    const activeLine = active
      ? `Kamu sedang bekerja di **${active.name}** (ID:${active.id})${active.location ? ` — ${active.location}` : ""}`
      : `Cabang aktif: ID ${branchId}`;
    let text = `\n## Context Cabang\n${activeLine}\n\n### Daftar Semua Cabang:\n`;
    for (const b of branches) {
      const marker = b.id === branchId ? " ⬅️ AKTIF" : "";
      text += `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}${marker}\n`;
    }
    text += `\nGunakan params.branchId=0 untuk melihat/mengubah data SEMUA cabang.\n`;
    text += `Gunakan params.branchId=<ID> untuk cabang spesifik.\n`;
    text += `Gunakan action "list_branches" untuk menampilkan daftar cabang ke user.`;
    return text;
  } catch {
    return "";
  }
}

function getDirective(): string {
  const provider = getFoundationProvider();
  return provider.getDirective("COO") || "";
}

function getFoundationCharter(): string {
  const provider = getFoundationProvider();
  const ctx = provider.getFoundationContext();
  const parts: string[] = [];
  if (ctx) parts.push(`## Ringkasan Foundation\n${ctx.slice(0, 1200)}`);
  return parts.join("\n\n");
}

function getCKOAdvisory(): string {
  try {
    return consultantDomain.advisor("COO operational context", "coo_advisory");
  } catch {
    return "";
  }
}

async function getCOOBrief(branchId?: number): Promise<ExecutiveBrief> {
  let branchName = "";
  if (branchId) {
    try {
      const [branch] = await db.select({ name: branchesTable.name }).from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1);
      branchName = branch?.name || "";
    } catch {}
  }
  const brief = BriefGenerator.generate({
    role: "COO",
    branchId,
    branchName,
    situations: [],
    objectives: [],
    plans: PlanProvider.getAll(),
    knowledge: KnowledgeProvider.searchAll(""),
  });
  return brief;
}

async function handleApprove(situationId: string, optionId: string, branchId?: number): Promise<string> {
  const governance = GovernanceProvider.canExecute("COO", "approve", "situation");
  if (!governance.allow) return `Tidak bisa approve: ${governance.reason}`;

  auditEngine.log({ actor: "COO", action: `approve_${optionId}`, resource: `situation:${situationId}`, result: "allowed", reason: governance.reason, metadata: { branchId } });

  if (optionId === "approve") {
    KnowledgeProvider.ingestEpisode({
      eventType: "approval",
      eventId: situationId,
      context: `COO approved situation ${situationId}`,
      outcome: "success",
      domain: "operations",
      topic: "approval",
      summary: `COO approved situation ${situationId}`,
    });
    return `Situasi ${situationId} telah disetujui. Keputusan dicatat dan dikomunikasikan ke tim terkait.`;
  }

  if (optionId === "reject") {
    KnowledgeProvider.ingestEpisode({
      eventType: "rejection",
      eventId: situationId,
      context: `COO rejected situation ${situationId}`,
      outcome: "failure",
      domain: "operations",
      topic: "rejection",
      summary: `COO rejected situation ${situationId}`,
    });
    return `Situasi ${situationId} telah ditolak. Alasan akan ditinjau lebih lanjut.`;
  }

  if (optionId === "escalate") {
    CommunicationProvider.dispatch({
      channel: "notification",
      recipient: "founder",
      content: `COO mengeskalasi situasi ${situationId} — memerlukan keputusan Founder.`,
    });
    KnowledgeProvider.ingestEpisode({
      eventType: "escalation",
      eventId: situationId,
      context: `COO escalated situation ${situationId} to Founder`,
      outcome: "neutral",
      domain: "operations",
      topic: "escalation",
      summary: `Situation ${situationId} escalated to Founder by COO`,
    });
    return `Situasi ${situationId} telah dieskalasi ke Founder untuk keputusan.`;
  }

  return "Opsi tidak dikenal.";
}

async function handleStatus(query: string, branchId?: number): Promise<string> {
  // Collect real operational data from Tool Runtime before LLM
  const branch = branchId || 1;
  const operationalContext: string[] = [];

  // Sales
  try {
    const sales = await executeOperation("get_sales_summary", { period: "today" }, branch);
    operationalContext.push(`## Penjualan Hari Ini\n${sales}`);
  } catch { operationalContext.push("## Penjualan Hari Ini\nData tidak tersedia"); }

  // Top products
  try {
    const top = await executeOperation("get_top_products", { limit: 5 }, branch);
    operationalContext.push(`## Produk Terlaris\n${top}`);
  } catch { /* skip */ }

  // Inventory status
  try {
    const inv = await executeOperation("get_inventory_status", {}, branch);
    operationalContext.push(`## Status Stok\n${inv}`);
  } catch { operationalContext.push("## Status Stok\nData tidak tersedia"); }

  // Products
  try {
    const prods = await executeOperation("get_products", { limit: 10 }, branch);
    operationalContext.push(`## Daftar Produk\n${prods}`);
  } catch { /* skip */ }

  // Expenses
  try {
    const exp = await executeOperation("get_expenses", { period: "today" }, branch);
    operationalContext.push(`## Pengeluaran Hari Ini\n${exp}`);
  } catch { /* skip */ }

  // Branch list
  try {
    const branches = await executeOperation("list_branches", {}, branch);
    operationalContext.push(`## Cabang\n${branches}`);
  } catch { /* skip */ }

  // Plans
  const plans = PlanProvider.getAll();
  const planSummaries = plans.map(p => {
    const progress = PlanProvider.getProgress(p.graph.id);
    return `- ${p.graph.name}: ${progress ? `${progress.percentComplete}%` : "unknown"}`;
  }).join("\n");
  if (planSummaries) operationalContext.push(`## Progres Eksekusi\n${planSummaries}`);

  // Build prompt with real data
  const contextStr = operationalContext.join("\n\n");
  const responsePrompt = `${COO_BRIEF_PROMPT}\n\n{OPERATIONAL_CONTEXT}\n${contextStr}`;
  const llmResponse = await callDeepSeek(responsePrompt, query, 0, "bisnis", 3000, false);
  return llmResponse;
}

async function handleAction(action: string, params: Record<string, unknown>, branchId: number): Promise<string> {
  if (!EXECUTION_ACTIONS.includes(action)) {
    return `Aksi "${action}" tidak dikenal.`;
  }

  const governance = GovernanceProvider.canExecute("COO", action, "operation");
  if (!governance.allow) {
    CommunicationProvider.dispatch({ channel: "notification", recipient: "founder", content: `COO mencoba ${action} tapi ditolak: ${governance.reason}` });
    return `Tidak bisa menjalankan: ${governance.reason}`;
  }

  const result = await executeOperation(action, params, branchId);
  KnowledgeProvider.ingestEpisode({
    eventType: action,
    eventId: `action-${Date.now()}`,
    context: `COO executed ${action} on branch ${branchId}`,
    outcome: result.startsWith("Error") ? "failure" : "success",
    domain: "operations",
    topic: action,
    summary: result,
  });
  return result;
}

async function handleQuestion(query: string): Promise<string> {
  const knowledge = KnowledgeProvider.searchAll(query);
  const bestPractices = KnowledgeProvider.getBestPractices();
  const context = [
    knowledge.length > 0 ? `# Pengetahuan Relevan\n${knowledge.slice(0, 3).map(k => `- ${k.summary}`).join("\n")}` : "",
    bestPractices.length > 0 ? `# Best Practices\n${bestPractices.slice(0, 3).map(b => `- [${b.domain}] ${b.summary}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");

  const prompt = `# Identitas\nKamu adalah **Direktur Operasional (COO)** Lume's Everywhere.\n\n${context}\n\nJawab pertanyaan user berdasarkan pengetahuan di atas. Jika tidak tahu, akui dengan jujur.`;
  const llmResponse = await callDeepSeek(prompt, query, 0, "bisnis", 1500, false);
  return llmResponse;
}

async function execute(task: ExecutiveTask): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  const branchId = task.branchId || 1;
  const userId = task.userId;
  let executionResult = "";

  pipeline.push("Identity");
  const directiveContent = getDirective();
  const foundationCharter = getFoundationCharter();
  const ckoAdvisory = getCKOAdvisory();
  const brief = await getCOOBrief(branchId);

  // Memory Read — before Cognitive
  let memoryCtx = null;
  try {
    memoryCtx = await memoryProvider.read({
      executive: "COO",
      query: task.message,
      domain: "operations",
      memoryScope: "project",
      maxTokens: 1500,
    });
  } catch (e: any) {
    console.log(`[PIPELINE:COO:MemoryProvider] error: ${e.message}`);
  }

  let cognitiveResult = null;
  try {
    cognitiveResult = await cooCognitive.think({
      role: "COO",
      query: task.message,
      context: { branchId, memoryContext: memoryCtx },
    });
    recordTrace("COO", task.message, cognitiveResult.trace);
    await writeDecisionToMemory("COO", task.message, cognitiveResult);
    pipeline.push("CognitiveEngine");
    task.onProgress?.("🧠 COO: Cognitive reasoning completed");
  } catch (e: any) {
    console.log(`[PIPELINE:COO:CognitiveEngine] error: ${e.message}`);
  }

  pipeline.push("IntentClassification");
  const intentResponse = await callDeepSeek(COO_INTENT_PROMPT, task.message, userId, "bisnis", 500, false);

  let intentType: string | null = null;
  let intentData: Record<string, any> = {};
  if (!intentResponse.startsWith("ERROR:")) {
    try {
      const cleaned = intentResponse.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.intent && parsed.intent !== "none") {
        intentType = parsed.intent;
        intentData = parsed;
      }
    } catch { }
  }

  if (intentType === "approve") {
    pipeline.push("ApprovalHandler");
    executionResult = await handleApprove(intentData.situationId || "unknown", intentData.optionId || "approve", branchId);
    return { success: true, text: executionResult, pipeline };
  }

  if (intentType === "status") {
    pipeline.push("BriefConsumer");
    executionResult = await handleStatus(intentData.query || task.message, branchId);
    return { success: true, text: executionResult, pipeline };
  }

  if (intentType === "action") {
    pipeline.push("ExecuteAction");
    executionResult = await handleAction(intentData.action, intentData.params || {}, branchId);
    return { success: true, text: executionResult, pipeline };
  }

  if (intentType === "question") {
    pipeline.push("KnowledgeRecorder");
    executionResult = await handleQuestion(intentData.query || task.message);
    return { success: true, text: executionResult, pipeline };
  }

  pipeline.push("LLM");
  const briefContext = `# Brief Hari Ini\n${JSON.stringify(brief, null, 2).slice(0, 3000)}`;
  const cognitiveContext = cognitiveResult?.trace
    ? `\n## Cognitive Analysis\nRole: COO | Confidence: ${cognitiveResult.decision.confidence.overall}% | Recommendation: ${cognitiveResult.recommendation.summary.slice(0, 500)}`
    : "";
  const memoryBlock = memoryCtx ? [memoryCtx.workingMemory, memoryCtx.recentDecisions, memoryCtx.episodicMemory, memoryCtx.knowledgeContext].filter(Boolean).join("\n") : "";
  const branchContext = await getBranchContext(branchId);
  const systemPrompt = [
    `# Identitas\nKamu adalah **Direktur Operasional (COO)** Lume's Everywhere — jaringan F&B.`,
    `\n## BATASAN KETAT\n- Kamu TIDAK BOLEH mengarang data operasional\n- Kamu TIDAK BOLEH membuat estimasi atau asumsi\n- Kamu TIDAK BOLEH membuat nama produk palsu\n- Kamu boleh mengakses data melalui action tool (get_sales_summary, get_inventory_status, dll)\n- Kamu TIDAK BISA mengubah harga tanpa approval\n- Kamu TIDAK BISA mengubah resep tanpa approval`,
    `\n${briefContext}`,
    branchContext ? `\n${branchContext}` : "",
    directiveContent ? `\n## Arahan COO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
    ckoAdvisory ? `\n## CKO Advisory — Pengetahuan Organisasi\n${ckoAdvisory}` : "",
    memoryBlock ? `\n## Memory Context\n${memoryBlock}` : "",
    cognitiveContext,
    `\n## Aksi Bisnis yang Tersedia\n${EXECUTION_ACTIONS.map(a => `- ${a}`).join("\n")}`,
    `\n${COO_EXECUTION_SCHEMA}`,
  ].filter(Boolean).join("\n");

  const llmResponse = await callDeepSeek(systemPrompt, task.message, userId, "bisnis", 2000, false);

  if (llmResponse.startsWith("ERROR:")) {
    return { success: false, text: llmResponse, pipeline };
  }

  pipeline.push("ParseResult");
  const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : "";

  let naturalResponse = "";
  if (jsonMatch) {
    naturalResponse = llmResponse.slice(0, jsonMatch.index).trim();
  } else {
    try {
      const cleaned = llmResponse.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      JSON.parse(cleaned);
      naturalResponse = "";
    } catch {
      naturalResponse = llmResponse;
    }
  }

  pipeline.push("ExecuteAction");
  if (jsonStr) {
    try {
      const cleaned = jsonStr.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.actions && Array.isArray(parsed.actions)) {
        pipeline.push("ExecuteMultiAction");
        const results: string[] = [];
        for (const item of parsed.actions) {
          if (item.action && item.params) {
            const r = await handleAction(item.action, item.params, branchId);
            results.push(r);
          }
        }
        executionResult = results.join("\n");
      } else if (parsed.action) {
        executionResult = await handleAction(parsed.action, parsed.params || {}, branchId);
      }
    } catch (e) {
      console.error("[COO] JSON parse error:", e);
    }
  }

  pipeline.push("BusinessResult");
  let finalText: string;
  if (executionResult && executionResult.startsWith("Aksi")) {
    finalText = executionResult;
  } else {
    finalText = [naturalResponse, executionResult].filter(Boolean).join("\n\n");
  }

  return {
    success: !executionResult.startsWith("Error") && !executionResult.startsWith("❌"),
    text: finalText || llmResponse,
    pipeline,
  };
}

async function decide(brief: ExecutiveBrief, _context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const criticalCount = brief.pendingApprovals.length;
  const actionCount = brief.actionItems.length;

  if (criticalCount > 0) {
    return {
      role: "COO",
      action: "approve",
      reasoning: `${criticalCount} pending approvals from brief — ${brief.summary}`,
      confidence: 85,
      payload: { pendingApprovals: brief.pendingApprovals },
    };
  }

  if (actionCount > 0) {
    return {
      role: "COO",
      action: "execute_action_items",
      reasoning: `${actionCount} action items identified from brief — prioritizing operational tasks`,
      confidence: 75,
      payload: { actionItems: brief.actionItems },
    };
  }

  return {
    role: "COO",
    action: "monitor",
    reasoning: `No critical items — ${brief.summary}`,
    confidence: 90,
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [],
    version: "3.0.0",
    custom: { directive: "coo-directive", maturity: "L3" },
  };
}

export const cooRuntime = {
  name: "COORuntime",
  version: "3.0.0",
  capabilities: ["inventory-management", "sales-tracking", "product-management", "branch-operations"],
  dependencies: ["Identity", "FoundationProvider", "CKO", "BriefGenerator", "GovernanceProvider", "CommunicationRuntime", "KnowledgePlatform"],
  health,
  execute,
  decide,
};
