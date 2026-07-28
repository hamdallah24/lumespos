import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import type { DecisionObject } from "../../types";
import type { RuntimeContext } from "../../../runtime-intelligence-core/types";

const COO_IDENTITY = getIdentity("COO")!;

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
  context: RuntimeContext;
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

function getBriefFromContext(context: RuntimeContext, branchId?: number): string {
  return `Cabang: ${branchId ?? 'Semua cabang'}\nPeriode: ${context.time?.label || '7 Hari Terakhir'}`;
}

async function handleApprove(situationId: string, optionId: string, _context: RuntimeContext, _branchId?: number): Promise<string> {
  if (optionId === "approve") {
    return `Situasi ${situationId} telah disetujui. Keputusan akan dieksekusi melalui ExecutionEngine.`;
  }
  if (optionId === "reject") {
    return `Situasi ${situationId} telah ditolak. Alasan akan ditinjau lebih lanjut.`;
  }
  if (optionId === "escalate") {
    return `Situasi ${situationId} telah dieskalasi ke Founder untuk keputusan.`;
  }
  return "Opsi tidak dikenal.";
}

function buildStatusContext(context: RuntimeContext): string {
  const parts: string[] = [];
  const bi = (context as any).__businessIntelligence;
  const execBI = (context as any).__executiveBI;

  if (!bi || !bi.kpis) {
    parts.push("## BI Data Tidak Tersedia");
    return parts.join("\n\n");
  }

  const { kpis, health, forecasts, analytics, narratives, alerts } = bi;

  const kpiVal = (id: string) => { const k = kpis.find((k: any) => k.kpiId === id); return k ? k.value : null; };
  const kpiStr = (id: string, label: string, fmt?: (v: number) => string) => {
    const v = kpiVal(id);
    if (v === null || v === 0) return null;
    return `- ${label}: ${fmt ? fmt(v) : v}`;
  };

  const rev = kpiVal("kpi_revenue");
  const orders = kpiVal("kpi_orders");
  const aov = kpiVal("kpi_aov");

  if (rev !== null && rev > 0) {
    parts.push(`## Ringkasan Penjualan`);
    if (rev) parts.push(`- Revenue: Rp${Number(rev).toLocaleString("id-ID")}`);
    if (orders) parts.push(`- Orders: ${orders}`);
    if (aov) parts.push(`- Rata-rata Nilai Order: Rp${Number(aov).toLocaleString("id-ID")}`);
  }

  const invTurnover = kpiVal("kpi_inventory_turnover");
  const invValue = kpiVal("kpi_inventory_value");
  const stockoutRate = kpiVal("kpi_stockout_rate");
  const wastePct = kpiVal("kpi_waste_pct");
  const yield1 = kpiVal("kpi_yield");
  const pickAcc = kpiVal("kpi_picking_accuracy");
  const warehouseCap = kpiVal("kpi_warehouse_capacity");
  const suppOnTime = kpiVal("kpi_supplier_on_time");

  const invLines = [kpiStr("kpi_inventory_value", "Nilai Inventory", (v: number) => `Rp${Number(v).toLocaleString("id-ID")}`),
    kpiStr("kpi_inventory_turnover", "Perputaran Stok"),
    kpiStr("kpi_stockout_rate", "Stockout Rate"),
    kpiStr("kpi_waste_pct", "Waste", (v: number) => `${v}%`),
    kpiStr("kpi_yield", "Production Yield", (v: number) => `${v}%`),
    kpiStr("kpi_picking_accuracy", "Akurasi Picking", (v: number) => `${v}%`),
    kpiStr("kpi_warehouse_capacity", "Kapasitas Gudang", (v: number) => `${v}%`),
    kpiStr("kpi_supplier_on_time", "Supplier On-Time", (v: number) => `${v}%`),
  ].filter(Boolean);
  if (invLines.length > 0) parts.push(`## KPI Operasional\n${invLines.join("\n")}`);

  if (health?.dimensions) {
    const opDims = health.dimensions.filter((d: any) =>
      ["inventory", "warehouse", "production", "purchasing"].includes(d.dimension));
    if (opDims.length > 0) {
      parts.push(`## Skor Kesehatan\n${opDims.map((d: any) =>
        `- ${d.dimension}: ${d.score}/100 (${d.status})`).join("\n")}`);
    }
  }

  if (execBI) {
    if (execBI.stockPrediction) parts.push(`## Prediksi Stok\n${execBI.stockPrediction}`);
    if (execBI.warehouseHealth !== null && execBI.warehouseHealth !== undefined) {
      parts.push(`## Kesehatan Gudang: ${execBI.warehouseHealth}/100`);
    }
    if (execBI.inventoryForecast?.stockoutRisk) {
      parts.push(`## Risiko Stockout: ${execBI.inventoryForecast.stockoutRisk.toUpperCase()}`);
    }
    if (execBI.productionTrend) {
      const pt = execBI.productionTrend;
      const prodLines: string[] = [];
      if (pt.yield !== null) prodLines.push(`- Yield: ${pt.yield}%`);
      if (pt.oee !== null) prodLines.push(`- OEE: ${pt.oee}%`);
      if (pt.waste !== null) prodLines.push(`- Waste: ${pt.waste}%`);
      if (prodLines.length > 0) parts.push(`## Produksi\n${prodLines.join("\n")}`);
    }
    if (execBI.supplierRisk?.length > 0) {
      parts.push(`## Risiko Supplier\n${execBI.supplierRisk.map((s: any) =>
        `- ${s.supplier}: ${s.risk}`).join("\n")}`);
    }
  }

  if (forecasts?.length > 0) {
    const invForecasts = forecasts.filter((f: any) =>
      ["inventory", "warehouse", "production", "purchasing", "sales"].includes(f.dimension));
    if (invForecasts.length > 0) {
      parts.push(`## Proyeksi\n${invForecasts.slice(0, 5).map((f: any) =>
        `- ${f.metric}: 30d=${f.forecast30d}, confidence=${(f.confidence * 100).toFixed(0)}%`).join("\n")}`);
    }
  }

  if (narratives?.length > 0) {
    const opNarratives = narratives.filter((n: any) =>
      ["inventory", "warehouse", "production", "purchasing", "sales"].includes(n.dimension));
    if (opNarratives.length > 0) {
      parts.push(`## Insight Operasional\n${opNarratives.slice(0, 3).map((n: any) =>
        `- [${n.type}] ${n.headline}`).join("\n")}`);
    }
  }

  if (alerts?.length > 0) {
    const opAlerts = alerts.filter((a: any) =>
      ["inventory", "warehouse", "production", "purchasing", "sales"].includes(a.dimension));
    if (opAlerts.length > 0) {
      parts.push(`## Alert\n${opAlerts.slice(0, 5).map((a: any) =>
        `- [${a.severity}] ${a.kpiName}: ${a.message}`).join("\n")}`);
    }
  }

  return parts.join("\n\n");
}

async function handleStatus(context: RuntimeContext, query: string): Promise<string> {
  const contextStr = buildStatusContext(context);
  const responsePrompt = `${COO_BRIEF_PROMPT}\n\n{OPERATIONAL_CONTEXT}\n${contextStr}`;
  const llmResponse = (await executiveReason({ persona: responsePrompt, context: query, userId: 0 })).content;
  return llmResponse;
}

async function handleAction(action: string, params: Record<string, unknown>, branchId: number, context: RuntimeContext): Promise<{ decision: DecisionObject | null; text: string }> {
  if (!EXECUTION_ACTIONS.includes(action)) {
    return { decision: null, text: `Aksi "${action}" tidak dikenal.` };
  }

  const safeToExecute = context.runtime?.confidence?.safeToExecute ?? true;
  if (!safeToExecute) {
    return { decision: null, text: `Tidak bisa menjalankan: confidence terlalu rendah untuk eksekusi.` };
  }

  const decision: DecisionObject = {
    decisionId: `coo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    executive: "COO",
    confidence: context.runtime?.confidence?.overall ?? 0.8,
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

async function handleQuestion(query: string, context: RuntimeContext): Promise<string> {
  const knowledgeEntries = context.grounding?.knowledge || [];
  const knowledgeBlock = knowledgeEntries.length > 0
    ? `# Pengetahuan Relevan\n${knowledgeEntries.slice(0, 3).map(k => `- ${k.content?.slice(0, 200) || k.id}`).join("\n")}`
    : "";
  const prompt = `# Identitas\nKamu adalah **Direktur Operasional (COO)** Lume's Everywhere.\n\n${knowledgeBlock}\n\nJawab pertanyaan user berdasarkan pengetahuan di atas. Jika tidak tahu, akui dengan jujur.`;
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
  const briefContext = getBriefFromContext(task.context, branchId);

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
    executionResult = await handleApprove(intentData.situationId || "unknown", intentData.optionId || "approve", task.context, branchId);
    return { success: true, text: executionResult, pipeline, decision: null };
  }

  if (intentType === "status") {
    pipeline.push("BriefConsumer");
    executionResult = await handleStatus(task.context, intentData.query || task.message);
    return { success: true, text: executionResult, pipeline, decision: null };
  }

  if (intentType === "action") {
    pipeline.push("ExecuteAction");
    const { decision, text } = await handleAction(intentData.action, intentData.params || {}, branchId, task.context);
    return { success: true, text: text || `Aksi ${intentData.action} akan dieksekusi.`, pipeline, decision };
  }

  if (intentType === "question") {
    pipeline.push("KnowledgeRecorder");
    executionResult = await handleQuestion(intentData.query || task.message, task.context);
    return { success: true, text: executionResult, pipeline, decision: null };
  }

  pipeline.push("LLM");
  const contextStr = buildStatusContext(task.context);

  const systemPrompt = [
    `# Identitas\nKamu adalah **Direktur Operasional (COO)** Lume's Everywhere — jaringan F&B.`,
    `\n## BATASAN KETAT\n- Kamu TIDAK BOLEH mengarang data operasional\n- Kamu TIDAK BOLEH membuat estimasi atau asumsi\n- Kamu TIDAK BOLEH membuat nama produk palsu\n- Kamu TIDAK BISA mengubah harga tanpa approval\n- Kamu TIDAK BISA mengubah resep tanpa approval`,
    `\n## Periode Laporan\n${task.context.time?.label || '7 Hari Terakhir'} (${new Date(task.context.time?.from).toLocaleDateString('id-ID')} — ${new Date(task.context.time?.to).toLocaleDateString('id-ID')})`,
    `\n## Brief\n${briefContext}`,
    `\n${contextStr}`,
    directiveContent ? `\n## Arahan COO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
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

async function decide(context: RuntimeContext): Promise<ExecutiveDecision> {
  const bi = (context as any).__businessIntelligence;
  const alerts = bi?.alerts || [];
  const criticalCount = alerts.filter((a: any) => a.severity === "critical").length;
  if (criticalCount > 0) {
    return { role: "COO", action: "approve", reasoning: `${criticalCount} critical alerts — requires attention`, confidence: 85, payload: { alerts } };
  }
  return { role: "COO", action: "monitor", reasoning: `Operations normal — ${context.time?.label || 'current period'}`, confidence: 90 };
}

function health() {
  return { status: "healthy" as const, uptime: 0, dependencies: [], version: "3.0.0", custom: { directive: "coo-directive", maturity: "L3" } };
}

export const cooRuntime = {
  name: "COORuntime",
  version: "3.2.0",
  capabilities: ["inventory-management", "sales-tracking", "product-management", "branch-operations"],
  dependencies: ["Identity", "FoundationProvider", "RuntimeContext"],
  health,
  execute,
  decide,
};
