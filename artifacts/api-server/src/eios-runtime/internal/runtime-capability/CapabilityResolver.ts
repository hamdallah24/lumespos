import type { ComponentId } from "../../contracts/ComponentId";
import type { Capability, CapabilityConstraint } from "../../contracts/CapabilityContracts";
import { satisfies } from "../../contracts/ComponentId";
import { CapabilityRegistry } from "../runtime-metadata/CapabilityRegistry";
import { CapabilityPriority } from "./CapabilityPriority";

export const CapabilityResolver = {
  resolve(name: string, constraint?: CapabilityConstraint): Capability | undefined {
    const candidates = CapabilityRegistry.getByName(name);
    if (candidates.length === 0) return undefined;

    let filtered = candidates;

    if (constraint?.minVersion) {
      filtered = filtered.filter(c => {
        const cv = c.id.version;
        const mv = constraint.minVersion!;
        if (cv.major < mv.major) return false;
        if (cv.major === mv.major && cv.minor < mv.minor) return false;
        if (cv.major === mv.major && cv.minor === mv.minor && cv.patch < mv.patch) return false;
        return true;
      });
    }

    if (constraint?.maxVersion) {
      filtered = filtered.filter(c => {
        const cv = c.id.version;
        const mv = constraint.maxVersion!;
        if (cv.major > mv.major) return false;
        if (cv.major === mv.major && cv.minor > mv.minor) return false;
        if (cv.major === mv.major && cv.minor === mv.minor && cv.patch > mv.patch) return false;
        return true;
      });
    }

    if (constraint?.maxCost !== undefined) {
      filtered = filtered.filter(c => c.cost <= constraint.maxCost!);
    }

    if (constraint?.maxLatency !== undefined) {
      filtered = filtered.filter(c => c.latency <= constraint.maxLatency!);
    }

    if (constraint?.preferredProvider) {
      const preferred = filtered.find(c => c.provider.name === constraint.preferredProvider);
      if (preferred) return preferred;
    }

    return CapabilityPriority.selectBest(filtered);
  },

  resolveAll(name: string): Capability[] {
    const candidates = CapabilityRegistry.getByName(name);
    return CapabilityPriority.rank(candidates);
  },
};
