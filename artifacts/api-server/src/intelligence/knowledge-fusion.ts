// ECP-045 Sprint 2: Knowledge Fusion
// Merges knowledge from multiple executives into organizational knowledge.
// Cross-pollination: CTO learns from COO, CEO learns from CFO.

import type { ExecutiveRole, OrgKnowledgeNode } from "./intelligence-types";
import { organizationalMemory } from "./organizational-memory";
import { learningEngine } from "../learning/learning-engine";
import { knowledgeGraph } from "../learning/knowledge-graph";

export class KnowledgeFusion {

  /** Fuse knowledge from multiple executives into organizational memory */
  fuse(contributors: ExecutiveRole[], domain: string): OrgKnowledgeNode[] {
    const results: OrgKnowledgeNode[] = [];

    for (const exec of contributors) {
      const execNodes = knowledgeGraph.findByExecutive(exec)
        .filter(n => n.reinforced >= 2); // Only well-reinforced knowledge

      for (const node of execNodes) {
        const proposed = organizationalMemory.propose(
          node.content,
          "INSIGHT",
          domain,
          exec,
          [node.domain, node.type.toLowerCase()],
        );
        if (proposed.validated && !results.find(r => r.id === proposed.id)) {
          results.push(proposed);
        }
      }
    }

    // Auto-validate if multiple executives contributed similar insight
    for (const result of results) {
      if (result.sources.length >= 2) {
        organizationalMemory.validate(result.id, "CEO");
      }
    }

    return results;
  }

  /** Cross-pollinate: transfer knowledge from one executive's scope to another */
  crossPollinate(source: ExecutiveRole, target: ExecutiveRole): OrgKnowledgeNode[] {
    const sourceNodes = knowledgeGraph.findByExecutive(source)
      .filter(n => n.confidence >= 70 && n.reinforced >= 2);
    const results: OrgKnowledgeNode[] = [];

    for (const node of sourceNodes) {
      // Check if target already has similar knowledge
      const targetNodes = knowledgeGraph.findByExecutive(target);
      const alreadyKnown = targetNodes.some(tn =>
        tn.domain === node.domain &&
        tn.type === node.type &&
        this.overlap(tn.content, node.content) > 0.4
      );

      if (!alreadyKnown) {
        const proposed = organizationalMemory.propose(
          `[Cross-learned from ${source}] ${node.content}`,
          "BEST_PRACTICE",
          node.domain,
          target,
          ["cross-learned", source.toLowerCase(), node.type.toLowerCase()],
        );
        results.push(proposed);
      }
    }

    return results;
  }

  /** Merge domain knowledge from all executives */
  mergeDomain(domain: string): OrgKnowledgeNode[] {
    const allExecs: ExecutiveRole[] = ["CEO", "CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    return this.fuse(allExecs, domain);
  }

  private overlap(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    return [...wordsA].filter(w => wordsB.has(w)).length / Math.max(wordsA.size, wordsB.size);
  }
}

export const knowledgeFusion = new KnowledgeFusion();
