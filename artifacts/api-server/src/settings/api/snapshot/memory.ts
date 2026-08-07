// ConfigCenter — In-memory SnapshotPersistence.
// Runtime/unit-test implementation of the SnapshotPersistence contract. Keeps
// snapshot rows in-process; SQL persistence is the operational path and shares
// the exact same contract (see ./sql.ts). Retention/GC/verification logic is
// persistence-agnostic and works unchanged against both.

import type {
  SnapshotPersistence,
  SnapshotRecord,
  SnapshotStatus,
} from "./types";

export class MemorySnapshotPersistence implements SnapshotPersistence {
  private readonly rows = new Map<string, SnapshotRecord>();

  async save(record: SnapshotRecord): Promise<void> {
    // Immutable: a snapshot is stored once. Attempting to overwrite an existing
    // id throws, mirroring SQL primary-key semantics for the domain.
    if (this.rows.has(record.id)) {
      throw new Error(`snapshot "${record.id}" already exists (immutable)`);
    }
    this.rows.set(record.id, structuredClone(record));
  }

  async findById(id: string): Promise<SnapshotRecord | null> {
    const row = this.rows.get(id);
    return row ? structuredClone(row) : null;
  }

  async list(): Promise<SnapshotRecord[]> {
    return [...this.rows.values()]
      .map((r) => structuredClone(r))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async search(query: string): Promise<SnapshotRecord[]> {
    const q = query.trim().toLowerCase();
    const all = await this.list();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.metadata.actor.toLowerCase().includes(q) ||
        s.origin.includes(q),
    );
  }

  async updateStatus(id: string, status: SnapshotStatus): Promise<void> {
    const row = this.rows.get(id);
    if (!row) throw new Error(`snapshot "${id}" not found`);
    row.status = status;
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    const row = this.rows.get(id);
    if (!row) throw new Error(`snapshot "${id}" not found`);
    row.pinned = pinned;
    if (pinned) row.status = "PINNED";
    else if (row.status === "PINNED") row.status = "ACTIVE";
  }

  async remove(ids: string[]): Promise<void> {
    for (const id of ids) this.rows.delete(id);
  }

  async count(): Promise<number> {
    return this.rows.size;
  }
}
