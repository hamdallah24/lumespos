// ADR-009 Phase 2.6: Evidence Query
// CQRS: Repository stores, Query fetches, Engine computes.
// EvidenceEngine doesn't know how to find data. Query layer does.

import type { Artifact } from "./MetricTypes";
import { artifactRepository } from "./ArtifactRepository";

export interface EvidenceQueryResult {
  fileArtifacts: Artifact[];
  searchArtifacts: Artifact[];
  commandArtifacts: Artifact[];
  verifiedCount: number;
  unverifiedCount: number;
  uniqueSources: number;
  totalArtifacts: number;
}

export function queryEvidence(): EvidenceQueryResult {
  const all = artifactRepository.all();
  const verified = all.filter(a => a.verified);

  return {
    fileArtifacts: all.filter(a => a.type === "file"),
    searchArtifacts: all.filter(a => a.type === "search_result"),
    commandArtifacts: all.filter(a => a.type === "command_output"),
    verifiedCount: verified.length,
    unverifiedCount: all.length - verified.length,
    uniqueSources: new Set(all.map(a => a.source)).size,
    totalArtifacts: all.length,
  };
}

export function queryByType(type: string): Artifact[] {
  return artifactRepository.findByType(type);
}

export function querySince(since: string): Artifact[] {
  return artifactRepository.all().filter(a => a.createdAt >= since);
}
