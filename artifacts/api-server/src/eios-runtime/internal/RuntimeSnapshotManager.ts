interface SnapshotEvent {
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

const eventLog: SnapshotEvent[] = [];
const snapshots = new Map<string, SnapshotEvent[]>();

export const RuntimeSnapshotManager = {
  recordEvent(type: string, payload: Record<string, unknown>): void {
    eventLog.push({ type, timestamp: new Date().toISOString(), payload });
  },

  createSnapshot(label: string): string {
    const snapshotId = `snapshot-${label}-${Date.now().toString(36)}`;
    snapshots.set(snapshotId, [...eventLog]);
    this.recordEvent("snapshot_created", { snapshotId, label });
    return snapshotId;
  },

  restoreSnapshot(snapshotId: string): boolean {
    const events = snapshots.get(snapshotId);
    if (!events) return false;
    eventLog.length = 0;
    eventLog.push(...events);
    return true;
  },

  diffSnapshots(idA: string, idB: string): Array<{ event: string; present: string[]; missing: string[] }> {
    const a = snapshots.get(idA) || [];
    const b = snapshots.get(idB) || [];
    const aTypes = new Set(a.map(e => e.type));
    const bTypes = new Set(b.map(e => e.type));
    const diff: Array<{ event: string; present: string[]; missing: string[] }> = [];

    for (const type of aTypes) {
      if (!bTypes.has(type)) {
        diff.push({ event: type, present: [idA], missing: [idB] });
      }
    }
    for (const type of bTypes) {
      if (!aTypes.has(type)) {
        diff.push({ event: type, present: [idB], missing: [idA] });
      }
    }

    return diff;
  },

  getEventLog(): SnapshotEvent[] {
    return [...eventLog];
  },

  getSnapshotIds(): string[] {
    return Array.from(snapshots.keys());
  },

  clear(): void {
    eventLog.length = 0;
    snapshots.clear();
  },
};
