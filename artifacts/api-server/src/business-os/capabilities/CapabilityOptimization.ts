import type { BusinessCapability, CapabilityAction, CapabilityRecommendationResult, CapabilityStatus } from "./types";
import * as CapabilityRegistry from "./CapabilityRegistry";
import * as CapabilityGraph from "./CapabilityGraph";
import * as CapabilityRecommendation from "./CapabilityRecommendation";

export interface CapabilityPerformance {
  capabilityId: string;
  name: string;
  domain: string;
  ownerExecutive: string;
  status: CapabilityStatus;
  executionCount: number;
  successRate: number;
  avgConfidence: number;
  avgRiskScore: number;
  dependencyCount: number;
  dependentCount: number;
  criticalPathCount: number;
  priorityScore: number;
}

const RISK_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 5 };

export class CapabilityOptimization {
  private scores: Map<string, CapabilityPerformance> = new Map();
  private executionHistory: Map<string, { count: number; successes: number; totalConfidence: number }> = new Map();

  recordExecution(capabilityId: string, success: boolean, confidence: number): void {
    const existing = this.executionHistory.get(capabilityId) ?? { count: 0, successes: 0, totalConfidence: 0 };
    existing.count++;
    if (success) existing.successes++;
    existing.totalConfidence += confidence;
    this.executionHistory.set(capabilityId, existing);
  }

  calculateScore(capabilityId: string): CapabilityPerformance {
    const cap = CapabilityRegistry.getCapabilityById(capabilityId);
    if (!cap) throw new Error(`Capability not found: ${capabilityId}`);

    const history = this.executionHistory.get(capabilityId) ?? { count: 0, successes: 0, totalConfidence: 0 };
    const executionCount = history.count;
    const successRate = executionCount > 0 ? history.successes / history.count : 1.0;
    const avgConfidence = executionCount > 0 ? history.totalConfidence / history.count : 1.0;

    const avgRisk = cap.supportedActions.length > 0
      ? cap.supportedActions.reduce((s, a) => s + (RISK_SCORE[a.riskLevel] ?? 1), 0) / cap.supportedActions.length
      : 1;

    const deps = CapabilityRegistry.getCapabilityById(capabilityId)?.dependencies ?? [];
    const dependencyCount = deps.length;

    const graph = CapabilityGraph.buildGraph();
    const dependentCount = graph.edges.filter(e => e.from === capabilityId).length;
    const criticalPathCount = CapabilityGraph.getCriticalPath(capabilityId).length;

    const statusScore = cap.status === "active" ? 1.0 : cap.status === "beta" ? 0.7 : 0.3;
    const executionScore = successRate * 0.3 + avgConfidence * 0.2;
    const importanceScore = Math.min(1, (dependentCount + 1) / 10) * 0.2;
    const criticalScore = Math.min(1, criticalPathCount) * 0.2;
    const riskPenalty = Math.min(1, (avgRisk - 1) / 4) * 0.1;

    const priorityScore = Math.round((statusScore * 0.2 + executionScore + importanceScore + criticalScore - riskPenalty) * 100);

    const performance: CapabilityPerformance = {
      capabilityId, name: cap.name, domain: cap.domain,
      ownerExecutive: cap.ownerExecutive, status: cap.status,
      executionCount, successRate: Math.round(successRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      avgRiskScore: Math.round(avgRisk * 100) / 100,
      dependencyCount, dependentCount, criticalPathCount,
      priorityScore: Math.max(0, Math.min(100, priorityScore)),
    };

    this.scores.set(capabilityId, performance);
    return performance;
  }

  calculateAllScores(): CapabilityPerformance[] {
    const allCaps = CapabilityRegistry.getAllCapabilities();
    for (const cap of allCaps) this.calculateScore(cap.id);
    return this.getPrioritizedList();
  }

  getPrioritizedList(domain?: string): CapabilityPerformance[] {
    let scores = [...this.scores.values()];
    if (domain) scores = scores.filter(s => s.domain === domain);
    return scores.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  getTopCapabilities(limit: number = 5, domain?: string): CapabilityPerformance[] {
    return this.getPrioritizedList(domain).slice(0, limit);
  }

  getRecommendations(executive: string, objective: string, topN: number = 3): CapabilityPerformance[] {
    const caps = CapabilityRegistry.getCapabilitiesByExecutive(executive);
    const scores = caps.map(c => this.scores.get(c.id)).filter((s): s is CapabilityPerformance => s !== undefined);
    return scores.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, topN);
  }

  getScore(capabilityId: string): CapabilityPerformance | undefined {
    return this.scores.get(capabilityId);
  }

  printReport(): string {
    const sorted = this.getPrioritizedList();
    const lines: string[] = [];
    lines.push("Capability Optimization Report");
    lines.push("─".repeat(80));
    lines.push("Rank  ID                     Name                    Score  Rate  Exec  Domain");
    lines.push("─".repeat(80));
    sorted.forEach((s, i) => {
      lines.push(
        `#${(i + 1).toString().padStart(2)}   ${s.capabilityId.padEnd(22)} ` +
        `${s.name.padEnd(22)} ${String(s.priorityScore).padStart(4)}  ` +
        `${(s.successRate * 100).toFixed(0).padStart(3)}%  ${String(s.executionCount).padStart(4)}  ${s.domain}`
      );
    });
    lines.push("─".repeat(80));
    return lines.join("\n");
  }
}
