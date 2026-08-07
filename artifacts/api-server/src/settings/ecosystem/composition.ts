// ConfigCenter — Milestone 6 Phase 4: Ecosystem composition root.
// Lazily assembles the Ecosystem Operations layer from the singleton ConfigCenter
// plus locked Plugin/Impact/Marketplace SDK instances. Internal to the ecosystem
// module; keeps REST routes free of business logic and guarantees a single
// coordinated ecosystem facade per process.

import { getConfigCenter } from "../index";
import { PackageManager } from "../marketplace/lifecycle";
import { EcosystemOperations } from "./operations";
import { EcosystemHealth } from "./health";
import { EcosystemDiagnostics } from "./diagnostics";
import { EcosystemExplorer, PackageCapabilitySource } from "./explorer";

/** Cross-cutting facade the REST routes call. Read-heavy + explicit mutations. */
export interface EcosystemFacade {
  health(): ReturnType<EcosystemHealth["report"]>;
  diagnostics(pkg?: string): ReturnType<EcosystemDiagnostics["run"]>;
  capabilities(required?: string[]): ReturnType<EcosystemExplorer["list"]>;
  packages(name?: string): ReturnType<EcosystemOperations["status"]>;
  events(filter?: { type?: string; package?: string }): unknown[];
  operation(id: string): unknown[];
  install(name: string, version?: string, ctx?: Record<string, string>): { ok: boolean; result?: unknown; error?: string };
  remove(name: string, version?: string, ctx?: Record<string, string>): { ok: boolean; result?: unknown; error?: string };
  forceRemove(name: string, version?: string, ctx?: Record<string, string>): { ok: boolean; result?: unknown; error?: string };
}

let cached: EcosystemFacade | null = null;

/** Lazy singleton used by the routes module and manual wiring. */
export function getEcosystem(): EcosystemFacade {
  if (cached) return cached;
  const center = getConfigCenter();

  const manager = new PackageManager();
  // host capability seed: the config capabilities the host itself provides
  const hostCapabilities = center.capabilities.list().filter((c) => c.available).map((c) => c.id);

  const operations = new EcosystemOperations({ packageManager: manager, now: Date.now });
  const health = new EcosystemHealth({ registry: manager.registry, hostCapabilities });
  const diagnostics = new EcosystemDiagnostics({ registry: manager.registry, hostCapabilities });
  const explorer = new EcosystemExplorer({
    sources: [new PackageCapabilitySource(manager.registry)],
    hostCapabilities,
  });

  cached = {
    health: () => health.report(),
    diagnostics: (pkg) => diagnostics.run(pkg),
    capabilities: (required) => explorer.list(required),
    packages: (name) => operations.status(name),
    events: (filter) => operations.events().filter((e) => {
      const ev = e as { type?: string; package?: string };
      if (filter?.type && ev.type !== filter.type) return false;
      if (filter?.package && ev.package !== filter.package) return false;
      return true;
    }),
    operation: (id) => {
      const all = operations.events();
      return (all as unknown as Array<{ correlationId?: string }>).filter((e) => e.correlationId === id);
    },
    install: (name, version, ctx) => operations.install(name, version, { actor: ctx?.actor, correlationId: ctx?.correlationId }),
    remove: (name, version, ctx) => operations.remove(name, version, { actor: ctx?.actor, correlationId: ctx?.correlationId }),
    forceRemove: (name, version, ctx) => operations.forceRemove(name, version, { actor: ctx?.actor, correlationId: ctx?.correlationId, reason: String(ctx?.reason ?? "") }),
  };
  return cached;
}