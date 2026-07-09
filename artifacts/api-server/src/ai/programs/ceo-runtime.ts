// ECP-039: CEO Runtime — REASONING mode. Pure executor.
// NO tools. NO tool rules. NO execution decisions.
// Governor owns all policy. Contract governs behavior.

import { getIdentity } from "../runtime/identity";
import { understand } from "../runtime/semantic-engine";
import { buildSpecV1 } from "../runtime/execution-spec";
import { verify } from "../runtime/verification-engine";
import { organizationEngine } from "../runtime/organization-engine";
import { executiveCollaboration } from "../../organization/executive-collaboration";
import { callDeepSeek } from "../llm/llm-adapter";
import { getFoundationProvider } from "../runtime/foundation";
import { assemble } from "../runtime/prompt-assembler";
import { EXECUTIVE_OUTPUT_SCHEMA } from "../../routes/ai-prompts";
import type { ExecutionContract } from "../runtime/execution/execution-manifest";
import { aiMissionService } from "../../services/ai-mission-service";
import { missionRuntime } from "../runtime/mission-engine";
import { missionEngine } from "../runtime/mission-background-engine";
import { consultantRuntime } from "../../programs/consultant";
import { knowledgeBackbone } from "../../knowledge/KnowledgeBackbone";
import { db, missionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const CEO_IDENTITY = getIdentity("CEO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CEO");
  return content || "";
}

export interface ExecutiveDecision {
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
  onExecutionEvent?: (snapshot: import("../runtime/execution/execution-manifest").ExecutionSnapshot) => void;
}

export interface CEOResult {
  success: boolean;
  text: string;
  decision: ExecutiveDecision;
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

    try {
      const approved = await callDeepSeek(
        `Kamu adalah CEO Engineering OS. Tugasmu hanya MENYETUJUI atau MENOLAK rencana implementasi dari CTO.
        
        ATURAN:
        - Jika rencana CTO masuk akal dan tidak merusak sistem, balas dengan: "APPROVED"
        - Jika rencana CTO berbahaya atau tidak tepat, balas dengan: "REJECTED: [alasan singkat]"
        - JANGAN berikan analisis tambahan. JANGAN gunakan format executive report.
        - Jawab LANGSUNG dengan APPROVED atau REJECTED.
        - Bahasa Indonesia.`,
        ctx.message, ctx.userId, "ceo", 500,
      );
      const isApproved = approved.toUpperCase().includes("APPROVED");
      return {
        success: true,
        text: isApproved ? `APPROVED: ${approved}` : `REJECTED: ${approved}`,
        decision: {
          goal: "approve_implementation_plan",
          delegation: null,
          priority: "normal",
          risk: "low",
          reasoning: "CTO implementation plan review",
          expectedOutcome: isApproved ? "CTO will proceed with implementation" : "CTO will conclude without writing files",
        },
        pipeline,
      };
    } catch (e: any) {
      return {
        success: false,
        text: `REJECTED: Approval error — ${e.message}`,
        decision: {
          goal: "approve_implementation_plan",
          delegation: null,
          priority: "normal",
          risk: "medium",
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
  let ckoTargets: import("../../programs/consultant").CKOTargets | null = null;
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
  
  // Smart Dispatch: CEO handles greetings + knowledge_query (chat biasa) langsung.
  // Delegasi hanya untuk intent yg butuh aksi konkret.
  const noDelegate = ["greeting", "knowledge_query"];
  const shouldDispatch = !noDelegate.includes(spec.intent) && executives.length > 0;

  if (shouldDispatch) {
    ctx.onState?.(`Dispatching: ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`);
    ctx.onProgress?.(`📋 Mendelegasikan ke ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`);
  }

  // Stage 7: Decision
  const decision: ExecutiveDecision = {
    goal: spec.objective,
    delegation: shouldDispatch
      ? { runtime: executives.map((e: { runtime: string }) => e.runtime).join(", "), reason: "Multi-executive dispatch" }
      : executives.length > 0
        ? { runtime: executives[0].runtime, reason: executives[0].reason }
        : null,
    priority: spec.risk === "high" ? "critical" : "normal",
    risk: spec.risk as "low" | "medium" | "high",
    reasoning: spec.semanticReasoning,
    expectedOutcome: spec.expectedOutcome,
  };

    // Stage 8: LLM Reasoning
  let rawText = "";

  // Stage 8a: Mission Query — handle BEFORE verification gate so "Confidence too low" doesn't block it
  const isMissionQuery = /misi\s*#?\d+|misi\s+(terakhir|sebelumnya|lalu|yang\s+selesai|lampau)/i.test(ctx.message)
    && !/\b(buat|jalankan|kerjakan|proses)\s+misi\b/i.test(ctx.message);
  if (isMissionQuery) {
    pipeline.push("MissionQuery");
    const match = ctx.message.match(/misi\s*#?(\d+)/i);
    const targetId = match ? parseInt(match[1]) : -1;
    const missionRows = await db.select({
      id: missionsTable.id, status: missionsTable.status, result: missionsTable.result,
    }).from(missionsTable)
      .where(targetId > 0 ? eq(missionsTable.id, targetId) : undefined)
      .orderBy(desc(missionsTable.id)).limit(5).catch(() => []);
    const target = targetId > 0 ? missionRows.find(m => m.id === targetId) : missionRows[0];
    if (target) {
      rawText = `Ringkasan Eksekutif\nMisi #${target.id} berstatus **${target.status}**.\n\nHasil Executive\n${target.result ? target.result.slice(0, 4000) : "Tidak ada output tersimpan."}`;
    } else {
      rawText = `Ringkasan Eksekutif\nMisi #${targetId} tidak ditemukan di database.`;
    }
  } else if (!verification.passed) {
    rawText = `❌ ${verification.stopReason}`;
  } else if (contract.intent === "greeting") {
    rawText = "Halo. Ada yang bisa CEO Runtime bantu?";
  } else if (shouldDispatch) {
    // ── Mission Creator: jika user minta buat misi → create + queue ──
    const lower = ctx.message.toLowerCase();
    const isCreateMission = /\b(buat|jalankan|kerjakan|proses)\s+misi\b/i.test(lower)
      || /\b(misi)\s+(baru|lanjut|eksekusi)\b/i.test(lower);

    if (isCreateMission) {
      pipeline.push("BackgroundMission");
      // 1. Create in-memory mission (13-state lifecycle via mission-engine)
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
      // 2. Persist ke DB
      const dbId = await aiMissionService.create(ctx.userId, rtMission.title, ctx.message, "cto", spec.estimatedComplexity, "DELEGATED");
      // Update in-memory mission dengan dbMissionId
      const stored = missionRuntime.get(rtMission.id);
      if (stored) stored.dbMissionId = dbId;
      // Trigger background engine segera (jangan nunggu 5 detik)
      missionEngine.triggerTick();
      rawText = `✅ **Misi ${rtMission.id} (DB#${dbId}) dibuat** berdasarkan diskusi kita. Misi sedang diproses, hasil akan muncul di chat ini otomatis.`;
    } else {
      // Chat biasa — CEO diskusi dulu, misi dibuat hanya saat user bilang "buat misi"
      pipeline.push("PromptAssembly");
      ctx.onProgress?.("📝 Merakit prompt CEO...");
      // Inject executive memory + recent missions from DB so CEO has real data
      const ceoMemory = knowledgeBackbone.summarizeMemory("CEO");
      const ctoMemory = knowledgeBackbone.summarizeMemory("CTO");
      const memoryBlock = [ceoMemory, ctoMemory].filter(Boolean).join("\n");
      let missionsContext = "";
      try {
        const recentMissions = await db.select({
          id: missionsTable.id, status: missionsTable.status, result: missionsTable.result,
        }).from(missionsTable).orderBy(desc(missionsTable.id)).limit(5);
        missionsContext = recentMissions.map((m, i) => {
          const showFull = i === 0 && m.result && m.result.length > 300;
          return `- Misi #${m.id}: ${m.status}${m.result ? ` — ${showFull ? m.result : m.result.slice(0, 300)}` : ""}`;
        }).join("\n");
      } catch { /* DB unavailable */ }
      const contextParts = [memoryBlock, missionsContext ? `\n## Riwayat Misi Terbaru\n${missionsContext}` : ""].filter(Boolean);
      const systemPrompt = `DILARANG: jangan pernah mengatakan "Confidence too low" atau "confidence terlalu rendah". Jawab langsung berdasarkan data yang ada atau pengetahuanmu.\n\n${assemble({
        identity: CEO_IDENTITY,
        directive: directiveContent,
        context: contextParts.join("\n\n") || undefined,
        outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
        maxTokens: 8000,
        mode: "ceo",
      })}`;
      ctx.onProgress?.("💼 CEO Runtime merespon...");
      try {
        rawText = await callDeepSeek(
          systemPrompt, ctx.message, ctx.userId, "ceo", 4000,
        );
        // Tambah catatan bahwa user bisa buat misi kalo mau
        if (!rawText.toLowerCase().includes("buat misi")) {
          rawText += "\n\n> 💡 *Jika ingin tugas ini dijalankan sebagai misi, katakan **buat misi**.*";
        }
      } catch {
        rawText = "CEO Runtime sedang sibuk. Coba lagi.";
      }
    }
  } else {
    pipeline.push("PromptAssembly");
    ctx.onProgress?.("📝 Merakit prompt CEO...");
    // ECP-039: NO toolRules — CEO is REASONING mode. No tools.
    let missionsContext = "";
    try {
      const recentMissions = await db.select({
        id: missionsTable.id, status: missionsTable.status, result: missionsTable.result,
      }).from(missionsTable).orderBy(desc(missionsTable.id)).limit(5);
      missionsContext = recentMissions.map((m, i) => {
        const showFull = i === 0 && m.result && m.result.length > 300;
        return `- Misi #${m.id}: ${m.status}${m.result ? ` — ${showFull ? m.result : m.result.slice(0, 300)}` : ""}`;
      }).join("\n");
    } catch { /* DB unavailable */ }
    const systemPrompt = `DILARANG: jangan pernah mengatakan "Confidence too low" atau "confidence terlalu rendah". Jawab langsung berdasarkan data yang ada atau pengetahuanmu.\n\n${assemble({
      identity: CEO_IDENTITY,
      directive: directiveContent,
      context: missionsContext ? `\n## Riwayat Misi Terbaru\n${missionsContext}` : undefined,
      outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
      maxTokens: 8000,
      mode: "ceo",
    })}`;
    ctx.onProgress?.("💼 CEO Runtime menganalisis...");
    try {
      // ECP-039: CEO uses callDeepSeek (single call, no Governor loop).
      // CEO is REASONING mode — never executes tools.
      rawText = await callDeepSeek(
        systemPrompt, ctx.message, ctx.userId, "ceo", 4000,
      );
    } catch {
      rawText = "CEO Runtime sedang sibuk. Coba lagi.";
    }
  }

  // Stage 8b: Post-process — catch LLM refusal patterns (confidence, no access, no data)
  const refusalRe = /confidence\s+too\s+low|confidence\s+terlalu\s+rendah|tidak.*(?:memiliki\s+akses|bisa\s+mengakses|ada\s+data|bisa\s+menjawab|memiliki\s+cukup|bisa\s+melakukan)|tidak.*(?:akses\s+ke\s+database|shared\s+memory|terhubung)|forbidden\s+actions/i;
  if (refusalRe.test(rawText) && rawText.length < 3000) {
    const match = ctx.message.match(/misi\s*#?(\d+)/i);
    const targetId = match ? parseInt(match[1]) : -1;
    const missionRows = await db.select({
      id: missionsTable.id, status: missionsTable.status, result: missionsTable.result,
    }).from(missionsTable)
      .where(targetId > 0 ? eq(missionsTable.id, targetId) : undefined)
      .orderBy(desc(missionsTable.id)).limit(5).catch(() => []);
    if (missionRows.length > 0) {
      const target = targetId > 0 ? missionRows.find(m => m.id === targetId) : missionRows[0];
      if (target) {
      rawText = `Ringkasan Eksekutif\nMisi #${target.id} berstatus **${target.status}**.\n\nHasil Executive\n${target.result ? target.result.slice(0, 4000) : "Tidak ada output tersimpan."}`;
      if (!pipeline.includes("MissionQuery")) pipeline.push("MissionQuery");
      }
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

  return {
    success: verification.passed && !rawText.startsWith("ERROR:"),
    text,
    decision,
    pipeline,
  };
}

function health() {
  return {
    status: "healthy" as const, uptime: 0, dependencies: [] as any[], version: "1.0.0",
    custom: { directive: "ceo-directive-v1", maturity: "L2" },
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
};
