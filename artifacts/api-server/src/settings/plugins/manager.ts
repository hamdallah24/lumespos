// ConfigCenter — Milestone 6 Phase 1: PluginManager.
// Orchestrates the Plugin SDK. register() runs the full gate in order:
//   manifest validate → version compatibility → capability register →
//   dependency validation → registry put.
// Lifecycle ops (init/start/stop) drive the guarded state machine and only
// call the plugin's own hooks. on-config-changed hooks are wired as consumers
// of the locked ConfigEventBus — plugins receive notifications, never values.

import type { ConfigEventBus, ConfigurationChangedEvent } from "../events";
import type { ConfigReader } from "../sdk";
import { CapabilityRegistry } from "./capabilities";
import { VersionCompatibility } from "./compatibility";
import { validateDependencies } from "./dependencies";
import { assertTransition } from "./lifecycle";
import { validatePluginManifest } from "./manifest";
import { PluginRegistry } from "./registry";
import type {
  PluginImplementation,
  PluginManagerOptions,
  PluginManifest,
  PluginRegistration,
  PluginReport,
  PluginRuntimeContext,
  PluginStatus,
} from "./types";

export type { PluginManagerOptions } from "./types";

export class PluginManager {
  private readonly registry = new PluginRegistry();
  private readonly capabilities: CapabilityRegistry;
  private readonly compatibility: VersionCompatibility;
  private readonly bus: ConfigEventBus | undefined;
  private readonly now: () => number;
  private readonly sdk: ConfigReader;

  constructor(options: PluginManagerOptions) {
    this.sdk = options.sdk;
    this.now = options.now ?? Date.now;
    this.bus = options.bus;
    this.capabilities = new CapabilityRegistry(options.hostCapabilities ?? [], this.now);
    this.compatibility = new VersionCompatibility(options.apiVersion ?? "1.0.0", options.sdkVersion ?? "1.0.0");
  }

  /** Register a plugin if it passes manifest + compatibility + capability +
   *  dependency validation. Returns the registration or throws a structured error. */
  register(manifest: PluginManifest, impl: PluginImplementation): PluginRegistration {
    const validation = validatePluginManifest(manifest);
    if (!validation.ok || !validation.manifest) {
      throw new Error(`plugin manifest invalid: ${validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`);
    }
    const m = validation.manifest;
    if (this.registry.has(m.id)) throw new Error(`plugin already registered: ${m.id}`);

    const compat = this.compatibility.check(m);
    if (!compat.ok) throw new Error(`plugin incompatible: ${compat.reasons.join("; ")}`);

    const dependencyResult = validateDependencies(m, this.manifests());
    if (!dependencyResult.ok) {
      throw new Error(`dependency error: ${dependencyResult.issues.map((i) => i.message).join("; ")}`);
    }

    this.capabilities.register(m.id, m.capabilities ?? []);
    const reg = this.registry.put(m, impl);

    if (this.bus && m.hooks.includes("on-config-changed") && impl.onConfigurationChanged) {
      const subId = this.bus.on(`plugin:${m.id}`, (event) => {
        void this.onConfigurationChanged(m, event);
      });
      this.registry.setSubscription(m.id, subId);
    }
    return reg;
  }

  async init(id: string): Promise<PluginRegistration> {
    const reg = this.registry.registration(id);
    if (!reg) throw new Error(`plugin not registered: ${id}`);
    if (reg.status === "initialized" || reg.status === "active") return reg;
    assertTransition(reg.status, "initialized");
    const impl = this.registry.get(id);
    try {
      if (impl?.init) await impl.init(this.ctx(id));
      this.registry.setStatus(id, "initialized");
    } catch (err) {
      this.registry.setStatus(id, "error", { initError: err instanceof Error ? err.message : String(err) });
    }
    return this.registry.registration(id) as PluginRegistration;
  }

  async start(id: string): Promise<PluginRegistration> {
    const reg = this.registry.registration(id);
    if (!reg) throw new Error(`plugin not registered: ${id}`);
    if (reg.status === "active") return reg;
    if (reg.status === "registered") await this.init(id);
    const current = this.registry.registration(id) as PluginRegistration;
    assertTransition(current.status, "active");
    const impl = this.registry.get(id);
    try {
      if (impl?.start) await impl.start(this.ctx(id));
      this.registry.setStatus(id, "active", {
        lastStartedAt: this.now(),
        startCount: (this.registry.registration(id)?.startCount ?? 0) + 1,
      });
    } catch (err) {
      this.registry.setStatus(id, "error");
    }
    return this.registry.registration(id) as PluginRegistration;
  }

  async stop(id: string): Promise<PluginRegistration> {
    const reg = this.registry.registration(id);
    if (!reg) throw new Error(`plugin not registered: ${id}`);
    if (reg.status === "inactive") return reg;
    assertTransition(reg.status, "inactive");
    const impl = this.registry.get(id);
    try {
      if (impl?.stop) await impl.stop(this.ctx(id));
      this.registry.setStatus(id, "inactive", {
        lastStoppedAt: this.now(),
        stopCount: (this.registry.registration(id)?.stopCount ?? 0) + 1,
      });
    } catch (err) {
      this.registry.setStatus(id, "error");
    }
    return this.registry.registration(id) as PluginRegistration;
  }

  async unregister(id: string): Promise<boolean> {
    if (!this.registry.has(id)) return false;
    if (this.registry.registration(id)?.status === "active") await this.stop(id);
    if (this.bus) {
      const subId = this.registry.subscription(id);
      if (subId) this.bus.off(subId);
    }
    this.capabilities.unregisterAll(id);
    return this.registry.remove(id);
  }

  status(id: string): PluginStatus | undefined {
    return this.registry.registration(id)?.status;
  }

  registration(id: string): PluginRegistration | undefined {
    return this.registry.registration(id);
  }

  list(): PluginRegistration[] {
    return this.registry.list();
  }

  /** Safe start order: dependencies before dependents (deterministic). */
  order(): string[] {
    return this.registry.startOrder();
  }

  report(): PluginReport {
    const plugins = this.list();
    return {
      host: { apiVersion: this.compatibility.hostApiVersion, sdkVersion: this.compatibility.hostSdkVersion },
      plugins,
      capabilities: this.capabilities.list(),
      registeredCount: plugins.length,
      activeCount: plugins.filter((p) => p.status === "active").length,
      errorCount: plugins.filter((p) => p.status === "error").length,
    };
  }

  private manifests(): Map<string, PluginManifest> {
    const map = new Map<string, PluginManifest>();
    for (const reg of this.registry.list()) map.set(reg.manifest.id, reg.manifest);
    return map;
  }

  private async onConfigurationChanged(m: PluginManifest, event: ConfigurationChangedEvent): Promise<void> {
    const impl = this.registry.get(m.id);
    const reg = this.registry.registration(m.id);
    if (!impl?.onConfigurationChanged || !reg) return;
    if (reg.status === "error") return;
    try {
      await impl.onConfigurationChanged(
        {
          revision: event.revision,
          scope: event.scope,
          changedKeys: event.changedKeys,
          actor: event.actor,
          correlationId: event.correlationId,
          timestamp: event.timestamp,
        },
        this.ctx(m.id),
      );
    } catch (err) {
      this.registry.setStatus(m.id, "error", { initError: err instanceof Error ? err.message : String(err) });
    }
  }

  private ctx(id: string): PluginRuntimeContext {
    return {
      pluginId: id,
      config: this.sdk,
      log: () => { /* consumer-only no-op */ },
    };
  }
}