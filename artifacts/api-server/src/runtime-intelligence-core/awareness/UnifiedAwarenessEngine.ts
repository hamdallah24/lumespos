import type { UnifiedAwareness, AwarenessBrief, ComponentLiveness } from './AwarenessTypes';
import { getRuntimeState } from './RuntimeStateBridge';
import { collectBusinessState } from '../../decision-context/BusinessStateCollector';
import { DigitalTwinProvider } from '../../digital-twin/DigitalTwinProvider';
import { missionRuntime } from '../../ai/runtime/mission-engine';
import { healthMonitor } from '../../ai/runtime/health-monitor';
import { kernelHeartbeat } from '../../kernel/kernel-heartbeat';
import type { HeartbeatRecord } from '../../kernel/kernel-types';
import { RuntimeHealth } from '../../eios-runtime/internal/RuntimeHealth';
import { AwarenessSynthesizer } from './AwarenessSynthesizer';
import { AwarenessPrioritizer } from './AwarenessPrioritizer';

export class UnifiedAwarenessEngine {
  private synthesizer = new AwarenessSynthesizer();
  private prioritizer = new AwarenessPrioritizer();

  async collect(): Promise<UnifiedAwareness> {
    const [business, twin, mission, health, heartbeat, runtimeHealth, runtimeState] = await Promise.all([
      this.safeCollect('business', () => Promise.resolve(collectBusinessState())),
      this.safeCollect('digitalTwin', () => Promise.resolve(DigitalTwinProvider.getState())),
      this.safeCollect('mission', () => this.collectMission()),
      this.safeCollect('health', () => healthMonitor.check()),
      this.safeCollect('heartbeat', () => Promise.resolve(kernelHeartbeat.getAllStatus())),
      this.safeCollect('runtimeHealth', () => Promise.resolve({
        score: RuntimeHealth.score(),
        trend: RuntimeHealth.getTrend(),
      })),
      this.safeCollect('runtimeState', () => Promise.resolve(getRuntimeState())),
    ]);

    const components = this.toComponentLiveness(heartbeat);
    const deadComponents = components.filter(c => c.status === 'dead').map(c => c.component);

    const raw = {
      business: business ?? { cashAvailable: 0, activeBranches: 1, activeEmployees: 0, currentWorkload: 0, operatingHours: 8 },
      operational: twin ? {
        revenue: twin.revenue, expenses: twin.expenses, grossMargin: twin.grossMargin,
        stockCoverageDays: twin.stockCoverageDays, customerSatisfaction: twin.customerSatisfaction,
      } : null,
      mission: mission ?? { active: 0, total: 0, completed: 0, failed: 0, successRate: 100, byStatus: {} },
      runtime: runtimeState ?? { status: 'unknown', isRunning: false, uptimeMs: 0, error: '' },
      system: {
        cpuPercent: health?.system?.cpuPercent ?? '0%', ramPercent: health?.system?.ramPercent ?? '0%',
        uptime: health?.uptime ?? { hours: 0, minutes: 0 }, components, deadComponents,
      },
      digitalTwin: twin ? {
        cashAvailable: twin.cashAvailable, revenue: twin.revenue, expenses: twin.expenses,
        grossMargin: twin.grossMargin, stockCoverageDays: twin.stockCoverageDays,
        activeBranches: twin.activeBranches, activeEmployees: twin.activeEmployees,
        customerSatisfaction: twin.customerSatisfaction,
      } : null,
      health: {
        overall: health?.overall ?? 'unknown', services: health?.services ?? {},
        runtimeHealthScore: runtimeHealth?.score.overall ?? 100,
        runtimeHealthTrend: runtimeHealth?.trend ?? 'stable',
      },
      timestamp: new Date().toISOString(),
    };

    const { signals, businessSituation, systemSituation } = this.synthesizer.synthesize(raw);
    const { criticalSignals, warnings, ordered } = this.prioritizer.prioritize(signals);
    const brief = this.prioritizer.buildBrief(ordered, criticalSignals, warnings, businessSituation, systemSituation);

    return {
      ...raw,
      brief,
      criticalSignals,
      warnings,
      overallHealth: brief.overallHealth,
      businessSituation: brief.businessSituation,
      systemSituation: brief.systemSituation,
      confidence: brief.overallConfidence,
      awarenessScore: brief.awarenessScore,
      nextAttention: brief.nextAttention,
    };
  }

  async collectBrief(): Promise<AwarenessBrief> {
    const awareness = await this.collect();
    return awareness.brief;
  }

  async collectBusiness(): Promise<UnifiedAwareness['business']> {
    const state = collectBusinessState();
    return {
      cashAvailable: state.cashAvailable, activeBranches: state.activeBranches,
      activeEmployees: state.activeEmployees, currentWorkload: state.currentWorkload,
      operatingHours: state.operatingHours,
    };
  }

  async collectMission(): Promise<UnifiedAwareness['mission']> {
    const reportStr = missionRuntime.report();
    const lines = reportStr.split('\n');
    const total = parseInt(lines[0]?.match(/\d+/)?.[0] ?? '0', 10);
    const active = parseInt(lines[1]?.match(/\d+/)?.[0] ?? '0', 10);
    const completed = parseInt(lines[2]?.match(/\d+/)?.[0] ?? '0', 10);
    const failed = parseInt(lines[3]?.match(/\d+/)?.[0] ?? '0', 10);
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;
    return { active, total, completed, failed, successRate, byStatus: { active, completed, failed } };
  }

  private toComponentLiveness(records: HeartbeatRecord[] | null): ComponentLiveness[] {
    if (!records) return [];
    return records.map(r => ({ component: r.component, status: r.status, missCount: r.missCount }));
  }

  private async safeCollect<T>(_name: string, fn: () => Promise<T>): Promise<T | null> {
    try { return await fn(); } catch { return null; }
  }
}
