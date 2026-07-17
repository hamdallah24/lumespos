import type { AwarenessSignal, UnifiedAwareness } from './AwarenessTypes';

interface ContradictionResult {
  signalId: string;
  withSource: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export class ContradictionDetector {
  detect(raw: Omit<UnifiedAwareness, 'brief' | 'criticalSignals' | 'warnings' | 'overallHealth' | 'businessSituation' | 'systemSituation' | 'confidence' | 'awarenessScore' | 'nextAttention'>, signals: AwarenessSignal[]): ContradictionResult[] {
    const results: ContradictionResult[] = [];

    if (raw.digitalTwin) {
      if (raw.business.cashAvailable !== raw.digitalTwin.cashAvailable) {
        const severity = this.calcSeverity(raw.business.cashAvailable, raw.digitalTwin.cashAvailable, 1000);
        const signal = signals.find(s => s.category === 'cash' && s.source === 'business');
        if (signal) {
          results.push({
            signalId: signal.id,
            withSource: 'digitalTwin',
            description: `Business cash (${raw.business.cashAvailable}) != Digital Twin cash (${raw.digitalTwin.cashAvailable})`,
            severity,
          });
        }
      }

      if (raw.business.activeBranches !== raw.digitalTwin.activeBranches) {
        const signal = signals.find(s => s.category === 'branches' && s.source === 'business');
        if (signal) {
          results.push({
            signalId: signal.id,
            withSource: 'digitalTwin',
            description: `Business branches (${raw.business.activeBranches}) != Digital Twin branches (${raw.digitalTwin.activeBranches})`,
            severity: 'medium',
          });
        }
      }
    }

    if (raw.health.overall === 'healthy' && raw.runtime.status === 'error') {
      const signal = signals.find(s => s.source === 'runtime');
      if (signal) {
        results.push({
          signalId: signal.id,
          withSource: 'health',
          description: `Health says healthy but runtime is in error state`,
          severity: 'high',
        });
      }
    }

    if (raw.mission.active > 0 && raw.runtime.status !== 'running') {
      const signal = signals.find(s => s.source === 'mission' && s.category === 'active');
      if (signal) {
        results.push({
          signalId: signal.id,
          withSource: 'runtime',
          description: `${raw.mission.active} active missions but runtime is ${raw.runtime.status}`,
          severity: 'high',
        });
      }
    }

    return results;
  }

  private calcSeverity(a: number, b: number, threshold: number): 'low' | 'medium' | 'high' {
    const delta = Math.abs(a - b);
    if (delta > threshold * 3) return 'high';
    if (delta > threshold) return 'medium';
    return 'low';
  }
}
