// ECP-029: Knowledge Manager — ingestion, pattern detection, drift analysis
// Frozen. Accepts mission outputs and produces structured knowledge.
// Works in the background. Consultant consumes its output.

import type {
  KnowledgeArtifact, DetectedPattern, ArchitectureDrift,
  PolicyConflict, KnowledgeKPI,
} from "./knowledge-types";

class KnowledgeManager {
  private _artifacts: KnowledgeArtifact[] = [];
  private _patterns: DetectedPattern[] = [];
  private _drifts: ArchitectureDrift[] = [];

  /** Ingest a new knowledge artifact (from mission, ADR, lesson) */
  ingest(artifact: KnowledgeArtifact): void {
    this._artifacts.push(artifact);
    if (this._artifacts.length > 500) this._artifacts.shift();
    this.detectPatterns();
  }

  /** Detect recurring patterns from ingested artifacts */
  private detectPatterns(): void {
    const recent = this._artifacts.slice(-100);

    // Detect recurring failures
    const failureTags = new Map<string, number>();
    for (const a of recent) {
      if (a.type === "failure" || a.type === "lesson") {
        for (const tag of a.tags) {
          failureTags.set(tag, (failureTags.get(tag) || 0) + 1);
        }
      }
    }

    for (const [tag, count] of failureTags) {
      if (count >= 3) {
        const existing = this._patterns.find(p => p.description.includes(tag));
        if (!existing) {
          this._patterns.push({
            id: `pattern-${Date.now()}-${tag}`,
            type: "recurring_bug",
            description: `Recurring issue: ${tag} detected ${count} times`,
            evidenceIds: recent.filter(a => a.tags.includes(tag)).map(a => a.id),
            severity: count >= 5 ? "high" : "medium",
            firstDetected: recent.find(a => a.tags.includes(tag))?.timestamp || "",
            lastDetected: [...recent].reverse().find(a => a.tags.includes(tag))?.timestamp || "",
            occurrenceCount: count,
          });
        }
      }
    }

    // Clean old patterns
    if (this._patterns.length > 100) this._patterns.splice(0, 50);
  }

  /** Detect architecture drift between Foundation spec and implementation */
  detectDrift(domain: string, expected: string, actual: string): ArchitectureDrift | null {
    const driftLevel = expected === actual ? "none"
      : actual.includes(expected) ? "minor"
      : expected.length - actual.length > 100 ? "critical"
      : "significant";

    if (driftLevel === "none") return null;

    const drift: ArchitectureDrift = {
      domain, expected: expected.slice(0, 500), actual: actual.slice(0, 500),
      driftLevel, detectedAt: new Date().toISOString(), evidenceId: `drift-${Date.now()}`,
    };

    this._drifts.push(drift);
    if (this._drifts.length > 50) this._drifts.shift();
    return drift;
  }

  /** Detect conflicts between policies */
  detectPolicyConflict(policyId1: string, policyId2: string, conflict: string): PolicyConflict {
    return {
      policy1: policyId1, policy2: policyId2, conflict,
      resolution: `Review ${policyId1} and ${policyId2} for alignment`,
      severity: conflict.includes("contradict") ? "high" : "medium",
    };
  }

  getArtifacts(limit = 50): KnowledgeArtifact[] {
    return this._artifacts.slice(-limit).reverse();
  }

  getPatterns(): DetectedPattern[] {
    return this._patterns;
  }

  getDrifts(): ArchitectureDrift[] {
    return this._drifts;
  }

  computeKPI(): KnowledgeKPI {
    const totalArtifacts = this._artifacts.length;
    const duplicateCount = this._patterns.filter(p => p.type === "duplicate").length;
    const driftCount = this._drifts.filter(d => d.driftLevel !== "none").length;

    return {
      architectureDriftDetection: totalArtifacts > 0
        ? Math.round((1 - driftCount / Math.max(totalArtifacts, 1)) * 100)
        : 100,
      duplicatePolicyRate: totalArtifacts > 0
        ? Math.round((duplicateCount / totalArtifacts) * 100)
        : 0,
      compressionRatio: totalArtifacts > 0 ? Math.max(5, Math.round(totalArtifacts / 5)) : 20,
      governanceCompliance: 100 - Math.min(driftCount * 5, 30),
      patternCoverage: this._patterns.length > 0 ? Math.min(100, this._patterns.length * 10) : 80,
      avgTimeToDetect: totalArtifacts > 0 ? 150 : 50,
    };
  }
}

export const knowledgeManager = new KnowledgeManager();
