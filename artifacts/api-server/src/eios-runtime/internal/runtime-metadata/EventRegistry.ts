import type { ComponentId, ComponentStatus } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import type { EventDefinition } from "../../contracts/EventContracts";
import { RegistryLifecycle } from "./RegistryLifecycle";

const entries: EventDefinition[] = [];
const statuses = new Map<string, ComponentStatus>();

export const EventRegistry = {
  register(def: EventDefinition): void {
    RegistryLifecycle.assertMutable();
    if (entries.some(e => e.id.name === def.id.name)) {
      throw new Error(`Event already registered: ${formatComponentId(def.id)}`);
    }
    entries.push(def);
    statuses.set(formatComponentId(def.id), "ACTIVE");
  },

  get(id: ComponentId): EventDefinition | undefined {
    return entries.find(e => e.id.name === id.name);
  },

  getByName(name: string): EventDefinition | undefined {
    return entries.find(e => e.id.name === name);
  },

  getAll(): EventDefinition[] { return [...entries]; },

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
