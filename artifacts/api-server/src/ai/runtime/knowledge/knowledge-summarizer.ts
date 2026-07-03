// ECP-029: Knowledge Summarizer — produces executive summaries from raw artifacts
// Frozen. Generates KnowledgeSummary for Consultant consumption.
// Reduces 2000 documents to ~5000 token summary.

import type { KnowledgeSummary, KnowledgeArtifact, DetectedPattern } from "./knowledge-types";
import { knowledgeManager } from "./knowledge-manager";

function extractKeyInsights(artifacts: KnowledgeArtifact[], patterns: DetectedPattern[]): string[] {
  const insights: string[] = [];

  if (patterns.length > 0) {
    insights.push(`${patterns.length} recurring patterns detected`);
    for (const p of patterns.slice(0, 3)) {
      insights.push(`${p.type}: ${p.description}`);
    }
  }

  const failures = artifacts.filter(a => a.type === "failure");
  const lessons = artifacts.filter(a => a.type === "lesson");

  if (failures.length > lessons.length) {
    insights.push(`Failure rate exceeds learning rate (${failures.length} vs ${lessons.length})`);
  }
  if (lessons.length > 0) {
    insights.push(`${lessons.length} lessons documented`);
  }

  if (insights.length === 0) {
    insights.push("No significant patterns detected yet");
  }

  return insights.slice(0, 5);
}

function computeFailureTrend(artifacts: KnowledgeArtifact[]): "improving" | "stable" | "declining" {
  const recent = artifacts.slice(-20);
  const older = artifacts.slice(0, -20);

  const recentFailures = recent.filter(a => a.type === "failure").length;
  const olderFailures = older.filter(a => a.type === "failure").length;

  if (recentFailures < olderFailures) return "improving";
  if (recentFailures === olderFailures) return "stable";
  return "declining";
}

export function generateSummary(): KnowledgeSummary {
  const artifacts = knowledgeManager.getArtifacts(100);
  const patterns = knowledgeManager.getPatterns();
  const drifts = knowledgeManager.getDrifts();

  const keyInsights = extractKeyInsights(artifacts, patterns);

  const recommendations: string[] = [];
  if (drifts.length > 0) {
    recommendations.push(`${drifts.length} architecture drifts detected — review Foundation alignment`);
  }
  if (keyInsights.some(i => i.includes("failure"))) {
    recommendations.push("Schedule mission review for recurring failures");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue current trajectory — no critical issues detected");
  }

  return {
    generatedAt: new Date().toISOString(),
    artifactCount: artifacts.length,
    newPatterns: patterns,
    activeDrifts: drifts,
    policyConflicts: [],
    keyInsights,
    failureTrend: computeFailureTrend(artifacts),
    recommendations,
    compressionRatio: artifacts.length > 0 ? Math.round(artifacts.length / Math.max(keyInsights.length, 1)) : 20,
  };
}
