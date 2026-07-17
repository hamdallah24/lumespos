import type { AwarenessSignal, AwarenessOrigin, UnifiedAwareness } from './AwarenessTypes';
import type { BusinessSituation, SystemSituation } from './AwarenessTypes';
import { ContradictionDetector } from './ContradictionDetector';
import { AwarenessGraphBuilder } from './AwarenessGraph';

type RawAwarenessInput = Omit<UnifiedAwareness, 'brief' | 'criticalSignals' | 'warnings' | 'overallHealth' | 'businessSituation' | 'systemSituation' | 'confidence' | 'awarenessScore' | 'nextAttention'>;

const TTL_BY_SOURCE: Record<string, number> = {
  business: 30000, health: 10000, runtime: 5000,
  mission: 60000, digitalTwin: 120000, system: 10000, operational: 120000,
};

const SOURCE_CONFIDENCE: Record<string, number> = {
  BusinessStateCollector: 0.70,
  HealthMonitor: 0.95,
  RuntimeState: 1.0,
  MissionEngine: 0.95,
  DigitalTwinProvider: 0.85,
  KernelHeartbeat: 0.95,
  RuntimeHealth: 0.90,
};

let signalCounter = 0;

export class AwarenessSynthesizer {
  private contradictionDetector = new ContradictionDetector();
  private graphBuilder = new AwarenessGraphBuilder();

  synthesize(raw: RawAwarenessInput): {
    signals: AwarenessSignal[];
    contradictions: Array<{ signalId: string; withSource: string; description: string; severity: string }>;
    businessSituation: BusinessSituation;
    systemSituation: SystemSituation;
  } {
    const ts = new Date().toISOString();
    const signals: AwarenessSignal[] = [];

    const addSignal = (
      source: AwarenessSignal['source'], origin: AwarenessOrigin,
      category: string, label: string, value: string | number,
      reason: string, priority: AwarenessSignal['priority'],
      severity: AwarenessSignal['severity'], signalConfidence: number,
    ) => {
      signalCounter++;
      signals.push({
        id: `sig-${signalCounter}`, source, origin, category, label, value, reason,
        priority, severity, sourceConfidence: SOURCE_CONFIDENCE[origin] ?? 0.8,
        signalConfidence, freshness: 'current', timestamp: ts,
        ttlMs: TTL_BY_SOURCE[source] ?? 60000, relationships: [],
      });
    };

    if (raw.business.cashAvailable < 1000) {
      addSignal('business', 'BusinessStateCollector', 'cash', 'Cash low', raw.business.cashAvailable,
        `cashAvailable (${raw.business.cashAvailable}) < minimumThreshold (1000)`, 'critical', 'critical', 0.9);
    } else {
      addSignal('business', 'BusinessStateCollector', 'cash', 'Cash stable', raw.business.cashAvailable,
        `cashAvailable (${raw.business.cashAvailable}) >= minimumThreshold (1000)`, 'low', 'info', 0.8);
    }

    if (raw.business.currentWorkload > 80) {
      addSignal('business', 'BusinessStateCollector', 'workload', 'Workload high', `${raw.business.currentWorkload}%`,
        `currentWorkload (${raw.business.currentWorkload}%) > 80% threshold`, 'high', 'warning', 0.85);
    } else {
      addSignal('business', 'BusinessStateCollector', 'workload', 'Workload normal', `${raw.business.currentWorkload}%`,
        `currentWorkload (${raw.business.currentWorkload}%) within normal range`, 'low', 'info', 0.8);
    }

    if (raw.business.activeBranches > 0) {
      addSignal('business', 'BusinessStateCollector', 'branches', 'Active branches', raw.business.activeBranches,
        `activeBranches = ${raw.business.activeBranches}`, 'low', 'info', 0.8);
    }

    if (raw.operational) {
      const margin = raw.operational.revenue > 0
        ? ((1 - raw.operational.expenses / raw.operational.revenue) * 100)
        : 0;
      if (raw.operational.revenue > 0 && margin < 5) {
        addSignal('operational', 'DigitalTwinProvider', 'margin', 'Margin critical', `${margin.toFixed(1)}%`,
          `gross margin (${margin.toFixed(1)}%) < 5% critical threshold`, 'critical', 'critical', 0.9);
      } else if (raw.operational.revenue > 0 && margin < 15) {
        addSignal('operational', 'DigitalTwinProvider', 'margin', 'Margin tight', `${margin.toFixed(1)}%`,
          `gross margin (${margin.toFixed(1)}%) < 15% warning threshold`, 'high', 'warning', 0.85);
      } else if (raw.operational.revenue > 0) {
        addSignal('operational', 'DigitalTwinProvider', 'margin', 'Margin healthy', `${margin.toFixed(1)}%`,
          `gross margin (${margin.toFixed(1)}%) >= 15% healthy threshold`, 'low', 'info', 0.8);
      }

      if (raw.operational.stockCoverageDays > 60) {
        addSignal('operational', 'DigitalTwinProvider', 'stock', 'Stock overage', `${raw.operational.stockCoverageDays}d`,
          `stockCoverageDays (${raw.operational.stockCoverageDays}) > 60d overage threshold`, 'medium', 'warning', 0.8);
      } else if (raw.operational.stockCoverageDays > 0 && raw.operational.stockCoverageDays < 7) {
        addSignal('operational', 'DigitalTwinProvider', 'stock', 'Stock low', `${raw.operational.stockCoverageDays}d`,
          `stockCoverageDays (${raw.operational.stockCoverageDays}) < 7d low threshold`, 'high', 'critical', 0.85);
      }

      if (raw.operational.customerSatisfaction > 0 && raw.operational.customerSatisfaction < 70) {
        addSignal('operational', 'DigitalTwinProvider', 'satisfaction', 'Satisfaction low', `${raw.operational.customerSatisfaction}%`,
          `customerSatisfaction (${raw.operational.customerSatisfaction}%) < 70% threshold`, 'high', 'critical', 0.9);
      }
    }

    if (raw.mission.failed > 0) {
      addSignal('mission', 'MissionEngine', 'failed', 'Failed missions', raw.mission.failed,
        `${raw.mission.failed} mission(s) in FAILED state`, 'high', 'warning', 0.9);
    }
    if (raw.mission.active > 0) {
      addSignal('mission', 'MissionEngine', 'active', 'Active missions', raw.mission.active,
        `${raw.mission.active} mission(s) currently active`, 'medium', 'info', 0.9);
    }

    if (raw.runtime.status === 'error') {
      addSignal('runtime', 'RuntimeState', 'status', 'Runtime error', raw.runtime.error || 'unknown',
        `RuntimeState is 'error': ${raw.runtime.error}`, 'critical', 'critical', 1.0);
    } else if (raw.runtime.status === 'paused') {
      addSignal('runtime', 'RuntimeState', 'status', 'Runtime paused', raw.runtime.status,
        `RuntimeState is 'paused'`, 'high', 'warning', 1.0);
    } else {
      addSignal('runtime', 'RuntimeState', 'status', 'Runtime running', raw.runtime.status,
        `RuntimeState is '${raw.runtime.status}'`, 'low', 'info', 1.0);
    }

    if (raw.health.overall === 'unhealthy') {
      addSignal('health', 'HealthMonitor', 'overall', 'System unhealthy', raw.health.overall,
        'HealthMonitor overall status is unhealthy', 'critical', 'critical', 0.95);
    } else if (raw.health.overall === 'degraded') {
      addSignal('health', 'HealthMonitor', 'overall', 'System degraded', raw.health.overall,
        'HealthMonitor overall status is degraded', 'high', 'warning', 0.9);
    }

    for (const [name, svc] of Object.entries(raw.health.services)) {
      if (svc.status === 'unhealthy') {
        addSignal('health', 'HealthMonitor', `svc:${name}`, `${name} down`, svc.value || 'unreachable',
          `Health check '${name}' returned unhealthy: ${svc.value}`, 'critical', 'critical', 0.95);
      } else if (svc.status === 'degraded') {
        addSignal('health', 'HealthMonitor', `svc:${name}`, `${name} degraded`, svc.value || 'slow',
          `Health check '${name}' returned degraded: ${svc.value}`, 'high', 'warning', 0.85);
      }
    }

    if (raw.system.deadComponents.length > 0) {
      addSignal('system', 'KernelHeartbeat', 'components', 'Dead components', raw.system.deadComponents.join(', '),
        `${raw.system.deadComponents.length} component(s) missed >= 3 heartbeats`, 'critical', 'critical', 1.0);
    }

    if (raw.health.runtimeHealthScore < 60) {
      addSignal('system', 'RuntimeHealth', 'runtimeHealth', 'Runtime score critical', `${raw.health.runtimeHealthScore}/100`,
        `RuntimeHealth score (${raw.health.runtimeHealthScore}) < 60 critical threshold`, 'critical', 'critical', 0.9);
    } else if (raw.health.runtimeHealthScore < 80) {
      addSignal('system', 'RuntimeHealth', 'runtimeHealth', 'Runtime score degraded', `${raw.health.runtimeHealthScore}/100`,
        `RuntimeHealth score (${raw.health.runtimeHealthScore}) < 80 warning threshold`, 'high', 'warning', 0.85);
    }

    if (raw.digitalTwin) {
      if (raw.digitalTwin.grossMargin < 10) {
        addSignal('digitalTwin', 'DigitalTwinProvider', 'margin', 'Twin margin critical', `${raw.digitalTwin.grossMargin}%`,
          `Digital Twin grossMargin (${raw.digitalTwin.grossMargin}%) < 10%`, 'critical', 'critical', 0.9);
      } else if (raw.digitalTwin.grossMargin < 20) {
        addSignal('digitalTwin', 'DigitalTwinProvider', 'margin', 'Twin margin low', `${raw.digitalTwin.grossMargin}%`,
          `Digital Twin grossMargin (${raw.digitalTwin.grossMargin}%) < 20%`, 'medium', 'warning', 0.85);
      }
    }

    const contradictions = this.contradictionDetector.detect(raw, signals);
    for (const c of contradictions) {
      const signal = signals.find(s => s.id === c.signalId);
      if (signal) {
        signal.contradiction = { withSource: c.withSource, description: c.description, severity: c.severity as 'low' | 'medium' | 'high' };
      }
    }

    const businessSituation = this.buildBusinessSituation(signals, raw);
    const systemSituation = this.buildSystemSituation(signals, raw);

    return { signals, contradictions, businessSituation, systemSituation };
  }

  private buildBusinessSituation(
    signals: AwarenessSignal[],
    raw: RawAwarenessInput,
  ): BusinessSituation {
    const criticalBiz = signals.filter(s => (s.source === 'business' || s.source === 'operational' || s.source === 'digitalTwin') && s.severity === 'critical');
    const warningBiz = signals.filter(s => (s.source === 'business' || s.source === 'operational' || s.source === 'digitalTwin') && s.severity === 'warning');
    const cashSig = signals.find(s => s.category === 'cash');
    const marginSig = signals.find(s => s.category === 'margin');
    const stockSig = signals.find(s => s.category === 'stock');

    let riskLevel: BusinessSituation['riskLevel'] = 'low';
    let trend: BusinessSituation['trend'] = 'stable';
    if (criticalBiz.length > 0) riskLevel = 'high';
    else if (warningBiz.length > 0) riskLevel = 'medium';

    const prioritySignals = [...criticalBiz, ...warningBiz];
    const focus = prioritySignals.length > 0
      ? prioritySignals[0].label
      : 'Normal operations';

    const summaryParts: string[] = [];
    if (cashSig) summaryParts.push(`${cashSig.label} (${cashSig.value})`);
    if (marginSig) summaryParts.push(`margin ${marginSig.value}`);
    if (stockSig) summaryParts.push(`stock ${stockSig.value}`);

    return {
      summary: summaryParts.length > 0 ? summaryParts.join(', ') : 'Normal',
      riskLevel,
      trend,
      focus,
    };
  }

  private buildSystemSituation(
    signals: AwarenessSignal[],
    raw: RawAwarenessInput,
  ): SystemSituation {
    const criticalSys = signals.filter(s => (s.source === 'runtime' || s.source === 'health' || s.source === 'system') && s.severity === 'critical');
    const degradedSvcSignals = signals.filter(s => s.category.startsWith('svc:') && (s.severity === 'warning' || s.severity === 'critical'));

    let health: SystemSituation['health'] = 'healthy';
    if (criticalSys.length > 0 || raw.system.deadComponents.length > 0) health = 'critical';
    else if (degradedSvcSignals.length > 0 || raw.health.overall === 'degraded') health = 'degraded';

    return {
      summary: `Runtime ${raw.runtime.status}, health ${health}`,
      health,
      degradedServices: degradedSvcSignals.map(s => s.label),
      runtimeState: raw.runtime.status,
    };
  }
}
