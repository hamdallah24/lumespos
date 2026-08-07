// ConfigCenter — Milestone 6 Phase 3: Package Install/Remove Lifecycle.
// State machine: DISCOVERED → VALIDATED → RESOLVED → INSTALLED → ACTIVE.
// Removal: ACTIVE → DEPENDENCY CHECK → REMOVED. Installation fails fast if the
// package is invalid (manifest/checksum/compat), or its dependency graph is not
// green (missing/conflict/cycle/unresolvable). Removal is blocked while the
// package is still an active dependency of another unless force is supplied.
// The marketplace never takes over commit/governance/revision/resolver authority.

import { validatePackageManifest, manifestChecksum, artifactChecksum, type PackageManifest } from "./manifest";
import { resolveDependencyGraph } from "./dependencies";
import { PackageRegistry, type PackageStatus } from "./registry";

export type RemovalPolicy = "blocking" | "force";

export interface InstallResult {
  ok: boolean;
  name: string;
  version: string;
  status: PackageStatus;
  message?: string;
  installOrder: string[];
}

export interface RemoveResult {
  ok: boolean;
  name: string;
  version?: string;
  status: PackageStatus;
  message?: string;
  removalOrder: string[];
}

export interface PackageManagerOptions {
  now?: () => number;
}

export class PackageManager {
  readonly registry: PackageRegistry;

  constructor(options: PackageManagerOptions = {}) {
    this.registry = new PackageRegistry(options.now);
  }

  /** Validate a raw manifest (structural) — does NOT register. */
  inspect(input: unknown): { ok: boolean; message?: string; manifest?: PackageManifest } {
    const v = validatePackageManifest(input);
    if (!v.ok || !v.manifest) return { ok: false, message: v.issues.map((i) => `${i.path}: ${i.message}`).join("; ") };
    return { ok: true, manifest: v.manifest };
  }

  /** Register into DISCOVERED, computing + storing the manifest checksum. */
  discover(raw: unknown, payload?: Record<string, unknown>): { ok: boolean; manifest?: PackageManifest; message?: string } {
    const inspected = this.inspect(raw);
    if (!inspected.ok || !inspected.manifest) return { ok: false, message: inspected.message };
    const m = inspected.manifest;
    m.checksum = payload ? artifactChecksum(m, payload) : manifestChecksum(m);
    m.checksumAlgorithm = "fnv1a";
    const existing = this.registry.getVersion(m.name, m.version);
    if (!existing) {
      // verify integrity of the incoming manifest against its own checksum (if provided)
      if (typeof raw === "object" && raw != null && (raw as Record<string, unknown>)["checksum"] != null) {
        const declared = String((raw as Record<string, unknown>)["checksum"]);
        const computed = m.checksum;
        if (declared !== computed) {
          return { ok: false, message: `manifest checksum mismatch: declared "${declared}", computed "${computed}"` };
        }
      }
    }
    this.registry.register(m);
    return { ok: true, manifest: m };
  }

  /** Transition DISCOVERED → VALIDATED (re-runs manifest + checksum checks). */
  validate(name: string, version?: string): InstallResult {
    const pkg = version ? this.registry.getVersion(name, version) : this.registry.get(name)[0];
    if (!pkg) return { ok: false, name, version: version ?? "", status: "discovered", message: `package not found: ${name}`, installOrder: [] };
    const v = validatePackageManifest(pkg);
    if (!v.ok) return { ok: false, name, version: pkg.version, status: "discovered", message: "manifest invalid", installOrder: [] };
    if (pkg.checksum) {
      const computed = pkg.checksumAlgorithm === "fnv1a" ? manifestChecksum(pkg) : null;
      if (computed && computed !== pkg.checksum) {
        return { ok: false, name, version: pkg.version, status: "discovered", message: "checksum invalid", installOrder: [] };
      }
    }
    this.registry.setStatus(name, pkg.version, "validated");
    return { ok: true, name, version: pkg.version, status: "validated", installOrder: [] };
  }

  /** Transition → RESOLVED + INSTALLED + ACTIVE in dependency order. */
  install(name: string, version?: string): InstallResult {
    const target = version ? this.registry.getVersion(name, version) : this.registry.get(name)[0];
    if (!target) return { ok: false, name, version: version ?? "", status: "discovered", message: `package not found: ${name}`, installOrder: [] };

    // structural + integrity re-check before install (fails on invalid manifest / checksum)
    const validated = this.validate(name, version);
    if (!validated.ok) return validated;

    // graph must be green for the full registered set (install target resolution)
    const graph = resolveDependencyGraph(this.manifestMap());
    if (!graph.ok) {
      const first = graph.issues[0];
      return { ok: false, name, version: target.version, status: "discovered", message: `dependency error: ${first.message}`, installOrder: [] };
    }
    if (!graph.installOrder.includes(target.name)) {
      return { ok: false, name, version: target.version, status: "discovered", message: "target not reachable in install order", installOrder: [] };
    }

    // install in dependency-first order
    for (const pkgName of graph.installOrder) {
      const pkg = this.registry.get(pkgName)[0];
      if (!pkg) continue;
      const st = this.registry.status(pkg.name, pkg.version) ?? "discovered";
      if (st === "active" || st === "installed" || st === "resolved") continue;
      if (st === "discovered" || st === "validated") this.registry.setStatus(pkg.name, pkg.version, "resolved");
      this.registry.setStatus(pkg.name, pkg.version, "installed");
      this.registry.setStatus(pkg.name, pkg.version, "active");
      this.registry.setInstalledAt(pkg.name, pkg.version, this.now());
    }

    return { ok: true, name: target.name, version: target.version, status: "active", installOrder: graph.installOrder };
  }

  /** ACTIVE → DEPENDENCY CHECK → REMOVED. Blocked if a dependent is active. */
  remove(name: string, version?: string, policy: RemovalPolicy = "blocking"): RemoveResult {
    const pkg = version ? this.registry.getVersion(name, version) : this.registry.get(name)[0];
    if (!pkg) return { ok: false, name, version: version ?? "", status: "removed", message: `package not found: ${name}`, removalOrder: [] };

    const graph = resolveDependencyGraph(this.manifestMap());
    if (policy !== "force") {
      // dependents that are active and depend on `name` (with this version) block removal
      const blockedBy: string[] = [];
      for (const entry of this.registry.list()) {
        if (entry.manifest.name === name) continue;
        const deps = [...(entry.manifest.dependencies ?? []), ...(entry.manifest.peerDependencies ?? [])];
        const usesThis = deps.some((d) => d.name === name);
        if (usesThis && (entry.status === "active" || entry.status === "installed" || entry.status === "resolved")) {
          blockedBy.push(entry.manifest.name);
        }
      }
      if (blockedBy.length > 0) {
        return { ok: false, name, version: pkg.version, status: "active", message: `blocked by dependents: ${blockedBy.join(", ")}`, removalOrder: [] };
      }
    }

    // removal order: dependents first (reverse install order), then the target
    const order = policy === "force" ? [] : graphRemovalOrder(this.manifestMap(), name);
    this.registry.setStatus(name, pkg.version, "removed");
    // GC: unregister the version (keeps the artifact history via status)
    this.registry.unregister(name, pkg.version);
    return { ok: true, name, version: pkg.version, status: "removed", message: undefined, removalOrder: order };
  }

  /** Set of registered manifests (highest version per name). Public for graph use. */
  list(): PackageManifest[] {
    return this.registry.list().map((e) => e.manifest);
  }

  private manifestMap(): Map<string, PackageManifest> {
    return new Map(this.list().map((m) => [m.name, m]));
  }

  private now(): number {
    return Date.now();
  }
}

function graphRemovalOrder(packages: Map<string, PackageManifest>, target: string): string[] {
  const graph = resolveDependencyGraph(packages);
  const rev = [...graph.removalOrder];
  return rev.filter((n) => n !== target).concat(target);
}