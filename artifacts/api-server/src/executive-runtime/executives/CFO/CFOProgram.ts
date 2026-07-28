import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import type { DecisionObject } from "../../types";
import type { RuntimeContext } from "../../../runtime-intelligence-core/types";

const CFO_IDENTITY = getIdentity("CFO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CFO");
  return content || "";
}

function getFoundationCharter(): string {
  const provider = getFoundationProvider();
  const ctx = provider.getFoundationContext();
  return ctx ? `## Ringkasan Foundation\n${ctx.slice(0, 1200)}` : "";
}

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

function buildFinanceContext(context: RuntimeContext): string {
  const parts: string[] = [];
  const bi = (context as any).__businessIntelligence;
  const execBI = (context as any).__executiveBI;

  if (!bi || !bi.kpis) {
    parts.push("## BI Data Tidak Tersedia");
    return parts.join("\n");
  }

  const { kpis, health, forecasts, analytics, narratives, alerts } = bi;

  const kpiVal = (id: string) => { const k = kpis.find((k: any) => k.kpiId === id); return k ? k.value : null; };

  const grossMargin = kpiVal("kpi_gross_margin");
  const netMargin = kpiVal("kpi_net_margin");
  const cashFlow = kpiVal("kpi_cash_flow");
  const burnRate = kpiVal("kpi_burn_rate");
  const ebitda = kpiVal("kpi_ebitda");
  const opExpense = kpiVal("kpi_operating_expense");
  const workingCap = kpiVal("kpi_working_capital");
  const rev = kpiVal("kpi_revenue");

  const finLines: string[] = [];
  if (rev) finLines.push(`- Revenue: Rp${Number(rev).toLocaleString("id-ID")}`);
  if (ebitda) finLines.push(`- EBITDA: Rp${Number(ebitda).toLocaleString("id-ID")}`);
  if (grossMargin) finLines.push(`- Gross Margin: ${grossMargin}%`);
  if (netMargin) finLines.push(`- Net Margin: ${netMargin}%`);
  if (cashFlow) finLines.push(`- Cash Flow: Rp${Number(cashFlow).toLocaleString("id-ID")}`);
  if (burnRate) finLines.push(`- Burn Rate: Rp${Number(burnRate).toLocaleString("id-ID")}/bulan`);
  if (opExpense) finLines.push(`- Operating Expense: Rp${Number(opExpense).toLocaleString("id-ID")}`);
  if (workingCap) finLines.push(`- Working Capital: Rp${Number(workingCap).toLocaleString("id-ID")}`);

  if (finLines.length > 0) parts.push(`## Financial KPIs\n${finLines.join("\n")}`);

  if (execBI) {
    if (execBI.cashRunway !== null && execBI.cashRunway !== undefined) {
      parts.push(`## Cash Runway: ${execBI.cashRunway} hari`);
    }
    if (execBI.cashForecast?.runway !== null && execBI.cashForecast?.runway !== undefined) {
      parts.push(`## Cash Forecast: ${execBI.cashForecast.runway} hari`);
    }
    if (execBI.marginTrend) {
      const mt = execBI.marginTrend;
      const marginLines: string[] = [];
      if (mt.gross !== null) marginLines.push(`- Gross: ${mt.gross}%`);
      if (mt.net !== null) marginLines.push(`- Net: ${mt.net}%`);
      marginLines.push(`- Trend: ${mt.trend}`);
      if (marginLines.length > 0) parts.push(`## Margin Trend\n${marginLines.join("\n")}`);
    }
    if (execBI.financialHealth !== null && execBI.financialHealth !== undefined) {
      parts.push(`## Financial Health: ${execBI.financialHealth}/100`);
    }
    if (execBI.expenseVariance?.length > 0) {
      parts.push(`## Expense Variance\n${execBI.expenseVariance.map((e: any) =>
        `- ${e.category}: ${e.variance.toFixed(1)}% ${e.isSignificant ? "(Signifikan)" : ""}`).join("\n")}`);
    }
  }

  if (health?.dimensions) {
    const finDim = health.dimensions.find((d: any) => d.dimension === "finance");
    if (finDim) parts.push(`## Financial Health Dimension: ${finDim.score}/100 (${finDim.status}, ${finDim.trend})`);
  }

  if (forecasts?.length > 0) {
    const finForecasts = forecasts.filter((f: any) => f.dimension === "finance");
    if (finForecasts.length > 0) {
      parts.push(`## Financial Forecasts\n${finForecasts.slice(0, 5).map((f: any) =>
        `- ${f.metric}: 7d=${f.forecast7d}, 30d=${f.forecast30d}, 90d=${f.forecast90d}`).join("\n")}`);
    }
  }

  if (narratives?.length > 0) {
    const finNarratives = narratives.filter((n: any) => n.dimension === "finance");
    if (finNarratives.length > 0) {
      parts.push(`## Financial Insights\n${finNarratives.slice(0, 3).map((n: any) =>
        `- [${n.type}] ${n.headline}`).join("\n")}`);
    }
  }

  if (alerts?.length > 0) {
    const finAlerts = alerts.filter((a: any) => a.dimension === "finance");
    if (finAlerts.length > 0) {
      parts.push(`## Financial Alerts\n${finAlerts.slice(0, 5).map((a: any) =>
        `- [${a.severity}] ${a.kpiName}: ${a.message}`).join("\n")}`);
    }
  }

  return parts.join("\n");
}

async function execute(task: ExecutiveTask): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  const branchId = task.branchId || 1;
  console.log(`[PIPELINE:CFO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  const directiveContent = getDirective();
  const foundationCharter = getFoundationCharter();
  const finCtx = buildFinanceContext(task.context);

  const safeToExecute = task.context.runtime?.confidence?.safeToExecute ?? true;
  if (!safeToExecute) {
    return { success: false, text: "Tidak bisa memproses: confidence terlalu rendah.", pipeline, decision: null };
  }

  pipeline.push("LLM");
  const systemPrompt = [
    `# Identitas\nKamu adalah **Direktur Keuangan (CFO)** Lume's Everywhere — jaringan F&B.`,
    `\n## Periode Laporan\n${task.context.time?.label || '7 Hari Terakhir'} (${new Date(task.context.time?.from).toLocaleDateString('id-ID')} — ${new Date(task.context.time?.to).toLocaleDateString('id-ID')})`,
    `\n${finCtx}`,
    directiveContent ? `\n## Arahan CFO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
    `\n\n## ATURAN GROUNDING KEUANGAN`,
    `- JANGAN mengarang angka keuangan.`,
    `- SEMUA angka HARUS berasal dari Finance Context di atas.`,
    `- Jika Finance Context kosong (semua 0), nyatakan data tidak tersedia.`,
    `- JANGAN membuat estimasi revenue, expense, atau profit.`,
    `- JANGAN membuat asumsi produk atau harga.`,
  ].filter(Boolean).join("\n");

  const llmResult = await executiveReason({ persona: systemPrompt, context: task.message, userId: task.userId });
  const isSuccess = !llmResult.content.startsWith("ERROR:");

  console.log(`[PIPELINE:CFO] execute end — pipeline=[${pipeline.join("→")}] success=${isSuccess}`);

  return { success: isSuccess, text: isSuccess ? llmResult.content : "✅ Laporan finansial selesai.", pipeline, decision: null };
}

async function decide(context: RuntimeContext): Promise<ExecutiveDecision> {
  return { role: "CFO", action: "monitor_finance", reasoning: `Financial monitoring — ${context.time?.label || 'current period'}`, confidence: 90, payload: {} };
}

function health() {
  return { status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "2.0.0", custom: { role: "CFO", maturity: "L3" } };
}

export const cfoRuntime = {
  name: "CFORuntime",
  version: "2.0.0",
  capabilities: CFO_IDENTITY?.capabilities || ["financial-analysis", "budget-review", "cost-optimization", "margin-analysis"],
  dependencies: ["Identity", "FoundationProvider", "RuntimeContext"],
  health,
  execute,
  decide,
};
