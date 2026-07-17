import { foundationLoader } from "../../ai/runtime/foundation-loader";
import { loadKnowledge } from "../../ai/runtime/knowledge-loader";
import { runtimeDomain } from "../../ai/runtime/foundation";
import { getIdentity } from "../../ai/runtime/identity";
import { assemble } from "../../ai/runtime/prompt-assembler";
import { CognitiveEngine } from "../cognition/CognitiveEngine";
import { getTracesByRole } from "../cognition/CognitiveTraceStore";
import { EXECUTIVE_OUTPUT_SCHEMA } from "../../routes/ai-prompts";

export interface IntegrationCategory {
  name: string;
  status: "ALIVE" | "DEAD";
  detail: string;
}

export interface ExecutiveScore {
  executive: string;
  categories: IntegrationCategory[];
  score: number;
  passed: number;
  total: number;
}

const CATEGORIES = [
  "Registry", "Foundation", "Directive", "Knowledge",
  "Prompt", "Cognition", "Trace", "Decision",
] as const;

export async function scoreExecutive(role: string): Promise<ExecutiveScore> {
  const r = role.toUpperCase();
  const categories: IntegrationCategory[] = [];

  const alive = (name: string, detail: string) => categories.push({ name, status: "ALIVE", detail });
  const dead = (name: string, detail: string) => categories.push({ name, status: "DEAD", detail });

  // 1. Registry
  try {
    const assets = foundationLoader.load();
    alive("Registry", `${assets.length} assets from registry`);
  } catch (e: any) {
    dead("Registry", `FoundationLoader failed: ${e.message}`);
  }

  // 2. Foundation
  try {
    const assets = foundationLoader.load();
    const fAssets = assets.filter(a => a.artifact_type === "foundation");
    if (fAssets.length > 0) {
      alive("Foundation", `${fAssets.length} foundation assets`);
    } else {
      dead("Foundation", "No foundation assets found");
    }
  } catch (e: any) {
    dead("Foundation", e.message);
  }

  // 3. Directive
  try {
    const content = runtimeDomain.directive(r);
    if (content?.directive) {
      alive("Directive", `${r} directive (${content.directive.length} chars)`);
    } else {
      dead("Directive", `No directive for ${r}`);
    }
  } catch (e: any) {
    dead("Directive", e.message);
  }

  // 4. Knowledge
  try {
    const nodes = loadKnowledge({ strategy: "always" });
    if (nodes.length > 0) {
      alive("Knowledge", `${nodes.length} knowledge nodes`);
    } else {
      dead("Knowledge", "No knowledge nodes");
    }
  } catch (e: any) {
    dead("Knowledge", e.message);
  }

  // 5. Prompt
  try {
    const identity = getIdentity(r);
    const directiveContent = runtimeDomain.directive(r);
    if (identity) {
      const prompt = assemble({
        identity,
        directive: directiveContent?.directive || "",
        outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
        maxTokens: 4000,
        mode: r.toLowerCase(),
      });
      alive("Prompt", `${prompt.length} chars assembled`);
    } else {
      dead("Prompt", `No identity for ${r}`);
    }
  } catch (e: any) {
    dead("Prompt", e.message);
  }

  // 6. Cognition
  try {
    const engine = new CognitiveEngine();
    const result = await engine.think({
      role: r as any,
      query: "Integration check",
      context: { integration: true },
    });
    alive("Cognition", `Decision confidence: ${result.decision?.confidence?.overall ?? "N/A"}`);
  } catch (e: any) {
    dead("Cognition", e.message);
  }

  // 7. Trace
  try {
    const traces = getTracesByRole(r as any, 1);
    if (traces.length > 0) {
      alive("Trace", `${traces.length} traces for ${r}`);
    } else {
      dead("Trace", `No traces for ${r} (cognition may not have recorded yet)`);
    }
  } catch (e: any) {
    dead("Trace", e.message);
  }

  // 8. Decision
  try {
    const engine = new CognitiveEngine();
    const result = await engine.think({
      role: r as any,
      query: "Decision verification",
      context: { verify: true },
    });
    if (result.decision?.reasoning) {
      alive("Decision", `Decision: ${(result.decision as any).action || result.decision.reasoning.slice(0, 80)}`);
    } else {
      dead("Decision", "No decision generated");
    }
  } catch (e: any) {
    dead("Decision", e.message);
  }

  const passed = categories.filter(c => c.status === "ALIVE").length;
  const total = categories.length;
  const score = Math.round((passed / total) * 100);

  return { executive: r, categories, score, passed, total };
}

export async function scoreAll(): Promise<ExecutiveScore[]> {
  const execs = ["CEO", "CTO", "COO", "CFO", "CMO", "CAIO", "CKO", "CHRO"];
  return Promise.all(execs.map(e => scoreExecutive(e)));
}

export function formatScoreCard(score: ExecutiveScore): string {
  const lines: string[] = [];
  lines.push(`\n${score.executive}`);
  for (const cat of score.categories) {
    const icon = cat.status === "ALIVE" ? "●" : "○";
    lines.push(`  ${icon} ${cat.name.padEnd(15)} ${cat.status}  ${cat.detail}`);
  }
  lines.push(`  ─${"".padEnd(35, "─")}`);
  lines.push(`  Integration Score: ${score.score}% (${score.passed}/${score.total})`);
  return lines.join("\n");
}

export function formatAllScoreCards(scores: ExecutiveScore[]): string {
  const lines = scores.map(s => formatScoreCard(s));
  const overallPassed = scores.reduce((s, sc) => s + sc.passed, 0);
  const overallTotal = scores.reduce((s, sc) => s + sc.total, 0);
  const overallScore = Math.round((overallPassed / overallTotal) * 100);
  const allAlive = scores.every(s => s.score === 100);
  lines.push(`\n${"═".repeat(50)}`);
  lines.push(`  EXECUTIVE INTEGRATION SCORE: ${overallScore}%`);
  lines.push(`  Overall: ${overallPassed}/${overallTotal} categories ALIVE`);
  lines.push(`  Status: ${allAlive ? "✓ ALL INTEGRATED" : "⚠ GAPS DETECTED"}`);
  lines.push(`${"═".repeat(50)}`);
  return lines.join("\n");
}
