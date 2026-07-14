import type { ComponentId, ComponentStatus, ComponentManifest } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import { RegistryLifecycle } from "./RegistryLifecycle";

export interface TriggerDefinition {
  id: ComponentId;
  manifest: ComponentManifest;
  description: string;
  intent: string;
  condition?: (payload: unknown) => boolean;
  enabled: boolean;
  priority: number;
}

const entries: TriggerDefinition[] = [];
const statuses = new Map<string, ComponentStatus>();

export const TriggerRegistry = {
  register(def: TriggerDefinition): void {
    RegistryLifecycle.assertMutable();
    if (entries.some(e => e.id.name === def.id.name)) {
      throw new Error(`Trigger already registered: ${formatComponentId(def.id)}`);
    }
    entries.push(def);
    statuses.set(formatComponentId(def.id), "ACTIVE");
  },

  get(id: ComponentId): TriggerDefinition | undefined {
    return entries.find(e => e.id.name === id.name && e.id.namespace === id.namespace);
  },

  getByName(name: string): TriggerDefinition | undefined {
    return entries.find(e => e.id.name === name);
  },

  getAll(): TriggerDefinition[] { return [...entries]; },

  getEnabled(): TriggerDefinition[] {
    return entries.filter(e => e.enabled && statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },

  enable(id: string): void {
    const t = entries.find(e => e.id.name === id);
    if (t) t.enabled = true;
  },

  disable(id: string): void {
    const t = entries.find(e => e.id.name === id);
    if (t) t.enabled = false;
  },

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
