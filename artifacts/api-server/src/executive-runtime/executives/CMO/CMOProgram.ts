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
import { CMO_CONFIG } from "./CMO.config";
import { CognitiveEngine, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";
import type { MarketingContext } from "../../../executive-context/types";
import type { DecisionObject } from "../../types";

const CMO_IDENTITY = getIdentity("CMO")!;
const cmoCognitive = new CognitiveEngine();

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CMO");
  return content || "";
}

interface ExecutiveTask {
  message: string;
  userId: number;
  branchId?: number;
  onProgress?: (msg: string) => void;
  context: MarketingContext;
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
  console.log(`[PIPELINE:CMO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  task.onProgress?.("🟡 CMO Runtime: Identity loaded");

  const directiveContent = getDirective();
  pipeline.push("Directive");
  task.onProgress?.("📄 CMO: Memuat directive marketing");

  pipeline.push("SemanticEngine");
  const contract = await understand(task.message, task.userId);

  pipeline.push("ExecutionSpec");
  const spec = buildSpecV1(contract);

  pipeline.push("Verification");
  const verification = verify(spec);
  if (!verification.passed) {
    auditEngine.log({ actor: "CMO", action: "verify", resource: "spec", result: "denied", reason: verification.stopReason || "Verification failed", metadata: { userId: task.userId } });
    return { success: false, text: `❌ ${verification.stopReason}`, pipeline, decision: null };
  }

  const govCheck = GovernanceProvider.canExecute("CMO" as any, "analyze", spec.domain);
  if (!govCheck.allow) {
    auditEngine.log({ actor: "CMO", action: "analyze", resource: spec.domain, result: "denied", reason: govCheck.reason, metadata: { userId: task.userId } });
    return { success: false, text: `❌ Governance denied: ${govCheck.reason}`, pipeline, decision: null };
  }

  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("founder_advisory" as any, task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CMO: Consult CKO untuk insight pasar");

  let memoryCtx = null;
  try {
    memoryCtx = await memoryProvider.read({
      executive: "CMO",
      query: task.message,
      domain: spec.domain,
      memoryScope: "project",
      maxTokens: 1500,
    });
  } catch (e: any) {
    console.log(`[PIPELINE:CMO:MemoryProvider] error: ${e.message}`);
  }

  let cognitiveResult = null;
  try {
    if (spec.intent !== "greeting") {
      cognitiveResult = await cmoCognitive.think({
        role: "CMO",
        query: task.message,
        context: { intent: spec.intent, domain: spec.domain, objective: spec.objective, memoryContext: memoryCtx },
      });
      recordTrace("CMO", task.message, cognitiveResult.trace);
      await writeDecisionToMemory("CMO", task.message, cognitiveResult);
      pipeline.push("CognitiveEngine");
      task.onProgress?.("🧠 CMO: Cognitive reasoning completed");
    }
  } catch (e: any) {
    console.log(`[PIPELINE:CMO:CognitiveEngine] error: ${e.message}`);
  }

  pipeline.push("MarketingContext");
  task.onProgress?.("📊 CMO: Mengambil data marketing dari context");

  const salesCtx = task.context.sales;
  const products = task.context.products;
  const branchCtx = task.context.branches;
  const plans = PlanProvider.getAll();
  const activeBranch = branchCtx.find(b => b.id === branchId);

  let branchContextStr = "";
  if (branchCtx.length > 0) {
    branchContextStr = `\n## Context Cabang\nKamu sedang menganalisis pasar untuk cabang **${activeBranch?.name || `ID ${branchId}`}** (ID:${branchId})${activeBranch?.location ? ` — ${activeBranch.location}` : ""}\n\n### Daftar Semua Cabang:\n${branchCtx.map(b => `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}${b.id === branchId ? " ⬅️ AKTIF" : ""}`).join("\n")}\n`;
  }

  pipeline.push("LLM");
  let systemPrompt = assemble({
    identity: CMO_IDENTITY,
    directive: directiveContent,
    decision: cognitiveResult?.trace,
    outputSchema: JSON_OUTPUT_SCHEMA,
    maxTokens: 16000,
    mode: "cmo",
  });
  if (memoryCtx) {
    const memBlock = [memoryCtx.workingMemory, memoryCtx.recentDecisions, memoryCtx.knowledgeContext].filter(Boolean).join("\n");
    if (memBlock) systemPrompt += `\n\n## Memory Context\n${memBlock}`;
  }
  if (branchContextStr) systemPrompt += `${branchContextStr}\n`;
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n`;

  systemPrompt += `\n\n## Marketing Context\n`;
  systemPrompt += `- Total Sales Hari Ini: Rp${salesCtx.today.revenue.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Orders Hari Ini: ${salesCtx.today.orders}\n`;
  systemPrompt += `- Total Sales Periode (${salesCtx.period.label}): Rp${salesCtx.period.revenue.toLocaleString("id-ID")}\n`;
  systemPrompt += `- Orders Periode: ${salesCtx.period.orders}\n`;

  if (salesCtx.topProducts && salesCtx.topProducts.length > 0) {
    systemPrompt += `\n## Top Products\n${salesCtx.topProducts.slice(0, 8).map(p => `- ${p.name}: ${p.sold} sold (Rp${p.revenue.toLocaleString("id-ID")})`).join("\n")}\n`;
  }
  if (products && products.length > 0) {
    systemPrompt += `\n## Product Catalog\n${products.slice(0, 10).map(p => `- ${p.name} (${p.isActive ? "Active" : "Inactive"}) — Rp${p.price.toLocaleString("id-ID")}`).join("\n")}\n`;
  }
  systemPrompt += `\n## Plans Context\n${plans.slice(0, 3).map(p => `- Plan ${p.graph.id}: ${p.criticalPath.length} steps`).join("\n") || "Tidak ada plan aktif"}`;

  systemPrompt += `\n\n## ATURAN GROUNDING MARKETING\n`;
  systemPrompt += `- JANGAN mengarang angka penjualan atau data produk.\n`;
  systemPrompt += `- Semua data harus berasal dari Marketing Context di atas.\n`;
  systemPrompt += `- JANGAN membuat asumsi produk, harga, atau tren pasar.\n`;
  systemPrompt += `- Jika data tidak tersedia, nyatakan dengan jujur.\n`;

  pipeline.push("LLM");
  const llmResult = await executiveReason({ persona: systemPrompt, context: task.message, userId: task.userId });

  pipeline.push("Result");

  const isSuccess = !llmResult.content.startsWith("ERROR:");
  const finalText = isSuccess ? llmResult.content : "✅ Laporan marketing selesai.";

  KnowledgeProvider.ingestEpisode({
    eventType: "cmo_execution",
    eventId: `CMO-${Date.now()}`,
    context: task.message.slice(0, 500),
    outcome: isSuccess ? "success" : "failure",
    domain: spec.domain,
    topic: spec.objective || "marketing_analysis",
    summary: `CMO analysis: ${spec.objective || "marketing analysis"}`,
    tags: ["cmo", "marketing", spec.intent, `branch:${branchId}`],
  });

  auditEngine.log({ actor: "CMO", action: "execute", resource: "program", result: isSuccess ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")} — duration=${Date.now() - t0}ms`, metadata: { userId: task.userId, branchId } });

  console.log(`[PIPELINE:CMO] execute end — pipeline=[${pipeline.join("→")}] success=${isSuccess} duration=${Date.now() - t0}ms`);

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
  const actionItems = brief.actionItems;
  if (actionItems.length > 0) {
    return {
      role: "CMO",
      action: "market_analysis",
      reasoning: `${actionItems.length} action items from brief${branchPrefix} — analyzing market impact`,
      confidence: 75,
      payload: { actionItems, branchId },
    };
  }
  return {
    role: "CMO",
    action: "monitor_market",
    reasoning: `Market monitoring based on brief${branchPrefix} — ${brief.summary}`,
    confidence: 85,
    payload: { branchId },
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { role: "CMO", maturity: "L2" },
  };
}

export const cmoRuntime = {
  name: "CMORuntime",
  version: "1.0.0",
  capabilities: CMO_IDENTITY?.capabilities || ["market-analysis", "campaign-strategy", "customer-insight", "product-trend"],
  dependencies: ["FoundationLoader", "SemanticEngine", "ExecutionPipeline", "CKO"],
  health,
  execute,
  decide,
};
