// ConfigCenter — Milestone 6 Phase 1: Capability Registration.
// Plugins declare capabilities they provide and capabilities they require.
// The registry resolves providers and rejects ambiguity (a capability may be
// provided by exactly one plugin). The host's own capabilities are seeded in.

export interface CapabilityProvider {
  capability: string;
  provider: string;
  registeredAt: number;
}

export class CapabilityRegistry {
  private providers = new Map<string, CapabilityProvider>();

  constructor(hostCapabilities: string[] = [], private readonly now: () => number = Date.now) {
    for (const capability of hostCapabilities) this.providers.set(capability, { capability, provider: "__host__", registeredAt: this.now() });
  }

  register(pluginId: string, capabilities: string[]): void {
    for (const capability of capabilities) {
      const existing = this.providers.get(capability);
      if (existing && existing.provider !== pluginId) {
        throw new Error(`capability "${capability}" already provided by "${existing.provider}"`);
      }
      if (!existing) {
        this.providers.set(capability, { capability, provider: pluginId, registeredAt: this.now() });
      }
    }
  }

  unregisterAll(pluginId: string): void {
    for (const [capability, provider] of [...this.providers.entries()]) {
      if (provider.provider === pluginId) this.providers.delete(capability);
    }
  }

  providerOf(capability: string): string | undefined {
    return this.providers.get(capability)?.provider;
  }

  has(capability: string): boolean {
    return this.providers.has(capability);
  }

  list(): CapabilityProvider[] {
    return [...this.providers.values()];
  }
}
