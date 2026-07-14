import { parseComponentId } from "../contracts/ComponentId";
import type { ExecutionResult } from "../contracts/PipelineContracts";
import { PipelineContext } from "./PipelineContext";
import { PipelineResolver } from "./PipelineResolver";
import { PipelineEngine } from "../internal/PipelineEngine";
import { TriggerRegistry } from "../internal/runtime-metadata/TriggerRegistry";
import { RegistryLifecycle } from "../internal/runtime-metadata/RegistryLifecycle";
import { RuntimeState } from "../internal/RuntimeState";

export const TriggerEngine = {
  async fire(triggerId: string, payload?: unknown, branchId?: number): Promise<ExecutionResult | null> {
    if (!RuntimeState.isRunning()) return null;
    if (!RegistryLifecycle.isFrozen()) return null;

    const trigger = TriggerRegistry.getByName(triggerId) ||
      TriggerRegistry.get(parseComponentId(triggerId));
    if (!trigger || !trigger.enabled) return null;
    if (trigger.condition && !trigger.condition(payload)) return null;

    const ctx = new PipelineContext(Date.now().toString(36));
    const intent = trigger.intent || "business_operation";
    const graphId = PipelineResolver.resolve(intent, ctx);
    return PipelineEngine.execute(graphId, ctx);
  },

  getRegisteredTriggers(): string[] {
    return TriggerRegistry.getAll().map(t => t.id.name);
  },

  getEnabledTriggers(): string[] {
    return TriggerRegistry.getEnabled().map(t => t.id.name);
  },
};
