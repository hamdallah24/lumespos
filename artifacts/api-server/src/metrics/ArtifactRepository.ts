// ADR-009 Phase 2.5: Artifact Repository
// Immutable store for execution artifacts. Append only.

import type { Artifact } from "./MetricTypes";

export class ArtifactRepository {
  private artifacts: Map<string, Artifact> = new Map();

  /** Append artifact — immutable, no overwrite */
  append(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact);
  }

  /** Append multiple artifacts */
  appendAll(artifacts: Artifact[]): void {
    for (const a of artifacts) this.append(a);
  }

  /** Get artifact by ID */
  get(id: string): Artifact | null {
    return this.artifacts.get(id) ?? null;
  }

  /** Find artifacts by type */
  findByType(type: string): Artifact[] {
    return [...this.artifacts.values()].filter(a => a.type === type);
  }

  /** Find artifacts by producer */
  findByProducer(producer: string): Artifact[] {
    return [...this.artifacts.values()].filter(a => a.producer === producer);
  }

  /** Query artifacts by criteria */
  query(criteria: { type?: string; verified?: boolean; producer?: string }): Artifact[] {
    return [...this.artifacts.values()].filter(a => {
      if (criteria.type && a.type !== criteria.type) return false;
      if (criteria.verified !== undefined && a.verified !== criteria.verified) return false;
      if (criteria.producer && a.producer !== criteria.producer) return false;
      return true;
    });
  }

  /** Get all artifacts */
  all(): Artifact[] {
    return [...this.artifacts.values()];
  }

  /** Count artifacts */
  count(): number {
    return this.artifacts.size;
  }
}

export const artifactRepository = new ArtifactRepository();
