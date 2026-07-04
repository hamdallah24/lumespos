// ECP-046 Sprint 4: Quality Engine
// Measures organization quality. Trends, alerts, benchmarks.
// Feeds improvement engine and risk engine.

import type { QualityMetrics, MetricTrend, QualityAlert, Severity } from "./governance-types";
import { learningEngine } from "../learning/learning-engine";
import { knowledgeGraph } from "../learning/knowledge-graph";
import { organizationIntelligence } from "../intelligence/organization-intelligence";

export class QualityEngine {

  private history: number[] = []; // Rolling org scores

  /** Evaluate organization quality */
  evaluate(): QualityMetrics {
    const learnStats = learningEngine.stats();
    const graphStats = knowledgeGraph.stats();
    const intelStats = organizationIntelligence.stats();

    // Compute scores
    const successRate = learnStats.organization.successRate;
    const failureRate = learnStats.organization.failureRate;
    const avgConfidence = graphStats.avgConfidence;
    const knowledgeReinforcement = graphStats.avgReinforced;
    const consensusAccuracy = intelStats.consensus.unanimousDecisions;

    const orgScore = this.computeOrgScore(successRate, graphStats.totalNodes, graphStats.avgConfidence, graphStats.totalLinks);
    this.history.push(orgScore);
    if (this.history.length > 50) this.history.shift();

    // Detect trends
    const trends: MetricTrend[] = this.detectTrends(orgScore, successRate, graphStats.totalNodes, graphStats.avgConfidence);

    // Generate alerts
    const alerts: QualityAlert[] = this.generateAlerts(
      orgScore, successRate, failureRate, avgConfidence, trends
    );

    return {
      organizationScore: orgScore,
      successRate,
      failureRate,
      avgConfidence,
      knowledgeReinforcement,
      consensusAccuracy,
      avgDuration: 0,
      tokenEfficiency: 0,
      trends,
      alerts,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /** Compute organization quality score (0-100) */
  private computeOrgScore(successRate: number, nodes: number, confidence: number, links: number): number {
    let score = 0;
    score += successRate * 0.35;
    score += Math.min(100, nodes * 2) * 0.2;
    score += confidence * 0.25;
    score += Math.min(100, links * 5) * 0.2;
    return Math.round(score);
  }

  private detectTrends(orgScore: number, successRate: number, nodes: number, confidence: number): MetricTrend[] {
    const trends: MetricTrend[] = [];
    const recent = this.history.slice(-5);

    if (this.history.length >= 5) {
      const prevAvg = this.history.slice(-10, -5).reduce((s, v) => s + v, 0) / Math.max(1, this.history.slice(-10, -5).length);
      const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;

      trends.push({
        metric: "organization_score",
        values: recent,
        direction: recentAvg > prevAvg ? "UP" : recentAvg < prevAvg ? "DOWN" : "FLAT",
        threshold: 60,
        breached: recentAvg < 60,
      });
    }

    trends.push({
      metric: "success_rate",
      values: [successRate],
      direction: successRate >= 70 ? "UP" : successRate >= 40 ? "FLAT" : "DOWN",
      threshold: 70,
      breached: successRate < 50,
    });

    return trends;
  }

  private generateAlerts(
    orgScore: number, successRate: number, failureRate: number,
    confidence: number, trends: MetricTrend[],
  ): QualityAlert[] {
    const alerts: QualityAlert[] = [];
    const now = new Date().toISOString();

    if (orgScore < 50) {
      alerts.push({ metric: "organization_score", message: `Org score critical: ${orgScore}/100`, severity: "CRITICAL", detectedAt: now });
    } else if (orgScore < 65) {
      alerts.push({ metric: "organization_score", message: `Org score declining: ${orgScore}/100`, severity: "HIGH", detectedAt: now });
    }

    if (successRate < 40) {
      alerts.push({ metric: "success_rate", message: `Mission success rate low: ${successRate}%`, severity: "HIGH", detectedAt: now });
    }

    if (failureRate > 40) {
      alerts.push({ metric: "failure_rate", message: `Mission failure rate high: ${failureRate}%`, severity: "HIGH", detectedAt: now });
    }

    if (confidence < 50) {
      alerts.push({ metric: "confidence", message: `Average confidence low: ${confidence}%`, severity: "MEDIUM", detectedAt: now });
    }

    return alerts;
  }
}

export const qualityEngine = new QualityEngine();
