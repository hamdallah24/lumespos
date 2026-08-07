// ConfigCenter — Milestone 6 Phase 2: Impact Provider Registry + Capability
// Discovery. registerImpactProvider() is the primary entrypoint. Providers are
// matched to a change by metadata category / key / restart strategy, so a
// provider declares what it understands then the registry discovers eligibility.
// Consumer-only: providers never bypass the pipeline.

import type { ConfigurationRegistry } from "../registry";
import type { ImpactChange, ImpactProviderDefinition } from "./types";

/** Register an impact provider against the global registry. Returns an id that
 *  can be used with unregisterImpactProvider(). */
export function registerImpactProvider(
  registry: ConfigurationRegistry,
  provider: ImpactProviderDefinition,
): ImpactProviderRegistry {
  const global = ImpactProviderRegistry.get();
  global.register(registry, provider);
  return global;
}

export function unregisterImpactProvider(id: string): boolean {
  return ImpactProviderRegistry.get().unregister(id);
}

export interface ProviderMatch {
  provider: ImpactProviderDefinition;
  reason: string;
}

/** Discovery facet — which providers (and capabilities) can analyze a change. */
export interface CapabilityDiscoveryResult {
  providers: ImpactProviderDefinition[];
  capabilities: string[];
}

export class ImpactProviderRegistry {
  private static instance: ImpactProviderRegistry | null = null;
  private providers = new Map<string, ImpactProviderDefinition>();

  static get(): ImpactProviderRegistry {
    if (!ImpactProviderRegistry.instance) ImpactProviderRegistry.instance = new ImpactProviderRegistry();
    return ImpactProviderRegistry.instance;
  }

  static reset(): void {
    ImpactProviderRegistry.instance = null;
  }

  register(registry: ConfigurationRegistry, provider: ImpactProviderDefinition): void {
    if (this.providers.has(provider.id)) {
      throw new Error(`impact provider already registered: ${provider.id}`);
    }
    this.providers.set(provider.id, provider);
  }

  unregister(id: string): boolean {
    return this.providers.delete(id);
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  list(): ImpactProviderDefinition[] {
    return [...this.providers.values()];
  }

  /** Providers eligible to analyze a change (by category/keys/restart). */
  eligible(change: ImpactChange): ProviderMatch[] {
    const out: ProviderMatch[] = [];
    for (const p of this.providers.values()) {
      const match = this.matchesProvider(p, change);
      if (match) out.push({ provider: p, reason: match });
    }
    return out;
  }

  private matchesProvider(p: ImpactProviderDefinition, change: ImpactChange): string | null {
    if (p.keys && p.keys.length > 0 && p.keys.includes(change.key)) return `key ${change.key}`;
    if (p.categories && p.categories.length > 0 && p.categories.includes(change.meta.category)) return `category ${change.meta.category}`;
    if (p.categories && p.categories.length > 0 && change.meta.restartStrategy && p.categories.includes(change.meta.restartStrategy)) return `restart ${change.meta.restartStrategy}`;
    if ((!p.keys || p.keys.length === 0) && (!p.categories || p.categories.length === 0)) return "any";
    return null;
  }

  /** Capability discovery: providers that offer any of the asked capabilities. */
  capabilitiesOf(required: string[]): CapabilityDiscoveryResult {
    const providers: ImpactProviderDefinition[] = [];
    const capabilities = new Set<string>();
    for (const p of this.providers.values()) {
      const offered = p.capabilities ?? [];
      if (required.length === 0 || offered.some((c) => required.includes(c))) {
        providers.push(p);
        for (const c of offered) capabilities.add(c);
      }
    }
    return { providers, capabilities: [...capabilities] };
  }
}

/** Re-exported for convenience. */
export type { ImpactChange };