// ECP-039: CEO Runtime — REASONING mode. Pure executor.
// NO tools. NO tool rules. NO execution decisions.
// Governor owns all policy. Contract governs behavior.
// Migrated to executive-runtime with EIOS integrations.

import { getIdentity } from "../../../ai/runtime/identity";
import { understand } from "../../../ai/runtime/semantic-engine";
import { buildSpecV1 } from "../../../ai/runtime/execution-spec";
import { verify } from "../../../ai/runtime/verification-engine";
import { organizationEngine } from "../../../ai/runtime/organization-engine";
import { executiveCollaboration } from "../../../organization/executive-collaboration";
import { executiveReason } from "../../../ai/runtime/execution/ExecutiveReasoner";
import { getFoundationProvider } from "../../../ai/runtime/foundation";
import { assemble } from "../../../ai/runtime/prompt-assembler";
import { EXECUTIVE_OUTPUT_SCHEMA } from "../../../routes/ai-prompts";
import type { ExecutionContract } from "../../../eios-runtime/contracts/PipelineContracts";
import { aiMissionService } from "../../../services/ai-mission-service";
import { missionRuntime } from "../../../ai/runtime/mission-engine";
import { missionEngine } from "../../../ai/runtime/mission-background-engine";
import { consultantRuntime } from "../../../programs/consultant";
import type { CKOTargets } from "../../../programs/consultant";
import { knowledgeBackbone } from "../../../knowledge/KnowledgeBackbone";
import { GovernanceProvider } from "../../../governance/providers";
import { KnowledgeProvider } from "../../../knowledge-platform/providers";
import { auditEngine } from "../../../governance/core";
import { PlanProvider } from "../../../execution-planner/providers";
import type { ExecutiveBrief, ExecutiveDecision } from "../../../eios-runtime/contracts/PipelineContracts";
import { CEO_CONFIG } from "./CEO.config";
import { CognitiveEngine, getThinkingProfile, recordTrace } from "../../cognition";
import { memoryProvider } from "../../memory-provider";
import { writeDecisionToMemory } from "../../memory-provider/decision-hook";

const CEO_IDENTITY = getIdentity("CEO")!;
const ceoCognitive = new CognitiveEngine();

function normalizeRisk(risk: string | undefined): "low" | "medium" | "high" {
  if (risk === "low" || risk === "medium" || risk === "high") return risk;
  return "medium";
}

function normalizePriority(risk: string | undefined): "normal" | "high" | "critical" {
  if (risk === "high") return "critical";
  return "normal";
}

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CEO");
  return content || "";
}

export interface CEOExecutiveDecision {
  goal: string;
  delegation: { runtime: string; reason: string } | null;
  priority: "normal" | "high" | "critical";
  risk: "low" | "medium" | "high";
  reasoning: string;
  expectedOutcome: string;
}

export interface CEOContext {
  message: string;
  userId: number;
  onProgress?: (msg: string) => void;
  onTool?: (event: { name: string; status: "started" | "completed"; durationMs?: number }) => void;
  onState?: (state: string) => void;
  onExecutionEvent?: (snapshot: import("../../../ai/runtime/execution/execution-manifest").ExecutionSnapshot) => void;
  runtimeContext?: import('../../../runtime-intelligence-core/types').RuntimeContext;
}

export interface CEOResult {
  success: boolean;
  text: string;
  decision: CEOExecutiveDecision;
  pipeline: string[];
}

async function execute(ctx: CEOContext, execContract?: ExecutionContract): Promise<CEOResult> {
  const pipeline: string[] = [];
  console.log(`[PIPELINE:CEO] execute start — message="${ctx.message.slice(0, 80)}" userId=${ctx.userId}`);

  // Stage 1: Identity
  pipeline.push("Identity");
  ctx.onProgress?.("💼 CEO Runtime booting...");

  // ── Approval Handler: CTO Implementation Plan review ──
  if (ctx.message.startsWith("[CEO APPROVAL]")) {
    pipeline.push("ApprovalHandler");
    ctx.onProgress?.("📋 Meninjau rencana implementasi CTO...");

    // Cognitive reasoning before approval decision
    let approvalCognitiveResult = null;
    try {
      approvalCognitiveResult = await ceoCognitive.think({
        role: "CEO",
        query: ctx.message.replace("[CEO APPROVAL]", "").trim(),
        context: { intent: "approval", domain: "engineering" },
      });
      recordTrace("CEO", ctx.message, approvalCognitiveResult.trace);
      await writeDecisionToMemory("CEO", ctx.message, approvalCognitiveResult);
      pipeline.push("CognitiveEngine");
    } catch (e: any) {
      console.log(`[PIPELINE:CEO:CognitiveEngine:approval] error: ${e.message}`);
    }

    try {
      const approvedResult = await executiveReason({
        persona: `Kamu adalah CEO Engineering OS. Tugasmu hanya MENYETUJUI atau MENOLAK rencana implementasi dari CTO.
        
        ATURAN:
        - Jika rencana CTO masuk akal dan tidak merusak sistem, balas dengan: "APPROVED"
        - Jika rencana CTO berbahaya atau tidak tepat, balas dengan: "REJECTED: [alasan singkat]"
        - JANGAN berikan analisis tambahan. JANGAN gunakan format executive report.
        - Jawab LANGSUNG dengan APPROVED atau REJECTED.
        - Bahasa Indonesia.`,
        context: ctx.message,
        userId: ctx.userId,
      });
      const approved = approvedResult.content;
      const isApproved = approved.toUpperCase().includes("APPROVED");

      auditEngine.log({ actor: "CEO", action: "approve_plan", resource: "cto_implementation", result: "allowed", reason: `CTO implementation plan review — ${isApproved ? "APPROVED" : "REJECTED"}`, metadata: { userId: ctx.userId } });

      return {
        success: true,
        text: isApproved ? `APPROVED: ${approved}` : `REJECTED: ${approved}`,
        decision: {
          goal: "approve_implementation_plan",
          delegation: null,
          priority: "normal",
          risk: normalizeRisk("low"),
          reasoning: approvalCognitiveResult?.trace
            ? `Cognitive analysis: ${approvalCognitiveResult.decision.reasoning}`
            : "CTO implementation plan review",
          expectedOutcome: isApproved ? "CTO will proceed with implementation" : "CTO will conclude without writing files",
        },
        pipeline,
      };
    } catch (e: any) {
      auditEngine.log({ actor: "CEO", action: "approve_plan", resource: "cto_implementation", result: "denied", reason: `Approval error — ${e.message}`, metadata: { userId: ctx.userId } });
      return {
        success: false,
        text: `REJECTED: Approval error — ${e.message}`,
        decision: {
          goal: "approve_implementation_plan",
          delegation: null,
          priority: "normal",
          risk: normalizeRisk("medium"),
          reasoning: "approval LLM call failed",
          expectedOutcome: "rejected due to error",
        },
        pipeline,
      };
    }
  }

  // Stage 2: Load Executive Directive from Foundation (cached)
  pipeline.push("DirectiveLoad");
  ctx.onProgress?.("📄 Memuat directive eksekutif...");
  const directiveContent = getDirective();

  // Stage 2b: CKO — translate Founder's business intent → technical targets
  pipeline.push("CKOTranslate");
  ctx.onProgress?.("🧠 CKO menerjemahkan intent bisnis ke target teknis...");
  let ckoTargets: CKOTargets | null = null;
  try {
    ckoTargets = await consultantRuntime.translateToTargets(ctx.message);
    console.log(`[PIPELINE:CEO:CKO] domain="${ckoTargets.domain}" files=${ckoTargets.targetFiles.length} entities=${ckoTargets.entities.join(",")}`);
  } catch (e: any) {
    console.log(`[PIPELINE:CEO:CKO] error: ${e.message}`);
  }

  // Stage 3: Semantic Understanding (dengan CKO advisory)
  pipeline.push("SemanticEngine");
  ctx.onProgress?.("🔎 Memahami intent pengguna...");
  const contract = await understand(ctx.message, ctx.userId, ckoTargets ?? undefined);

  // Stage 4: Execution Specification
  pipeline.push("ExecutionSpec");
  ctx.onProgress?.("📋 Execution spec selesai...");
  const spec = buildSpecV1(contract);

  // Stage 5: Verification
  pipeline.push("Verification");
  ctx.onProgress?.("✅ Verifikasi spesifikasi...");
  const verification = verify(spec);

  // Stage 6: Delegation via Organization Engine
  pipeline.push("OrganizationEngine");
  ctx.onProgress?.("🏢 Menentukan delegasi...");
  const executives = organizationEngine.delegateBySpec(spec);

  const noDelegate = ["knowledge_query"];
  const shouldDispatch = !noDelegate.includes(spec.intent) && executives.length > 0;

  if (shouldDispatch) {
    // Governance check before delegation
    const govCheck = GovernanceProvider.canExecute("CEO" as any, "delegate", spec.domain);
    if (!govCheck.allow) {
      console.log(`[PIPELINE:CEO] Governance denied delegation: ${govCheck.reason}`);
      auditEngine.log({ actor: "CEO", action: "delegate", resource: spec.domain, result: "denied", reason: govCheck.reason, metadata: { userId: ctx.userId, intent: spec.intent } });
    } else {
      ctx.onState?.(`Dispatching: ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`);
      ctx.onProgress?.(`📋 Mendelegasikan ke ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`);
      auditEngine.log({ actor: "CEO", action: "delegate", resource: spec.domain, result: "allowed", reason: `Delegating to ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`, metadata: { userId: ctx.userId, intent: spec.intent, ckoDomain: ckoTargets?.domain } });
    }
  }

  // Stage 6b: Memory Read — before Cognitive
  let memoryCtx = null;
  try {
    memoryCtx = await memoryProvider.read({
      executive: "CEO",
      query: ctx.message,
      domain: spec.domain,
      memoryScope: "organization",
      maxTokens: 2500,
    });
  } catch (e: any) {
    console.log(`[PIPELINE:CEO:MemoryProvider] error: ${e.message}`);
  }

  // Stage 7: Cognitive Engine — think before LLM
  let cognitiveResult = null;
  if (!noDelegate.includes(spec.intent)) {
    try {
      cognitiveResult = await ceoCognitive.think({
        role: "CEO",
        query: ctx.message,
        context: {
          intent: spec.intent,
          domain: spec.domain,
          objective: spec.objective,
          ckoDomain: ckoTargets?.domain,
          memoryContext: memoryCtx,
        },
      });
      ctx.onProgress?.("🧠 CEO: Cognitive reasoning completed");
    } catch (e: any) {
      console.log(`[PIPELINE:CEO:CognitiveEngine] error: ${e.message}`);
    }
    // Always record trace and pipeline step, even if think() threw
    if (cognitiveResult) {
      recordTrace("CEO", ctx.message, cognitiveResult.trace);
      await writeDecisionToMemory("CEO", ctx.message, cognitiveResult);
    } else {
      recordTrace("CEO", ctx.message, {
        correlationId: `trace-failed-${Date.now()}`,
        steps: [],
        durationMs: 0,
        status: "error",
      });
    }
    pipeline.push("CognitiveEngine");
  }

  // Stage 7b: Decision
  const decision: CEOExecutiveDecision = {
    goal: spec.objective,
    delegation: shouldDispatch
      ? { runtime: executives.map((e: { runtime: string }) => e.runtime).join(", "), reason: "Multi-executive dispatch" }
      : executives.length > 0
        ? { runtime: executives[0].runtime, reason: executives[0].reason }
        : null,
    priority: normalizePriority(spec.risk),
    risk: normalizeRisk(spec.risk),
    reasoning: spec.semanticReasoning,
    expectedOutcome: spec.expectedOutcome,
  };

  // EIOS: Record decision as knowledge episode (only when cognitive reasoning succeeded)
  if (cognitiveResult) {
    KnowledgeProvider.ingestEpisode({
      eventType: "ceo_decision",
      eventId: `CEO-${Date.now()}`,
      context: ctx.message.slice(0, 500),
      outcome: verification.passed ? "success" : "failure",
      domain: spec.domain,
      topic: spec.objective || "general",
      summary: `CEO decision: ${spec.objective} — risk ${decision.risk}, delegation ${decision.delegation?.runtime || "none"}`,
      tags: ["ceo", "decision", spec.intent],
    });
  }

  // Stage 8: LLM Reasoning
  let rawText = "";

  // Stage 8a: Mission Query — handle BEFORE verification gate so "Confidence too low" doesn't block it
  const isMissionQuery = /misi\s*#?\d+|misi\s+(terakhir|sebelumnya|lalu|yang\s+selesai|lampau)/i.test(ctx.message)
    && !/\b(buat|jalankan|kerjakan|proses)\s+misi\b/i.test(ctx.message);
  if (isMissionQuery) {
    pipeline.push("MissionQuery");
    const match = ctx.message.match(/misi\s*#?(\d+)/i);
    const targetId = match ? parseInt(match[1]) : -1;
    // EIOS: Use KnowledgeProvider for mission episode data instead of direct DB
    const episodes = KnowledgeProvider.getLatestEpisodes(5);
    if (targetId > 0) {
      const target = episodes.find(e => e.id.includes(String(targetId)));
      if (target) {
        rawText = `Ringkasan Eksekutif\nEpisode #${target.id} berstatus **${target.status}**.\n\nHasil\n${target.summary.slice(0, 4000)}`;
      } else {
        rawText = `Ringkasan Eksekutif\nMisi #${targetId} tidak ditemukan.`;
      }
    } else if (episodes.length > 0) {
      const target = episodes[0];
      rawText = `Ringkasan Eksekutif\nEpisode terakhir #${target.id} berstatus **${target.status}**.\n\nHasil\n${target.summary.slice(0, 4000)}`;
    } else {
      rawText = `Ringkasan Eksekutif\nBelum ada misi tercatat.`;
    }
  } else if (!verification.passed) {
    rawText = `Saya tidak dapat memproses permintaan ini karena: ${verification.stopReason}. Silakan perjelas atau ubah pendekatan Anda.`;
  } else if (shouldDispatch) {
    const lower = ctx.message.toLowerCase();
    const isCreateMission = /\b(buat|jalankan|kerjakan|proses)\s+misi\b/i.test(lower)
      || /\b(misi)\s+(baru|lanjut|eksekusi)\b/i.test(lower);

    if (isCreateMission) {
      pipeline.push("BackgroundMission");
      const rtMission = missionRuntime.create(
        spec.objective || ctx.message.slice(0, 100),
        ctx.message,
        [executives[0]?.runtime || "cto"],
        spec.risk === "high" ? "high" : "normal",
        "RUNTIME-001",
        { missionType: "analysis", userId: ctx.userId, userMessage: ctx.message, ckoTargets: ckoTargets ?? undefined },
      );
      missionRuntime.transition(rtMission.id, "UNDERSTANDING");
      missionRuntime.transition(rtMission.id, "PLANNING");
      missionRuntime.transition(rtMission.id, "DELEGATED");
      const dbId = await aiMissionService.create(ctx.userId, rtMission.title, ctx.message, "cto", spec.estimatedComplexity, "DELEGATED");
      const stored = missionRuntime.get(rtMission.id);
      if (stored) stored.dbMissionId = dbId;
      missionEngine.triggerTick();
      rawText = `✅ **Misi ${rtMission.id} (DB#${dbId}) dibuat** berdasarkan diskusi kita. Misi sedang diproses, hasil akan muncul di chat ini otomatis.`;
    } else {
      pipeline.push("PromptAssembly");
      ctx.onProgress?.("📝 Merakit prompt CEO...");
      const memoryBlock = memoryCtx ? [
        memoryCtx.workingMemory,
        memoryCtx.recentDecisions,
        memoryCtx.episodicMemory,
        memoryCtx.knowledgeContext,
        memoryCtx.memoryEngineRecords,
        memoryCtx.organizationalMemory,
      ].filter(Boolean).join("\n") : "";
      // EIOS: Get plans from PlanProvider instead of direct DB
      let missionsContext = "";
      try {
        const plans = PlanProvider.getAll();
        missionsContext = plans.slice(0, 5).map((p, i) => {
          return `- Plan ${p.graph.id}: ${p.criticalPath.length} steps (${p.criticalPathDuration || "N/A"}ms)`;
        }).join("\n");
      } catch (e: any) { console.log(`[PIPELINE:CEO:PlanProvider] ${e?.message || "unavailable"}`); }
      const contextParts = [memoryBlock, missionsContext ? `\n## Riwayat Misi Terbaru\n${missionsContext}` : ""].filter(Boolean);
      const systemPrompt = `${CEO_CONFIG.systemPromptPrefix}${assemble({
        identity: CEO_IDENTITY,
        directive: directiveContent,
        context: contextParts.join("\n\n") || undefined,
        decision: cognitiveResult?.trace,
        outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
        maxTokens: 8000,
        mode: "ceo",
      })}`;
      ctx.onProgress?.("💼 CEO Runtime merespon...");
      try {
        rawText = (await executiveReason({ persona: systemPrompt, context: ctx.message, userId: ctx.userId })).content;
        if (!rawText.toLowerCase().includes("buat misi")) {
          rawText += "\n\n> 💡 *Jika ingin tugas ini dijalankan sebagai misi, katakan **buat misi**.*";
        }
      } catch (e: any) {
        rawText = `Maaf, CEO Runtime mengalami kendala teknis saat merespon. Silakan coba lagi. (${e?.message || "unknown error"})`;
      }
    }
  } else {
    pipeline.push("PromptAssembly");
    ctx.onProgress?.("📝 Merakit prompt CEO...");
    // EIOS: Get plans from PlanProvider instead of direct DB
    let missionsContext = "";
    try {
      const plans = PlanProvider.getAll();
      missionsContext = plans.slice(0, 5).map((p, i) => {
        return `- Plan ${p.graph.id}: ${p.criticalPath.length} steps (${p.criticalPathDuration || "N/A"}ms)`;
      }).join("\n");
    } catch (e: any) { console.log(`[PIPELINE:CEO:PlanProvider] ${e?.message || "unavailable"}`); }
    const systemPrompt = `${CEO_CONFIG.systemPromptPrefix}${assemble({
      identity: CEO_IDENTITY,
      directive: directiveContent,
      context: missionsContext ? `\n## Riwayat Misi Terbaru\n${missionsContext}` : undefined,
      decision: cognitiveResult?.trace,
      outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
      maxTokens: 8000,
      mode: "ceo",
    })}`;
    ctx.onProgress?.("💼 CEO Runtime menganalisis...");
    try {
      rawText = (await executiveReason({ persona: systemPrompt, context: ctx.message, userId: ctx.userId })).content;
    } catch (e: any) {
      rawText = `Maaf, CEO Runtime mengalami kendala teknis saat merespon. Silakan coba lagi. (${e?.message || "unknown error"})`;
    }
  }

  // Stage 8b: Post-process — catch LLM refusal patterns
  const refusalRe = /confidence\s+too\s+low|confidence\s+terlalu\s+rendah|tidak.*(?:memiliki\s+akses|bisa\s+mengakses|ada\s+data|bisa\s+menjawab|memiliki\s+cukup|bisa\s+melakukan)|tidak.*(?:akses\s+ke\s+database|shared\s+memory|terhubung)|forbidden\s+actions/i;
  if (refusalRe.test(rawText) && rawText.length < 3000) {
    // EIOS: Try KnowledgeProvider for recovery instead of direct DB
    const episodes = KnowledgeProvider.getLatestEpisodes(5);
    if (episodes.length > 0) {
      const target = episodes[0];
      rawText = `Ringkasan Eksekutif\nEpisode terakhir #${target.id} berstatus **${target.status}**.\n\nHasil\n${target.summary ? target.summary.slice(0, 4000) : "Tidak ada output tersimpan."}`;
      if (!pipeline.includes("MissionQuery")) pipeline.push("MissionQuery");
    }
  }

  // Stage 9: Executive Report
  pipeline.push("ExecutiveReport");
  const isDelegated = rawText.includes("Misi #") && !pipeline.includes("MissionQuery");
  const delegationLine = isDelegated
    ? `\n> — CEO Runtime · Misi dikirim ke ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`
    : "\n> — CEO Runtime · Direct";
  const text = `${rawText}\n${delegationLine}`;

  console.log(`[PIPELINE:CEO] execute end — pipeline=[${pipeline.join("→")}] success=${verification.passed && !rawText.startsWith("ERROR:")}`);

  // EIOS: Record final decision outcome
  auditEngine.log({ actor: "CEO", action: "execute", resource: "program", result: verification.passed ? "allowed" : "denied", reason: `Pipeline: ${pipeline.join("→")}`, metadata: { userId: ctx.userId, success: verification.passed } });

  return {
    success: verification.passed && !rawText.startsWith("ERROR:"),
    text,
    decision,
    pipeline,
  };
}

async function decide(brief: ExecutiveBrief, _context?: Record<string, unknown>): Promise<ExecutiveDecision> {
  const highPriorityItems = brief.pendingApprovals.length;
  if (highPriorityItems > 0) {
    return {
      role: "CEO",
      action: "review_approvals",
      reasoning: `${highPriorityItems} pending approvals requiring CEO review from brief`,
      confidence: 90,
      delegateTo: highPriorityItems > 3 ? "COO" : undefined,
      payload: { pendingApprovals: brief.pendingApprovals },
    };
  }

  if (brief.actionItems.length > 5) {
    return {
      role: "CEO",
      action: "delegate",
      reasoning: `${brief.actionItems.length} action items — delegating to optimize throughput`,
      confidence: 85,
      delegateTo: "COO",
      payload: { actionItems: brief.actionItems },
    };
  }

  return {
    role: "CEO",
    action: "strategic_monitor",
    reasoning: `Routine monitoring — ${brief.summary}`,
    confidence: 95,
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { directive: "ceo-directive", maturity: "L2" },
  };
}

export const ceoRuntime = {
  name: "CEORuntime",
  version: "1.0.0",
  capabilities: [
    "mission-planning", "delegation", "proposal-review",
    "organization-management", "business-analysis",
    "strategic-decision", "report-aggregation",
  ],
  dependencies: [
    "FoundationLoader", "SemanticEngine", "ExecutionSpecificationV1",
    "VerificationEngine", "OrganizationEngine", "LLM",
  ],
  health,
  execute,
  decide,
};

export { execute, health };
