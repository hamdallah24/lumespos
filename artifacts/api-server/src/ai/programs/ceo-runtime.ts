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
  const executives = organizationEngine.delegateAll(ctx.message);
  const shouldDispatch = executives.length > 1
    || (executives.length === 1 && !executives[0].fallback);

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
    const result = await executiveCollaboration.executeMission(
      executives, ctx, spec.objective,
    );

    pipeline.push("CEOSynthesis");
    ctx.onState?.("Synthesizing");
    const synthesisPrompt = assemble({
      identity: CEO_IDENTITY,
      directive: directiveContent,
      decision: { ...decision, executiveResults: result.executiveResults },
      outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
      context: result.synthesisContext,
      maxTokens: 4000,
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
      maxTokens: 4000,
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
