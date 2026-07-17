export interface DomainMetrics {
  requestCount: number;
  successCount: number;
  avgConfidence: number;
  avgVerificationScore: number;
  replanRate: number;
  lastRequest: number;
}

export interface ProviderMetrics {
  totalCalls: number;
  failureCount: number;
  circuitTripCount: number;
  avgLatency: number;
  lastFailure: number | null;
}

export interface LearningSummary {
  totalRequests: number;
  overallSuccessRate: number;
  overallAvgConfidence: number;
  degradedRate: number;
  replanRate: number;
  topDomains: { domain: string; count: number; avgConfidence: number }[];
  weakestDomains: { domain: string; avgConfidence: number }[];
  providerHealth: { provider: string; failureRate: number }[];
}

export class MetricsStore {
  private domains = new Map<string, DomainMetrics>();
  private providers = new Map<string, ProviderMetrics>();
  private totalRequests = 0;
  private degradedCount = 0;
  private replanTotal = 0;

  recordRequest(
    domain: string,
    confidence: number,
    verificationScore: number,
    degraded: boolean,
    replanCount: number,
  ): void {
    this.totalRequests++;
    if (degraded) this.degradedCount++;
    if (replanCount > 0) this.replanTotal++;

    const existing = this.domains.get(domain) ?? {
      requestCount: 0, successCount: 0,
      avgConfidence: 0, avgVerificationScore: 0,
      replanRate: 0, lastRequest: 0,
    };

    const prev = existing.requestCount;
    existing.requestCount++;
    if (confidence >= 0.7) existing.successCount++;
    existing.avgConfidence = (existing.avgConfidence * prev + confidence) / existing.requestCount;
    existing.avgVerificationScore = (existing.avgVerificationScore * prev + verificationScore) / existing.requestCount;
    existing.replanRate = (existing.replanRate * prev + (replanCount > 0 ? 1 : 0)) / existing.requestCount;
    existing.lastRequest = Date.now();

    this.domains.set(domain, existing);
  }

  recordProviderCall(provider: string, success: boolean, latency: number, circuitTripped: boolean): void {
    const existing = this.providers.get(provider) ?? {
      totalCalls: 0, failureCount: 0,
      circuitTripCount: 0, avgLatency: 0, lastFailure: null,
    };

    const prev = existing.totalCalls;
    existing.totalCalls++;
    if (!success) {
      existing.failureCount++;
      existing.lastFailure = Date.now();
    }
    if (circuitTripped) existing.circuitTripCount++;
    existing.avgLatency = (existing.avgLatency * prev + latency) / existing.totalCalls;

    this.providers.set(provider, existing);
  }

  getSummary(): LearningSummary {
    const domainEntries = [...this.domains.entries()].map(([domain, m]) => ({
      domain, count: m.requestCount, avgConfidence: m.avgConfidence,
    }));

    domainEntries.sort((a, b) => b.count - a.count);

    const weakest = [...this.domains.entries()]
      .map(([domain, m]) => ({ domain, avgConfidence: m.avgConfidence }))
      .sort((a, b) => a.avgConfidence - b.avgConfidence)
      .slice(0, 5);

    const providerHealth = [...this.providers.entries()].map(([provider, m]) => ({
      provider,
      failureRate: m.totalCalls > 0 ? m.failureCount / m.totalCalls : 0,
    }));

    return {
      totalRequests: this.totalRequests,
      overallSuccessRate: this.totalRequests > 0
        ? [...this.domains.values()].reduce((s, d) => s + d.successCount, 0) / this.totalRequests
        : 0,
      overallAvgConfidence: this.totalRequests > 0
        ? [...this.domains.values()].reduce((s, d) => s + d.avgConfidence * d.requestCount, 0) / this.totalRequests
        : 0,
      degradedRate: this.totalRequests > 0 ? this.degradedCount / this.totalRequests : 0,
      replanRate: this.totalRequests > 0 ? this.replanTotal / this.totalRequests : 0,
      topDomains: domainEntries.slice(0, 5),
      weakestDomains: weakest,
      providerHealth,
    };
  }

  getDomainMetrics(domain: string): DomainMetrics | undefined {
    return this.domains.get(domain);
  }

  getProviderMetrics(provider: string): ProviderMetrics | undefined {
    return this.providers.get(provider);
  }
}
