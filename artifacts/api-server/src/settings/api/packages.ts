// ConfigCenter — Package Store (Milestone 2 user layer).
// A configuration package bundles a set of catalog-defined overrides into an
// installable unit. Install/apply goes THROUGH the governance Pipeline — package
// payloads are whitelisted against the Registry (no unknown keys). This is the
// seed of the M6 Marketplace: packages are data, not code.

import type { ConfigurationRegistry } from "../registry";
import type { ConfigurationPipeline } from "../pipeline";
import type { ConfigScope, ConfigValue } from "../types";
import type { WriteActor } from "../security";

export type { ConfigScope, ConfigValue } from "../types";

export interface ConfigPackage {
  id: string;
  name: string;
  version: string;
  description?: string;
  category?: string;
  // Keys must exist in the Registry catalog.
  changes: Record<string, ConfigValue>;
  scope?: ConfigScope;
}

export interface PackageInstallResult {
  packageId: string;
  applied: string[];
  dryRun: boolean;
  revision?: number;
  correlationId?: string;
}

type PipelineLike = Pick<ConfigurationPipeline, "run" | "plan">;

export class PackageStore {
  private readonly packages: ConfigPackage[] = [];

  constructor(
    private readonly registry: ConfigurationRegistry,
    private readonly pipeline: PipelineLike,
  ) {}

  register(pkg: ConfigPackage): void {
    // Whitelist: every key in the package must be a declared Registry field.
    const unknown = Object.keys(pkg.changes).filter((k) => !this.registry.has(k));
    if (unknown.length > 0) {
      throw new Error(`package "${pkg.id}" references unknown keys: ${unknown.join(", ")}`);
    }
    const existing = this.packages.findIndex((p) => p.id === pkg.id);
    if (existing >= 0) this.packages[existing] = pkg;
    else this.packages.push(pkg);
  }

  list(): ConfigPackage[] {
    return [...this.packages];
  }

  get(id: string): ConfigPackage | undefined {
    return this.packages.find((p) => p.id === id);
  }

  // Apply a package through the governance Pipeline → new revision (or dry-run).
  async install(opts: {
    packageId: string;
    actor: WriteActor;
    scope?: ConfigScope;
    dryRun?: boolean;
  }): Promise<PackageInstallResult> {
    const pkg = this.get(opts.packageId);
    if (!pkg) throw new Error("package not found");
    const target: ConfigScope = { type: "workspace", workspaceId: 1, ...pkg.scope, ...opts.scope };
    const run = await this.pipeline.run({ actor: opts.actor, scope: target, changes: pkg.changes });
    if (!run.validation?.ok) throw new Error(run.validation?.errors.join("; ") ?? "validation failed");
    if (!run.policy?.ok) throw new Error(run.policy?.reason ?? "install denied by policy");
    const result: PackageInstallResult = {
      packageId: pkg.id,
      applied: Object.keys(pkg.changes),
      dryRun: Boolean(opts.dryRun),
    };
    if (run.revision != null) result.revision = run.revision;
    if (run.correlationId) result.correlationId = run.correlationId;
    return result;
  }
}