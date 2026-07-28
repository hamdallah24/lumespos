import { getIdentity } from "../../../ai/runtime/identity";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import type { DecisionObject } from "../../types";
import type { RuntimeContext } from "../../../runtime-intelligence-core/types";

const CAIO_IDENTITY = getIdentity("CAIO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CAIO");
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

function buildIntelligenceContext(context: RuntimeContext): string {
  const parts: string[] = [];
  const bi = (context as any).__businessIntelligence;
  const execBI = (context as any).__executiveBI;

  if (!bi || !bi.kpis) {
    parts.push("## BI Data Tidak Tersedia");
    return parts.join("\n");
  }

  const { kpis, health, forecasts, analytics, narratives, alerts } = bi;

  const kpiVal = (id: string) => { const k = kpis.find((k: any) => k.kpiId === id); return k ? k.value : null; };

  const uptime = kpiVal("kpi_uptime");
  const errorRate = kpiVal("kpi_error_rate");
  const apiLatency = kpiVal("kpi_api_latency");
  const activeUsers = kpiVal("kpi_active_users");

  const platformLines: string[] = [];
  if (uptime) platformLines.push(`- System Uptime: ${uptime}%`);
  if (errorRate) platformLines.push(`- Error Rate: ${errorRate}%`);
  if (apiLatency) platformLines.push(`- API Latency: ${apiLatency}ms`);
  if (activeUsers) platformLines.push(`- Active Users: ${activeUsers}`);

  if (platformLines.length > 0) parts.push(`## Platform KPIs\n${platformLines.join("\n")}`);

  if (execBI) {
    if (execBI.automationTrend) {
      parts.push(`## Automation\n- Coverage: ${execBI.automationTrend.coverage}%\n- Trend: ${execBI.automationTrend.trend}`);
    }
    if (execBI.modelAccuracy !== null && execBI.modelAccuracy !== undefined) {
      parts.push(`## Model Accuracy: ${execBI.modelAccuracy}%`);
    }
    if (execBI.agentPerformance?.length > 0) {
      parts.push(`## Agent Performance\n${execBI.agentPerformance.map((a: any) =>
        `- ${a.agent}: ${a.score}`).join("\n")}`);
    }
  }

  if (health?.dimensions) {
    const platformDim = health.dimensions.find((d: any) => d.dimension === "platform");
    if (platformDim) parts.push(`## Platform Health: ${platformDim.score}/100 (${platformDim.status})`);
  }

  if (narratives?.length > 0) {
    const platformNarratives = narratives.filter((n: any) => n.dimension === "platform");
    if (platformNarratives.length > 0) {
      parts.push(`## Platform Insights\n${platformNarratives.slice(0, 3).map((n: any) =>
        `- [${n.type}] ${n.headline}`).join("\n")}`);
    }
  }

  if (alerts?.length > 0) {
    const platformAlerts = alerts.filter((a: any) => a.dimension === "platform");
    if (platformAlerts.length > 0) {
      parts.push(`## Platform Alerts\n${platformAlerts.slice(0, 5).map((a: any) =>
        `- [${a.severity}] ${a.kpiName}: ${a.message}`).join("\n")}`);
    }
  }

  const grounding = context.grounding;
  if (grounding?.knowledge?.length) {
    parts.push(`### Grounding Knowledge`);
    parts.push(`- ${grounding.knowledge.length} knowledge entries available`);
    const confirmed = grounding.knowledge.filter((k: any) => k.confirmed).length;
    if (confirmed) parts.push(`- ${confirmed} confirmed entries`);
  }

  return parts.join("\n");
}

async function execute(task: ExecutiveTask): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  const branchId = task.branchId || 1;
  console.log(`[PIPELINE:CAIO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  const directiveContent = getDirective();
  const foundationCharter = getFoundationCharter();
  const intelCtx = buildIntelligenceContext(task.context);

  const safeToExecute = task.context.runtime?.confidence?.safeToExecute ?? true;
  if (!safeToExecute) {
    return { success: false, text: "Tidak bisa memproses: confidence terlalu rendah.", pipeline, decision: null };
  }

  pipeline.push("LLM");
  const systemPrompt = [
    `# Identitas\nKamu adalah **Chief AI Officer (CAIO)** Lume's Everywhere — jaringan F&B.`,
    `\n## Periode Laporan\n${task.context.time?.label || '7 Hari Terakhir'} (${new Date(task.context.time?.from).toLocaleDateString('id-ID')} — ${new Date(task.context.time?.to).toLocaleDateString('id-ID')})`,
    `\n## Intelligence Context\n${intelCtx}`,
    directiveContent ? `\n## Arahan CAIO\n${directiveContent.slice(0, 2000)}` : "",
    foundationCharter ? `\n${foundationCharter}` : "",
    `\n\n## ATURAN GROUNDING AI`,
    `- JANGAN mengarang data sistem.`,
    `- Semua data harus berasal dari Intelligence Context di atas.`,
    `- Jika data tidak tersedia, nyatakan dengan jujur.`,
  ].filter(Boolean).join("\n");

  const llmResult = await executiveReason({ persona: systemPrompt, context: task.message, userId: task.userId });
  const isSuccess = !llmResult.content.startsWith("ERROR:");

  console.log(`[PIPELINE:CAIO] execute end — pipeline=[${pipeline.join("→")}] success=${isSuccess}`);

  return { success: isSuccess, text: isSuccess ? llmResult.content : "✅ Laporan sistem AI selesai.", pipeline, decision: null };
}

async function decide(context: RuntimeContext): Promise<ExecutiveDecision> {
  return { role: "CAIO", action: "monitor_system", reasoning: `AI system monitoring — ${context.time?.label || 'current period'}`, confidence: 90, payload: {} };
}

function health() {
  return { status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "2.0.0", custom: { role: "CAIO", maturity: "L3" } };
}

export const caioRuntime = {
  name: "CAIORuntime",
  version: "2.0.0",
  capabilities: CAIO_IDENTITY?.capabilities || ["ai-health-monitoring", "system-architecture", "knowledge-management", "automation-oversight"],
  dependencies: ["Identity", "FoundationProvider", "RuntimeContext"],
  health,
  execute,
  decide,
};
