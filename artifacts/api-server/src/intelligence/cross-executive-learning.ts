// ECP-045 Sprint 5b: Cross-Executive Learning
// Facilitates knowledge transfer between executives.
// Source executive's validated knowledge feeds target executive.

import type { ExecutiveRole, CrossLearningResult } from "./intelligence-types";
import { knowledgeFusion } from "./knowledge-fusion";
import { organizationalMemory } from "./organizational-memory";
import { executiveReputationTracker } from "./executive-reputation";

export class CrossExecutiveLearning {

  /** Transfer validated knowledge from source to target executive */
  transfer(
    source: ExecutiveRole,
    target: ExecutiveRole,
    domain: string,
  ): CrossLearningResult {
    const nodes = knowledgeFusion.crossPollinate(source, target);

    // Update target's reputation specialties
    if (nodes.length > 0) {
      executiveReputationTracker.addSpecialty(target, domain);
    }

    return {
      sourceExecutive: source,
      targetExecutive: target,
      knowledgeNodes: nodes,
      relevance: nodes.length > 0
        ? Math.min(100, nodes.length * 20)
        : 0,
      transferredAt: new Date().toISOString(),
    };
  }

  /** Learn from the best: transfer from top executive to all others */
  learnFromBest(domain: string): CrossLearningResult[] {
    const best = executiveReputationTracker.bestForDomain(domain);
    if (!best) return [];

    const allExecs: ExecutiveRole[] = ["CEO", "CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    const targets = allExecs.filter(e => e !== best);
    const results: CrossLearningResult[] = [];

    for (const target of targets) {
      const result = this.transfer(best, target, domain);
      if (result.relevance > 0) results.push(result);
    }

    return results;
  }

  /** Cross-train all executives in a domain */
  crossTrain(domain: string): CrossLearningResult[] {
    const allExecs: ExecutiveRole[] = ["CEO", "CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    const results: CrossLearningResult[] = [];

    for (const source of allExecs) {
      const targets = allExecs.filter(e => e !== source);
      for (const target of targets) {
        const result = this.transfer(source, target, domain);
        if (result.relevance > 0) results.push(result);
      }
    }

    return results;
  }

  /** Get all transfers */
  stats() {
    return {
      domains: new Set(organizationalMemory.all().map(n => n.domain)).size,
    };
  }
}

export const crossExecutiveLearning = new CrossExecutiveLearning();
