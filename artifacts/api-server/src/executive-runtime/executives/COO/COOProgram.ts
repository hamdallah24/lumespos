import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { consultantDomain } from "../../../programs/consultant";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
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
import type { COOContext } from "../../../executive-context/types";
import type { DecisionObject } from "../../types";

const COO_IDENTITY = getIdentity("COO")!;
const cooCognitive = new CognitiveEngine();

const EXECUTION_ACTIONS = [
  "add_stock", "reduce_stock", "correct_stock", "loss_correction",
  "add_semi_finished", "add_ingredient", "add_product", "add_variant",
  "update_variant_price", "add_product_with_variants_and_recipe",
  "add_recipe_by_name", "update_recipe", "update_price",
  "deactivate_product", "add_expense", "add_recipe", "produce",
  "get_inventory_status", "get_sales_summary", "get_top_products",
  "get_products", "get_shift_audit", "change_role", "get_expenses",
  "list_branches", "migrate_branch", "general",
];

const COO_BRIEF_PROMPT = `Kamu adalah **Direktur Operasional** Lume's Everywhere.
Tugasmu memberikan ringkasan situasi operasional terkini. Gunakan data yang tersedia.
Jangan mengarang data yang tidak ada. Jika data tidak tersedia, sampaikan dengan jujur.`;

const COO_INTENT_PROMPT = `Klasifikasikan intent user:

1. "approve" — jika user menyetujui/menyetujui/menolak/mengeskalasi situasi operasional
2. "status" — jika user menanyakan kondisi/stok/penjualan/laporan
3. "action" — jika user meminta eksekusi operasional (tambah stok, update harga, dll)
4. "question" — jika user bertanya tentang prosedur/kebijakan/pengetahuan
5. "branch" — jika user menanyakan atau ingin mengganti cabang
6. "none" — jika tidak termasuk di atas

Output WAJIB JSON:
{"intent":"...", "query":"..."}
{"intent":"action", "action":"...", "params":{...}}
{"intent":"approve", "situationId":"...", "optionId":"approve|reject|escalate"}`;

const COO_EXECUTION_SCHEMA = `## Format Output

1. **RESPONSE** — Jelaskan dalam bahasa Indonesia natural apa yang akan kamu lakukan dan kenapa.

2. **JSON ACTION** — Lampirkan aksi dalam blok kode json setelah RESPONSE.

Contoh:
\`\`\`json
{"action":"add_stock","params":{"itemName":"Gula","qty":5,"unit":"kg"}}
\`\`\`

Jika butuh banyak aksi:
\`\`\`json
{"actions":[{"action":"add_stock","params":{"itemName":"Gula","qty":5,"unit":"kg"}},{"action":"add_expense","params":{"description":"Beli gula","amount":75000}}]}
\`\`\``;

interface ExecutiveTask {
  message: string;
  userId: number;
  branchId?: number;
  onProgress?: (msg: string) => void;
  context: COOContext;
}

interface ExecutiveResult {
  success: boolean;
  text: string;
  pipeline: string[];
  decision: DecisionObject | null;
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

async function getCOOBrief(context: COOContext, branchId?: number): Promise<ExecutiveBrief> {
  const branch = context.branches.find(b => b.id === branchId);
  const brief = BriefGenerator.generate({
    role: "COO",
    branchId,
    branchName: branch?.name ?? "",
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
    KnowledgeProvider.ingestEpisode({ eventType: "approval", eventId: situationId, context: `COO approved situation ${situationId}`, outcome: "success", domain: "operations", topic: "approval", summary: `COO approved situation ${situationId}` });
    return `Situasi ${situationId} telah disetujui. Keputusan dicatat dan dikomunikasikan ke tim terkait.`;
  }
  if (optionId === "reject") {
    KnowledgeProvider.ingestEpisode({ eventType: "rejection", eventId: situationId, context: `COO rejected situation ${situationId}`, outcome: "failure", domain: "operations", topic: "rejection", summary: `COO rejected situation ${situationId}` });
    return `Situasi ${situationId} telah ditolak. Alasan akan ditinjau lebih lanjut.`;
  }
  if (optionId === "escalate") {
    CommunicationProvider.dispatch({ channel: "notification", recipient: "founder", content: `COO mengeskalasi situasi ${situationId} — memerlukan keputusan Founder.` });
    KnowledgeProvider.ingestEpisode({ eventType: "escalation", eventId: situationId, context: `COO escalated situation ${situationId} to Founder`, outcome: "neutral", domain: "operations", topic: "escalation", summary: `Situation ${situationId} escalated to Founder by COO` });
    return `Situasi ${situationId} telah dieskalasi ke Founder untuk keputusan.`;
  }
  return "Opsi tidak dikenal.";
}

function buildStatusContext(context: COOContext): string {
  const parts: string[] = [];
  const inv = context.inventory;
  const sales = context.sales;
  const alerts = context.alerts;

  if (sales.today.revenue > 0) {
    parts.push(`## Penjualan Hari Ini\nTotal: Rp${sales.today.revenue.toLocaleString("id-ID")}\nTransaksi: ${sales.today.orders}`);
  }
  if (sales.period.revenue > 0) {
    parts.push(`## Penjualan Periode (${sales.period.label})\nTotal: Rp${sales.period.revenue.toLocaleString("id-ID")}\nTransaksi: ${sales.period.orders}`);
  }
  if (sales.topProducts.length > 0) {
    parts.push(`## Produk Terlaris\n${sales.topProducts.slice(0, 5).map(p => `- ${p.name}: ${p.sold} terjual (Rp${p.revenue.toLocaleString("id-ID")})`).join("\n")}`);
  }
  if (inv.criticalItems?.length > 0) {
    parts.push(`## Stok Kritis\n${inv.criticalItems.map(i => `- ${i.name}: ${i.stock}/${i.reorderPoint} ${i.unit} di ${i.warehouse}`).join("\n")}`);
  }
  if (inv.stockRisks?.length > 0) {
    parts.push(`## Risiko Stok\n${inv.stockRisks.map(r => `- ${r.item}: ${r.description}`).join("\n")}`);
  }
  if (inv.health) {
    parts.push(`## Kesehatan Inventory: ${inv.health.toUpperCase()}`);
  }
  if (inv.movementSummary) {
    parts.push(`## Pergerakan Stok (24 jam)\nMasuk: ${inv.movementSummary.last24h.in} | Keluar: ${inv.movementSummary.last24h.out} | Adjust: ${inv.movementSummary.last24h.adjust}`);
  }
  if (context.branches.length > 0) {
    parts.push(`## Cabang\n${context.branches.map(b => `- ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}`).join("\n")}`);
  }
  if (alerts.length > 0) {
    parts.push(`## Alert\n${alerts.map(a => `[${a.severity.toUpperCase()}] ${a.message}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

async function handleStatus(context: COOContext, query: string, branchId?: number): Promise<string> {
  const contextStr = buildStatusContext(context);
  const responsePrompt = `${COO_BRIEF_PROMPT}\n\n{OPERATIONAL_CONTEXT}\n${contextStr}`;
  const llmResponse = (await executiveReason({ persona: responsePrompt, context: query, userId: 0 })).content;
  return llmResponse;
}

async function handleAction(action: string, params: Record<string, unknown>, branchId: number): Promise<{ decision: DecisionObject | null; text: string }> {
  if (!EXECUTION_ACTIONS.includes(action)) {
    return { decision: null, text: `Aksi "${action}" tidak dikenal.` };
  }

  const governance = GovernanceProvider.canExecute("COO", action, "operation");
  if (!governance.allow) {
    CommunicationProvider.dispatch({ channel: "notification", recipient: "founder", content: `COO mencoba ${action} tapi ditolak: ${governance.reason}` });
    return { decision: null, text: `Tidak bisa menjalankan: ${governance.reason}` };
  }

  const decision: DecisionObject = {
    decisionId: `coo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    executive: "COO",
    confidence: 0.85,
    reasoning: `COO memutuskan ${action} dengan parameter ${JSON.stringify(params)}`,
    action,
    parameters: params,
    risks: [],
    recommendation: `Eksekusi ${action} di branch ${branchId}`,
    requiresApproval: false,
    priority: "normal",
  };

  return { decision, text: `Keputusan: ${action} akan dieksekusi.` };
}

function buildDecisionFromExec(text: string, action: string, params: Record<string, unknown>): DecisionObject | null {
  if (!action) return null;
  return {
    decisionId: `coo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    executive: "COO",
    confidence: 0.8,
    reasoning: text.slice(0, 500),
    action,
    parameters: params,
    risks: [],
    recommendation: text.slice(0, 200),
    requiresApproval: false,
    priority: "normal",
  };
}

async function handleQuestion(query: string): Promise<string> {
  const knowledge = KnowledgeProvider.searchAll(query);
  const bestPractices = KnowledgeProvider.getBestPractices();
  const context = [
    knowledge.length > 0 ? `# Pengetahuan Relevan\n${knowledge.slice(0, 3).map(k => `- ${k.summary}`).join("\n")}` : "",
    bestPractices.length > 0 ? `# Best Practices\n${bestPractices.slice(0, 3).map(b => `- [${b.domain}] ${b.summary}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  const prompt = `# Identitas\nKamu adalah **Direktur Operasional (COO)** Lume's Everywhere.\n\n${context}\n\nJawab pertanyaan user berdasarkan pengetahuan di atas. Jika tidak tahu, akui dengan jujur.`;
  const llmResponse = (await executiveReason({ persona: prompt, context: query, userId: 0 })).content;
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
  const brief = await getCOOBrief(task.context, branchId);

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
  const intentResponse = (await executiveReason({ persona: COO_INTENT_PROMPT, context: task.message, userId })).content;

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
    return { success: true, text: executionResult, pipeline, decision: null };
  }

  if (intentType === "status") {
    pipeline.push("BriefConsumer");
    executionResult = await handleStatus(task.context, intentData.query || task.message, branchId);
    return { success: true, text: executionResult, pipeline, decision: null };
  }

  if (intentType === "action") {
    pipeline.push("ExecuteAction");
    const { decision, text } = await handleAction(intentData.action, intentData.params || {}, branchId);
    return { success: true, text: text || `Aksi ${intentData.action} akan dieksekusi.`, pipeline, decision };
  }

  if (intentType === "question") {
    pipeline.push("KnowledgeRecorder");
    executionResult = await handleQuestion(intentData.query || task.message);
    return { success: true, text: executionResult, pipeline, decision: null };
  }

  pipeline.push("LLM");
  const contextStr = buildStatusContext(task.context);
  const briefContext = `# Brief Hari Ini\n${JSON.stringify(brief, null, 2).slice(0, 3000)}`;
  const cognitiveContext = cognitiveResult?.trace
    ? `\n## Cognitive Analysis\nRole: COO | Confidence: ${cognitiveResult.decision.confidence.overall}% | Recommendation: ${cognitiveResult.recommendation.summary.slice(0, 500)}`
    : "";
  const memoryBlock = memoryCtx ? [memoryCtx.workingMemory, memoryCtx.recentDecisions, memoryCtx.episodicMemory, memoryCtx.knowledgeContext].filter(Boolean).join("\n") : "";

  const systemPrompt = [
    `# Identitas\nKamu adalah **Direktur Operasional (COO)** Lume's Everywhere — jaringan F&B.`,
    `\n## BATASAN KETAT\n- Kamu TIDAK BOLEH mengarang data operasional\n- Kamu TIDAK BOLEH membuat estimasi atau asumsi\n- Kamu TIDAK BOLEH membuat nama produk palsu\n- Kamu TIDAK BISA mengubah harga tanpa approval\n- Kamu TIDAK BISA mengubah resep tanpa approval`,
    `\n${briefContext}`,
    `\n${contextStr}`,
    directiveContent ? `\n## Arahan COO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
    ckoAdvisory ? `\n## CKO Advisory — Pengetahuan Organisasi\n${ckoAdvisory}` : "",
    memoryBlock ? `\n## Memory Context\n${memoryBlock}` : "",
    cognitiveContext,
    `\n## Aksi Bisnis yang Tersedia\n${EXECUTION_ACTIONS.map(a => `- ${a}`).join("\n")}`,
    `\n${COO_EXECUTION_SCHEMA}`,
  ].filter(Boolean).join("\n");

  const llmResponse = (await executiveReason({ persona: systemPrompt, context: task.message, userId })).content;

  if (llmResponse.startsWith("ERROR:")) {
    return { success: false, text: llmResponse, pipeline, decision: null };
  }

  pipeline.push("ParseResult");
  const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : "";
  let finalDecision: DecisionObject | null = null;

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

  pipeline.push("DecisionMapping");
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.actions && Array.isArray(parsed.actions)) {
        finalDecision = {
          decisionId: `coo-${Date.now()}`,
          executive: "COO",
          confidence: 0.8,
          reasoning: naturalResponse || "Multiple actions requested",
          action: "batch",
          parameters: { actions: parsed.actions },
          risks: [],
          recommendation: `${parsed.actions.length} actions akan dieksekusi`,
          requiresApproval: false,
          priority: "normal",
        };
        executionResult = `${parsed.actions.length} aksi akan dieksekusi.`;
      } else if (parsed.action) {
        finalDecision = buildDecisionFromExec(naturalResponse, parsed.action, parsed.params || {});
        executionResult = `Keputusan: ${parsed.action}`;
      }
    } catch (e) {
      console.error("[COO] JSON parse error:", e);
    }
  }

  pipeline.push("BusinessResult");
  let finalText: string;
  if (executionResult) {
    finalText = executionResult;
  } else {
    finalText = [naturalResponse, executionResult].filter(Boolean).join("\n\n");
  }

  return {
    success: true,
    text: finalText || llmResponse,
    pipeline,
    decision: finalDecision,
  };
}

async function decide(brief: ExecutiveBrief, _context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const criticalCount = brief.pendingApprovals.length;
  const actionCount = brief.actionItems.length;
  if (criticalCount > 0) {
    return { role: "COO", action: "approve", reasoning: `${criticalCount} pending approvals from brief — ${brief.summary}`, confidence: 85, payload: { pendingApprovals: brief.pendingApprovals } };
  }
  if (actionCount > 0) {
    return { role: "COO", action: "execute_action_items", reasoning: `${actionCount} action items identified from brief — prioritizing operational tasks`, confidence: 75, payload: { actionItems: brief.actionItems } };
  }
  return { role: "COO", action: "monitor", reasoning: `No critical items — ${brief.summary}`, confidence: 90 };
}

function health() {
  return { status: "healthy" as const, uptime: 0, dependencies: [], version: "3.0.0", custom: { directive: "coo-directive", maturity: "L3" } };
}

export const cooRuntime = {
  name: "COORuntime",
  version: "3.1.0",
  capabilities: ["inventory-management", "sales-tracking", "product-management", "branch-operations"],
  dependencies: ["Identity", "FoundationProvider", "CKO", "BriefGenerator", "GovernanceProvider", "CommunicationRuntime", "KnowledgePlatform"],
  health,
  execute,
  decide,
};
