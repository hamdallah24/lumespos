// ConfigCenter — Snapshot persistence module barrel (Milestone 3).
export type {
  SnapshotOrigin,
  SnapshotStatus,
  SnapshotTriggerType,
  SnapshotFingerprint,
  SnapshotMetadata,
  SnapshotRecord,
  SnapshotView,
  SnapshotPersistence,
} from "./types";
export { MemorySnapshotPersistence } from "./memory";
export { SqlSnapshotPersistence } from "./sql";
export { SnapshotVerifier, verifySnapshot, type VerificationResult } from "./verifier";
export { RetentionManager, DEFAULT_RETENTION_POLICY, type RetentionPolicy } from "./retention";
export { GarbageCollector, type GcAuditEvent } from "./gc";
export { payloadChecksum, canonicalize, fnv1a } from "./checksum";
export type { SettingsSnapshot } from "./sql";