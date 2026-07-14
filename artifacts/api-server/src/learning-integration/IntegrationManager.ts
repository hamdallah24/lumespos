import type { UnifiedLearningResult, RetrieveInput, IngestInput, FeedbackInput, IntegrationMetrics, LearningEngine } from "./types";
import { LearningRegistry } from "./LearningRegistry";

class IntegrationManagerImpl {
  private metrics = {
    retrieveCalls: 0,
    ingestCalls: 0,
    feedbackCalls: 0,
    maintenanceRuns: 0,
    failedCalls: 0,
    totalLatencyMs: 0,
    totalCalls: 0,
    perEngineCalls: {} as Record<string, number>,
    perCapabilityCalls: {} as Record<string, number>,
    engineTimestamps: {} as Record<string, { lastRetrieve?: string; lastFeedback?: string; lastMaintenance?: string; errors: number }>,
  };

  private track(engineId: string, caps: string[], latencyMs: number, success: boolean): void {
    this.metrics.totalCalls++;
    this.metrics.totalLatencyMs += latencyMs;
    this.metrics.perEngineCalls[engineId] = (this.metrics.perEngineCalls[engineId] ?? 0) + 1;
    for (const c of caps) {
      this.metrics.perCapabilityCalls[c] = (this.metrics.perCapabilityCalls[c] ?? 0) + 1;
    }
    if (!success) this.metrics.failedCalls++;
    if (!this.metrics.engineTimestamps[engineId]) {
      this.metrics.engineTimestamps[engineId] = { errors: 0 };
    }
    if (!success) this.metrics.engineTimestamps[engineId].errors++;
  }

  discover() {
    return LearningRegistry.getAllInfo();
  }

  retrieve(input: RetrieveInput): UnifiedLearningResult[] {
    this.metrics.retrieveCalls++;
    const engines = LearningRegistry.getByCapability("retrieval");
    const all: UnifiedLearningResult[] = [];
    for (const engine of engines) {
      const start = Date.now();
      try {
        const results = engine.retrieve(input);
        all.push(...results);
        this.metrics.engineTimestamps[engine.info.id] ??= { errors: 0 };
        this.metrics.engineTimestamps[engine.info.id].lastRetrieve = new Date().toISOString();
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, true);
      } catch {
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, false);
      }
    }
    return all;
  }

  ingest(input: IngestInput): number {
    this.metrics.ingestCalls++;
    const engines = LearningRegistry.getByCapability("ingestion");
    let count = 0;
    for (const engine of engines) {
      const start = Date.now();
      try {
        engine.ingest(input);
        count++;
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, true);
      } catch {
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, false);
      }
    }
    return count;
  }

  provideFeedback(input: FeedbackInput): number {
    this.metrics.feedbackCalls++;
    const engines = LearningRegistry.getByCapability("feedback");
    let count = 0;
    for (const engine of engines) {
      const start = Date.now();
      try {
        engine.feedback(input);
        count++;
        this.metrics.engineTimestamps[engine.info.id] ??= { errors: 0 };
        this.metrics.engineTimestamps[engine.info.id].lastFeedback = new Date().toISOString();
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, true);
      } catch {
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, false);
      }
    }
    return count;
  }

  runMaintenance(): { engine: string; actions: number; details: string[] }[] {
    this.metrics.maintenanceRuns++;
    const engines = LearningRegistry.getByCapability("maintenance");
    const results: { engine: string; actions: number; details: string[] }[] = [];
    for (const engine of engines) {
      const start = Date.now();
      try {
        const result = engine.maintenance();
        results.push({ engine: engine.info.id, ...result });
        this.metrics.engineTimestamps[engine.info.id] ??= { errors: 0 };
        this.metrics.engineTimestamps[engine.info.id].lastMaintenance = new Date().toISOString();
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, true);
      } catch {
        results.push({ engine: engine.info.id, actions: 0, details: [`${engine.info.id} maintenance failed`] });
        this.track(engine.info.id, engine.info.capabilities, Date.now() - start, false);
      }
    }
    return results;
  }

  health(): {
    engine: string; adapter: string; registered: boolean; healthy: boolean;
    supportedCapabilities: string[]; lastMaintenance?: string; lastFeedback?: string;
    lastRetrieve?: string; errors: number; message?: string;
  }[] {
    return LearningRegistry.getAll().map(e => {
      const ts = this.metrics.engineTimestamps[e.info.id];
      try {
        const h = e.health();
        return {
          engine: e.info.id, adapter: e.info.name, registered: true, healthy: h.status === "healthy",
          supportedCapabilities: e.info.capabilities, message: h.message,
          lastMaintenance: ts?.lastMaintenance, lastFeedback: ts?.lastFeedback,
          lastRetrieve: ts?.lastRetrieve, errors: ts?.errors ?? 0,
        };
      } catch {
        return {
          engine: e.info.id, adapter: e.info.name, registered: true, healthy: false,
          supportedCapabilities: e.info.capabilities,
          lastMaintenance: ts?.lastMaintenance, lastFeedback: ts?.lastFeedback,
          lastRetrieve: ts?.lastRetrieve, errors: (ts?.errors ?? 0) + 1,
        };
      }
    });
  }

  getMetrics(): IntegrationMetrics {
    return {
      retrieveCalls: this.metrics.retrieveCalls,
      ingestCalls: this.metrics.ingestCalls,
      feedbackCalls: this.metrics.feedbackCalls,
      maintenanceRuns: this.metrics.maintenanceRuns,
      failedCalls: this.metrics.failedCalls,
      averageLatency: this.metrics.totalCalls > 0 ? Math.round(this.metrics.totalLatencyMs / this.metrics.totalCalls) : 0,
      perEngineCalls: { ...this.metrics.perEngineCalls },
      perCapabilityCalls: { ...this.metrics.perCapabilityCalls },
    };
  }
}

export const IntegrationManager = new IntegrationManagerImpl();
