// ECP-018: CEO Runtime — Executive Director
// Foundation v2.0 compliant. Single source of truth for CEO.
// Loads CEO_EXECUTIVE_DIRECTIVE.md, CEO_PLAYBOOK.md, CEO_CAPABILITY.md.
// Pipeline: Identity → Semantic → Spec → Verify → Organization → Delegation → LLM → Report
// CEO NEVER writes code, NEVER executes inventory, NEVER deploys.

import { getIdentity } from "../runtime/identity";
import { understand } from "../runtime/semantic-engine";
import { buildSpecV1 } from "../runtime/execution-spec";
import { verify } from "../runtime/verification-engine";
import { organizationEngine } from "../runtime/organization-engine";
import { callDeepSeekWithTools, READ_TOOLS } from "../../routes/ai-helpers";
import { foundationLoader } from "../runtime/foundation-loader";

const CEO_IDENTITY = getIdentity("CEO")!;

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
}

export interface CEOResult {
  success: boolean;
  text: string;
  decision: ExecutiveDecision;
  pipeline: string[];
}

function buildCEOPrompt(directiveContent: string, message: string, delegationSummary: string): string {
  return `Kamu adalah CEO Runtime Engineering OS — Executive Director Lume's Everywhere.

## Executive Directive
${directiveContent.slice(0, 2000)}

## Current Session
Founder: ${message}
Delegation Plan: ${delegationSummary}

## Instructions
1. Analisis permintaan Founder berdasarkan directive di atas.
2. Jika perlu delegasi, sebutkan ke Runtime mana dan kenapa.
3. Berikan Executive Report: Ringkasan → Delegasi → Analisis → Rekomendasi.
4. Bahasa Indonesia profesional. Format terstruktur.
5. JANGAN menulis kode.
6. JANGAN menjalankan inventory.
7. JANGAN menyebut dirimu Claude, Anthropic, atau AI lain.
8. Kamu adalah CEO Engineering OS — bukan AI generik.`;
}

async function execute(ctx: CEOContext): Promise<CEOResult> {
  const pipeline: string[] = [];

  // Stage 1: Identity
  pipeline.push("Identity");
  ctx.onProgress?.("💼 CEO Runtime booting...");

  // Stage 2: Load Executive Directive from Foundation
  pipeline.push("DirectiveLoad");
  let directiveContent = "";
  try {
    const assets = foundationLoader.load();
    const directive = assets.find(a => a.id === "ceo-directive-v1");
    if (directive) {
      directiveContent = directive.content;
    }
  } catch { /* Continue without directive — use identity baseline */ }

  // Stage 3: Semantic Understanding
  pipeline.push("SemanticEngine");
  const contract = await understand(ctx.message);

  // Stage 4: Execution Specification
  pipeline.push("ExecutionSpec");
  const spec = buildSpecV1(contract);

  // Stage 5: Verification
  pipeline.push("Verification");
  const verification = verify(spec);

  // Stage 6: Delegation via Organization Engine
  pipeline.push("OrganizationEngine");
  const delegation = organizationEngine.delegate(ctx.message);
  ctx.onState?.(delegation ? `Didelegasikan ke ${delegation.runtime}` : "Direct");
  const delegationSummary = delegation
    ? `Didelegasikan ke ${delegation.runtime} — ${delegation.reason}`
    : "Diproses langsung oleh CEO Runtime";

  // Stage 7: Decision
  const decision: ExecutiveDecision = {
    goal: spec.objective,
    delegation: delegation ? { runtime: delegation.runtime, reason: delegation.reason } : null,
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
  } else {
    pipeline.push("LLMEngine");
    const systemPrompt = buildCEOPrompt(directiveContent, ctx.message, delegationSummary);
    ctx.onProgress?.("🧠 CEO Runtime menganalisis...");
    try {
      rawText = await callDeepSeekWithTools(
        systemPrompt, ctx.message, ctx.userId, "ceo", READ_TOOLS, 6000,
        (msg) => ctx.onProgress?.(msg),
        (ev) => ctx.onTool?.(ev),
      );
    } catch {
      rawText = "CEO Runtime sedang sibuk. Coba lagi.";
    }
  }

  // Stage 9: Executive Report
  pipeline.push("ExecutiveReport");
  const delegationLine = delegation
    ? `\n> — CEO Runtime · Didelegasikan ke ${delegation.runtime}`
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
