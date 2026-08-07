// ConfigCenter — Retention Manager (Milestone 3).
// Decides which snapshots are eligible for deletion under a RetentionPolicy:
//   - keepLatest: keep the newest N snapshots (per environment+scope bucket)
//   - keepYoungerThanDays: keep snapshots younger than X days
// Manual pins and snapshots referenced by rollback/audit are ALWAYS excluded
// (retention must never remove a snapshot that rollback or audit depends on).

import type { SnapshotRecord } from "./types";

export interface RetentionPolicy {
  keepLatest: number; // 0 = disabled (no latest-limit)
  keepYoungerThanDays: number; // 0 = disabled (no age-limit)
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  keepLatest: 0,
  keepYoungerThanDays: 0,
};

// A snapshot is "referenced" if it has been used for a rollback/restore (status
// RESTORED) or archived for audit — retention must never collect those.
function isReferenced(snapshot: SnapshotRecord): boolean {
  return snapshot.status === "RESTORED" || snapshot.status === "ARCHIVED";
}

export class RetentionManager {
  private policy: RetentionPolicy;

  constructor(policy: RetentionPolicy = DEFAULT_RETENTION_POLICY) {
    this.policy = { ...policy };
  }

  updatePolicy(policy: Partial<RetentionPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  getPolicy(): RetentionPolicy {
    return { ...this.policy };
  }

  // Candidates are snapshots that violate the policy AND are neither pinned nor
  // referenced. GC actually deletes them; retention only computes the set.
  candidates(snapshots: SnapshotRecord[]): SnapshotRecord[] {
    const { keepLatest, keepYoungerThanDays } = this.policy;
    if (keepLatest <= 0 && keepYoungerThanDays <= 0) return [];

    const all = snapshots;

    // Bucket by environment + scope signature so "latest N" is per target.
    const bucketKey = (s: SnapshotRecord) => `${s.environment}|${s.scope.type}|${s.scope.workspaceId ?? s.scope.branchId ?? s.scope.executiveRole ?? "default"}`;
    const buckets = new Map<string, SnapshotRecord[]>();
    for (const s of all) {
      const k = bucketKey(s);
      const b = buckets.get(k) ?? [];
      b.push(s);
      buckets.set(k, b);
    }

    const now = Date.now();
    const victims = new Set<string>();

    for (const bucket of buckets.values()) {
      // newest-first (list() sorts desc, but be robust)
      const sorted = [...bucket].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      sorted.forEach((s, index) => {
        if (s.pinned || s.status === "PINNED") return; // never delete pinned
        if (isReferenced(s)) return; // never delete referenced (rollback/audit)
        const exceedsCount = keepLatest > 0 && index >= keepLatest;
        const exceedsAge = keepYoungerThanDays > 0
          && (now - new Date(s.createdAt).getTime()) > keepYoungerThanDays * 24 * 60 * 60 * 1000;
        if (exceedsCount || exceedsAge) victims.add(s.id);
      });
    }
    return all.filter((s) => victims.has(s.id));
  }
}
