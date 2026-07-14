import { EIOSOrchestrator } from "./EIOSOrchestrator";
export { EIOSOrchestrator };
export { executePipeline } from "./PipelineController";
export { TriggerManager } from "./TriggerManager";
export { schedulePipeline, unschedulePipeline, getScheduledTasks, clearAllSchedules } from "./PipelineScheduler";
export { createPipelineContext } from "./PipelineContext";
export { registerStage, getStageHandler, clearStages } from "./PipelineRegistry";
export { getAuditLog, getAuditByCorrelationId, clearAuditLog, recordAudit } from "./PipelineAudit";
export { getMetrics } from "./PipelineMetrics";
export { RuntimeState } from "./RuntimeState";
export { ExecutiveDispatchRegistry } from "./public/ExecutiveDispatchRegistry";
export { RuntimeLogger, TraceManager, MetricsEngine, HealthEndpoint, DashboardModelBuilder } from "./internal/runtime-observability";
export type { DashboardModel } from "./internal/runtime-observability";
export { RuntimeIdentity, Authorization, PermissionTokenManager, SecretManager, ManifestVerifier, SecureConfiguration, AuditTrail, APIHardener, SupplyChainAuditor, SecurityMonitor } from "./internal/runtime-security";
export { createRuntimeFacade } from "./internal/runtime-security";
export type { PermissionToken, AuditEntry, AuditAction, ManifestVerificationResult } from "./internal/runtime-security";

import { bootstrapRuntime, getBootReport } from "./internal/Bootstrap";
import { PipelineEngine } from "./internal/PipelineEngine";
import { RegistryLifecycle } from "./internal/runtime-metadata/RegistryLifecycle";
import { ExecutiveRegistry } from "./internal/runtime-metadata/ExecutiveRegistry";
import { RuntimeGovernance } from "./internal/runtime-governance/RuntimeGovernance";
import { RuntimeSnapshotManager } from "./internal/RuntimeSnapshotManager";
import { RuntimeLogger } from "./internal/runtime-observability/RuntimeLogger";
import { GracefulShutdownManager } from "./internal/runtime-observability/GracefulShutdownManager";
import { MetricsEngine } from "./internal/runtime-observability/MetricsEngine";
import { TraceManager } from "./internal/runtime-observability/TraceManager";
import { ResourceMonitor } from "./internal/runtime-observability/ResourceMonitor";
import { CircuitBreaker } from "./internal/runtime-observability/CircuitBreaker";
import { BulkheadManager } from "./internal/runtime-observability/BulkheadManager";
import { BackpressureController } from "./internal/runtime-observability/BackpressureController";
import { PerformanceBudget } from "./internal/runtime-observability/PerformanceBudget";
import { RuntimeConfiguration } from "./internal/runtime-observability/RuntimeConfiguration";
import { RuntimeProfiler } from "./internal/runtime-observability/RuntimeProfiler";
import { AuditTrail } from "./internal/runtime-security/AuditTrail";

let initialized = false;

export async function initializeEIOSRuntime(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Self-registration: stages register themselves + DAG edges
  await import("./stages");

  // Self-registration: observers register themselves with event subscriptions
  await import("./observers");

  // Self-registration: profiles register themselves with intents
  await import("./profiles");

  // Self-registration: events
  await import("./events");

  // Self-registration: policies
  await import("./policies");

  // Self-registration: capabilities
  await import("./capabilities");

  // Self-registration: executives
  await import("./executives");

  // Initialize legacy adapter for backward compatibility
  EIOSOrchestrator.initialize();

  // Run full bootstrap sequence: container -> discovery -> registry -> deps -> freeze -> health -> RUNNING
  await bootstrapRuntime();

  // EPIC D: Initialize observability stack
  const envConfig = RuntimeConfiguration.get();
  RuntimeLogger.setLevel(envConfig.logLevel as any);

  if (envConfig.circuitBreakerEnabled) {
    CircuitBreaker.register("PipelineEngine");
    CircuitBreaker.register("ExecutiveDispatch");
    CircuitBreaker.register("ObserverDispatch");
  }

  if (envConfig.backpressureMode) {
    BackpressureController.configure({ mode: envConfig.backpressureMode as any });
  }

  BulkheadManager.createPool("PipelineEngine", 10);
  BulkheadManager.createPool("ObserverEngine", 20);

  // Performance budget rules
  if (envConfig.performanceBudgetEnabled) {
    PerformanceBudget.getRules().forEach(r => RuntimeProfiler.setThreshold(r.operation, r.slaMs));
  }

  // Graceful shutdown steps
  GracefulShutdownManager.register("StopTrigger", 0, async () => { /* triggers stopped */ });
  GracefulShutdownManager.register("StopScheduler", 1, async () => { EIOSOrchestrator.shutdown(); });
  GracefulShutdownManager.register("StopGovernance", 2, async () => { RuntimeGovernance.stopPeriodicCheck(); });
  GracefulShutdownManager.register("FlushMetrics", 3, async () => { MetricsEngine.snapshot(); });
  GracefulShutdownManager.register("PersistSnapshot", 4, async () => { RuntimeSnapshotManager.createSnapshot("shutdown"); });
  GracefulShutdownManager.register("ShutdownRuntime", 5, async () => { RegistryLifecycle.transition("SHUTDOWN"); });

  TraceManager.createTrace(); // Initialize trace counter
  ResourceMonitor.snapshot(); // First resource sample

  RuntimeLogger.info("EIOS", `Runtime v4.1.1 initialized`);
  RuntimeLogger.info("EIOS", getBootReport());
}

export async function shutdownEIOSRuntime(): Promise<void> {
  if (!initialized) return;
  initialized = false;

  RuntimeLogger.info("EIOS", "Shutting down runtime...");
  await GracefulShutdownManager.shutdown(30000);
  RuntimeLogger.info("EIOS", "Runtime shut down gracefully");
}
