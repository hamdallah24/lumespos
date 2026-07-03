// ECP-034: Conflict Detector — duplicate + dependency conflict detection
// Frozen. Prevents duplicate missions and dependency violations.

import type { MissionProposal } from "./mission-types";
import { proposalRegistry } from "./proposal-registry";

interface ConflictResult {
  hasConflict: boolean;
  conflicts: { proposalId: string; similarity: number; reason: string }[];
}

class ConflictDetector {
  detect(newProposal: Omit<MissionProposal, "conflictIds">): ConflictResult {
    const conflicts: ConflictResult["conflicts"] = [];
    const existing = proposalRegistry.getAllProposals();

    for (const existingProposal of existing) {
      if (existingProposal.status === "ARCHIVED" || existingProposal.status === "COMPLETED") continue;

      // Check title similarity
      const similarity = this.computeSimilarity(newProposal.title, existingProposal.title);
      if (similarity > 80) {
        conflicts.push({
          proposalId: existingProposal.id,
          similarity,
          reason: `Similar title (${similarity}%): "${existingProposal.title}"`,
        });
      }

      // Check dependency conflict
      if (newProposal.dependencies.includes(existingProposal.id)) {
        conflicts.push({
          proposalId: existingProposal.id,
          similarity: 100,
          reason: `Dependency not met: "${existingProposal.title}" is still ${existingProposal.status}`,
        });
      }
    }

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  private computeSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\s+/));
    const bWords = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...aWords].filter(w => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);
    return union.size > 0 ? Math.round((intersection.size / union.size) * 100) : 0;
  }
}

export const conflictDetector = new ConflictDetector();
