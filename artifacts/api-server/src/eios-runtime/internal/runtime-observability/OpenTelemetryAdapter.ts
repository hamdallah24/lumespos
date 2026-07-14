import { MetricsEngine } from "./MetricsEngine";
import { RuntimeLogger } from "./RuntimeLogger";

interface OTelExporterConfig {
  endpoint: string;
  protocol: "grpc" | "http/protobuf";
  headers?: Record<string, string>;
}

let config: OTelExporterConfig | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

async function pushMetrics(): Promise<void> {
  if (!config) return;
  const snapshot = MetricsEngine.snapshot();
  try {
    const body = JSON.stringify({
      resourceMetrics: [{
        resource: { attributes: [{ key: "service.name", value: { stringValue: "eios-runtime" } }] },
        scopeMetrics: [{
          metrics: [
            ...Object.entries(snapshot.counters).map(([name, value]) => ({
              name, data: { counter: { dataPoints: [{ asDouble: value }] } },
            })),
            ...Object.entries(snapshot.gauges).map(([name, value]) => ({
              name, data: { gauge: { dataPoints: [{ asDouble: value }] } },
            })),
          ],
        }],
      }],
    });
    if (config.protocol === "http/protobuf") {
      await fetch(config.endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...config.headers }, body });
    }
  } catch (err) {
    RuntimeLogger.error("OTelAdapter", "Failed to export metrics", { error: String(err) });
  }
}

export const OpenTelemetryAdapter = {
  configure(cfg: OTelExporterConfig): void { config = cfg; },
  start(intervalMs = 10000): void { if (interval) return; interval = setInterval(pushMetrics, intervalMs); },
  stop(): void { if (interval) { clearInterval(interval); interval = null; } },
};
