import type { ComponentId, ComponentStatus, ComponentManifest } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import { RegistryLifecycle } from "./RegistryLifecycle";

export interface ProfileDefinition {
  id: ComponentId;
  manifest: ComponentManifest;
  intents: string[];
  tags: string[];
}

const entries: ProfileDefinition[] = [];
const statuses = new Map<string, ComponentStatus>();

export const PipelineProfileRegistry = {
  register(def: ProfileDefinition): void {
    RegistryLifecycle.assertMutable();
    if (entries.some(e => e.id.name === def.id.name && e.id.namespace === def.id.namespace)) {
      throw new Error(`Profile already registered: ${formatComponentId(def.id)}`);
    }
    entries.push(def);
    statuses.set(formatComponentId(def.id), "ACTIVE");
  },

  get(id: ComponentId): ProfileDefinition | undefined {
    return entries.find(e => e.id.name === id.name && e.id.namespace === id.namespace);
  },

  getByIntent(intent: string): ProfileDefinition | undefined {
    return entries.find(e => e.intents.includes(intent) && statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },

  getAll(): ProfileDefinition[] { return [...entries]; },

  setStatus(id: ComponentId, status: ComponentStatus): void {
    RegistryLifecycle.assertMutable();
    statuses.set(formatComponentId(id), status);
  },

  clear(): void {
    RegistryLifecycle.assertMutable();
    entries.length = 0;
    statuses.clear();
  },
};
