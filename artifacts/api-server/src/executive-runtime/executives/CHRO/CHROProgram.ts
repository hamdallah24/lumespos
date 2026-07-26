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
import { getExecutionEngine } from "../../../ai/runtime/execution/ExecutionEngine";
import { GovernanceProvider } from "../../../governance/providers";
import { KnowledgeProvider } from "../../../knowledge-platform/providers";
import { auditEngine } from "../../../governance/core";
import { PlanProvider } from "../../../execution-planner/providers";
import { BriefGenerator, type ExecutiveBrief } from "../../core";
import type { ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import { CHRO_CONFIG } from "./CHRO.config";
import { CognitiveEngine, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";
import type { PeopleContext } from "../../../executive-context/types";
import type { DecisionObject } from "../../types";

const CHRO_IDENTITY = getIdentity("CHRO")!;
const chroCognitive = new CognitiveEngine();

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CHRO");
  return content || "";
}

interface ExecutiveTask {
  message: string;
  userId: number;
  branchId?: number;
  onProgress?: (msg: string) => void;
  context: PeopleContext;
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
  console.log(`[PIPELINE:CHRO] execute start — message="${task.message.slice(0, 80)}" userId=${task.userId} branchId=${branchId}`);

  pipeline.push("Identity");
  task.onProgress?.("🟢 CHRO Runtime: Identity loaded");

  const directiveContent = getDirective();
  pipeline.push("Directive");
  task.onProgress?.("📄 CHRO: Memuat directive SDM");

  pipeline.push("SemanticEngine");
  const contract = await understand(task.message, task.userId);

  pipeline.push("ExecutionSpec");
  const spec = buildSpecV1(contract);

  pipeline.push("Verification");
  const verification = verify(spec);
  if (!verification.passed) {
    auditEngine.log({ actor: "CHRO", action: "verify", resource: "spec", result: "denied", reason: verification.stopReason || "Verification failed", metadata: { userId: task.userId } });
    return { success: false, text: `❌ ${verification.stopReason}`, pipeline, decision: null };
  }

  const govCheck = GovernanceProvider.canExecute("CHRO" as any, "analyze", spec.domain);
  if (!govCheck.allow) {
    auditEngine.log({ actor: "CHRO", action: "analyze", resource: spec.domain, result: "denied", reason: govCheck.reason, metadata: { userId: task.userId } });
    return { success: false, text: `❌ Governance denied: ${govCheck.reason}`, pipeline, decision: null };
  }

  let ckoText = "";
  try {
    const ckoResult = await consultantRuntime.analyze("founder_advisory" as any, task.message);
    if (ckoResult.success && ckoResult.text) ckoText = ckoResult.text;
  } catch { }
  pipeline.push("CKO");
  task.onProgress?.("🤖 CHRO: Consult CKO untuk data SDM");

  let memoryCtx = null;
  try {
    memoryCtx = await memoryProvider.read({
      executive: "CHRO",
      query: task.message,
      domain: spec.domain,
      memoryScope: "project",
      maxTokens: 1500,
    });
  } catch (e: any) {
    console.log(`[PIPELINE:CHRO:MemoryProvider] error: ${e.message}`);
  }

  let cognitiveResult = null;
  try {
    if (spec.intent !== "greeting") {
      cognitiveResult = await chroCognitive.think({
        role: "CHRO" as any,
        query: task.message,
        context: { intent: spec.intent, domain: spec.domain, objective: spec.objective, memoryContext: memoryCtx },
      });
      recordTrace("CHRO" as any, task.message, cognitiveResult.trace);
      await writeDecisionToMemory("CHRO" as any, task.message, cognitiveResult);
      pipeline.push("CognitiveEngine");
      task.onProgress?.("🧠 CHRO: Cognitive reasoning completed");
    }
  } catch (e: any) {
    console.log(`[PIPELINE:CHRO:CognitiveEngine] error: ${e.message}`);
  }

  pipeline.push("Context");
  task.onProgress?.("👥 CHRO: Mengumpulkan konteks SDM");

  const peopleCtx = task.context.people;
  const branchCtx = task.context.branches;
  const plans = PlanProvider.getAll();
  const knowledge = KnowledgeProvider.searchAll(task.message);
  const activeBranch = branchCtx.find(b => b.id === branchId);

  let branchContextStr = "";
  if (branchCtx.length > 0) {
    branchContextStr = `\n## Context Cabang\nKamu sedang mengelola SDM untuk cabang **${activeBranch?.name || `ID ${branchId}`}** (ID:${branchId})${activeBranch?.location ? ` — ${activeBranch.location}` : ""}\n\n### Daftar Semua Cabang:\n${branchCtx.map(b => `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}${b.id === branchId ? " ⬅️ AKTIF" : ""}`).join("\n")}\n\nData SDM bisa berbeda per cabang. Sertakan konteks cabang dalam analisa.\n`;
  }

  pipeline.push("PipelineLLM");
  let systemPrompt = assemble({
    identity: CHRO_IDENTITY,
    directive: directiveContent,
    decision: cognitiveResult?.trace,
    outputSchema: JSON_OUTPUT_SCHEMA,
    maxTokens: 16000,
    mode: "chro",
  });
  if (memoryCtx) {
    const memBlock = [memoryCtx.workingMemory, memoryCtx.recentDecisions, memoryCtx.knowledgeContext].filter(Boolean).join("\n");
    if (memBlock) systemPrompt += `\n\n## Memory Context\n${memBlock}`;
  }
  if (branchContextStr) systemPrompt += `${branchContextStr}\n`;
  if (ckoText) systemPrompt += `\n\n## CKO Advisory\n${ckoText}\n`;

  systemPrompt += `\n\n## People Context\n`;
  systemPrompt += `- Total Headcount: ${peopleCtx.headcount.total}\n`;
  systemPrompt += `- Karyawan Aktif: ${peopleCtx.headcount.active}\n`;
  systemPrompt += `- Kontrak: ${peopleCtx.headcount.contract}\n`;
  systemPrompt += `- Karyawan Tidak Aktif: ${peopleCtx.headcount.inactive}\n`;
  if (peopleCtx.attendance) {
    systemPrompt += `\n## Attendance Rate: ${(peopleCtx.attendance.rate * 100).toFixed(1)}%\n`;
    systemPrompt += `- Hadir: ${peopleCtx.attendance.present} | Izin: ${peopleCtx.attendance.leave} | Absen: ${peopleCtx.attendance.absent}\n`;
  }
  if (peopleCtx.leave && peopleCtx.leave.pending > 0) {
    systemPrompt += `\n## Izin Pending: ${peopleCtx.leave.pending} permohonan\n`;
  }
  if (peopleCtx.performance && peopleCtx.performance.length > 0) {
    systemPrompt += `\n## Performance\n${peopleCtx.performance.slice(0, 5).map(p => `- ${p.employee}: rating ${p.rating} (${p.category})`).join("\n")}\n`;
  }
  if (peopleCtx.risks && peopleCtx.risks.length > 0) {
    systemPrompt += `\n## HR Risks\n${peopleCtx.risks.map(r => `- [${r.severity}] ${r.description}`).join("\n")}\n`;
  }

  systemPrompt += `\n\n## Plans Context\n${plans.slice(0, 3).map(p => `- Plan ${p.graph.id}: ${p.criticalPath.length} steps`).join("\n") || "Tidak ada plan aktif"}`;
  systemPrompt += `\n\n## Knowledge\n${knowledge.slice(0, 5).map(k => `- ${k.summary}`).join("\n") || "Tidak ada pengetahuan relevan"}`;

  const messages = [{ role: "system" as const, content: systemPrompt }, { role: "user" as const, content: task.message }];
  const execResult = await ExecutionPipeline.execute(
    { role: "CHRO" as any, intent: spec.intent, domain: spec.domain },
    messages, getExecutionEngine().getToolDefinitions(), spec.estimatedTokens || 16000, task.userId, "chro", task.message, true,
    { onProgress: task.onProgress },
    { complexity: spec.estimatedComplexity || "simple", domain: spec.domain, objective: spec.objective },
  );

  pipeline.push("Result");

  KnowledgeProvider.ingestEpisode({
    eventType: "chro_execution",
    eventId: `CHRO-${Date.now()}`,
    context: task.message.slice(0, 500),
    outcome: execResult.success ? "success" : "failure",
    domain: spec.domain,
    topic: spec.objective || "hr_analysis",
    summary: `CHRO analysis: ${spec.objective || "HR report"}`,
    tags: ["chro", "hr", "personnel", spec.intent, `branch:${branchId}`],
  });

  auditEngine.log({ actor: "CHRO", action: "execute", resource: "program", result: execResult.success ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")} — duration=${Date.now() - t0}ms`, metadata: { userId: task.userId, branchId } });

  console.log(`[PIPELINE:CHRO] execute end — pipeline=[${pipeline.join("→")}] success=${execResult.success} duration=${Date.now() - t0}ms`);

  return {
    success: execResult.success,
    text: execResult.text || "✅ Laporan SDM selesai.",
    pipeline,
    decision: null,
  };
}

async function decide(brief: ExecutiveBrief, context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const branchId = context?.branchId;
  const branchPrefix = branchId ? ` (Cabang ${branchId})` : "";
  const personnelSections = brief.sections.filter(s =>
    s.title.toLowerCase().includes("personnel") || s.title.toLowerCase().includes("hr") || s.title.toLowerCase().includes("shift") || s.title.toLowerCase().includes("staff")
  );
  if (personnelSections.length > 0) {
    return {
      role: "CHRO",
      action: "hr_review",
      reasoning: `${personnelSections.length} HR areas from brief${branchPrefix} — reviewing staffing and scheduling`,
      confidence: 80,
      payload: { personnelItems: personnelSections.flatMap(s => s.items), branchId },
    };
  }
  return {
    role: "CHRO",
    action: "monitor_hr",
    reasoning: `HR monitoring based on brief${branchPrefix} — ${brief.summary}`,
    confidence: 90,
    payload: { branchId },
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { role: "CHRO", maturity: "L2" },
  };
}

export const chroRuntime = {
  name: "CHRORuntime",
  version: "1.0.0",
  capabilities: CHRO_IDENTITY?.capabilities || ["viewPersonnel", "scheduleShift", "generateHRReport"],
  dependencies: ["FoundationLoader", "SemanticEngine", "ExecutionPipeline", "CKO"],
  health,
  execute,
  decide,
};
