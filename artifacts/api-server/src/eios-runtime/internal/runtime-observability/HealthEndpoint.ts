import { RegistryLifecycle } from "../runtime-metadata/RegistryLifecycle";
import { RuntimeHealth } from "../RuntimeHealth";
import type { RuntimeGovernance } from "../runtime-governance/RuntimeGovernance";
import { MetricsEngine } from "./MetricsEngine";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  score: number;
  registries: number;
  pipeline: number;
  memory: number;
  governance: number;
  uptime: number;
  timestamp: string;
}

interface ReadyResponse {
  ready: boolean;
  registriesFrozen: boolean;
  runtimeRunning: boolean;
  governanceActive: boolean;
}

interface LiveResponse {
  alive: boolean;
  uptime: number;
  eventLoopLag: number;
}

interface MetricsResponse {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, { avg: number; p50: number; p95: number; p99: number }>;
}

const startTime = Date.now();

export const HealthEndpoint = {
  health(): HealthResponse {
    const score = RuntimeHealth.score();
    const dims = [
      score.registries, score.plugins, score.pipeline,
      score.memory, score.eventBus, score.dependencies,
      score.governance, score.scheduler,
    ];
    const avg = Math.round(dims.reduce((a, b) => a + b, 0) / dims.length);
    const isFrozen = RegistryLifecycle.isFrozen();
    return {
      status: avg >= 90 ? "healthy" : avg >= 70 ? "degraded" : "unhealthy",
      score: avg,
      registries: score.registries,
      pipeline: score.pipeline,
      memory: score.memory,
      governance: score.governance,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  },

  ready(): ReadyResponse {
    return {
      ready: RegistryLifecycle.isFrozen() && RegistryLifecycle.state === "RUNNING",
      registriesFrozen: RegistryLifecycle.isFrozen(),
      runtimeRunning: RegistryLifecycle.state === "RUNNING",
      governanceActive: true,
    };
  },

  live(): LiveResponse {
    return { alive: true, uptime: Math.floor((Date.now() - startTime) / 1000), eventLoopLag: 0 };
  },

  metrics(): MetricsResponse {
    const snap = MetricsEngine.snapshot();
    return {
      counters: snap.counters,
      gauges: snap.gauges,
      histograms: Object.fromEntries(
        Object.entries(snap.histograms).map(([k, v]) => [k, { avg: v.avg, p50: v.p50, p95: v.p95, p99: v.p99 }])
      ),
    };
  },
};
