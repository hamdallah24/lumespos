import { foundationLoader } from "../../ai/runtime/foundation-loader";
import { loadKnowledge } from "../../ai/runtime/knowledge-loader";
import { runtimeDomain } from "../../ai/runtime/foundation";
import type { CognitiveTrace } from "../cognition/CognitiveContracts";

export interface AssetTraceStep {
  phase: string;
  assetIds: string[];
  detail: string;
  timestamp: string;
}

export interface AssetTraceReport {
  correlationId: string;
  executive: string;
  query: string;
  steps: AssetTraceStep[];
  cognitiveTrace?: CognitiveTrace;
  durationMs: number;
  assetCount: number;
}

let currentTrace: AssetTraceReport | null = null;
let startTime = 0;

function now(): string {
  return new Date().toISOString();
}

function collectAssetsByType(type: string): string[] {
  try {
    const assets = foundationLoader.load();
    return assets
      .filter(a => a.artifact_type === type || a.domain === type)
      .map(a => a.id);
  } catch {
    return [];
  }
}

export function traceStart(executive: string, query: string): string {
  const correlationId = `trace-${executive}-${Date.now()}`;
  startTime = Date.now();
  currentTrace = {
    correlationId,
    executive,
    query,
    steps: [],
    durationMs: 0,
    assetCount: 0,
  };
  return correlationId;
}

export function traceStep(phase: string, assetIds: string[], detail: string): void {
  if (!currentTrace) return;
  currentTrace.steps.push({
    phase,
    assetIds,
    detail,
    timestamp: now(),
  });
}

export function traceFoundation(): void {
  const ids = collectAssetsByType("foundation");
  traceStep("Foundation", ids, `${ids.length} foundation assets loaded from registry`);
}

export function traceDirective(executive: string): void {
  try {
    const content = runtimeDomain.directive(executive);
    const ids = content?.directive ? [executive.toLowerCase() + "-directive"] : [];
    traceStep("Directive", ids, ids.length > 0 ? `${executive} directive loaded (${content!.directive.length} chars)` : "No directive");
  } catch {
    traceStep("Directive", [], "Directive load failed");
  }
}

export function traceKnowledge(): void {
  try {
    const nodes = loadKnowledge({ strategy: "always" });
    const ids = nodes.map(n => n.id);
    const byDomain = new Map<string, number>();
    for (const n of nodes) byDomain.set(n.domain, (byDomain.get(n.domain) || 0) + 1);
    const domainSummary = [...byDomain.entries()].map(([d, c]) => `${d}:${c}`).join(", ");
    traceStep("Knowledge", ids, `${ids.length} knowledge nodes — ${domainSummary}`);
  } catch {
    traceStep("Knowledge", [], "Knowledge load failed");
  }
}

export function traceMentalModels(ids: string[]): void {
  traceStep("Mental Model", ids, `${ids.length} mental models selected`);
}

export function traceFrameworks(ids: string[]): void {
  traceStep("Framework", ids, `${ids.length} frameworks selected`);
}

export function tracePrompt(ids: string[]): void {
  traceStep("Prompt", ids, `Prompt assembled from ${ids.length} assets`);
}

export function traceLLM(): void {
  traceStep("LLM", [], "LLM payload prepared");
}

export function traceDecision(decisionId: string, detail: string): void {
  traceStep("Decision", [decisionId], detail);
}

export function traceEnd(cognitiveTrace?: CognitiveTrace): AssetTraceReport | null {
  if (!currentTrace) return null;
  currentTrace.cognitiveTrace = cognitiveTrace;
  currentTrace.durationMs = Date.now() - startTime;
  currentTrace.assetCount = currentTrace.steps.reduce((acc, s) => acc + s.assetIds.length, 0);
  const report = currentTrace;
  currentTrace = null;
  return report;
}

export function formatAssetTrace(report: AssetTraceReport): string {
  const lines: string[] = [];
  lines.push(`\n${"═".repeat(50)}`);
  lines.push(`  Asset Trace: ${report.executive}`);
  lines.push(`  Query: ${report.query.slice(0, 80)}`);
  lines.push(`  Correlation: ${report.correlationId}`);
  lines.push(`  Total Assets: ${report.assetCount}`);
  lines.push(`  Duration: ${report.durationMs}ms`);
  lines.push(`${"═".repeat(50)}`);

  for (const step of report.steps) {
    const assetSummary = step.assetIds.length > 3
      ? step.assetIds.slice(0, 3).join(", ") + ` +${step.assetIds.length - 3} more`
      : step.assetIds.join(", ") || "(none)";
    lines.push(`\n  ↓ ${step.phase}`);
    lines.push(`    Assets: [${assetSummary}]`);
    lines.push(`    Detail: ${step.detail}`);
  }

  if (report.cognitiveTrace) {
    lines.push(`\n  ↓ Cognitive Pipeline`);
    for (const step of report.cognitiveTrace.steps) {
      const icon = step.status === "success" ? "✓" : "✗";
      lines.push(`    ${icon} ${step.phase} (${step.durationMs}ms)`);
    }
    lines.push(`    Status: ${report.cognitiveTrace.status}`);
  }

  lines.push(`\n${"═".repeat(50)}`);
  return lines.join("\n");
}

export function getCurrentTrace(): AssetTraceReport | null {
  return currentTrace;
}
