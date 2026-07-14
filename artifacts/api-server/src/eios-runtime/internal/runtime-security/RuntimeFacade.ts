import type { ExecutionResult, PipelineContext } from "../../contracts/PipelineContracts";
import type { RuntimeFacade as RuntimeFacadeContract } from "../../contracts/RuntimeContracts";
import type { ComponentId } from "../../contracts/ComponentId";
import { PipelineEngine } from "../PipelineEngine";
import { PipelineContext as PipelineContextImpl } from "../../public/PipelineContext";
import { ObserverEngine } from "../../public/ObserverEngine";
import { PermissionTokenManager } from "./PermissionTokenManager";
import { Authorization } from "./Authorization";
import { schedulePipeline, unschedulePipeline } from "../PipelineScheduler";
import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";
import { RegistryLifecycle } from "../runtime-metadata/RegistryLifecycle";
import { RuntimeHealth } from "../RuntimeHealth";
import { MetricsEngine } from "../runtime-observability/MetricsEngine";
import { TraceManager } from "../runtime-observability/TraceManager";
import { RuntimeSnapshotManager } from "../RuntimeSnapshotManager";
import { GracefulShutdownManager } from "../runtime-observability/GracefulShutdownManager";

export function createRuntimeFacade(pluginId: ComponentId): RuntimeFacadeContract {
  const token = PermissionTokenManager.issue(pluginId, ["read_context", "emit_event"]);

  return {
    async execute(intent: string, _payload?: unknown): Promise<ExecutionResult> {
      Authorization.assert(`plugin:${pluginId.name}`, null, "execute_pipeline");
      const ctx = new PipelineContextImpl(`facade-${Date.now().toString(36)}`);
      return PipelineEngine.execute(intent, ctx);
    },

    subscribe(event: string, handler: Function): void {
      Authorization.assert(`plugin:${pluginId.name}`, null, "subscribe_event");
      ObserverEngine.dispatch({
        id: `sub-${Date.now().toString(36)}`,
        correlationId: pluginId.name,
        type: { namespace: "eios.core", type: "event", name: event, version: { major: 1, minor: 0, patch: 0 } },
        payload: { handler: handler.toString().slice(0, 200) },
        timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 },
      });
    },

    capability(id: string): boolean {
      Authorization.assert(`plugin:${pluginId.name}`, null, "use_capability");
      return PermissionTokenManager.hasCapability(token, id);
    },

    emit(event: string, payload: unknown): void {
      Authorization.assert(`plugin:${pluginId.name}`, null, "emit_event");
      ObserverEngine.dispatch({
        id: `emit-${Date.now().toString(36)}`,
        correlationId: pluginId.name,
        type: { namespace: "eios.core", type: "event", name: event, version: { major: 1, minor: 0, patch: 0 } },
        payload,
        timestamp: new Date().toISOString(),
        version: { major: 1, minor: 0, patch: 0 },
      });
    },

    context(): PipelineContext {
      Authorization.assert(`plugin:${pluginId.name}`, null, "read_context");
      return new PipelineContextImpl(`ctx-${Date.now().toString(36)}`);
    },

    schedule(intervalMs: number, profileId?: string): string {
      Authorization.assert(`plugin:${pluginId.name}`, null, "execute_pipeline");
      return schedulePipeline(intervalMs, profileId ? parseInt(profileId) : undefined);
    },

    unschedule(taskId: string): boolean {
      Authorization.assert(`plugin:${pluginId.name}`, null, "execute_pipeline");
      return unschedulePipeline(taskId);
    },

    registry() {
      Authorization.assert(`plugin:${pluginId.name}`, null, "read_context");
      return {
        list: () => PipelineStageRegistry.getActive().map(s => `${s.id.namespace}:${s.id.type}:${s.id.name}`),
        has: (id: string) => PipelineStageRegistry.getActive().some(s => s.id.name === id),
      };
    },

    async health(): Promise<{ status: string; score: number }> {
      Authorization.assert(`plugin:${pluginId.name}`, null, "read_context");
      RuntimeHealth.record();
      const score = RuntimeHealth.score();
      return { status: score.overall >= 70 ? "healthy" : "degraded", score: score.overall };
    },

    metrics(): Record<string, number> {
      Authorization.assert(`plugin:${pluginId.name}`, null, "read_context");
      return MetricsEngine.snapshot().counters;
    },

    trace(operation: string) {
      const traceId = TraceManager.createTrace();
      const span = TraceManager.createSpan(operation, traceId);
      return {
        spanId: span.spanId,
        end: (status: "ok" | "error") => TraceManager.endSpan(span.spanId, status),
      };
    },

    async snapshot(): Promise<Record<string, unknown>> {
      Authorization.assert(`plugin:${pluginId.name}`, null, "read_context");
      const snapshotId = RuntimeSnapshotManager.createSnapshot("facade-request");
      return { snapshotId } as Record<string, unknown>;
    },

    async shutdown(): Promise<void> {
      Authorization.assert(`plugin:${pluginId.name}`, null, "execute_pipeline");
      await GracefulShutdownManager.shutdown(30000);
    },
  };
}
