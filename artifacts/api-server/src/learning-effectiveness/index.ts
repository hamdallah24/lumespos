export { learningTelemetry, recordTelemetry, TraceContext } from "./telemetry";
export { TelemetryStore } from "./types";
export type {
  TelemetryEvent, TelemetryEventType, TelemetryResult,
  TelemetrySeverity, TelemetryCategory, ExportFormat, TelemetryStoreHealth,
} from "./types";

import { IntegrationManager } from "../learning-integration/IntegrationManager";
import { recordTelemetry, TraceContext } from "./telemetry";

let telemetryActive = false;

export function activateLearningTelemetry(): void {
  if (telemetryActive) return;
  telemetryActive = true;

  const env = process.env["NODE_ENV"] ?? "development";

  const origRetrieve = IntegrationManager.retrieve.bind(IntegrationManager);
  IntegrationManager.retrieve = ((input: any) => {
    TraceContext.startTrace();
    const start = Date.now();
    let result: any;
    let error: any = null;
    try {
      result = origRetrieve(input);
      return result;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      recordTelemetry({
        type: "retrieve", category: "retrieve",
        executive: input.executive, engine: "all", capability: "retrieval",
        durationMs: Date.now() - start, runtime: "learning-runtime", environment: env,
        result: error ? "failure" : (result?.length ?? 0) > 0 ? "success" : "partial",
        traceId: TraceContext.getTraceId() ?? undefined,
        executiveRole: input.executive,
        metadata: { query: input.query?.slice(0, 100), domain: input.domain, resultCount: result?.length ?? 0 },
      });
    }
  }) as any;

  const origIngest = IntegrationManager.ingest.bind(IntegrationManager);
  IntegrationManager.ingest = ((input: any) => {
    TraceContext.startTrace();
    const start = Date.now();
    let error: any = null;
    let count = 0;
    try {
      count = origIngest(input);
      return count;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      recordTelemetry({
        type: "ingest", category: "ingest",
        executive: input.executive, engine: "all", capability: "ingestion",
        durationMs: Date.now() - start, runtime: "learning-runtime", environment: env,
        result: error ? "failure" : count > 0 ? "success" : "partial",
        traceId: TraceContext.getTraceId() ?? undefined,
        executiveRole: input.executive,
        metadata: { domain: input.domain, outcome: input.outcome, engineCount: count },
      });
    }
  }) as any;

  const origFeedback = IntegrationManager.provideFeedback.bind(IntegrationManager);
  IntegrationManager.provideFeedback = ((input: any) => {
    TraceContext.startTrace();
    const start = Date.now();
    let error: any = null;
    let count = 0;
    try {
      count = origFeedback(input);
      return count;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      recordTelemetry({
        type: "feedback", category: "feedback",
        executive: input.executive, engine: "all", capability: "feedback",
        durationMs: Date.now() - start, runtime: "learning-runtime", environment: env,
        result: error ? "failure" : count > 0 ? "success" : "partial",
        traceId: TraceContext.getTraceId() ?? undefined,
        executiveRole: input.executive, decisionId: input.decisionId,
        metadata: { decisionId: input.decisionId, domain: input.domain, outcome: input.outcome, engineCount: count },
      });
    }
  }) as any;

  const origMaintenance = IntegrationManager.runMaintenance.bind(IntegrationManager);
  IntegrationManager.runMaintenance = (() => {
    TraceContext.startTrace();
    const start = Date.now();
    let error: any = null;
    let results: any = [];
    try {
      results = origMaintenance();
      return results;
    } catch (e) {
      error = e;
      throw e;
    } finally {
      recordTelemetry({
        type: "maintenance", category: "maintenance",
        engine: "all", capability: "maintenance",
        durationMs: Date.now() - start, runtime: "learning-runtime", environment: env,
        result: error ? "failure" : "success",
        traceId: TraceContext.getTraceId() ?? undefined,
        metadata: { engineResults: results.map((r: any) => `${r.engine}:${r.actions}`).join(",") },
      });
    }
  }) as any;
}
