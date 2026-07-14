import type { ComponentId, ComponentStatus, ComponentManifest } from "../../contracts";
import { componentIdEquals, formatComponentId } from "../../contracts/ComponentId";
import type { PipelineContext, ContextDelta } from "../../contracts/PipelineContracts";
import { RegistryLifecycle } from "./RegistryLifecycle";

export interface StageDefinition {
  id: ComponentId;
  manifest: ComponentManifest;
  execute(ctx: PipelineContext): Promise<ContextDelta>;
  canRun?(ctx: PipelineContext): boolean;
  rollback?(ctx: PipelineContext): Promise<void>;
  timeout: number;
  retries: number;
}

const entries: StageDefinition[] = [];
const statuses = new Map<string, ComponentStatus>();

export const PipelineStageRegistry = {
  register(def: StageDefinition): void {
    RegistryLifecycle.assertMutable();
    if (entries.some(e => componentIdEquals(e.id, def.id))) {
      throw new Error(`Stage already registered: ${formatComponentId(def.id)}`);
    }
    entries.push(def);
    statuses.set(formatComponentId(def.id), "ACTIVE");
  },

  get(id: ComponentId): StageDefinition | undefined {
    return entries.find(e => componentIdEquals(e.id, id));
  },

  getBestVersion(ns: string, name: string): StageDefinition | undefined {
    const candidates = entries.filter(e => e.id.namespace === ns && e.id.name === name);
    return candidates.sort((a, b) =>
      b.id.version.major - a.id.version.major ||
      b.id.version.minor - a.id.version.minor
    )[0];
  },

  getAll(): StageDefinition[] { return [...entries]; },

  setStatus(id: ComponentId, status: ComponentStatus): void {
    RegistryLifecycle.assertMutable();
    statuses.set(formatComponentId(id), status);
  },

  getStatus(id: ComponentId): ComponentStatus {
    return statuses.get(formatComponentId(id)) || "DISABLED";
  },

  getActive(): StageDefinition[] {
    return entries.filter(e => statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },

  clear(): void {
    RegistryLifecycle.assertMutable();
    entries.length = 0;
    statuses.clear();
  },
};
