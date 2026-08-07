// ConfigCenter — Composition Root.
// Wires the full Configuration Center foundation into a single initializable
// unit. Milestone 1: defaults seeded into registry + in-memory store, resolver
// warmed, security + pipeline assembled, plus observability refinements
// (checksum, capabilities, metrics, health). No APPLY phase exists anywhere.

import { ConfigurationRegistry } from "./registry";
import { registerDefaultConfiguration } from "./defaults";
import { ConfigurationResolver } from "./resolver";
import { SettingsStore } from "./store";
import { ConfigurationPipeline } from "./pipeline";
import { ConfigSecurity } from "./security";
import { ConfigEventBus } from "./events";
import { createConfigSDK, ConfigurationSDK } from "./sdk";
import { ConfigMetrics } from "./metrics";
import { CapabilityDiscovery } from "./capabilities";
import { ConfigCenterHealth } from "./health";

export interface ConfigCenterInstances {
  registry: ConfigurationRegistry;
  resolver: ConfigurationResolver;
  store: SettingsStore;
  bus: ConfigEventBus;
  security: ConfigSecurity;
  pipeline: ConfigurationPipeline;
  sdk: ConfigurationSDK;
  metrics: ConfigMetrics;
  capabilities: CapabilityDiscovery;
  health: ConfigCenterHealth;
}

export class ConfigCenter {
  readonly registry = new ConfigurationRegistry();
  readonly store = new SettingsStore();
  readonly bus = new ConfigEventBus();
  readonly metrics = new ConfigMetrics();
  readonly capabilities = new CapabilityDiscovery();
  security: ConfigSecurity;
  resolver: ConfigurationResolver;
  sdk: ConfigurationSDK;
  pipeline: ConfigurationPipeline;
  health: ConfigCenterHealth;

  constructor() {
    this.security = new ConfigSecurity(this.registry);
    this.resolver = new ConfigurationResolver(this.registry, this.store, this.metrics);
    this.sdk = createConfigSDK(this.resolver);
    this.pipeline = new ConfigurationPipeline({
      registry: this.registry,
      security: this.security,
      resolver: this.resolver,
      store: this.store,
      bus: this.bus,
      metrics: this.metrics,
    });
    this.health = new ConfigCenterHealth({
      registry: this.registry,
      store: this.store,
      resolver: this.resolver,
      bus: this.bus,
      capabilities: this.capabilities,
      metrics: this.metrics,
    });
  }

  // Bootstrap: seed defaults, freeze registry (computes checksum), warm resolver.
  async init(): Promise<void> {
    registerDefaultConfiguration(this.registry, { freeze: true });
    await this.resolver.warm();
  }

  instances(): ConfigCenterInstances {
    return {
      registry: this.registry,
      resolver: this.resolver,
      store: this.store,
      bus: this.bus,
      security: this.security,
      pipeline: this.pipeline,
      sdk: this.sdk,
      metrics: this.metrics,
      capabilities: this.capabilities,
      health: this.health,
    };
  }
}

// Lazily-initialized singleton for the api-server root.
let center: ConfigCenter | null = null;

export async function initConfigCenter(): Promise<ConfigCenter> {
  if (center) return center;
  center = new ConfigCenter();
  await center.init();
  return center;
}

export function getConfigCenter(): ConfigCenter {
  if (!center) throw new Error("[ConfigCenter] not initialized — call initConfigCenter() first");
  return center;
}
