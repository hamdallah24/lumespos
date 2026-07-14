import type { Capability } from "../../contracts/CapabilityContracts";
import { CapabilityRegistry } from "../runtime-metadata/CapabilityRegistry";
import { CapabilityResolver } from "./CapabilityResolver";
import { CapabilityPriority } from "./CapabilityPriority";

export const CapabilityNegotiator = {
  negotiateAll(): Map<string, Capability> {
    const all = CapabilityRegistry.getAll();
    const byName = new Map<string, Capability[]>();

    for (const cap of all) {
      const key = cap.name;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key)!.push(cap);
    }

    const selected = new Map<string, Capability>();

    for (const [name, versions] of byName) {
      if (versions.length === 1) {
        selected.set(name, versions[0]);
        CapabilityRegistry.setProvider(name, versions[0]);
      } else {
        const best = CapabilityPriority.selectBest(versions);
        selected.set(name, best);
        CapabilityRegistry.setProvider(name, best);
      }
    }

    return selected;
  },

  canResolve(name: string): boolean {
    return CapabilityRegistry.getByName(name).length > 0;
  },

  getResolution(name: string): Capability | undefined {
    return CapabilityResolver.resolve(name);
  },
};
