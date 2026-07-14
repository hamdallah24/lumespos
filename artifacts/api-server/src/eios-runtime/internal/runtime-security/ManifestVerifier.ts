import type { ComponentManifest } from "../../contracts/Manifest";
import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

export interface ManifestVerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function computeChecksum(manifest: ComponentManifest): string {
  const payload = `${manifest.id.type}:${manifest.name}:${JSON.stringify(manifest.dependencies)}:${manifest.schemaVersion.major}.${manifest.schemaVersion.minor}.${manifest.schemaVersion.patch}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `sha1-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export const ManifestVerifier = {
  verify(manifest: ComponentManifest): ManifestVerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!manifest.id || !manifest.name) {
      errors.push("Manifest missing id or name");
      return { valid: false, errors, warnings };
    }

    if (manifest.checksum && manifest.checksum !== computeChecksum(manifest)) {
      errors.push(`Checksum mismatch for "${manifest.name}"`);
    }

    if (manifest.deprecated && manifest.replacement === null) {
      warnings.push(`Deprecated manifest "${manifest.name}" has no replacement`);
    }

    const result: ManifestVerificationResult = { valid: errors.length === 0, errors, warnings };

    if (!result.valid) {
      RuntimeLogger.error("ManifestVerifier", `Manifest verification failed for "${manifest.name}"`, { metadata: { errors } });
    }

    return result;
  },

  computeChecksum,
};
