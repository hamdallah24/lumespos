import { PipelineEngine } from "./internal/PipelineEngine";
import { RegistryLifecycle } from "./internal/runtime-metadata/RegistryLifecycle";
import { PipelineContext } from "./public/PipelineContext";
import { RuntimeLogger } from "./internal/runtime-observability/RuntimeLogger";
import { RuntimeState } from "./internal/RuntimeState";
import { clearAllSchedules } from "./internal/PipelineScheduler";

export const EIOSOrchestrator = {
  initialize(): void {
    RuntimeState.start();
    RuntimeLogger.info("EIOSOrchestrator", "Adapter initialized");
  },

  async runWithEngine(profileId: string): Promise<import("./contracts/PipelineContracts").ExecutionResult | null> {
    if (!RegistryLifecycle.isFrozen()) return null;
    const ctx = new PipelineContext(Date.now().toString(36));
    return PipelineEngine.execute(profileId, ctx);
  },

  shutdown(): void {
    RuntimeState.stop();
    clearAllSchedules();
    RuntimeLogger.info("EIOSOrchestrator", "Adapter shut down");
  },

  isRunning(): boolean {
    return RuntimeState.isRunning();
  },
};
