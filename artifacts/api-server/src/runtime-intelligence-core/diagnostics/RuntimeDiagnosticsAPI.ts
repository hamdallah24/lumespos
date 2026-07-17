import type {
  RuntimeContext,
  RuntimeTrace,
  RuntimeBudget,
  OverallConfidence,
  CapabilityGraph,
} from '../types';
import type { ReasoningProvider } from '../types';

export interface DiagnosticsResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  lastContract: {
    contractId: string;
    version: string;
    degraded: boolean;
    trace: RuntimeTrace;
    confidence: OverallConfidence;
  } | null;
  budget: {
    limits: Record<string, number>;
    exceeded: boolean;
    exceededStages: string[];
  };
  providers: {
    reasoning: { provider: string; status: string } | null;
    grounding: Record<string, { status: string; error?: string }>;
  };
  capabilities: {
    supportedDomains: string[];
    supportedTools: number;
    activeReasoningProvider: string | null;
  };
}

export class RuntimeDiagnosticsAPI {
  private uptimeStart: number = Date.now();
  private provider: ReasoningProvider | null = null;
  private capabilityGraph: CapabilityGraph | null = null;
  private lastContext: RuntimeContext | null = null;
  private providerName: string = 'unknown';

  initialize(
    provider: ReasoningProvider,
    capabilityGraph: CapabilityGraph,
    providerName: string,
  ): void {
    this.provider = provider;
    this.capabilityGraph = capabilityGraph;
    this.providerName = providerName;
    this.uptimeStart = Date.now();
  }

  recordContract(context: RuntimeContext): void {
    this.lastContext = context;
  }

  async getDiagnostics(): Promise<DiagnosticsResponse> {
    const reasoningHealth = this.provider
      ? await this.provider.health()
      : null;

    const allCaps: any[] = (this.capabilityGraph as any)?.getAllCapabilities() ?? [];
    const domains = [...new Set(allCaps.map((c: any) => c.domain))].sort();
    const healthyCaps = allCaps.filter((c: any) => c.health !== 'offline');

    return {
      status: this.lastContext?.metadata.degraded ? 'degraded' : 'ok',
      version: this.lastContext?.metadata.version || '1.0',
      uptime: Math.floor((Date.now() - this.uptimeStart) / 1000),
      lastContract: this.lastContext
        ? {
            contractId: this.lastContext.metadata.contractId,
            version: this.lastContext.metadata.version,
            degraded: this.lastContext.metadata.degraded,
            trace: this.lastContext.runtime.trace,
            confidence: this.lastContext.runtime.confidence,
          }
        : null,
      budget: this.lastContext
        ? this.lastContext.runtime.budget
        : { limits: {}, exceeded: false, exceededStages: [] },
      providers: {
        reasoning: reasoningHealth
          ? { provider: this.providerName, status: reasoningHealth.ok ? 'ok' : 'degraded' }
          : null,
        grounding: {
          operational: { status: 'ok' },
          memory: { status: 'ok' },
          knowledge: { status: 'ok' },
          metadata: { status: 'ok' },
          repository: { status: 'ok' },
        },
      },
      capabilities: {
        supportedDomains: domains as string[],
        supportedTools: (healthyCaps as any[]).filter((c: any) => c.tools.length > 0).length,
        activeReasoningProvider: this.providerName,
      },
    };
  }
}
