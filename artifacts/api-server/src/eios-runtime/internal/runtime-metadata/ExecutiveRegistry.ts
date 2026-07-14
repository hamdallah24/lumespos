import type { ComponentId, ComponentStatus, ComponentManifest } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import { RegistryLifecycle } from "./RegistryLifecycle";

export interface ExecutiveDefinition {
  id: ComponentId;
  manifest: ComponentManifest;
  role: string;
  capabilities: string[];
  priority: number;
  authority: "full" | "limited" | "observer";
  councilMember: boolean;
}

const entries: ExecutiveDefinition[] = [];
const statuses = new Map<string, ComponentStatus>();

export const ExecutiveRegistry = {
  register(def: ExecutiveDefinition): void {
    RegistryLifecycle.assertMutable();
    entries.push(def);
    statuses.set(formatComponentId(def.id), "ACTIVE");
  },

  get(id: ComponentId): ExecutiveDefinition | undefined {
    return entries.find(e => e.id.name === id.name);
  },

  getByRole(role: string): ExecutiveDefinition | undefined {
    return entries.find(e => e.role === role && statuses.get(formatComponentId(e.id)) === "ACTIVE");
  },

  getAll(): ExecutiveDefinition[] { return [...entries]; },

  getByCapability(capability: string): ExecutiveDefinition[] {
    return entries.filter(e =>
      e.capabilities.includes(capability) &&
      statuses.get(formatComponentId(e.id)) === "ACTIVE"
    );
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
