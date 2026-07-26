import { getIdentity } from "../../../ai/runtime/identity";
import { understand } from "../../../ai/runtime/semantic-engine";
import { buildSpecV1 } from "../../../ai/runtime/execution-spec";
import { verify } from "../../../ai/runtime/verification-engine";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { assemble } from "../../../ai/runtime/prompt-assembler";
import { JSON_OUTPUT_SCHEMA } from "../../../routes/ai-prompts";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import type { ExecutionContract } from "../../../eios-runtime/contracts/PipelineContracts";
import { consultantRuntime } from "../../../programs/consultant";
import { GovernanceProvider } from "../../../governance/providers";
import { KnowledgeProvider } from "../../../knowledge-platform/providers";
import { auditEngine } from "../../../governance/core";
import { PlanProvider } from "../../../execution-planner/providers";
import { BriefGenerator, type ExecutiveBrief } from "../../core";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import { CFO_CONFIG } from "./CFO.config";
import { CognitiveEngine, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";
import type { CFOContext } from "../../../executive-context/types";
import type { DecisionObject } from "../../types";

const CFO_IDENTITY = getIdentity("CFO")!;
const cfoCognitive = new CognitiveEngine();

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CFO");
  return content || "";
}

interface ExecutiveTask {
  message: string;
  userId: number;
  branchId?: number;
  onProgress?: (msg: string) => void;
  context: CFOContext;
}

interface ExecutiveResult {
  success: boolean;
  text: string;
  pipeline: string[];
  decision: DecisionObject | null;
}

async function execute(task: ExecutiveTask, execContract?: ExecutionContract): Promise<ExecutiveResult> {
  const pipeline: string[] = [];
  const t0 = Date.now();
  const branchId = task.branchId || 1;
  console.log(`[PIPELINE:CFO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  task.onProgress?.("🟢 CFO Runtime: Identity loaded");

  const directiveContent = getDirective();
  pipeline.push("Directive");
  task.onProgress?.("📄 CFO: Memuat directive finansial");

  pipeline.push("SemanticEngine");
  const contract = await understand(task.message, task.userId);

  pipeline.push("ExecutionSpec");
  const spec = buildSpecV1(contract);

  pipeline.push("Verification");
  const verification = verify(spec);
  if (!verification.passed) {
    auditEngine.log({ actor: "CFO", action: "verify", resource: "spec", result: "denied", reason: verification.stopReason || "Verification failed", metadata: { userId: task.userId } });
    return { success: false, text: `❌ ${verification.stopReason}`, pipeline, decision: null };
  }

  const govCheck = GovernanceProvider.canExecute("CFO" as any, "analyze", spec.domain);
  if (!govCheck.allow) {
    auditEngine.log({ actor: "CFO", action: "analyze", resource: spec.domain, result: "denied", reason: govCheck.reason, metadata: { userId: task.userId } });
    return { success: false, text: `❌ Governance denied: ${govCheck.reason}`, pipeline, decision: null };
  }

  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("cfo_advisory" as any, task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CFO: Consult CKO untuk struktur finansial");

  let memoryCtx = null;
  try {
    memoryCtx = await memoryProvider.read({
      executive: "CFO",
      query: task.message,
      domain: spec.domain,
      memoryScope: "project",
      maxTokens: 1500,
    });
  } catch (e: any) {
    console.log(`[PIPELINE:CFO:MemoryProvider] error: ${e.message}`);
  }

  let cognitiveResult = null;
  try {
    if (spec.intent !== "greeting") {
      cognitiveResult = await cfoCognitive.think({
        role: "CFO",
        query: task.message,
        context: { intent: spec.intent, domain: spec.domain, objective: spec.objective, memoryContext: memoryCtx },
      });
      recordTrace("CFO", task.message, cognitiveResult.trace);
      await writeDecisionToMemory("CFO", task.message, cognitiveResult);
      pipeline.push("CognitiveEngine");
      task.onProgress?.("🧠 CFO: Cognitive reasoning completed");
    }
  } catch (e: any) {
    console.log(`[PIPELINE:CFO:CognitiveEngine] error: ${e.message}`);
  }

  pipeline.push("FinanceContext");
  task.onProgress?.("💰 CFO: Mengambil data keuangan dari context");

  const finCtx = task.context.finance;
  const salesCtx = task.context.sales;
  const branchCtx = task.context.branches;
  const plans = PlanProvider.getAll();
  const activeBranch = branchCtx.find(b => b.id === branchId);

  let branchContextStr = "";
  if (branchCtx.length > 0) {
    branchContextStr = `\n## Context Cabang\nKamu sedang menganalisis keuangan untuk cabang **${activeBranch?.name || `ID ${branchId}`}** (ID:${branchId})${activeBranch?.location ? ` — ${activeBranch.location}` : ""}\n\n### Daftar Semua Cabang:\n${branchCtx.map(b => `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}${b.id === branchId ? " ⬅️ AKTIF" : ""}`).join("\n")}\n`;
  }

  pipeline.push("PipelineLLM");
  let systemPrompt = assemble({
    identity: CFO_IDENTITY,
    directive: directiveContent,
    decision: cognitiveResult?.trace,
    outputSchema: JSON_OUTPUT_SCHEMA,
    maxTokens: 16000,
    mode: "cfo",
  });
  if (memoryCtx) {
    const memBlock = [memoryCtx.workingMemory, memoryCtx.recentDecisions, memoryCtx.knowledgeContext].filter(Boolean).join("\n");
    if (memBlock) systemPrompt += `\n\n## Memory Context\n${memBlock}`;
  }
  if (branchContextStr) systemPrompt += `${branchContextStr}\n`;
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n`;

  systemPrompt += `\n\n## Finance Context\n`;
  systemPrompt += `- Revenue: Rp${finCtx.revenue.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Total Orders: ${finCtx.totalOrders}\n`;
  systemPrompt += `- Average Order Value: Rp${finCtx.averageOrderValue.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Total Expenses: Rp${finCtx.totalExpenses.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Gross Profit: Rp${finCtx.grossProfit.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Gross Margin: ${finCtx.grossMargin}%\n`;
  systemPrompt += `- Net Profit: Rp${finCtx.netProfit.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Cash Position: Rp${finCtx.cashPosition.toLocaleString("id-ID")}\n`;

  if (finCtx.expenseTrend && finCtx.expenseTrend.length > 0) {
    systemPrompt += `\n## Expense Trend\n${finCtx.expenseTrend.slice(0, 10).map(e => `- ${e.category}: Rp${e.amount.toLocaleString("id-ID")} (${e.period}, Δ${e.change > 0 ? "+" : ""}${e.change}%)`).join("\n")}\n`;
  }
  if (finCtx.financialRisks && finCtx.financialRisks.length > 0) {
    systemPrompt += `\n## Financial Risks\n${finCtx.financialRisks.map(r => `- [${r.severity}] ${r.description}`).join("\n")}\n`;
  }

  if (salesCtx.topProducts && salesCtx.topProducts.length > 0) {
    systemPrompt += `\n## Top Products\n${salesCtx.topProducts.slice(0, 5).map(p => `- ${p.name}: ${p.sold} sold (Rp${p.revenue.toLocaleString("id-ID")})`).join("\n")}\n`;
  }
  systemPrompt += `\n## Plans Context\n${plans.slice(0, 3).map(p => `- Plan ${p.graph.id}: ${p.criticalPath.length} steps`).join("\n") || "Tidak ada plan aktif"}`;

  systemPrompt += `\n\n## ATURAN GROUNDING KEUANGAN\n`;
  systemPrompt += `- JANGAN mengarang angka keuangan.\n`;
  systemPrompt += `- Semua angka harus berasal dari Finance Context di atas.\n`;
  systemPrompt += `- Jika Finance Context kosong, nyatakan data tidak tersedia.\n`;
  systemPrompt += `- JANGAN membuat estimasi revenue, expense, atau profit.\n`;
  systemPrompt += `- JANGAN membuat asumsi produk atau harga.\n`;

  pipeline.push("LLM");
  const llmResult = await executiveReason({ persona: systemPrompt, context: task.message, userId: task.userId });

  pipeline.push("Result");

  const isSuccess = !llmResult.content.startsWith("ERROR:");
  const finalText = isSuccess ? llmResult.content : "✅ Laporan finansial selesai.";

  KnowledgeProvider.ingestEpisode({
    eventType: "cfo_execution",
    eventId: `CFO-${Date.now()}`,
    context: task.message.slice(0, 500),
    outcome: isSuccess ? "success" : "failure",
    domain: spec.domain,
    topic: spec.objective || "financial_analysis",
    summary: `CFO analysis: ${spec.objective || "financial analysis"}`,
    tags: ["cfo", "financial", spec.intent, `branch:${branchId}`],
  });

  auditEngine.log({ actor: "CFO", action: "execute", resource: "program", result: isSuccess ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")} — duration=${Date.now() - t0}ms`, metadata: { userId: task.userId, branchId } });

  console.log(`[PIPELINE:CFO] execute end — pipeline=[${pipeline.join("→")}] success=${isSuccess} duration=${Date.now() - t0}ms`);

  return {
    success: isSuccess,
    text: finalText,
    pipeline,
    decision: null,
  };
}

async function decide(brief: ExecutiveBrief, context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const branchId = context?.branchId;
  const branchPrefix = branchId ? ` (Cabang ${branchId})` : "";
  const financialSections = brief.sections.filter(s =>
    s.title.toLowerCase().includes("fin") || s.title.toLowerCase().includes("cost") || s.title.toLowerCase().includes("margin") || s.title.toLowerCase().includes("budget")
  );
  if (financialSections.length > 0) {
    return {
      role: "CFO",
      action: "financial_review",
      reasoning: `${financialSections.length} financial areas from brief${branchPrefix} — reviewing budget and cost optimization`,
      confidence: 85,
      payload: { financialItems: financialSections.flatMap(s => s.items), branchId },
    };
  }
  return {
    role: "CFO",
    action: "monitor_finance",
    reasoning: `Financial monitoring based on brief${branchPrefix} — ${brief.summary}`,
    confidence: 90,
    payload: { branchId },
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { role: "CFO", maturity: "L2" },
  };
}

export const cfoRuntime = {
  name: "CFORuntime",
  version: "1.0.0",
  capabilities: CFO_IDENTITY?.capabilities || ["financial-analysis", "budget-review", "cost-optimization", "margin-analysis"],
  dependencies: ["FoundationLoader", "SemanticEngine", "ExecutionPipeline", "CKO"],
  health,
  execute,
  decide,
};
