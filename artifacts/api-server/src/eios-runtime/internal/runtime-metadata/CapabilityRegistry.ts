import type { ComponentId, ComponentStatus } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import type { Capability } from "../../contracts/CapabilityContracts";
import { RegistryLifecycle } from "./RegistryLifecycle";

const entries: Capability[] = [];
const statuses = new Map<string, ComponentStatus>();
const providers = new Map<string, Capability>();

export const CapabilityRegistry = {
  register(cap: Capability): void {
    RegistryLifecycle.assertMutable();
    entries.push(cap);
    statuses.set(formatComponentId(cap.id), "ACTIVE");
  },

  get(id: ComponentId): Capability | undefined {
    return entries.find(e => e.id.name === id.name && e.id.namespace === id.namespace);
  },

  getByName(name: string): Capability[] {
    return entries.filter(e => e.name === name && statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },

  has(name: string): boolean {
    return entries.some(e => e.name === name && statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },

  setProvider(key: string, cap: Capability): void {
    providers.set(key, cap);
  },

  getProvider(key: string): Capability | undefined {
    return providers.get(key);
  },

  getAll(): Capability[] { return [...entries]; },

  setStatus(id: ComponentId, status: ComponentStatus): void {
    RegistryLifecycle.assertMutable();
    statuses.set(formatComponentId(id), status);
  },

  clear(): void {
    RegistryLifecycle.assertMutable();
    entries.length = 0;
    statuses.clear();
    providers.clear();
  },
};
