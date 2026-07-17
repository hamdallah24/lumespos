export type SignalSource = 'business' | 'operational' | 'mission' | 'runtime' | 'system' | 'digitalTwin' | 'health';
export type SignalPriority = 'critical' | 'high' | 'medium' | 'low';
export type SignalSeverity = 'critical' | 'warning' | 'info';
export type Freshness = 'current' | 'stale' | 'unknown';
export type AwarenessOrigin = 'BusinessStateCollector' | 'MissionEngine' | 'DigitalTwinProvider' | 'RuntimeState' | 'HealthMonitor' | 'KernelHeartbeat' | 'RuntimeHealth';

export enum OverallHealth {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
}

export interface AwarenessSignal {
  id: string;
  source: SignalSource;
  origin: AwarenessOrigin;
  category: string;
  label: string;
  value: string | number;
  reason: string;
  priority: SignalPriority;
  severity: SignalSeverity;
  sourceConfidence: number;
  signalConfidence: number;
  freshness: Freshness;
  timestamp: string;
  ttlMs: number;
  contradiction?: {
    withSource: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  };
  relationships: string[];
}

export interface BusinessSituation {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  trend: 'improving' | 'declining' | 'stable';
  focus: string;
}

export interface SystemSituation {
  summary: string;
  health: 'healthy' | 'degraded' | 'critical';
  degradedServices: string[];
  runtimeState: string;
}

export interface AwarenessGraphNode {
  id: string;
  label: string;
  type: 'signal' | 'situation' | 'risk';
  severity: 'low' | 'medium' | 'high';
}

export interface AwarenessGraphEdge {
  from: string;
  to: string;
  type: 'causes' | 'impacts' | 'correlates';
}

export interface AwarenessGraph {
  nodes: AwarenessGraphNode[];
  edges: AwarenessGraphEdge[];
}

export interface AwarenessBrief {
  summary: string;
  overallHealth: OverallHealth;
  overallConfidence: number;
  awarenessScore: number;
  nextAttention: string;
  businessSituation: BusinessSituation;
  systemSituation: SystemSituation;
  criticalSignals: AwarenessSignal[];
  warnings: AwarenessSignal[];
  signals: AwarenessSignal[];
  graph: AwarenessGraph;
  timestamp: string;
}

export interface UnifiedAwareness {
  business: {
    cashAvailable: number;
    activeBranches: number;
    activeEmployees: number;
    currentWorkload: number;
    operatingHours: number;
  };
  operational: {
    revenue: number;
    expenses: number;
    grossMargin: number;
    stockCoverageDays: number;
    customerSatisfaction: number;
  } | null;
  mission: {
    active: number;
    total: number;
    completed: number;
    failed: number;
    successRate: number;
    byStatus: Record<string, number>;
  };
  runtime: {
    status: string;
    isRunning: boolean;
    uptimeMs: number;
    error: string;
  };
  system: {
    cpuPercent: string;
    ramPercent: string;
    uptime: { hours: number; minutes: number };
    components: ComponentLiveness[];
    deadComponents: string[];
  };
  digitalTwin: {
    cashAvailable: number;
    revenue: number;
    expenses: number;
    grossMargin: number;
    stockCoverageDays: number;
    activeBranches: number;
    activeEmployees: number;
    customerSatisfaction: number;
  } | null;
  health: {
    overall: string;
    services: Record<string, { status: string; value: string }>;
    runtimeHealthScore: number;
    runtimeHealthTrend: string;
  };

  brief: AwarenessBrief;
  criticalSignals: AwarenessSignal[];
  warnings: AwarenessSignal[];
  overallHealth: string;
  businessSituation: BusinessSituation;
  systemSituation: SystemSituation;
  confidence: number;
  awarenessScore: number;
  nextAttention: string;
  timestamp: string;
}

export interface ComponentLiveness {
  component: string;
  status: string;
  missCount: number;
}
