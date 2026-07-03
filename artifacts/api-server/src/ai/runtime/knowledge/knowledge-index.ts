// ECP-029: Knowledge Index — context index for Consultant Runtime
// Frozen. Produces compact context index for fast Consultant consumption.
// Target: 5000 tokens or less.

import type { ContextIndex } from "./knowledge-types";
import { knowledgeManager } from "./knowledge-manager";
import { generateSummary } from "./knowledge-summarizer";

export function generateIndex(maxTokens = 5000): ContextIndex {
  const summary = generateSummary();
  const artifacts = knowledgeManager.getArtifacts(20);
  const patterns = knowledgeManager.getPatterns();

  const topIssues = patterns
    .filter(p => p.severity === "high" || p.severity === "critical")
    .map(p => p.description)
    .slice(0, 3);

  const recentLearnings = artifacts
    .filter(a => a.type === "lesson" || a.type === "insight")
    .map(a => a.content.slice(0, 200))
    .slice(0, 5);

  const activeRisks = summary.activeDrifts
    .filter(d => d.driftLevel === "significant" || d.driftLevel === "critical")
    .map(d => `${d.domain}: ${d.expected.slice(0, 100)} vs ${d.actual.slice(0, 100)}`)
    .slice(0, 3);

  const recommendedContext: string[] = [];
  if (summary.activeDrifts.length > 0) recommendedContext.push("Review Foundation architecture documents");
  if (summary.failureTrend === "declining") recommendedContext.push("Review recent failure patterns");
  recommendedContext.push(summary.recommendations[0] || "Continue monitoring");

  const rawContent = [
    ...topIssues, ...recentLearnings, ...activeRisks, ...recommendedContext,
  ].join(" ");

  return {
    generatedAt: new Date().toISOString(),
    topIssues: topIssues.length > 0 ? topIssues : ["No critical issues detected"],
    recentLearnings: recentLearnings.length > 0 ? recentLearnings : ["Awaiting first mission outputs"],
    activeRisks: activeRisks.length > 0 ? activeRisks : ["No active risks"],
    knowledgeGaps: summary.recommendations.filter(r => r.includes("missing") || r.includes("gap")),
    recommendedContext,
    totalTokenEstimate: Math.ceil(rawContent.length / 4),
  };
}
