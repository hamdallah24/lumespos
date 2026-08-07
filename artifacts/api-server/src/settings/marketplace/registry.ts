// ConfigCenter — Milestone 6 Phase 3: Package Registry.
// DELIBERATELY SEPARATE from src/settings/registry.ts. Configuration Registry
// stays the source of truth for the config catalog; this registry only tracks
// ecosystem packages. Register / lookup / list / unregister / version resolve /
// status / capability discovery. Deterministic ordering by insertion.

import type { PackageManifest } from "./manifest";
import { satisfiesVersion } from "../plugins/semver";

export type PackageStatus = "discovered" | "validated" | "resolved" | "installed" | "active" | "removed";

export interface PackageEntry {
  manifest: PackageManifest;
  status: PackageStatus;
  installedAt?: number;
}

export interface VersionResolution {
  name: string;
  available: PackageManifest[];
  selected: PackageManifest | null;
}

export class PackageRegistry {
  /** name -> versions registered for that package (insertion order). */
  private readonly versions = new Map<string, PackageManifest[]>();
  private readonly statuses = new Map<string, PackageStatus>();
  private readonly installedAt = new Map<string, number>();
  private readonly byName: string[] = [];
  private now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? Date.now;
  }

  /** Register a package version. Adding a new version is allowed; redeclaring the
   *  exact same name+version replaces it (upgrade). Throws on manifest-less. */
  register(manifest: PackageManifest): PackageEntry {
    const list = this.versions.get(manifest.name) ?? [];
    const existing = list.findIndex((m) => m.version === manifest.version);
    if (existing >= 0) list[existing] = manifest;
    else {
      list.push(manifest);
      this.versions.set(manifest.name, list);
      if (!this.byName.includes(manifest.name)) this.byName.push(manifest.name);
    }
    this.statuses.set(this.versionKey(manifest.name, manifest.version), "discovered");
    return this.entry(manifest);
  }

  /** Remove an entire package (all versions) or a specific version. */
  unregister(name: string, version?: string): boolean {
    const list = this.versions.get(name);
    if (!list) return false;
    if (version == null) {
      this.versions.delete(name);
      for (const v of list) this.statuses.delete(this.versionKey(name, v.version));
      const idx = this.byName.indexOf(name);
      if (idx >= 0) this.byName.splice(idx, 1);
      return true;
    }
    const idx = list.findIndex((m) => m.version === version);
    if (idx < 0) return false;
    list.splice(idx, 1);
    this.statuses.delete(this.versionKey(name, version));
    if (list.length === 0) {
      this.versions.delete(name);
      const i2 = this.byName.indexOf(name);
      if (i2 >= 0) this.byName.splice(i2, 1);
    }
    return true;
  }

  /** Lookup (by exact name+version or just name → return all versions). */
  get(name: string): PackageManifest[] {
    return this.versions.get(name) ?? [];
  }

  /** Lookup a specific version. */
  getVersion(name: string, version: string): PackageManifest | undefined {
    return this.get(name).find((m) => m.version === version);
  }

  has(name: string, version?: string): boolean {
    if (version == null) return this.versions.has(name);
    return this.getVersion(name, version) != null;
  }

  /** All registered packages (all versions), in deterministic name order. */
  list(): PackageEntry[] {
    const out: PackageEntry[] = [];
    for (const name of this.byName) {
      for (const m of this.get(name)) out.push(this.entry(m));
    }
    return out;
  }

  /** Deterministic package names in registration order. */
  names(): string[] {
    return [...this.byName];
  }

  /** Resolve the best available version for a range (null if unsatisfiable). */
  resolve(name: string, range?: string): VersionResolution {
    const versions = this.get(name);
    const sorted = [...versions].sort((a, b) => compareSemver(b.version, a.version));
    const selected = range ? sorted.find((m) => rangeSatisfies(m.version, range)) ?? null : sorted[0] ?? null;
    return { name, available: sorted, selected };
  }

  status(name: string, version?: string): PackageStatus | undefined {
    if (version == null) {
      const list = this.get(name);
      if (list.length === 0) return undefined;
      return this.statuses.get(this.versionKey(name, list[list.length - 1].version));
    }
    return this.statuses.get(this.versionKey(name, version));
  }

  setStatus(name: string, version: string, status: PackageStatus): void {
    this.statuses.set(this.versionKey(name, version), status);
  }

  setInstalledAt(name: string, version: string, at: number): void {
    this.installedAt.set(this.versionKey(name, version), at);
  }

  installedAtOf(name: string, version: string): number | undefined {
    return this.installedAt.get(this.versionKey(name, version));
  }

  /** Capability discovery: packages that provide any of the requested caps. */
  discoverCapabilities(required: string[]): { name: string; version: string; provided: string[] }[] {
    const out: { name: string; version: string; provided: string[] }[] = [];
    for (const entry of this.list()) {
      const provided = entry.manifest.provides ?? [];
      if (required.length === 0 || provided.some((c) => required.includes(c))) {
        out.push({ name: entry.manifest.name, version: entry.manifest.version, provided });
      }
    }
    return out;
  }

  private versionKey(name: string, version?: string): string {
    return version ? `${name}@${version}` : name;
  }

  private entry(manifest: PackageManifest): PackageEntry {
    return {
      manifest,
      status: this.statuses.get(this.versionKey(manifest.name, manifest.version)) ?? "discovered",
      installedAt: this.installedAt.get(this.versionKey(manifest.name, manifest.version)),
    };
  }
}

// minimal semver compare + range helpers (mirror of plugins/semver)
function compareSemver(a: string, b: string): number {
  const pa = parseVersionNum(a);
  const pb = parseVersionNum(b);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

function parseVersionNum(v: string): number[] {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!match) return [0, 0, 0];
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function rangeSatisfies(version: string, range: string): boolean {
  return satisfiesVersion(version, range);
}