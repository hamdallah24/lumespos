import type { ComponentId, ComponentStatus } from "../../contracts";
import { formatComponentId } from "../../contracts/ComponentId";
import type { PolicyRule } from "../../contracts/PolicyContracts";
import { RegistryLifecycle } from "../runtime-metadata/RegistryLifecycle";

const entries: PolicyRule[] = [];
const statuses = new Map<string, ComponentStatus>();

export const PolicyRegistry = {
  register(rule: PolicyRule): void {
    RegistryLifecycle.assertMutable();
    entries.push(rule);
    statuses.set(formatComponentId(rule.id), "ACTIVE");
  },

  get(id: ComponentId): PolicyRule | undefined {
    return entries.find(r => r.id.name === id.name);
  },

  getPoliciesFor(_scope: string): PolicyRule[] {
    return entries.filter(r =>
      statuses.get(formatComponentId(r.id)) !== "DISABLED"
    );
  },

  getAll(): PolicyRule[] { return [...entries]; },

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
