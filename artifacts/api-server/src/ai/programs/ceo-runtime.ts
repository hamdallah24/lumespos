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
import { aiQueue } from "../../services/ai-queue";

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

  // Stage 1: Identity
  pipeline.push("Identity");
  ctx.onProgress?.("💼 CEO Runtime booting...");

  // ── Approval Handler: CTO Implementation Plan review ──
  if (ctx.message.startsWith("[CEO APPROVAL]")) {
    pipeline.push("ApprovalHandler");
    ctx.onProgress?.("📋 Meninjau rencana implementasi CTO...");

    const directiveContent = getDirective();
    const systemPrompt = assemble({
      identity: CEO_IDENTITY,
      directive: directiveContent,
      outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
      maxTokens: 2000,
      mode: "ceo",
    });

    try {
      const rawText = await callDeepSeek(systemPrompt, ctx.message, ctx.userId, "ceo", 1000);
      const approved = rawText.toUpperCase().includes("APPROVED") || rawText.toUpperCase().includes("SETUJUI");
      return {
        success: true,
        text: approved ? `APPROVED: ${rawText}` : `REJECTED: ${rawText}`,
        decision: {
          goal: "approve_implementation_plan",
          delegation: null,
          priority: "normal",
          risk: "low",
          reasoning: "CTO implementation plan review",
          expectedOutcome: approved ? "CTO will proceed with implementation" : "CTO will conclude without writing files",
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
  const directiveContent = getDirective();

  // Stage 3: Semantic Understanding
  pipeline.push("SemanticEngine");
  const contract = await understand(ctx.message, ctx.userId);

  // Stage 4: Execution Specification
  pipeline.push("ExecutionSpec");
  const spec = buildSpecV1(contract);

  // Stage 5: Verification
  pipeline.push("Verification");
  const verification = verify(spec);

  // Stage 6: Delegation via Organization Engine
  pipeline.push("OrganizationEngine");
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
  if (!verification.passed) {
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
      const missionId = await aiMissionService.create(
        ctx.userId,
        spec.objective || ctx.message.slice(0, 100),
        ctx.message,
        executives[0]?.runtime || "cto",
        spec.estimatedComplexity,
      );
      await aiMissionService.transition(missionId, "PLANNING");
      aiQueue.enqueue({ missionId, userId: ctx.userId, message: ctx.message, mode: executives[0]?.runtime || "cto" });
      await aiMissionService.transition(missionId, "DELEGATED");
      rawText = `✅ **Misi #${missionId} dibuat** berdasarkan diskusi kita. Misi sedang diproses, hasil akan muncul di chat ini otomatis.`;
    } else {
      // Chat biasa — CEO diskusi dulu, misi dibuat hanya saat user bilang "buat misi"
      pipeline.push("PromptAssembly");
      const systemPrompt = assemble({
        identity: CEO_IDENTITY,
        directive: directiveContent,
        decision,
        outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
        maxTokens: 8000,
        mode: "ceo",
      });
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
    // ECP-039: NO toolRules — CEO is REASONING mode. No tools.
    const systemPrompt = assemble({
      identity: CEO_IDENTITY,
      directive: directiveContent,
      decision,
      outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
      maxTokens: 8000,
      mode: "ceo",
    });
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

  // Stage 9: Executive Report
  pipeline.push("ExecutiveReport");
  const delegationLine = rawText.includes("Misi #")
    ? `\n> — CEO Runtime · Misi dikirim ke ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`
    : "\n> — CEO Runtime · Direct";
  const text = `## Executive Report\n\n${rawText}\n${delegationLine}`;

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
