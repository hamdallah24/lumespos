// CMO Runtime — Expanded from executive-runtime template with EIOS integrations
// Identity from identity.ts, directive from Foundation, prompt from PromptAssembler.

import { getIdentity } from "../../../ai/runtime/identity";
import { understand } from "../../../ai/runtime/semantic-engine";
import { buildSpecV1 } from "../../../ai/runtime/execution-spec";
import { verify } from "../../../ai/runtime/verification-engine";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { assemble } from "../../../ai/runtime/prompt-assembler";
import { JSON_OUTPUT_SCHEMA } from "../../../routes/ai-prompts";
import { ExecutionPipeline } from "../../../ai/runtime/execution/execution-pipeline";
import type { ExecutionContract } from "../../../eios-runtime/contracts/PipelineContracts";
import { consultantRuntime } from "../../../programs/consultant";
import { LOCAL_TOOLS } from "../../../ai/tools/tool-adapter";
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
import { db, branchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      ? `Kamu sedang menganalisis pasar untuk cabang **${active.name}** (ID:${active.id})${active.location ? ` — ${active.location}` : ""}`
      : `Cabang aktif: ID ${branchId}`;
    let text = `\n## Context Cabang\n${activeLine}\n\n### Daftar Semua Cabang:\n`;
    for (const b of branches) {
      const marker = b.id === branchId ? " ⬅️ AKTIF" : "";
      text += `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}${marker}\n`;
    }
    text += `\nData marketing bisa berbeda per cabang. Sertakan konteks cabang dalam analisa.\n`;
    return text;
  } catch {
    return "";
  }
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
    return { success: false, text: `❌ ${verification.stopReason}`, pipeline };
  }

  // Governance check
  const govCheck = GovernanceProvider.canExecute("CMO" as any, "analyze", spec.domain);
  if (!govCheck.allow) {
    auditEngine.log({ actor: "CMO", action: "analyze", resource: spec.domain, result: "denied", reason: govCheck.reason, metadata: { userId: task.userId } });
    return { success: false, text: `❌ Governance denied: ${govCheck.reason}`, pipeline };
  }

  // CKO Consultation
  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("founder_advisory" as any, task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { /* CKO unavailable */ }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CMO: Consult CKO untuk insight pasar");

  // Memory Read — before Cognitive
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

  // Cognitive Engine — think before LLM
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

  // Context
  pipeline.push("Context");
  task.onProgress?.("📊 CMO: Mengumpulkan konteks marketing");
  const plans = PlanProvider.getAll();
  const knowledge = KnowledgeProvider.searchAll(task.message);

  // Branch context
  const branchContext = await getBranchContext(branchId);

  // Decision via ExecutionPipeline
  pipeline.push("PipelineLLM");
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
  if (branchContext) systemPrompt += `\n${branchContext}\n`;
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n`;
  systemPrompt += `\n\n## Plans Context\n${plans.slice(0, 3).map(p => `- Plan ${p.graph.id}: ${p.criticalPath.length} steps`).join("\n") || "Tidak ada plan aktif"}`;
  systemPrompt += `\n\n## Knowledge\n${knowledge.slice(0, 5).map(k => `- ${k.summary}`).join("\n") || "Tidak ada pengetahuan relevan"}`;

  const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: task.message }];
  const execResult = await ExecutionPipeline.execute(
    { role: "CMO" as any, intent: spec.intent, domain: spec.domain },
    messages, LOCAL_TOOLS, spec.estimatedTokens || 16000, task.userId, "cmo", task.message, true,
    { onProgress: task.onProgress },
    { complexity: spec.estimatedComplexity || "simple", domain: spec.domain, objective: spec.objective },
  );

  pipeline.push("Result");

  // EIOS: Record decision
  KnowledgeProvider.ingestEpisode({
    eventType: "cmo_execution",
    eventId: `CMO-${Date.now()}`,
    context: task.message.slice(0, 500),
    outcome: execResult.success ? "success" : "failure",
    domain: spec.domain,
    topic: spec.objective || "marketing_analysis",
    summary: `CMO analysis: ${spec.objective || "marketing analysis"}`,
    tags: ["cmo", "marketing", spec.intent, `branch:${branchId}`],
  });

  auditEngine.log({ actor: "CMO", action: "execute", resource: "program", result: execResult.success ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")} — duration=${Date.now() - t0}ms`, metadata: { userId: task.userId, branchId } });

  console.log(`[PIPELINE:CMO] execute end — pipeline=[${pipeline.join("→")}] success=${execResult.success} duration=${Date.now() - t0}ms`);

  return {
    success: execResult.success,
    text: execResult.text || "✅ Laporan marketing selesai.",
    pipeline,
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
