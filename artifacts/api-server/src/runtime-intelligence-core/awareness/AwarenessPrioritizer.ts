import type { AwarenessSignal, AwarenessBrief, BusinessSituation, SystemSituation } from './AwarenessTypes';
import { OverallHealth } from './AwarenessTypes';
import { AwarenessGraphBuilder } from './AwarenessGraph';

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export class AwarenessPrioritizer {
  private graphBuilder = new AwarenessGraphBuilder();

  prioritize(signals: AwarenessSignal[]): {
    criticalSignals: AwarenessSignal[];
    warnings: AwarenessSignal[];
    ordered: AwarenessSignal[];
  } {
    const enriched = signals.map(s => ({
      ...s,
      freshness: (Date.now() - new Date(s.timestamp).getTime() > s.ttlMs) ? 'stale' as const : 'current' as const,
    }));

    const ordered = enriched.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      if (a.contradiction && !b.contradiction) return -1;
      if (!a.contradiction && b.contradiction) return 1;
      return (b.signalConfidence * b.sourceConfidence) - (a.signalConfidence * a.sourceConfidence);
    });

    return {
      criticalSignals: ordered.filter(s => s.severity === 'critical'),
      warnings: ordered.filter(s => s.severity === 'warning'),
      ordered,
    };
  }

  buildBrief(
    ordered: AwarenessSignal[],
    criticalSignals: AwarenessSignal[],
    warnings: AwarenessSignal[],
    businessSituation: BusinessSituation,
    systemSituation: SystemSituation,
  ): AwarenessBrief {
    const contradictionCount = ordered.filter(s => s.contradiction).length;
    const staleCount = ordered.filter(s => s.freshness === 'stale').length;
    const sourceCount = new Set(ordered.map(s => s.origin)).size;
    const collectedCount = ordered.filter(s => s.sourceConfidence > 0).length;

    const overallHealth = this.calcOverallHealth(criticalSignals.length, warnings.length, contradictionCount);
    const overallConfidence = this.calcOverallConfidence(ordered, businessSituation, systemSituation);
    const awarenessScore = this.calcAwarenessScore(ordered, sourceCount, staleCount, contradictionCount);
    const nextAttention = this.calcNextAttention(ordered, businessSituation, systemSituation);

    const graph = this.graphBuilder.build(ordered);

    const summary = this.buildSummary(overallHealth, criticalSignals.length, warnings.length, contradictionCount, staleCount, nextAttention);

    return {
      summary,
      overallHealth,
      overallConfidence,
      awarenessScore,
      nextAttention,
      businessSituation,
      systemSituation,
      criticalSignals,
      warnings,
      signals: ordered,
      graph,
      timestamp: new Date().toISOString(),
    };
  }

  private calcOverallHealth(criticalCount: number, warningCount: number, contradictionCount: number): OverallHealth {
    if (criticalCount > 0) return OverallHealth.CRITICAL;
    if (contradictionCount > 0) return OverallHealth.DEGRADED;
    if (warningCount > 0) return OverallHealth.WARNING;
    return OverallHealth.HEALTHY;
  }

  private calcOverallConfidence(
    signals: AwarenessSignal[],
    businessSituation: BusinessSituation,
    systemSituation: SystemSituation,
  ): number {
    if (signals.length === 0) return 0;
    const sourceConf = signals.reduce((sum, s) => sum + s.sourceConfidence, 0) / signals.length;
    const signalConf = signals.reduce((sum, s) => sum + s.signalConfidence, 0) / signals.length;

    const bizRiskScore = businessSituation.riskLevel === 'high' ? 0.6 : businessSituation.riskLevel === 'medium' ? 0.8 : 1.0;
    const sysHealthScore = systemSituation.health === 'critical' ? 0.5 : systemSituation.health === 'degraded' ? 0.7 : 1.0;
    const situationConf = (bizRiskScore + sysHealthScore) / 2;

    return Math.round((sourceConf * 0.3 + signalConf * 0.3 + situationConf * 0.4) * 100) / 100;
  }

  private calcAwarenessScore(signals: AwarenessSignal[], sourceCount: number, staleCount: number, contradictionCount: number): number {
    const maxSources = 7;
    const sourceCoverage = sourceCount / maxSources;
    const freshnessRatio = signals.length > 0 ? (signals.length - staleCount) / signals.length : 0;
    const contradictionPenalty = Math.max(0, 1 - contradictionCount * 0.2);
    const raw = (sourceCoverage * 0.4 + freshnessRatio * 0.3 + contradictionPenalty * 0.3);
    return Math.round(Math.min(1, Math.max(0, raw)) * 100);
  }

  private calcNextAttention(
    signals: AwarenessSignal[],
    businessSituation: BusinessSituation,
    systemSituation: SystemSituation,
  ): string {
    if (systemSituation.health === 'critical') return `System: ${systemSituation.summary}`;
    if (businessSituation.riskLevel === 'high') return `Business: ${businessSituation.focus}`;
    const critical = signals.find(s => s.severity === 'critical');
    if (critical) return `${critical.source}: ${critical.label}`;
    const warning = signals.find(s => s.severity === 'warning');
    if (warning) return `${warning.source}: ${warning.label}`;
    return 'All systems normal';
  }

  private buildSummary(
    health: OverallHealth,
    criticalCount: number,
    warningCount: number,
    contradictionCount: number,
    staleCount: number,
    nextAttention: string,
  ): string {
    const factors: string[] = [];
    if (criticalCount > 0) factors.push(`${criticalCount} critical`);
    if (warningCount > 0) factors.push(`${warningCount} warnings`);
    if (contradictionCount > 0) factors.push(`${contradictionCount} contradictions`);
    if (staleCount > 0) factors.push(`${staleCount} stale`);
    const status = factors.length > 0 ? factors.join(', ') : 'all nominal';
    return `System ${health}: ${status}. Focus: ${nextAttention}`;
  }
}
