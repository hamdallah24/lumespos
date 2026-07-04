// ADR-009 Phase 3: Evidence Engine
// Pure function. Consumes EvidenceQueryResult → produces EvidenceScore.
// NO LLM, NO DB, NO HTTP, NO mutation.

import type { EvidenceScore } from "./MetricTypes";
import { queryEvidence } from "./EvidenceQuery";

export class EvidenceEngine {

  /** Compute evidence score from current artifact state */
  evaluate(): EvidenceScore {
    const q = queryEvidence();
    const uniqueFiles = q.fileArtifacts.length;
    const diversity = q.totalArtifacts > 0
      ? q.uniqueSources / q.totalArtifacts
      : 0;
    const successRate = q.totalArtifacts > 0
      ? q.verifiedCount / q.totalArtifacts
      : 0;

    const quality = Math.max(0.05, Math.min(1,
      (uniqueFiles * 0.12) +
      (diversity * 0.35) +
      (successRate * 0.15) +
      (q.searchArtifacts.length * 0.08)
    ));

    const confidence = Math.min(100, Math.round(
      (quality * 50) + (successRate * 30) + (diversity * 20)
    ));

    return {
      quality,
      uniqueFiles,
      toolDiversity: diversity,
      toolsSucceeded: q.verifiedCount,
      toolsFailed: q.unverifiedCount,
      confidence,
      strength: quality > 0.7 ? "strong" : quality > 0.4 ? "moderate" : "weak",
    };
  }
}

export const evidenceEngine = new EvidenceEngine();
