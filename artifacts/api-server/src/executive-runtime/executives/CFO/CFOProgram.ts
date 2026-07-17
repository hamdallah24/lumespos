// CFO Runtime — Expanded from executive-runtime template with EIOS integrations
// Identity from identity.ts, directive from Foundation, prompt from PromptAssembler.

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
import { OperationalTruthProvider } from "../../../operational-truth";

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
  runtimeContext?: import('../../../runtime-intelligence-core/types').RuntimeContext;
}

interface ExecutiveResult {
  success: boolean;
  text: string;
  pipeline: string[];
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
    return { success: false, text: `❌ ${verification.stopReason}`, pipeline };
  }

  // Governance check
  const govCheck = GovernanceProvider.canExecute("CFO" as any, "analyze", spec.domain);
  if (!govCheck.allow) {
    auditEngine.log({ actor: "CFO", action: "analyze", resource: spec.domain, result: "denied", reason: govCheck.reason, metadata: { userId: task.userId } });
    return { success: false, text: `❌ Governance denied: ${govCheck.reason}`, pipeline };
  }

  // CKO Consultation
  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("cfo_advisory" as any, task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { /* CKO unavailable */ }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CFO: Consult CKO untuk struktur finansial");

  // Memory Read — before Cognitive
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

  // Cognitive Engine — think before LLM
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

  // T6.7: Get financial intelligence from OperationalTruthProvider
  pipeline.push("FinanceContext");
  task.onProgress?.("💰 CFO: Mengambil data keuangan dari provider");
  const finCtx = await OperationalTruthProvider.getFinanceContext(branchId, "today", task.userId);
  const plans = PlanProvider.getAll();

  // Branch context from provider (no direct SQL)
  const branchContext = await OperationalTruthProvider.getBranchContextString(branchId);

  // Decision: structured report from LLM via ExecutionPipeline
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
  if (branchContext) systemPrompt += `\n${branchContext}\n`;
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n`;

  // Finance Intelligence Context (replaces direct tool/SQL access)
  systemPrompt += `\n\n## Finance Context\n`;
  if (finCtx.finance) {
    const f = finCtx.finance;
    systemPrompt += `- Revenue: Rp${f.revenue.toLocaleString("id-ID")}\n`;
    systemPrompt += `- Total Orders: ${f.totalOrders}\n`;
    systemPrompt += `- Average Order Value: Rp${f.averageOrderValue.toLocaleString("id-ID")}\n`;
    systemPrompt += `- Total Expenses: Rp${f.totalExpenses.toLocaleString("id-ID")}\n`;
    systemPrompt += `- Gross Profit: Rp${f.grossProfit.toLocaleString("id-ID")}\n`;
    systemPrompt += `- Gross Margin: ${f.grossMargin}%\n`;
  } else {
    systemPrompt += `Data keuangan tidak tersedia.\n`;
  }
  if (finCtx.topProducts && finCtx.topProducts.length > 0) {
    systemPrompt += `\n## Top Products\n${finCtx.topProducts.slice(0, 5).map(p => `- ${p.name}: ${p.sold} sold (Rp${p.revenue.toLocaleString("id-ID")})`).join("\n")}\n`;
  }
  systemPrompt += `\n## Plans Context\n${plans.slice(0, 3).map(p => `- Plan ${p.graph.id}: ${p.criticalPath.length} steps`).join("\n") || "Tidak ada plan aktif"}`;

  // Grounding policy
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

  // EIOS: Record decision
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
