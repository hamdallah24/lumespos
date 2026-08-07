// ConfigCenter — Milestone 6 Phase 4: Ecosystem Diagnostics.
// Read-only diagnostics engine over the Marketplace Foundation. Detects invalid
// manifests, checksum mismatches, missing/conflicting/cyclic dependencies,
// incompatible versions, unreachable deps, blocked removal, invalid lifecycle
// transitions, and orphan packages/capabilities. NEVER mutates Store, Registry,
// Resolver, Governance, or calls pipeline.run().

import { validatePackageManifest, manifestChecksum, type PackageManifest } from "../marketplace/manifest";
import { resolveDependencyGraph, type GraphIssue } from "../marketplace/dependencies";
import { satisfiesVersion } from "../plugins/semver";
import type { PackageRegistry, PackageEntry } from "../marketplace/registry";
import type { DiagnosticsReport, PackageDiagnostic, PackageDiagnosticKind } from "./types";

export interface EcosystemDiagnosticsOptions {
  registry: PackageRegistry;
  /** Capabilities the host itself provides — used for orphan-capability checks. */
  hostCapabilities?: string[];
}

export class EcosystemDiagnostics {
  private readonly registry: PackageRegistry;
  private readonly hostCapabilities: string[];

  constructor(options: EcosystemDiagnosticsOptions) {
    this.registry = options.registry;
    this.hostCapabilities = [...(options.hostCapabilities ?? [])];
  }

  /** Full read-only diagnostics report over the whole registry (or one package). */
  run(packageName?: string): DiagnosticsReport {
    const entries = this.registry.list();
    const manifests = new Map<string, PackageManifest>(entries.map((e) => [e.manifest.name, e.manifest]));
    const graph = resolveDependencyGraph(manifests);

    const diagnostics: PackageDiagnostic[] = [];
    const targets = packageName != null ? entries.filter((e) => e.manifest.name === packageName) : entries;

    for (const entry of targets) this.manifestChecks(entry.manifest, diagnostics);
    for (const issue of graph.issues) this.graphChecks(issue, diagnostics);
    for (const entry of targets) this.incompatibilityChecks(entry, manifests, diagnostics);
    for (const entry of targets) this.unreachableChecks(entry, manifests, graph, diagnostics);
    for (const entry of entries) this.blockedRemovalChecks(entry, diagnostics);
    for (const entry of entries) this.orphanChecks(entry, manifests, graph, diagnostics);

    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    return {
      diagnostics,
      packageCount: entries.length,
      errorCount,
      warningCount: diagnostics.length - errorCount,
      checkedAt: Date.now(),
    };
  }

  private push(pkg: PackageManifest, diagnostics: PackageDiagnostic[], kind: PackageDiagnosticKind, message: string, severity: PackageDiagnostic["severity"]): void {
    diagnostics.push({ package: pkg.name, version: pkg.version, kind, severity, message });
  }

  private manifestChecks(manifest: PackageManifest, diagnostics: PackageDiagnostic[]): void {
    const v = validatePackageManifest(manifest);
    if (!v.ok) {
      this.push(manifest, diagnostics, "invalid-manifest", `invalid manifest: ${v.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`, "error");
      return;
    }
    if (manifest.checksum != null && manifest.checksumAlgorithm === "fnv1a") {
      const recomputed = manifestChecksum(manifest);
      if (recomputed !== manifest.checksum) {
        this.push(manifest, diagnostics, "checksum-mismatch", `checksum mismatch: declared "${manifest.checksum}", recomputed "${recomputed}"`, "error");
      }
    }
  }

  private graphChecks(issue: GraphIssue, diagnostics: PackageDiagnostic[]): void {
    if (issue.kind === "cycle") {
      for (const entry of this.registry.list()) {
        this.push(entry.manifest, diagnostics, "dependency-cycle", issue.message, "error");
      }
      return;
    }
    const entry = this.registry.get(issue.package ?? "")[0];
    if (!entry) return;
    const kind: PackageDiagnosticKind = issue.kind === "missing" ? "missing-dependency" : issue.kind === "conflict" ? "dependency-conflict" : "dependency-conflict";
    this.push(entry, diagnostics, kind, issue.message, issue.kind === "duplicate" ? "warning" : "error");
  }

  private incompatibilityChecks(entry: PackageEntry, manifests: Map<string, PackageManifest>, diagnostics: PackageDiagnostic[]): void {
    for (const dep of [...(entry.manifest.dependencies ?? []), ...(entry.manifest.peerDependencies ?? [])]) {
      const target = manifests.get(dep.name);
      if (target && !satisfiesVersion(target.version, dep.range)) {
        this.push(entry.manifest, diagnostics, "incompatible-version", `dependency "${dep.name}@${target.version}" does not satisfy "${dep.range}"`, "error");
      }
    }
  }

  private unreachableChecks(entry: PackageEntry, manifests: Map<string, PackageManifest>, graph: { issues: GraphIssue[] }, diagnostics: PackageDiagnostic[]): void {
    const brokenNames = new Set<string>(graph.issues.map((i) => i.package).filter((n): n is string => n != null));
    for (const dep of [...(entry.manifest.dependencies ?? []), ...(entry.manifest.peerDependencies ?? [])]) {
      if (manifests.has(dep.name) && brokenNames.has(dep.name) && !brokenNames.has(entry.manifest.name)) {
        this.push(entry.manifest, diagnostics, "unreachable-dependency", `dependency "${dep.name}" is itself broken`, "warning");
      }
    }
  }

  private blockedRemovalChecks(entry: PackageEntry, diagnostics: PackageDiagnostic[]): void {
    const dependents = this.registry
      .list()
      .filter((e) => e.manifest.name !== entry.manifest.name &&
        [...(e.manifest.dependencies ?? []), ...(e.manifest.peerDependencies ?? [])].some((d) => d.name === entry.manifest.name) &&
        (e.status === "active" || e.status === "installed" || e.status === "resolved"))
      .map((e) => e.manifest.name);
    if (dependents.length > 0) {
      this.push(entry.manifest, diagnostics, "blocked-removal", `removal blocked by active dependents: ${dependents.join(", ")}`, "warning");
    }
  }

  private orphanChecks(entry: PackageEntry, manifests: Map<string, PackageManifest>, graph: { installOrder: string[] }, diagnostics: PackageDiagnostic[]): void {
    if (entry.status === "removed") return;

    // capability orphan: package requires a capability nobody provides (host or packages)
    const provided = new Set<string>(this.hostCapabilities);
    for (const e of manifests.values()) for (const c of e.provides ?? []) provided.add(c);
    const unmet = (entry.manifest.requires ?? []).filter((c) => !provided.has(c));
    if (unmet.length > 0) {
      this.push(entry.manifest, diagnostics, "orphan-capability", `requires capabilities nobody provides: ${unmet.join(", ")}`, "warning");
    }

    // package orphan: not referenced by any dependency, never installed
    const referenced = new Set<string>();
    for (const pkg of manifests.values()) {
      for (const dep of [...(pkg.dependencies ?? []), ...(pkg.peerDependencies ?? [])]) referenced.add(dep.name);
    }
    if (!referenced.has(entry.manifest.name) && graph.installOrder.length > 0 && entry.status === "discovered") {
      this.push(entry.manifest, diagnostics, "orphan-package", "package is not referenced by any dependency and never installed", "warning");
    }
  }
}
