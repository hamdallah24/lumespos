export interface RuntimeMetrics {
  latencyMs: number;
  tokensUsed: number;
  contextSize: number;
  groundingDurationMs: number;
  decisionDurationMs: number;
  executionDurationMs: number;
  confidence: number;
  executive: string;
  action: string;
  success: boolean;
  timestamp: string;
}

export class MetricsCollector {
  private metrics: RuntimeMetrics[] = [];
  private totalTokens = 0;
  private totalLatency = 0;
  private totalRequests = 0;
  private successfulRequests = 0;

  record(metrics: RuntimeMetrics): void {
    this.metrics.push(metrics);
    this.totalTokens += metrics.tokensUsed;
    this.totalLatency += metrics.latencyMs;
    this.totalRequests++;
    if (metrics.success) this.successfulRequests++;
  }

  getRecent(count: number = 50): RuntimeMetrics[] {
    return this.metrics.slice(-count).reverse();
  }

  getByExecutive(executive: string, count: number = 20): RuntimeMetrics[] {
    return this.metrics.filter(m => m.executive === executive).slice(-count).reverse();
  }

  getSummary(): {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    avgTokens: number;
    avgConfidence: number;
  } {
    if (this.totalRequests === 0) {
      return { totalRequests: 0, successRate: 0, avgLatencyMs: 0, avgTokens: 0, avgConfidence: 0 };
    }
    const confidences = this.metrics.map(m => m.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    return {
      totalRequests: this.totalRequests,
      successRate: this.successfulRequests / this.totalRequests,
      avgLatencyMs: this.totalLatency / this.totalRequests,
      avgTokens: this.totalTokens / this.totalRequests,
      avgConfidence,
    };
  }

  clear(): void {
    this.metrics = [];
    this.totalTokens = 0;
    this.totalLatency = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
  }
}

let instance: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!instance) instance = new MetricsCollector();
  return instance;
}
