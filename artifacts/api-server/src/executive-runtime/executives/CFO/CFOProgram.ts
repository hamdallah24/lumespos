// CFO Runtime — Expanded from executive-runtime template with EIOS integrations
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
import { CFO_CONFIG } from "./CFO.config";
import { CognitiveEngine, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";
import { db, branchesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      ? `Kamu sedang menganalisis cabang **${active.name}** (ID:${active.id})${active.location ? ` — ${active.location}` : ""}`
      : `Cabang aktif: ID ${branchId}`;
    let text = `\n## Context Cabang\n${activeLine}\n\n### Daftar Semua Cabang:\n`;
    for (const b of branches) {
      const marker = b.id === branchId ? " ⬅️ AKTIF" : "";
      text += `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}${marker}\n`;
    }
    text += `\nData keuangan bisa berbeda per cabang. Sertakan konteks cabang dalam analisa finansial.\n`;
    return text;
  } catch {
    return "";
  }
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

  // Planning context
  pipeline.push("Context");
  task.onProgress?.("📊 CFO: Mengumpulkan konteks finansial");
  const plans = PlanProvider.getAll();
  const knowledge = KnowledgeProvider.searchAll(task.message);

  // Branch context
  const branchContext = await getBranchContext(branchId);

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
  systemPrompt += `\n\n## Plans Context\n${plans.slice(0, 3).map(p => `- Plan ${p.graph.id}: ${p.criticalPath.length} steps`).join("\n") || "Tidak ada plan aktif"}`;
  systemPrompt += `\n\n## Knowledge\n${knowledge.slice(0, 5).map(k => `- ${k.summary}`).join("\n") || "Tidak ada pengetahuan relevan"}`;

  const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: task.message }];
  const execResult = await ExecutionPipeline.execute(
    { role: "CFO" as any, intent: spec.intent, domain: spec.domain },
    messages, LOCAL_TOOLS, spec.estimatedTokens || 16000, task.userId, "cfo", task.message, true,
    { onProgress: task.onProgress },
    { complexity: spec.estimatedComplexity || "simple", domain: spec.domain, objective: spec.objective },
  );

  pipeline.push("Result");

  // EIOS: Record decision
  KnowledgeProvider.ingestEpisode({
    eventType: "cfo_execution",
    eventId: `CFO-${Date.now()}`,
    context: task.message.slice(0, 500),
    outcome: execResult.success ? "success" : "failure",
    domain: spec.domain,
    topic: spec.objective || "financial_analysis",
    summary: `CFO analysis: ${spec.objective || "financial analysis"}`,
    tags: ["cfo", "financial", spec.intent, `branch:${branchId}`],
  });

  auditEngine.log({ actor: "CFO", action: "execute", resource: "program", result: execResult.success ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")} — duration=${Date.now() - t0}ms`, metadata: { userId: task.userId, branchId } });

  console.log(`[PIPELINE:CFO] execute end — pipeline=[${pipeline.join("→")}] success=${execResult.success} duration=${Date.now() - t0}ms`);

  return {
    success: execResult.success,
    text: execResult.text || "✅ Laporan finansial selesai.",
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
