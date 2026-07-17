import type { RefinementEntry, VerificationResult } from '../types';
import type { MetricsStore } from './MetricsStore';

export interface Reflection {
  requestCount: number;
  timestamp: number;
  confidence: number;
  degraded: boolean;
  replanUsed: boolean;
  weakestComponent: string;
  topFailures: string[];
  patterns: string[];
}

export class ReflectionEngine {
  private reflections: Reflection[] = [];
  private readonly maxReflections = 100;

  reflect(
    confidence: number,
    verification: VerificationResult,
    refinementHistory: RefinementEntry[],
    degraded: boolean,
    metrics: MetricsStore,
  ): Reflection {
    const weakestComponent = verification.checks
      .filter(c => c.state !== 'verified')
      .map(c => c.check)
      .slice(0, 1)
      .join(', ');
    const topFailures = verification.checks
      .filter(c => c.state !== 'verified')
      .map(c => c.check);

    const patterns: string[] = [];
    if (degraded) patterns.push('degraded execution');
    if (refinementHistory.length > 0) patterns.push('required replanning');
    if (topFailures.length > 0) patterns.push(`failed: ${topFailures.join(', ')}`);
    if (weakestComponent) patterns.push(`weakest: ${weakestComponent}`);

    const summary = metrics.getSummary();
    if (summary.replanRate > 0.3) patterns.push('high replan rate in system');
    if (summary.overallAvgConfidence < 0.6) patterns.push('low system confidence trend');

    const reflection: Reflection = {
      requestCount: summary.totalRequests,
      timestamp: Date.now(),
      confidence: confidence,
      degraded,
      replanUsed: refinementHistory.length > 0,
      weakestComponent,
      topFailures,
      patterns: [...new Set(patterns)],
    };

    this.reflections.unshift(reflection);
    if (this.reflections.length > this.maxReflections) {
      this.reflections.length = this.maxReflections;
    }

    return reflection;
  }

  getRecentReflections(limit: number = 5): Reflection[] {
    return this.reflections.slice(0, limit);
  }

  getTopPatterns(): string[] {
    const freq = new Map<string, number>();
    for (const r of this.reflections) {
      for (const p of r.patterns) {
        freq.set(p, (freq.get(p) ?? 0) + 1);
      }
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([p]) => p);
  }

}
