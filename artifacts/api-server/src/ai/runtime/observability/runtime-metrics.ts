// ECP-048: Runtime Metrics — KPI aggregation per runtime
// Backed by EIOS MetricsEngine counters, gauges, histograms
import type { RuntimeKPISnapshot } from "./types";
import { MetricsEngine } from "../../../eios-runtime";

function metricKey(runtime: string, name: string): string {
  return `runtime.${runtime}.${name}`;
}

class RuntimeMetricsAggregator {
  recordRequest(runtime: string, latencyMs: number, tokens: number, delegated: boolean, verified: boolean, confidence: number): void {
    MetricsEngine.histogram(metricKey(runtime, "latency_ms")).record(latencyMs);
    MetricsEngine.counter(metricKey(runtime, "tokens")).inc(tokens);
    MetricsEngine.histogram(metricKey(runtime, "confidence")).record(confidence);
    MetricsEngine.gauge(metricKey(runtime, "last_active")).set(Date.now());
    MetricsEngine.counter(metricKey(runtime, "requests")).inc(1);
    if (delegated) MetricsEngine.counter(metricKey(runtime, "delegations")).inc(1);
    MetricsEngine.counter(metricKey(runtime, "verifications")).inc(1);
    if (verified) MetricsEngine.counter(metricKey(runtime, "verifications_passed")).inc(1);
  }

  recordMission(runtime: string): void {
    MetricsEngine.counter(metricKey(runtime, "missions")).inc(1);
  }

  snapshot(runtime: string): RuntimeKPISnapshot {
    const reqs = MetricsEngine.counter(metricKey(runtime, "requests")).value();
    if (reqs === 0) {
      return { runtime, avgLatencyMs: 0, delegationRate: 0, verificationPassRate: 100, avgConfidence: 0, avgTokens: 0, missionCount: 0, lastActive: "-", status: "idle" };
    }
    const deleg = MetricsEngine.counter(metricKey(runtime, "delegations")).value();
    const verifTotal = MetricsEngine.counter(metricKey(runtime, "verifications")).value();
    const verifPass = MetricsEngine.counter(metricKey(runtime, "verifications_passed")).value();
    const missions = MetricsEngine.counter(metricKey(runtime, "missions")).value();
    const tokens = MetricsEngine.counter(metricKey(runtime, "tokens")).value();
    const latHist = MetricsEngine.histogram(metricKey(runtime, "latency_ms"));
    const confHist = MetricsEngine.histogram(metricKey(runtime, "confidence"));
    const lastActiveVal = MetricsEngine.gauge(metricKey(runtime, "last_active")).value();
    return {
      runtime,
      avgLatencyMs: Math.round(latHist.percentile(50)),
      delegationRate: Math.round((deleg / reqs) * 100),
      verificationPassRate: verifTotal > 0 ? Math.round((verifPass / verifTotal) * 100) : 100,
      avgConfidence: Math.round(confHist.percentile(50)),
      avgTokens: Math.round(tokens / reqs),
      missionCount: missions,
      lastActive: lastActiveVal > 0 ? new Date(lastActiveVal).toISOString() : "-",
      status: "healthy",
    };
  }

  allSnapshots(): RuntimeKPISnapshot[] {
    const names = new Set(
      Object.keys(MetricsEngine.snapshot().counters)
        .filter(k => k.startsWith("runtime."))
        .map(k => k.split(".")[1])
    );
    return [...names].map(r => this.snapshot(r));
  }
}

export const runtimeMetrics = new RuntimeMetricsAggregator();
