// ECP-019: Runtime Resolver — RuntimeType → Candidate list
// Frozen. Finds all runtime instances of a given type.

import { organizationEngine } from "../organization-engine";
import type { OrganizationNode } from "../organization-engine";
import type { SchedulerCandidate } from "./execution-manifest";

class RuntimeResolver {
  findCandidates(runtimeType: string): SchedulerCandidate[] {
    const tree = organizationEngine.getTree();
    const candidates: SchedulerCandidate[] = [];

    for (const node of tree) {
      if (node.runtime.toLowerCase() === runtimeType.toLowerCase()) {
        candidates.push({
          id: node.id,
          runtime: node.runtime,
          role: node.runtime,
          health: node.health,
          load: node.health === "Healthy" ? 20 : node.health === "Busy" ? 80 : 100,
          currentMission: undefined,
          queueDepth: 0,
          capabilityScore: node.maturity === "L2" ? 90 : 70,
        });
      }
    }

    // Fallback: CEO always available
    if (candidates.length === 0 && runtimeType.toLowerCase() === "ceo") {
      candidates.push({
        id: "RUNTIME-001", runtime: "CEO", role: "CEO",
        health: "Healthy", load: 20, capabilityScore: 85, queueDepth: 0,
      });
    }

    return candidates;
  }

  findByName(name: string): SchedulerCandidate | null {
    const node = organizationEngine.find(name);
    if (!node) return null;
    return {
      id: node.id, runtime: node.runtime, role: node.runtime,
      health: node.health,
      load: node.health === "Healthy" ? 20 : 80,
      capabilityScore: node.maturity === "L2" ? 90 : 70,
      queueDepth: 0,
    };
  }
}

export const runtimeResolver = new RuntimeResolver();
