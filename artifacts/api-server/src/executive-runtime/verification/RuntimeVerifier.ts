import { foundationLoader } from "../../ai/runtime/foundation-loader";
import { loadKnowledge } from "../../ai/runtime/knowledge-loader";
import { runtimeDomain } from "../../ai/runtime/foundation";
import { getIdentity } from "../../ai/runtime/identity";
import { assemble } from "../../ai/runtime/prompt-assembler";
import { CognitiveEngine } from "../cognition/CognitiveEngine";
import { getTracesByRole } from "../cognition/CognitiveTraceStore";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { EXECUTIVE_OUTPUT_SCHEMA } from "../../routes/ai-prompts";

export interface VerificationStep {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
}

export interface VerificationReport {
  executive: string;
  steps: VerificationStep[];
  passed: number;
  failed: number;
  overall: "PASS" | "FAIL";
  timestamp: string;
}

const EXECUTIVES = ["CEO", "CTO", "COO", "CFO", "CMO", "CAIO", "CKO", "CHRO"] as const;

function aiRoot(): string {
  const cwd = process.cwd();
  if (cwd.includes("api-server")) return resolve(cwd, "..", "..", ".ai");
  return resolve(cwd, ".ai");
}

export async function verifyExecutive(role: string): Promise<VerificationReport> {
  const steps: VerificationStep[] = [];
  const r = role.toUpperCase();

  const pass = (name: string, detail: string) => steps.push({ name, status: "PASS", detail });
  const fail = (name: string, detail: string) => steps.push({ name, status: "FAIL", detail });
  const check = (name: string, condition: boolean, detail: string) =>
    condition ? pass(name, detail) : fail(name, detail);

  // 1. Registry Loaded
  try {
    const registryPath = join(aiRoot(), "registry", "manifest.json");
    check("Registry", existsSync(registryPath), `manifest.json ${existsSync(registryPath) ? "found" : "MISSING"}`);
  } catch (e: any) {
    fail("Registry", e.message);
  }

  // 2. Foundation Loaded — assets from registry
  try {
    const assets = foundationLoader.load();
    check("Foundation", assets.length > 0, `${assets.length} assets loaded from registry`);
    const foundationAssets = assets.filter(a => a.artifact_type === "foundation");
    check("Foundation Assets", foundationAssets.length > 0, `${foundationAssets.length} foundation assets`);
  } catch (e: any) {
    fail("Foundation", `FoundationLoader failed: ${e.message}`);
  }

  // 3. Directive Loaded — per executive
  try {
    const directiveContent = runtimeDomain.directive(r);
    if (directiveContent && directiveContent.directive) {
      pass("Directive", `${r} directive loaded (${directiveContent.directive.length} chars)`);
    } else {
      fail("Directive", `No directive content for ${r}`);
    }
  } catch (e: any) {
    fail("Directive", e.message);
  }

  // 4. Knowledge Loaded
  try {
    const knowledge = loadKnowledge({ strategy: "always" });
    check("Knowledge", knowledge.length > 0, `${knowledge.length} knowledge nodes loaded`);
    if (knowledge.length > 0) {
      const byDomain = new Map<string, number>();
      for (const n of knowledge) {
        byDomain.set(n.domain, (byDomain.get(n.domain) || 0) + 1);
      }
      pass("Knowledge Assets", [...byDomain.entries()].map(([d, c]) => `${d}:${c}`).join(", "));
    }
  } catch (e: any) {
    fail("Knowledge", `KnowledgeLoader failed: ${e.message}`);
  }

  // 5. Prompt Loaded — check global-prompt exists
  try {
    const assets = foundationLoader.load();
    const globalPrompt = assets.find(a => a.id === "global-prompt");
    const execPrompt = assets.find(a => a.id === `${r.toLowerCase()}-prompt`);
    check("Global Prompt", !!globalPrompt, globalPrompt ? `Found: ${globalPrompt.title}` : "MISSING");
    check("Executive Prompt", !!execPrompt, execPrompt ? `Found: ${execPrompt.title}` : "not required (uses directive)");
  } catch (e: any) {
    fail("Prompt", e.message);
  }

  // 6. Cognitive Engine — think()
  try {
    const engine = new CognitiveEngine();
    const result = await engine.think({
      role: r as any,
      query: "Verify runtime chain",
      context: { verification: true },
    });
    check("Cognitive Engine", !!result.decision, `Decision confidence: ${result.decision?.confidence?.overall ?? "N/A"}`);
    check("Cognitive Trace", !!result.trace, `${result.trace.steps.length} steps, status: ${result.trace.status}`);
  } catch (e: any) {
    fail("Cognitive Engine", e.message);
  }

  // 7. Prompt Assembly
  try {
    const identity = getIdentity(r);
    check("Identity", !!identity, identity ? `${identity.role} identity loaded` : "MISSING");

    if (identity) {
      const directiveContent = runtimeDomain.directive(r);
      const directive = directiveContent?.directive || "";
      const prompt = assemble({
        identity,
        directive,
        outputSchema: EXECUTIVE_OUTPUT_SCHEMA,
        maxTokens: 4000,
        mode: r.toLowerCase(),
      });
      check("Prompt Assembly", prompt.length > 100, `${prompt.length} chars assembled`);
      check("Directive in Prompt", prompt.includes("Executive Directive") || directive.length === 0,
        directive.length > 0 ? "Directive block included" : "No directive (empty)");
    }
  } catch (e: any) {
    fail("Prompt Assembly", e.message);
  }

  // 8. Trace Recorded
  try {
    const traces = getRecentTraces(5);
    const roleTraces = getTracesByRole(r as any, 5);
    check("Trace Recorded", roleTraces.length > 0, roleTraces.length > 0 ? `${roleTraces.length} traces found for ${r}` : `No traces for ${r} (may need active usage)`);
  } catch (e: any) {
    fail("Trace", e.message);
  }

  const passed = steps.filter(s => s.status === "PASS").length;
  const failed = steps.filter(s => s.status === "FAIL").length;
  const overall = failed === 0 ? "PASS" : "FAIL";

  return {
    executive: r,
    steps,
    passed,
    failed,
    overall,
    timestamp: new Date().toISOString(),
  };
}

export async function verifyAll(): Promise<VerificationReport[]> {
  return Promise.all(EXECUTIVES.map(exec => verifyExecutive(exec)));
}

export function formatReport(report: VerificationReport): string {
  const lines: string[] = [];
  lines.push(`\n${report.executive}`);
  for (const step of report.steps) {
    const icon = step.status === "PASS" ? "✓" : "✗";
    lines.push(`  ${icon} ${step.name.padEnd(20)} ${step.status}  ${step.detail}`);
  }
  lines.push(`  ─${"".padEnd(35, "─")}`);
  lines.push(`  Overall: ${report.overall === "PASS" ? "✓ PASS" : "✗ FAIL"} (${report.passed}/${report.passed + report.failed})`);
  return lines.join("\n");
}

export function formatAllReports(reports: VerificationReport[]): string {
  const lines = reports.map(r => formatReport(r));
  const totalPassed = reports.reduce((s, r) => s + r.passed, 0);
  const totalFailed = reports.reduce((s, r) => s + r.failed, 0);
  const allPassed = reports.every(r => r.overall === "PASS");
  lines.push(`\n${"═".repeat(50)}`);
  lines.push(`TOTAL: ${totalPassed}/${totalPassed + totalFailed} passed, ${totalFailed} failed`);
  lines.push(`ALL EXECUTIVES: ${allPassed ? "✓ PASS" : "✗ FAIL"}`);
  lines.push("═".repeat(50));
  return lines.join("\n");
}
