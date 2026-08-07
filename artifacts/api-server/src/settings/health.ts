// ConfigCenter — Configuration Health.
// Observable snapshot of Configuration Center internals: Registry status +
// checksum, store/revision, resolver cache, event bus, subscriber count,
// capabilities, and metrics. Consumed by endpoints/debugging/CI validation.

import { ConfigurationRegistry } from "./registry";
import { CapabilityDiscovery } from "./capabilities";
import { ConfigMetrics } from "./metrics";
import type { ConfigEventBus } from "./events";
import type { ConfigurationResolver } from "./resolver";
import type { SettingsStore } from "./store";

export type HealthStatus = "ok" | "degraded" | "error";

export interface ConfigCenterHealthReport {
  status: HealthStatus;
  registry: {
    status: HealthStatus;
    frozen: boolean;
    fieldCount: number;
    groupCount: number;
    checksum: string;
  };
  store: {
    status: HealthStatus;
    revision: number;
    overrideCount: number;
  };
  resolver: {
    status: HealthStatus;
    cacheSize: number;
    lastRevision: number;
  };
  eventBus: {
    status: HealthStatus;
    lastRevision: number;
    subscriberCount: number;
  };
  capabilities: Record<string, boolean>;
  metrics: MetricsSnapshot;
}

import type { MetricsSnapshot } from "./metrics";

const ok = (status: HealthStatus) => status === "ok";

export class ConfigCenterHealth {
  constructor(private readonly deps: {
    registry: ConfigurationRegistry;
    store: SettingsStore;
    resolver: ConfigurationResolver;
    bus: ConfigEventBus;
    capabilities: CapabilityDiscovery;
    metrics: ConfigMetrics;
  }) {}

  async report(): Promise<ConfigCenterHealthReport> {
    const { registry, store, resolver, bus, capabilities, metrics } = this.deps;

    const registryStatus: HealthStatus = registry.isFrozen && registry.list().length > 0 ? "ok" : "degraded";
    const storeStatus: HealthStatus = store.revisionCount >= 0 ? "ok" : "error";
    const resolverStatus: HealthStatus = resolver.lastRevision >= 0 ? "ok" : "degraded";
    const busStatus: HealthStatus = "ok";

    const statuses: HealthStatus[] = [registryStatus, storeStatus, resolverStatus, busStatus];
    const status: HealthStatus = statuses.some((s) => s === "error")
      ? "error"
      : statuses.every((s) => ok(s))
        ? "ok"
        : "degraded";

    return {
      status,
      registry: {
        status: registryStatus,
        frozen: registry.isFrozen,
        fieldCount: registry.list().length,
        groupCount: registry.listGroups().length,
        checksum: registry.isFrozen ? registry.getChecksum() : "",
      },
      store: {
        status: storeStatus,
        revision: await store.currentRevision(),
        overrideCount: store.overrideCount,
      },
      resolver: {
        status: resolverStatus,
        cacheSize: resolver.cacheSize,
        lastRevision: resolver.lastRevision,
      },
      eventBus: {
        status: busStatus,
        lastRevision: bus.lastRevision,
        subscriberCount: bus.subscriberCount,
      },
      capabilities: Object.fromEntries(capabilities.list().map((c) => [c.id, c.available])),
      metrics: metrics.snapshot(),
    };
  }

  // Deployment validation: assert the registry is intact and checksum matches expected.
  assertRegistry(expectedChecksum?: string): { ok: boolean; reason?: string } {
    const { registry } = this.deps;
    if (!registry.isFrozen) return { ok: false, reason: "registry not frozen" };
    if (expectedChecksum && registry.getChecksum() !== expectedChecksum) {
      return { ok: false, reason: `registry checksum mismatch: expected ${expectedChecksum}, got ${registry.getChecksum()}` };
    }
    if (registry.list().length === 0) return { ok: false, reason: "registry empty" };
    return { ok: true };
  }
}