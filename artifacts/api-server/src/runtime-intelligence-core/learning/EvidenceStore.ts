import type { Reflection, StageObservation } from './ReflectionEngine';

export interface Evidence {
  id: string;
  source: string;
  pattern: string;
  confidence: number;
  severity: 'info' | 'warning' | 'critical';
  stageCount: number;
  failedStages: number;
  timestamp: number;
  consumed: boolean;
}

export class EvidenceStore {
  private evidence: Evidence[] = [];
  private readonly maxEvidence = 200;

  record(reflection: Reflection): Evidence[] {
    const entries: Evidence[] = [];

    for (const pattern of reflection.patterns) {
      const confidence = this.calcConfidence(pattern, reflection);
      if (confidence < 0.3) continue;

      entries.push({
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source: pattern.startsWith('stage_failed') ? 'pipeline' : 'reflection',
        pattern,
        confidence,
        severity: this.calcSeverity(pattern, reflection),
        stageCount: reflection.stages.length,
        failedStages: reflection.stages.filter(s => s.status === 'failed').length,
        timestamp: Date.now(),
        consumed: false,
      });
    }

    this.evidence.push(...entries);
    if (this.evidence.length > this.maxEvidence) {
      this.evidence = this.evidence.slice(-this.maxEvidence);
    }

    return entries;
  }

  getUnconsumed(): Evidence[] {
    return this.evidence.filter(e => !e.consumed);
  }

  markConsumed(id: string): void {
    const entry = this.evidence.find(e => e.id === id);
    if (entry) entry.consumed = true;
  }

  getRecent(limit: number = 20): Evidence[] {
    return this.evidence.slice(-limit);
  }

  private calcConfidence(pattern: string, reflection: Reflection): number {
    if (pattern.startsWith('failed:')) return reflection.confidence < 0.5 ? 0.8 : 0.5;
    if (pattern.startsWith('stage_failed:')) return 0.9;
    if (pattern.startsWith('weakest:')) return 0.6;
    if (pattern === 'degraded execution') return 0.7;
    if (pattern === 'required replanning') return 0.5;
    return 0.4;
  }

  private calcSeverity(pattern: string, reflection: Reflection): 'info' | 'warning' | 'critical' {
    if (pattern.startsWith('stage_failed:')) return 'critical';
    if (pattern.startsWith('failed:')) return 'warning';
    if (pattern === 'degraded execution') return 'warning';
    if (pattern.startsWith('weakest:')) return 'info';
    if (reflection.degraded) return 'warning';
    return 'info';
  }
}
