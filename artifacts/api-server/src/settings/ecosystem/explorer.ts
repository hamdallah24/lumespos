// ConfigCenter — Milestone 6 Phase 4: Capability Explorer.
// Projection-only capability surface. Consumes capability sources that ALREADY
// exist (Plugin SDK CapabilityRegistry, Impact Provider SDK, Marketplace Package
// provides/requires) and exposes them as a unified read model. It is NOT a second
// capability registry — it holds no capability state of its own.

import type { CapabilityEntry, CapabilitySource } from "./types";
import type { PackageRegistry } from "../marketplace/registry";

/** A capability source adapter — a read-only view into an existing registry. */
export interface CapabilitySourceAdapter {
  /** Provider → capabilities it offers. Deterministic. */
  entries(): { provider: string; source: CapabilitySource; version?: string; capabilities: string[] }[];
}

export interface EcosystemExplorerOptions {
  sources: CapabilitySourceAdapter[];
  /** Host-provided capabilities (the host itself is a provider). */
  hostCapabilities?: string[];
}

export class EcosystemExplorer {
  private readonly sources: CapabilitySourceAdapter[];
  private readonly hostCapabilities: string[];

  constructor(options: EcosystemExplorerOptions) {
    this.sources = options.sources;
    this.hostCapabilities = [...(options.hostCapabilities ?? [])];
  }

  /** All capabilities, deterministically sorted by capability then provider. */
  list(required?: string[]): CapabilityEntry[] {
    const out: CapabilityEntry[] = [];
    const add = (capability: string, provider: string, source: CapabilitySource, version?: string): void => {
      if (required && required.length > 0 && !required.includes(capability)) return;
      out.push({
        capability,
        provider,
        source,
        version,
        status: "available",
        compatibility: "ok",
      });
    };
    for (const c of this.hostCapabilities) add(c, "__host__", "host");
    for (const src of this.sources) {
      for (const e of src.entries()) {
        for (const c of e.capabilities) add(c, e.provider, e.source, e.version);
      }
    }
    return out.sort((a, b) => a.capability.localeCompare(b.capability) || a.provider.localeCompare(b.provider));
  }

  /** Providers capable of offering any of the requested capabilities. */
  providersOf(required: string[]): string[] {
    const found = new Set<string>();
    for (const c of this.list(required)) found.add(c.provider);
    return [...found].sort();
  }

  /** Capabilities associated with a specific provider (package/plugin). */
  ofProvider(provider: string): CapabilityEntry[] {
    return this.list().filter((c) => c.provider === provider);
  }
}

/** Adapter over the Marketplace PackageRegistry (provides[]). */
export class PackageCapabilitySource implements CapabilitySourceAdapter {
  constructor(private readonly registry: PackageRegistry) {}

  entries(): Array<{ provider: string; source: CapabilitySource; version?: string; capabilities: string[] }> {
    return this.registry
      .list()
      .map((e) => ({ provider: e.manifest.name, source: "package" as CapabilitySource, version: e.manifest.version, capabilities: e.manifest.provides ?? [] }));
  }
}