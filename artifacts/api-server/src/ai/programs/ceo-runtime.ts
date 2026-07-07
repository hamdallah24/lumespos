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
import { foundationLoader } from "../runtime/foundation-loader";
import { buildFoundationContext } from "../runtime/context-builder";
import type { ExecutionContract } from "../runtime/execution/execution-manifest";

const CEO_IDENTITY = getIdentity("CEO")!;

function getDirective(): string {
  const provider = getFoundationProvider();
  const content = provider.getDirective("CEO");
  return content || "";
}

/** Load Foundation docs relevant to query and distill into a concise technical brief for CTO */
async function createTechBrief(query: string, domain: string, entities: string[]): Promise<string> {
  const targets = [domain, ...entities].filter(Boolean).join(" ");
  const assets = foundationLoader.load();
  const pkg = buildFoundationContext(assets, "ceo", 4000);
  if (pkg.assets.length === 0) return "";

  const docContext = pkg.assets
    .filter(a => !targets || targets.split(" ").some(t => t.length > 2 && a.id.toLowerCase().includes(t.toLowerCase()) || a.title.toLowerCase().includes(t.toLowerCase())))
    .slice(0, 3)
    .map(a => `[${a.id}] ${a.title}\n${a.content.slice(0, 1000)}`)
    .join("\n\n---\n\n");

  if (!docContext) return "";

  const briefPrompt = `Anda adalah CEO Engineering OS. Berdasarkan dokumen Foundation berikut dan query user, buat TECHNICAL BRIEF (maks 300 kata) yang merangkum poin-poin penting untuk dieksekusi oleh CTO.

Query User: ${query}

Dokumen Relevan:
${docContext}

Output format:
## Technical Brief
[Ringkasan 2-3 kalimat tentang apa yang perlu dilakukan]

## Key Requirements
- [Poin teknis 1]
- [Poin teknis 2]
- [Poin teknis 3]

## Dokumen Referensi
[ID Dokumen] — [Judul]`;

  try {
    return await callDeepSeek(briefPrompt, query, 0, "ceo", 500);
  } catch {
    return "";
  }
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
  
  // Smart Dispatch: CEO handles greetings directly. Everything else is delegated.
  const shouldDispatch = spec.intent !== "greeting" && executives.length > 0;

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
    // ECP-047: Multi-executive dispatch → collect → CEO synthesis
    pipeline.push("ExecutiveCollaboration");

    // CEO crafts structured mission: translate user intent → technical prompt
    const missionParts = [
      `[Executive Mission]`,
      `Objective: ${spec.objective}`,
      `Domain: ${spec.domain}`,
    ];
    if (spec.targetFiles.length > 0) missionParts.push(`Target Files: ${spec.targetFiles.join(", ")}`);
    if (spec.entities.length > 0) missionParts.push(`Keywords: ${spec.entities.join(", ")}`);
    if (spec.semanticReasoning) missionParts.push(`Reasoning: ${spec.semanticReasoning}`);
    if (spec.expectedOutcome) missionParts.push(`Expected: ${spec.expectedOutcome}`);

    // Load relevant Foundation docs and distill into concise technical brief
    ctx.onProgress?.("📖 Merangkum dokumen Foundation...");
    const techBrief = await createTechBrief(ctx.message, spec.domain, spec.entities);
    if (techBrief) missionParts.push(`\n## Technical Brief (dari Foundation)\n${techBrief}`);

    missionParts.push(`\nUser Query: ${ctx.message}`);

    const missionPrompt = missionParts.join("\n");
    const result = await executiveCollaboration.executeMission(
      executives, ctx, missionPrompt,
    );

    pipeline.push("CEOSynthesis");
    ctx.onState?.("Synthesizing");
    const synthesisPrompt = assemble({
      identity: CEO_IDENTITY,
      directive: directiveContent,
      decision: { ...decision, executiveResults: result.executiveResults },
      outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
      context: result.synthesisContext,
      maxTokens: 8000,
      mode: "ceo",
    });
    try {
      rawText = await callDeepSeek(synthesisPrompt, ctx.message, ctx.userId, "ceo", 4000);
    } catch {
      rawText = "CEO Runtime sedang sibuk. Coba lagi.";
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
  const delegationLine = shouldDispatch
    ? `\n> — CEO Runtime · Didispatch ke ${executives.map((e: { runtime: string }) => e.runtime).join(", ")}`
    : executives.length > 0
      ? `\n> — CEO Runtime · Didelegasikan ke ${executives[0].runtime}`
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
