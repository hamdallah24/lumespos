import type { Capability } from "../../contracts/CapabilityContracts";

export const CapabilityPriority = {
  selectBest(candidates: Capability[]): Capability {
    return candidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.cost !== b.cost) return a.cost - b.cost;
      if (a.latency !== b.latency) return a.latency - b.latency;
      const aVer = a.id.version;
      const bVer = b.id.version;
      if (bVer.major !== aVer.major) return bVer.major - aVer.major;
      if (bVer.minor !== aVer.minor) return bVer.minor - aVer.minor;
      return bVer.patch - aVer.patch;
    })[0];
  },

  rank(candidates: Capability[]): Capability[] {
    return [...candidates].sort((a, b) => {
      const aScore = a.priority * 10 - a.cost * 2 - a.latency * 0.5;
      const bScore = b.priority * 10 - b.cost * 2 - b.latency * 0.5;
      return bScore - aScore;
    });
  },
};
