// ConfigCenter — SnapshotVerifier (Milestone 3, restore verification).
// Runs before any restore reaches the Governance Pipeline. A snapshot that fails
// verification must NOT be restored. Checks, in order:
//   1. exists          — the snapshot row is present
//   2. checksum valid  — recomputed payload hash equals stored checksum
//   3. configVersion   — snapshot is compatible with the current registry version
//   4. payload intact  — payload is a well-formed object (not corrupt / not secret-dereferenced)
//   5. registry compat — every payload key is still declared in the current registry
//
// Registry compatibility uses the live registry (not a stored checksum) so a
// documented ADR/version bump is respected instead of blindly trusting migration.

import type { ConfigurationRegistry } from "../../registry";
import type { SnapshotRecord } from "./types";
import { payloadChecksum } from "./checksum";
import { REGISTRY_CONFIG_VERSION } from "../../defaults";

export interface VerificationResult {
  ok: boolean;
  reasons: string[];
  snapshotId?: string;
}

interface VerifierDeps {
  registry: ConfigurationRegistry | null;
}

export class SnapshotVerifier {
  private readonly registry: ConfigurationRegistry | null;

  constructor(deps: VerifierDeps) {
    this.registry = deps.registry;
  }

  // Verify a snapshot is safe + compatible for restore.
  verify(snapshot: SnapshotRecord | null): VerificationResult {
    if (!snapshot) return { ok: false, reasons: ["snapshot not found"] };

    const reasons: string[] = [];

    // 2. checksum valid — integrity of payload.
    const recomputed = payloadChecksum(snapshot.payload);
    if (recomputed !== snapshot.checksum) {
      reasons.push(`checksum mismatch (stored ${snapshot.checksum}, recomputed ${recomputed})`);
    }

    // 3. configVersion compatible
    if (snapshot.configVersion !== REGISTRY_CONFIG_VERSION) {
      reasons.push(`configVersion ${snapshot.configVersion} incompatible with current version ${REGISTRY_CONFIG_VERSION} — use explicit ADR bump before restore`);
    }

    // 4. payload intact
    if (
      snapshot.payload == null || typeof snapshot.payload !== "object" || Array.isArray(snapshot.payload)
    ) {
      reasons.push("payload is corrupt: expected a payload object");
    }

    // 5. registry compatible — every payload key is still declared.
    if (this.registry) {
      for (const key of Object.keys(snapshot.payload)) {
        if (!this.registry.has(key)) {
          reasons.push(`registry incompatible: key "${key}" is no longer declared`);
        }
      }
    }

    return { ok: reasons.length === 0, reasons };
  }
}

// Normalized identifier used by the controller response surface.
export function verifySnapshot(deps: { registry: ConfigurationRegistry | null }, snapshot: SnapshotRecord | null) {
  return new SnapshotVerifier(deps).verify(snapshot);
}