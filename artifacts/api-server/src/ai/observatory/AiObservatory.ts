import type { MetricsStore, LearningSummary } from '../../runtime-intelligence-core/learning/MetricsStore';
import type { ReflectionEngine, Reflection } from '../../runtime-intelligence-core/learning/ReflectionEngine';
import type { EvidenceStore, Evidence } from '../../runtime-intelligence-core/learning/EvidenceStore';
import type { ExecutionEngine, ExecutionResult } from '../runtime/execution/ExecutionEngine';
import type { GroundingLayer } from '../../runtime-intelligence-core/grounding/GroundingLayer';

export interface PipelineStageSnapshot {
  name: string;
  status: string;
  latencyMs: number;
  confidence: number;
}

export interface ObservatorySnapshot {
  timestamp: number;
  gateway: {
    uptime: number;
    ricReady: boolean;
    requestCount: number;
  };
  pipeline: PipelineStageSnapshot[];
  awareness: {
    score: number;
    overallHealth: string;
  } | null;
  learning: LearningSummary | null;
  reflections: Reflection[];
  patterns: string[];
  evidence: {
    total: number;
    unconsumed: number;
    recent: Evidence[];
  };
  executions: ExecutionResult[];
  providerHealth: Record<string, { state: string; failureCount: number }>;
  stages: {
    gateway: boolean;
    ric: boolean;
    awareness: boolean;
    understanding: boolean;
    planning: boolean;
    grounding: boolean;
    verification: boolean;
    executive: boolean;
    execution: boolean;
    reflection: boolean;
    learning: boolean;
  };
}

export class AiObservatory {
  private startTime = Date.now();
  private metricsStore: MetricsStore | null = null;
  private reflectionEngine: ReflectionEngine | null = null;
  private evidenceStore: EvidenceStore | null = null;
  private executionEngine: ExecutionEngine | null = null;
  private groundingLayer: GroundingLayer | null = null;
  private ricReady = false;
  private requestCount = 0;

  registerMetrics(store: MetricsStore): void { this.metricsStore = store; }
  registerReflection(engine: ReflectionEngine): void { this.reflectionEngine = engine; }
  registerEvidence(store: EvidenceStore): void { this.evidenceStore = store; }
  registerExecution(engine: ExecutionEngine): void { this.executionEngine = engine; }
  registerGrounding(layer: GroundingLayer): void { this.groundingLayer = layer; }
  setRicReady(v: boolean): void { this.ricReady = v; }
  incrementRequestCount(): void { this.requestCount++; }

  snapshot(): ObservatorySnapshot {
    const learning = this.metricsStore?.getSummary() ?? null;
    const reflections = this.reflectionEngine?.getRecentReflections(10) ?? [];
    const patterns = this.reflectionEngine?.getTopPatterns() ?? [];
    const evidenceList = this.evidenceStore?.getRecent(20) ?? [];
    const unconsumed = this.evidenceStore?.getUnconsumed().length ?? 0;
    const executions = this.executionEngine?.getRecentExecutions(10) ?? [];
    const circuitStatuses = (this.groundingLayer as any)?.getCircuitStatuses?.() ?? {};

    const providerHealth: Record<string, { state: string; failureCount: number }> = {};
    for (const [name, status] of Object.entries(circuitStatuses as Record<string, any>)) {
      providerHealth[name] = {
        state: status.state,
        failureCount: status.failureCount,
      };
    }

    const lastReflection = reflections[0];
    const pipeline: PipelineStageSnapshot[] = (lastReflection?.stages ?? []).map(s => ({
      name: s.stage,
      status: s.status,
      latencyMs: s.durationMs,
      confidence: s.confidence,
    }));

    return {
      timestamp: Date.now(),
      gateway: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        ricReady: this.ricReady,
        requestCount: this.requestCount,
      },
      pipeline,
      awareness: learning ? {
        score: learning.overallAvgConfidence * 100,
        overallHealth: learning.degradedRate > 0.3 ? 'degraded' : learning.degradedRate > 0.1 ? 'warning' : 'healthy',
      } : null,
      learning,
      reflections,
      patterns,
      evidence: {
        total: evidenceList.length,
        unconsumed,
        recent: evidenceList.slice(-10),
      },
      executions,
      providerHealth,
      stages: {
        gateway: true,
        ric: this.ricReady,
        awareness: this.ricReady,
        understanding: this.ricReady,
        planning: this.ricReady,
        grounding: this.ricReady,
        verification: this.ricReady,
        executive: true,
        execution: true,
        reflection: this.reflectionEngine !== null,
        learning: this.metricsStore !== null,
      },
    };
  }
}

let instance: AiObservatory | null = null;

export function getAiObservatory(): AiObservatory {
  if (!instance) instance = new AiObservatory();
  return instance;
}
