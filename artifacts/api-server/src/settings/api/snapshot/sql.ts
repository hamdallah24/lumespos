// ConfigCenter — SQL-backed SnapshotPersistence (Milestone 3, operational path).
// Persists immutable snapshot rows to the settings_snapshot table via drizzle.
// Shares the exact SnapshotPersistence contract with the in-memory impl, so
// Retention/GC/verification run unchanged over SQL storage.
//
// NOTE: constructing this module does NOT open a connection — the drizzle `db`
// client is injected by the caller. Test/dev may pass the memory persistence
// the same way the config store itself is runtime-injected.

import { eq, and, or, like, inArray, desc, sql } from "drizzle-orm";
import { settingsSnapshotTable, type SettingsSnapshot } from "@workspace/db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import type {
  SnapshotPersistence,
  SnapshotRecord,
  SnapshotStatus,
} from "./types";

export type Db = NodePgDatabase;

export class SqlSnapshotPersistence implements SnapshotPersistence {
  private readonly db: NodePgDatabase;
  private readonly t: typeof settingsSnapshotTable;

  constructor(db: NodePgDatabase, table: typeof settingsSnapshotTable = settingsSnapshotTable) {
    this.db = db;
    this.t = table;
  }

  private toRow(record: SnapshotRecord): Record<string, unknown> {
    return {
      snapshotId: record.id,
      name: record.name,
      kind: record.origin,
      triggerType: record.triggerType,
      environment: record.environment,
      configVersion: record.configVersion,
      scopeType: record.scope.type,
      workspaceId: record.scope.workspaceId ?? null,
      branchId: record.scope.branchId ?? null,
      executiveRole: record.scope.executiveRole ?? null,
      scopeKey: record.scope.type === "default" ? null : JSON.stringify(record.scope),
      payload: record.payload,
      changes: record.changes,
      checksum: record.checksum,
      registryChecksum: record.registryChecksum,
      revisionNo: record.revisionNo,
      status: record.status,
      pinned: record.pinned,
      fingerprint: {
        checksum: record.fingerprint.checksum,
        registryChecksum: record.fingerprint.registryChecksum,
        configVersion: record.fingerprint.configVersion,
        revisionNo: record.fingerprint.revisionNo,
      },
      metadata: {
        actor: record.metadata.actor,
        correlationId: record.metadata.correlationId ?? null,
        pipelineStage: record.metadata.pipelineStage ?? null,
        reason: record.metadata.reason ?? null,
        sourceRevision: record.metadata.sourceRevision ?? null,
      },
      sourceSnapshotId: null,
    };
  }

  private fromRow(row: SettingsSnapshot): SnapshotRecord {
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const changes = (row.changes ?? {}) as Record<string, unknown>;
    const fingerprint = (row.fingerprint ?? {}) as {
      checksum?: string; registryChecksum?: string; configVersion?: number; revisionNo?: number;
    };
    const metadata = (row.metadata ?? {}) as {
      actor?: string; correlationId?: string; pipelineStage?: string; reason?: string; sourceRevision?: number;
    };
    return {
      id: row.snapshotId,
      name: row.name,
      environment: row.environment,
      scope: {
        type: (row.scopeType ?? "default") as SnapshotRecord["scope"]["type"],
        workspaceId: row.workspaceId ?? null,
        branchId: row.branchId ?? null,
        executiveRole: row.executiveRole as never,
      },
      revisionNo: row.revisionNo,
      configVersion: row.configVersion,
      checksum: row.checksum,
      registryChecksum: row.registryChecksum,
      fingerprint: {
        checksum: fingerprint.checksum ?? row.checksum,
        registryChecksum: fingerprint.registryChecksum ?? row.registryChecksum,
        configVersion: fingerprint.configVersion ?? row.configVersion,
        revisionNo: fingerprint.revisionNo ?? row.revisionNo,
      },
      payload,
      changes,
      origin: row.kind as SnapshotRecord["origin"],
      triggerType: row.triggerType as SnapshotRecord["triggerType"],
      status: row.status as SnapshotStatus,
      pinned: row.pinned,
      createdAt: new Date(row.createdAt).toISOString(),
      metadata: {
        actor: metadata.actor ?? "system",
        correlationId: metadata.correlationId,
        pipelineStage: metadata.pipelineStage,
        reason: metadata.reason,
        sourceRevision: metadata.sourceRevision,
      },
    };
  }

  async save(record: SnapshotRecord): Promise<void> {
    await this.db.insert(this.t).values([this.toRow(record)] as never);
  }

  async findById(id: string): Promise<SnapshotRecord | null> {
    const rows = await this.db
      .select()
      .from(this.t)
      .where(eq(this.t.snapshotId, id))
      .limit(1);
    return rows[0] ? this.fromRow(rows[0]) : null;
  }

  async list(): Promise<SnapshotRecord[]> {
    const rows = await this.db
      .select()
      .from(this.t)
      .orderBy(desc(this.t.createdAt));
    return rows.map((r) => this.fromRow(r));
  }

  async search(query: string): Promise<SnapshotRecord[]> {
    const q = query.trim().toLowerCase();
    if (!q) return this.list();
    const rows = await this.db
      .select()
      .from(this.t)
      .where(
        or(
          like(this.t.name, `%${q}%`),
          like(this.t.kind, `%${q}%`),
          like(this.t.status, `%${q}%`),
        ),
      )
      .orderBy(desc(this.t.createdAt));
    return rows.map((r) => this.fromRow(r));
  }

  async updateStatus(id: string, status: SnapshotStatus): Promise<void> {
    await this.db
      .update(this.t)
      .set({ status })
      .where(eq(this.t.snapshotId, id));
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    await this.db
      .update(this.t)
      .set({ pinned, status: pinned ? "PINNED" : "ACTIVE" })
      .where(eq(this.t.snapshotId, id));
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .delete(this.t)
      .where(inArray(this.t.snapshotId, ids));
  }

  async count(): Promise<number> {
    const rows = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(this.t);
    return rows[0]?.n ?? 0;
  }
}

export type { SettingsSnapshot };