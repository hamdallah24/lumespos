import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import type { DecisionObject } from "../../types";
import type { RuntimeContext } from "../../../runtime-intelligence-core/types";

const CMO_IDENTITY = getIdentity("CMO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CMO");
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

function buildMarketingContext(context: RuntimeContext): string {
  const parts: string[] = [];
  const bi = (context as any).__businessIntelligence;
  const execBI = (context as any).__executiveBI;

  if (!bi || !bi.kpis) {
    parts.push("## BI Data Tidak Tersedia");
    return parts.join("\n");
  }

  const { kpis, health, forecasts, analytics, narratives, alerts } = bi;

  const kpiVal = (id: string) => { const k = kpis.find((k: any) => k.kpiId === id); return k ? k.value : null; };

  const rev = kpiVal("kpi_revenue");
  const grossSales = kpiVal("kpi_gross_sales");
  const netSales = kpiVal("kpi_net_sales");
  const aov = kpiVal("kpi_aov");
  const orders = kpiVal("kpi_orders");
  const convRate = kpiVal("kpi_conversion_rate");
  const cac = kpiVal("kpi_cac");
  const roas = kpiVal("kpi_roas");
  const retention = kpiVal("kpi_retention");
  const churn = kpiVal("kpi_churn_rate");

  const salesLines: string[] = [];
  if (rev) salesLines.push(`- Revenue: Rp${Number(rev).toLocaleString("id-ID")}`);
  if (orders) salesLines.push(`- Orders: ${orders}`);
  if (aov) salesLines.push(`- Average Order Value: Rp${Number(aov).toLocaleString("id-ID")}`);
  if (grossSales) salesLines.push(`- Gross Sales: Rp${Number(grossSales).toLocaleString("id-ID")}`);
  if (convRate) salesLines.push(`- Conversion Rate: ${convRate}%`);
  if (cac) salesLines.push(`- CAC: Rp${Number(cac).toLocaleString("id-ID")}`);
  if (roas) salesLines.push(`- ROAS: ${roas}x`);
  if (retention) salesLines.push(`- Retention Rate: ${retention}%`);
  if (churn) salesLines.push(`- Churn Rate: ${churn}%`);

  if (salesLines.length > 0) parts.push(`## Sales & Marketing KPIs\n${salesLines.join("\n")}`);

  if (execBI) {
    if (execBI.roas || execBI.cac) {
      parts.push(`## Marketing Performance`);
      if (execBI.roas) parts.push(`- ROAS: ${execBI.roas}x`);
      if (execBI.cac) parts.push(`- CAC: Rp${Number(execBI.cac).toLocaleString("id-ID")}`);
    }
    if (execBI.conversionTrend) {
      parts.push(`## Conversion Trend\n- Rate: ${execBI.conversionTrend.rate}%\n- Trend: ${execBI.conversionTrend.trend}`);
    }
    if (execBI.campaignRanking?.length > 0) {
      parts.push(`## Campaign Rankings\n${execBI.campaignRanking.slice(0, 5).map((c: any) =>
        `- ${c.campaign}: ROI ${c.roi}`).join("\n")}`);
    }
    if (execBI.marketInsight?.length > 0) {
      parts.push(`## Market Insights\n${execBI.marketInsight.slice(0, 3).map((m: any) => `- ${m}`).join("\n")}`);
    }
  }

  if (health?.dimensions) {
    const mktDims = health.dimensions.filter((d: any) =>
      ["sales", "marketing", "crm", "expansion"].includes(d.dimension));
    if (mktDims.length > 0) {
      parts.push(`## Health Scores\n${mktDims.map((d: any) =>
        `- ${d.dimension}: ${d.score}/100 (${d.status})`).join("\n")}`);
    }
  }

  if (forecasts?.length > 0) {
    const mktForecasts = forecasts.filter((f: any) =>
      ["sales", "marketing", "crm"].includes(f.dimension));
    if (mktForecasts.length > 0) {
      parts.push(`## Forecasts\n${mktForecasts.slice(0, 5).map((f: any) =>
        `- ${f.metric}: 30d=${f.forecast30d}`).join("\n")}`);
    }
  }

  if (narratives?.length > 0) {
    const mktNarratives = narratives.filter((n: any) =>
      ["sales", "marketing", "crm"].includes(n.dimension));
    if (mktNarratives.length > 0) {
      parts.push(`## Insights\n${mktNarratives.slice(0, 3).map((n: any) =>
        `- [${n.type}] ${n.headline}`).join("\n")}`);
    }
  }

  if (alerts?.length > 0) {
    const mktAlerts = alerts.filter((a: any) =>
      ["sales", "marketing", "crm"].includes(a.dimension));
    if (mktAlerts.length > 0) {
      parts.push(`## Alerts\n${mktAlerts.slice(0, 5).map((a: any) =>
        `- [${a.severity}] ${a.kpiName}: ${a.message}`).join("\n")}`);
    }
  }

  return parts.join("\n");
}

async function execute(task: ExecutiveTask): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  const branchId = task.branchId || 1;
  console.log(`[PIPELINE:CMO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  const directiveContent = getDirective();
  const foundationCharter = getFoundationCharter();
  const mktCtx = buildMarketingContext(task.context);

  const safeToExecute = task.context.runtime?.confidence?.safeToExecute ?? true;
  if (!safeToExecute) {
    return { success: false, text: "Tidak bisa memproses: confidence terlalu rendah.", pipeline, decision: null };
  }

  pipeline.push("LLM");
  const systemPrompt = [
    `# Identitas\nKamu adalah **Direktur Marketing (CMO)** Lume's Everywhere — jaringan F&B.`,
    `\n## Periode Laporan\n${task.context.time?.label || '7 Hari Terakhir'} (${new Date(task.context.time?.from).toLocaleDateString('id-ID')} — ${new Date(task.context.time?.to).toLocaleDateString('id-ID')})`,
    `\n${mktCtx}`,
    directiveContent ? `\n## Arahan CMO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
    `\n\n## ATURAN GROUNDING MARKETING`,
    `- JANGAN mengarang angka penjualan atau data produk.`,
    `- Semua data harus berasal dari Marketing Context di atas.`,
    `- JANGAN membuat asumsi produk, harga, atau tren pasar.`,
    `- Jika data tidak tersedia, nyatakan dengan jujur.`,
  ].filter(Boolean).join("\n");

  const llmResult = await executiveReason({ persona: systemPrompt, context: task.message, userId: task.userId });
  const isSuccess = !llmResult.content.startsWith("ERROR:");

  console.log(`[PIPELINE:CMO] execute end — pipeline=[${pipeline.join("→")}] success=${isSuccess}`);

  return { success: isSuccess, text: isSuccess ? llmResult.content : "✅ Laporan marketing selesai.", pipeline, decision: null };
}

async function decide(context: RuntimeContext): Promise<ExecutiveDecision> {
  return { role: "CMO", action: "monitor_market", reasoning: `Market monitoring — ${context.time?.label || 'current period'}`, confidence: 85, payload: {} };
}

function health() {
  return { status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "2.0.0", custom: { role: "CMO", maturity: "L3" } };
}

export const cmoRuntime = {
  name: "CMORuntime",
  version: "2.0.0",
  capabilities: CMO_IDENTITY?.capabilities || ["market-analysis", "campaign-strategy", "customer-insight", "product-trend"],
  dependencies: ["Identity", "FoundationProvider", "RuntimeContext"],
  health,
  execute,
  decide,
};
