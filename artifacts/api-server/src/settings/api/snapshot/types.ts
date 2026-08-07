// ConfigCenter — Snapshot domain types (Milestone 3, persistent snapshots).
// An immutable, verifiable artifact of the effective configuration at a point in
// time. Payload is the Resolver's effective output for the snapshot scope. All
// fields below are metadata around the payload; status never affects payload.

import type { ConfigScope, ConfigValue } from "../../types";

// Who/what initiated the snapshot. Used by the future Audit Center.
export type SnapshotOrigin =
  | "manual"
  | "automatic"
  | "pre-deploy"
  | "scheduled"
  | "rollback"
  | "migration";

// Status is metadata only — it never alters the payload.
export type SnapshotStatus =
  | "ACTIVE"
  | "ARCHIVED"
  | "PINNED"
  | "RESTORED"
  | "EXPIRED";

export type SnapshotTriggerType =
  | "manual"
  | "automatic"
  | "pre_deploy"
  | "scheduled"
  | "rollback"
  | "migration";

// Snapshot Fingerprint — enables compatibility validation across restores.
export interface SnapshotFingerprint {
  checksum: string; // payload content hash (FNV-1a canonical)
  registryChecksum: string; // registry checksum at capture time
  configVersion: number; // REGISTRY_CONFIG_VERSION at capture time
  revisionNo: number; // store revision at capture time
}

// Metadata consumed by Audit UI in a later milestone.
export interface SnapshotMetadata {
  actor: string; // actor that created the snapshot
  correlationId?: string; // governing pipeline correlation, if any
  pipelineStage?: string; // pipeline stage at capture (e.g. SNAPSHOT)
  reason?: string; // why this snapshot exists
  sourceRevision?: number; // revision this snapshot reflects
}

// Persisted Snapshot record. `changes` is the scope override set captured from
// the Store; `payload` is the Resolver's effective configuration (the artifact).
export interface SnapshotRecord {
  id: string; // snapshotId (uuid)
  name: string;
  environment: string; // development | production | testing | staging
scope: ConfigScope;
    revisionNo: number; // store revision captured
    configVersion: number; // REGISTRY_CONFIG_VERSION
    checksum: string; // payload content hash
    registryChecksum: string; // registry checksum at capture
    fingerprint: SnapshotFingerprint; // checksum + registry checksum + configVersion + revisionNo
    payload: Record<string, ConfigValue>; // effective configuration (Resolver)
    changes: Record<string, ConfigValue>; // captured override set (Store)
  origin: SnapshotOrigin;
  triggerType: SnapshotTriggerType;
  status: SnapshotStatus;
  pinned: boolean; // manual pin — never deleted by retention/GC
  createdAt: string;
  metadata: SnapshotMetadata;
}

// Immutable projection — callers must not mutate a snapshot after creation.
export type SnapshotView = Readonly<SnapshotRecord>;

// Where the store persists snapshot rows. Implementations: Memory (runtime/tests)
// and Sql (drizzle settings_snapshot). The interface keeps the domain agnostic.
export interface SnapshotPersistence {
  save(record: SnapshotRecord): Promise<void>;
  findById(id: string): Promise<SnapshotRecord | null>;
  list(): Promise<SnapshotRecord[]>;
  search(query: string): Promise<SnapshotRecord[]>;
  updateStatus(id: string, status: SnapshotStatus): Promise<void>;
  setPinned(id: string, pinned: boolean): Promise<void>;
  remove(ids: string[]): Promise<void>;
  count(): Promise<number>;
}
