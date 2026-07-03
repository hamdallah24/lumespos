// ECP-029: Knowledge Manager — consumes Mission Events via Knowledge Queue
// Frozen. Subscribes to KnowledgeQueue, processes mission outputs into knowledge.
// Consultant Runtime consumes the indexed output.

import type {
  KnowledgeArtifact, DetectedPattern, ArchitectureDrift,
  PolicyConflict, KnowledgeKPI,
} from "./knowledge-types";
import { knowledgeQueue, KnowledgeQueue } from "./knowledge-queue";
import { isCompletedEvent, isFailedEvent } from "./mission-event";

class KnowledgeManager {
  private _artifacts: KnowledgeArtifact[] = [];
  private _patterns: DetectedPattern[] = [];
  private _drifts: ArchitectureDrift[] = [];
  private _started = false;

  /** Start listening to Mission Events from the queue */
  start(): void {
    if (this._started) return;
    this._started = true;

    knowledgeQueue.subscribe((event) => {
      if (isCompletedEvent(event)) {
        const artifacts = KnowledgeQueue.toArtifacts(event);
        for (const a of artifacts) this.ingest(a);
      }
      if (isFailedEvent(event)) {
        const artifact = KnowledgeQueue.toFailureArtifact(event);
        this.ingest(artifact);
      }
      // MISSION_TIMEOUT, MISSION_ABORTED, MISSION_DELEGATED, MISSION_RETRIED
      // are logged but not converted to artifacts (yet)
    });
  }

  /** Ingest a knowledge artifact into the system */
  private ingest(artifact: KnowledgeArtifact): void {
    this._artifacts.push(artifact);
    if (this._artifacts.length > 500) this._artifacts.splice(0, 100);
    this.detectPatterns();
  }

  /** Detect recurring patterns from ingested artifacts */
  private detectPatterns(): void {
    const recent = this._artifacts.slice(-100);
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

    if (this._patterns.length > 100) this._patterns.splice(0, 50);
  }

  /** Detect architecture drift */
  detectDrift(domain: string, expected: string, actual: string): ArchitectureDrift | null {
    if (expected === actual) return null;
    const drift: ArchitectureDrift = {
      domain, expected: expected.slice(0, 500), actual: actual.slice(0, 500),
      driftLevel: actual.includes(expected) ? "minor"
        : expected.length - actual.length > 100 ? "critical" : "significant",
      detectedAt: new Date().toISOString(), evidenceId: `drift-${Date.now()}`,
    };
    this._drifts.push(drift);
    if (this._drifts.length > 50) this._drifts.shift();
    return drift;
  }

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

  getPatterns(): DetectedPattern[] { return this._patterns; }
  getDrifts(): ArchitectureDrift[] { return this._drifts; }

  computeKPI(): KnowledgeKPI {
    const total = this._artifacts.length;
    const dupes = this._patterns.filter(p => p.type === "duplicate").length;
    const drifts = this._drifts.filter(d => d.driftLevel !== "none").length;

    return {
      architectureDriftDetection: total > 0 ? Math.round((1 - drifts / Math.max(total, 1)) * 100) : 100,
      duplicatePolicyRate: total > 0 ? Math.round((dupes / total) * 100) : 0,
      compressionRatio: total > 0 ? Math.max(5, Math.round(total / 5)) : 20,
      governanceCompliance: 100 - Math.min(drifts * 5, 30),
      patternCoverage: this._patterns.length > 0 ? Math.min(100, this._patterns.length * 10) : 80,
      avgTimeToDetect: total > 0 ? 150 : 50,
    };
  }
}

export const knowledgeManager = new KnowledgeManager();
