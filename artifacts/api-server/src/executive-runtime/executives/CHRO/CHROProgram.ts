import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import type { DecisionObject } from "../../types";
import type { RuntimeContext } from "../../../runtime-intelligence-core/types";

const CHRO_IDENTITY = getIdentity("CHRO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CHRO");
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

function buildPeopleContext(context: RuntimeContext): string {
  const parts: string[] = [];
  const bi = (context as any).__businessIntelligence;
  const execBI = (context as any).__executiveBI;

  if (!bi || !bi.kpis) {
    parts.push("## BI Data Tidak Tersedia");
    return parts.join("\n");
  }

  const { kpis, health, forecasts, analytics, narratives, alerts } = bi;

  const kpiVal = (id: string) => { const k = kpis.find((k: any) => k.kpiId === id); return k ? k.value : null; };

  const headcount = kpiVal("kpi_headcount");
  const attendance = kpiVal("kpi_attendance");
  const turnover = kpiVal("kpi_turnover");
  const productivity = kpiVal("kpi_productivity");

  const hrLines: string[] = [];
  if (headcount) hrLines.push(`- Headcount: ${headcount}`);
  if (attendance) hrLines.push(`- Attendance Rate: ${attendance}%`);
  if (turnover) hrLines.push(`- Employee Turnover: ${turnover}%`);
  if (productivity) hrLines.push(`- Productivity: Rp${Number(productivity).toLocaleString("id-ID")}/karyawan`);

  if (hrLines.length > 0) parts.push(`## HR KPIs\n${hrLines.join("\n")}`);

  if (execBI) {
    if (execBI.turnoverPrediction) {
      parts.push(`## Turnover Prediction\n- Rate: ${execBI.turnoverPrediction.rate}%\n- Trend: ${execBI.turnoverPrediction.trend}`);
    }
    if (execBI.attendanceTrend) {
      parts.push(`## Attendance Trend\n- Rate: ${execBI.attendanceTrend.rate}%\n- Trend: ${execBI.attendanceTrend.trend}`);
    }
    if (execBI.productivityTrend) {
      parts.push(`## Productivity\n- Value: ${execBI.productivityTrend.value}\n- Trend: ${execBI.productivityTrend.trend}`);
    }
    if (execBI.hiringForecast?.length > 0) {
      parts.push(`## Hiring Forecast\n${execBI.hiringForecast.map((h: any) =>
        `- Need ${h.needs} hires in ${h.months} months`).join("\n")}`);
    }
  }

  if (health?.dimensions) {
    const hrDim = health.dimensions.find((d: any) => d.dimension === "hr");
    if (hrDim) parts.push(`## HR Health: ${hrDim.score}/100 (${hrDim.status}, ${hrDim.trend})`);
  }

  if (forecasts?.length > 0) {
    const hrForecasts = forecasts.filter((f: any) => f.dimension === "hr");
    if (hrForecasts.length > 0) {
      parts.push(`## HR Forecasts\n${hrForecasts.slice(0, 3).map((f: any) =>
        `- ${f.metric}: 30d=${f.forecast30d}`).join("\n")}`);
    }
  }

  if (narratives?.length > 0) {
    const hrNarratives = narratives.filter((n: any) => n.dimension === "hr");
    if (hrNarratives.length > 0) {
      parts.push(`## HR Insights\n${hrNarratives.slice(0, 3).map((n: any) =>
        `- [${n.type}] ${n.headline}`).join("\n")}`);
    }
  }

  if (alerts?.length > 0) {
    const hrAlerts = alerts.filter((a: any) => a.dimension === "hr");
    if (hrAlerts.length > 0) {
      parts.push(`## HR Alerts\n${hrAlerts.slice(0, 5).map((a: any) =>
        `- [${a.severity}] ${a.kpiName}: ${a.message}`).join("\n")}`);
    }
  }

  return parts.join("\n");
}

async function execute(task: ExecutiveTask): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  const branchId = task.branchId || 1;
  console.log(`[PIPELINE:CHRO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  const directiveContent = getDirective();
  const foundationCharter = getFoundationCharter();
  const peopleCtx = buildPeopleContext(task.context);

  const safeToExecute = task.context.runtime?.confidence?.safeToExecute ?? true;
  if (!safeToExecute) {
    return { success: false, text: "Tidak bisa memproses: confidence terlalu rendah.", pipeline, decision: null };
  }

  pipeline.push("LLM");
  const systemPrompt = [
    `# Identitas\nKamu adalah **Direktur SDM (CHRO)** Lume's Everywhere — jaringan F&B.`,
    `\n## Periode Laporan\n${task.context.time?.label || '7 Hari Terakhir'} (${new Date(task.context.time?.from).toLocaleDateString('id-ID')} — ${new Date(task.context.time?.to).toLocaleDateString('id-ID')})`,
    `\n${peopleCtx}`,
    directiveContent ? `\n## Arahan CHRO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
    `\n\n## ATURAN GROUNDING SDM`,
    `- JANGAN mengarang data SDM.`,
    `- Semua data harus berasal dari People Context di atas.`,
    `- Jika data tidak tersedia, nyatakan dengan jujur.`,
  ].filter(Boolean).join("\n");

  const llmResult = await executiveReason({ persona: systemPrompt, context: task.message, userId: task.userId });
  const isSuccess = !llmResult.content.startsWith("ERROR:");

  console.log(`[PIPELINE:CHRO] execute end — pipeline=[${pipeline.join("→")}] success=${isSuccess}`);

  return { success: isSuccess, text: isSuccess ? llmResult.content : "✅ Laporan SDM selesai.", pipeline, decision: null };
}

async function decide(context: RuntimeContext): Promise<ExecutiveDecision> {
  return { role: "CHRO", action: "monitor_hr", reasoning: `HR monitoring — ${context.time?.label || 'current period'}`, confidence: 90, payload: {} };
}

function health() {
  return { status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "2.0.0", custom: { role: "CHRO", maturity: "L3" } };
}

export const chroRuntime = {
  name: "CHRORuntime",
  version: "2.0.0",
  capabilities: CHRO_IDENTITY?.capabilities || ["viewPersonnel", "scheduleShift", "generateHRReport"],
  dependencies: ["Identity", "FoundationProvider", "RuntimeContext"],
  health,
  execute,
  decide,
};
