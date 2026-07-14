import type { ComponentId, SemVer } from "./ComponentId";

export interface ComponentManifest {
  id: ComponentId;
  name: string;
  description: string;
  dependencies: ComponentId[];
  capabilities: string[];
  tags: string[];
  checksum: string;
  signature?: string;
  schemaVersion: SemVer;
  migrationVersion?: SemVer;
  compatibilityVersion?: SemVer;
  deprecated: boolean;
  replacement: ComponentId | null;
  extends?: ComponentId;
  metadata: Record<string, unknown>;
}

export function defineStage(manifest: ComponentManifest): ComponentManifest {
  if (manifest.id.type !== "stage") throw new Error(`Expected stage type, got "${manifest.id.type}"`);
  return manifest;
}

export function defineObserver(manifest: ComponentManifest): ComponentManifest {
  if (manifest.id.type !== "observer") throw new Error(`Expected observer type, got "${manifest.id.type}"`);
  return manifest;
}

export function defineTrigger(manifest: ComponentManifest): ComponentManifest {
  if (manifest.id.type !== "trigger") throw new Error(`Expected trigger type, got "${manifest.id.type}"`);
  return manifest;
}

export function defineProfile(manifest: ComponentManifest): ComponentManifest {
  if (manifest.id.type !== "profile") throw new Error(`Expected profile type, got "${manifest.id.type}"`);
  return manifest;
}

export function defineExecutive(manifest: ComponentManifest): ComponentManifest {
  if (manifest.id.type !== "executive") throw new Error(`Expected executive type, got "${manifest.id.type}"`);
  return manifest;
}
