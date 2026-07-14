import type { ComponentId, ComponentStatus, ComponentManifest } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import type { RuntimeEvent } from "../../contracts/EventContracts";
import { RegistryLifecycle } from "./RegistryLifecycle";

export type DeliveryMode = "FireAndForget" | "ExactlyOnce" | "AtLeastOnce" | "Buffered";

export interface ObserverDefinition {
  id: ComponentId;
  manifest: ComponentManifest;
  subscribe: string;
  deliveryMode: DeliveryMode;
  priority: number;
  handle(event: RuntimeEvent): Promise<void>;
}

const entries: ObserverDefinition[] = [];

export const ObserverRegistry = {
  register(def: ObserverDefinition): void {
    RegistryLifecycle.assertMutable();
    entries.push(def);
  },

  getObserversForEvent(eventType: string): ObserverDefinition[] {
    return entries
      .filter(e => e.subscribe === eventType)
      .sort((a, b) => a.priority - b.priority);
  },

  getAll(): ObserverDefinition[] { return [...entries]; },

  remove(id: ComponentId): void {
    RegistryLifecycle.assertMutable();
    const idx = entries.findIndex(e => e.id.name === id.name && e.id.namespace === id.namespace);
    if (idx >= 0) entries.splice(idx, 1);
  },

  clear(): void {
    RegistryLifecycle.assertMutable();
    entries.length = 0;
  },
};
