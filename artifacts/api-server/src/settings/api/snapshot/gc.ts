// ConfigCenter — Garbage Collector (Milestone 3).
// A separate process that deletes snapshots which:
//   - pass the Retention Policy, AND
//   - are not pinned, AND
//   - are not referenced (by rollback/audit)
// GC always emits an Audit Event describing what was collected.

import type { SnapshotRecord, SnapshotPersistence } from "./types";
import type { RetentionManager } from "./retention";

export interface GcAuditEvent {
  type: "snapshot.gc";
  collected: number;
  snapshotIds: string[];
  policy: { keepLatest: number; keepYoungerThanDays: number };
  skippedPinned: number;
  skippedReferenced: number;
  correlationId: string;
  createdAt: string;
}

interface GcDeps {
  persistence: SnapshotPersistence;
  retention: RetentionManager;
}

export class GarbageCollector {
  private readonly persistence: SnapshotPersistence;
  private readonly retention: RetentionManager;
  private readonly auditLog: GcAuditEvent[] = [];
  private counter = 0;

  constructor(deps: GcDeps) {
    this.persistence = deps.persistence;
    this.retention = deps.retention;
  }

  // Audit events are readable by the (future) Audit Center and by health.
  get auditEvents(): readonly GcAuditEvent[] {
    return this.auditLog;
  }

  async run(): Promise<GcAuditEvent> {
    const all = await this.persistence.list();

    // retention.candidates already excludes pinned + referenced (RESTORED/ARCHIVED).
    const candidates = this.retention.candidates(all);
    const toDelete = candidates;

    if (toDelete.length > 0) {
      await this.persistence.remove(toDelete.map((s) => s.id));
    }

    const referenced = all.filter((s) => s.status === "RESTORED" || s.status === "ARCHIVED").length;
    const pinned = all.filter((s) => s.pinned || s.status === "PINNED").length;

    const event: GcAuditEvent = {
      type: "snapshot.gc",
      collected: toDelete.length,
      snapshotIds: toDelete.map((s) => s.id),
      policy: this.retention.getPolicy(),
      skippedPinned: pinned,
      skippedReferenced: referenced,
      correlationId: `gc-${Date.now()}-${(this.counter++).toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    this.auditLog.push(event);
    return event;
  }
}
