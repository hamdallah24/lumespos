// ADR-009 Phase 6: Mission History
// Append-only event store. Stores references (IDs), not full objects.
// Full objects remain in their respective repositories.

import type { MissionHistoryEntry, ExecutiveRole } from "./Mission";
import { createHistoryId } from "./Mission";

export class MissionHistory {
  private entries: MissionHistoryEntry[] = [];

  /** Append entry — immutable, no edit, no delete */
  record(
    missionId: string,
    objectiveId: string,
    artifactId: string,
    evidenceId: string,
    decision: string,
    decidedBy: ExecutiveRole,
  ): MissionHistoryEntry {
    const entry: MissionHistoryEntry = {
      id: createHistoryId(),
      missionId,
      objectiveId,
      artifactId,
      evidenceId,
      decision,
      decidedBy,
      timestamp: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  /** Get all entries for a mission */
  getByMission(missionId: string): MissionHistoryEntry[] {
    return this.entries
      .filter(e => e.missionId === missionId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /** Get entries by objective */
  getByObjective(objectiveId: string): MissionHistoryEntry[] {
    return this.entries
      .filter(e => e.objectiveId === objectiveId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /** Explain a decision chain */
  explain(missionId: string, objectiveId: string): string[] {
    const chain = this.entries
      .filter(e => e.missionId === missionId && e.objectiveId === objectiveId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return chain.map(e =>
      `[${e.timestamp}] ${e.decidedBy} decided: "${e.decision}" ` +
      `(evidence: ${e.evidenceId}, artifact: ${e.artifactId})`
    );
  }

  /** Get all entries */
  all(): MissionHistoryEntry[] {
    return [...this.entries];
  }

  /** Count entries */
  count(): number {
    return this.entries.length;
  }
}

export const missionHistory = new MissionHistory();
