// ECP-032.5: Runtime Metrics — KPI aggregation per runtime
// Frozen. Aggregates latency, delegation rate, confidence, tokens.

import type { RuntimeKPISnapshot } from "./types";

class RuntimeMetricsAggregator {
  private _data = new Map<string, {
    latencyTotal: number; latencyCount: number;
    delegationCount: number; totalRequests: number;
    verificationPasses: number; verificationTotal: number;
    confidenceTotal: number; confidenceCount: number;
    tokenTotal: number; tokenCount: number;
    missionCount: number; lastActive: string;
  }>();

  ensure(runtime: string): void {
    if (!this._data.has(runtime)) {
      this._data.set(runtime, {
        latencyTotal: 0, latencyCount: 0,
        delegationCount: 0, totalRequests: 0,
        verificationPasses: 0, verificationTotal: 0,
        confidenceTotal: 0, confidenceCount: 0,
        tokenTotal: 0, tokenCount: 0,
        missionCount: 0, lastActive: new Date().toISOString(),
      });
    }
  }

  recordRequest(runtime: string, latencyMs: number, tokens: number, delegated: boolean, verified: boolean, confidence: number): void {
    this.ensure(runtime);
    const d = this._data.get(runtime)!;
    d.totalRequests++;
    d.latencyTotal += latencyMs;
    d.latencyCount++;
    d.tokenTotal += tokens;
    d.tokenCount++;
    if (delegated) d.delegationCount++;
    d.verificationTotal++;
    if (verified) d.verificationPasses++;
    d.confidenceTotal += confidence;
    d.confidenceCount++;
    d.lastActive = new Date().toISOString();
  }

  recordMission(runtime: string): void {
    this.ensure(runtime);
    this._data.get(runtime)!.missionCount++;
  }

  snapshot(runtime: string): RuntimeKPISnapshot {
    const d = this._data.get(runtime);
    if (!d || d.totalRequests === 0) {
      return { runtime, avgLatencyMs: 0, delegationRate: 0, verificationPassRate: 100, avgConfidence: 0, avgTokens: 0, missionCount: 0, lastActive: "-", status: "idle" };
    }
    return {
      runtime,
      avgLatencyMs: Math.round(d.latencyTotal / d.latencyCount),
      delegationRate: Math.round((d.delegationCount / d.totalRequests) * 100),
      verificationPassRate: d.verificationTotal > 0 ? Math.round((d.verificationPasses / d.verificationTotal) * 100) : 100,
      avgConfidence: Math.round(d.confidenceTotal / d.confidenceCount),
      avgTokens: Math.round(d.tokenTotal / d.tokenCount),
      missionCount: d.missionCount,
      lastActive: d.lastActive,
      status: "healthy" as const,
    };
  }

  allSnapshots(): RuntimeKPISnapshot[] {
    return [...this._data.keys()].map(r => this.snapshot(r));
  }
}

export const runtimeMetrics = new RuntimeMetricsAggregator();
