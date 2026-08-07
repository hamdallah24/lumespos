// ConfigCenter — Milestone 6 Phase 4: Ecosystem Health.
// Read-only deterministic health facade over the Marketplace Foundation (and
// optional Plugin SDK). Computes HEALTHY / DEGRADED / CRITICAL from observable
// conditions only — no heuristics. Never mutates configuration.

import { validatePackageManifest, manifestChecksum } from "../marketplace/manifest";
import { resolveDependencyGraph } from "../marketplace/dependencies";
import { satisfiesVersion } from "../plugins/semver";
import type { PackageRegistry, PackageEntry } from "../marketplace/registry";
import type { EcosystemHealthReport, EcosystemHealthStatus, DependencyHealth, CompatibilityHealth, CapabilityHealth } from "./types";

export interface EcosystemHealthOptions {
  registry: PackageRegistry;
  /** Optional plugin SDK status stream (registered/active/error counts). */
  pluginStatus?: { active: number; error: number };
  /** Capabilities provided by the host, for capability-health checks. */
  hostCapabilities?: string[];
  now?: () => number;
}

export class EcosystemHealth {
  private readonly registry: PackageRegistry;
  private readonly pluginStatus?: { active: number; error: number };
  private readonly hostCapabilities: string[];
  private readonly now: () => number;

  constructor(options: EcosystemHealthOptions) {
    this.registry = options.registry;
    this.pluginStatus = options.pluginStatus;
    this.hostCapabilities = [...(options.hostCapabilities ?? [])];
    this.now = options.now ?? Date.now;
  }

  report(): EcosystemHealthReport {
    const entries = this.registry.list();
    const reasons: string[] = [];

    const invalid = entries.filter((e) => !validatePackageManifest(e.manifest).ok ||
      (e.manifest.checksum != null && e.manifest.checksumAlgorithm === "fnv1a" && manifestChecksum(e.manifest) !== e.manifest.checksum))
      .map((e) => e.manifest.name);

    const activeCount = entries.filter((e) => e.status === "active").length;
    const installedCount = entries.filter((e) => e.status === "installed" || e.status === "active").length;

    const dependencyHealth = this.dependencyHealth(entries, reasons);
    const compatibilityHealth = this.compatibilityHealth(entries, reasons);
    const capabilityHealth = this.capabilityHealth(entries, reasons);
    const lifecycleAnomalies = this.lifecycleAnomalies(entries);

    if (invalid.length > 0) reasons.push(`invalid packages: ${invalid.join(", ")}`);
    if (this.pluginStatus && this.pluginStatus.error > 0) reasons.push(`plugin errors: ${this.pluginStatus.error}`);

    const status = this.classify(invalid.length, dependencyHealth, compatibilityHealth, capabilityHealth, lifecycleAnomalies, reasons);

    return {
      status,
      packageRegistry: { total: entries.length, active: activeCount, installed: installedCount, invalid: invalid.length },
      dependencyHealth,
      compatibilityHealth,
      capabilityHealth,
      lifecycleAnomalies,
      reasons,
      checkedAt: this.now(),
    };
  }

  private classify(
    invalidCount: number,
    dependencyHealth: DependencyHealth,
    compatibilityHealth: CompatibilityHealth,
    capabilityHealth: CapabilityHealth,
    anomalies: number,
    reasons: string[],
  ): EcosystemHealthStatus {
    if (invalidCount > 0 || dependencyHealth.status === "CRITICAL" || compatibilityHealth.status === "CRITICAL") return "CRITICAL";
    if (anomalies > 0 || dependencyHealth.status === "DEGRADED" || compatibilityHealth.status === "DEGRADED" || capabilityHealth.status === "DEGRADED") return "DEGRADED";
    if (this.pluginStatus && this.pluginStatus.error > 0) return "DEGRADED";
    void reasons;
    return "HEALTHY";
  }

  private dependencyHealth(entries: PackageEntry[], reasons: string[]): DependencyHealth {
    const manifests = new Map(entries.map((e) => [e.manifest.name, e.manifest]));
    // distinguish truly-missing (name not registered → CRITICAL) from
    // incompatible-version (name present but range unmet → DEGRADED)
    let missing = 0;
    let incompatible = 0;
    for (const pkg of manifests.values()) {
      for (const dep of [...(pkg.dependencies ?? []), ...(pkg.peerDependencies ?? [])]) {
        const target = manifests.get(dep.name);
        if (!target) missing += 1;
        else if (!satisfiesVersion(target.version, dep.range)) incompatible += 1;
      }
    }
    const graph = resolveDependencyGraph(manifests);
    const conflicts = graph.issues.filter((i) => i.kind === "conflict").length;
    const duplicates = graph.issues.filter((i) => i.kind === "duplicate").length;
    const cycles = graph.issues.filter((i) => i.kind === "cycle").length;
    let status: EcosystemHealthStatus = "HEALTHY";
    if (missing > 0 || cycles > 0) { status = "CRITICAL"; reasons.push(`dependency graph critical (missing=${missing}, cycles=${cycles})`); }
    else if (incompatible > 0 || conflicts > 0 || duplicates > 0) { status = "DEGRADED"; reasons.push(`dependency graph degraded (incompatible=${incompatible}, conflicts=${conflicts})`); }
    return { status, missing, conflicts, duplicates, cycles };
  }

  private compatibilityHealth(entries: PackageEntry[], reasons: string[]): CompatibilityHealth {
    const manifests = new Map(entries.map((e) => [e.manifest.name, e.manifest]));
    let incompatible = 0;
    for (const pkg of manifests.values()) {
      for (const dep of [...(pkg.dependencies ?? []), ...(pkg.peerDependencies ?? [])]) {
        const target = manifests.get(dep.name);
        if (target && !satisfiesVersion(target.version, dep.range)) incompatible += 1;
      }
    }
    let status: EcosystemHealthStatus = incompatible > 0 ? "DEGRADED" : "HEALTHY";
    if (incompatible > 0) reasons.push(`incompatible versions: ${incompatible}`);
    else if (this.pluginStatus && this.pluginStatus.error > 0) status = "DEGRADED";
    return { status, incompatible };
  }

  private capabilityHealth(entries: PackageEntry[], reasons: string[]): CapabilityHealth {
    const provided = new Set<string>(this.hostCapabilities);
    for (const e of entries) for (const c of e.manifest.provides ?? []) provided.add(c);
    const requiredUnmet = new Set<string>();
    for (const e of entries) for (const c of e.manifest.requires ?? []) if (!provided.has(c)) requiredUnmet.add(c);
    let status: EcosystemHealthStatus = requiredUnmet.size > 0 ? "DEGRADED" : "HEALTHY";
    if (requiredUnmet.size > 0) reasons.push(`unmet capabilities: ${[...requiredUnmet].join(", ")}`);
    return { status, provided: provided.size, requiredUnmet: requiredUnmet.size };
  }

  private lifecycleAnomalies(entries: PackageEntry[]): number {
    // active/installed package whose every dependency is not itself active/installed
    let anomalies = 0;
    const manifests = new Map(entries.map((e) => [e.manifest.name, e.manifest]));
    const statuses = new Map(entries.map((e) => [e.manifest.name, e.status]));
    for (const e of entries) {
      if (e.status !== "active" && e.status !== "installed") continue;
      for (const dep of [...(e.manifest.dependencies ?? []), ...(e.manifest.peerDependencies ?? [])]) {
        const depStatus = statuses.get(dep.name);
        if (manifests.has(dep.name) && depStatus !== "active" && depStatus !== "installed") { anomalies += 1; }
      }
    }
    return anomalies;
  }
}