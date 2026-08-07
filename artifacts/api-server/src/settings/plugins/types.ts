// ConfigCenter — Milestone 6 Phase 1: Plugin SDK shared types.
// Consumer-only plugin contracts. Plugins read config through the SDK and may
// subscribe to change notifications; they never touch the Store, Pipeline or
// Registry internals. Host versions (apiVersion/sdkVersion) are validated at
// registration via the Version Compatibility contract.

import type { ConfigReader } from "../sdk";
import type { ConfigEventBus } from "../events";

export type PluginStatus =
  | "registered"
  | "initialized"
  | "active"
  | "inactive"
  | "error";

export type PluginHook =
  | "on-init"
  | "on-start"
  | "on-stop"
  | "on-config-changed";

export interface PluginDependency {
  id: string;
  /** Semver range the target plugin's version must satisfy. */
  range: string;
  optional?: boolean;
}

export interface PluginManifest {
  /** Namespaced id, e.g. "com.lumes.temperature". */
  id: string;
  name: string;
  /** Semver version of this plugin. */
  version: string;
  description?: string;
  author?: string;
  /** Plugin SDK API contract this plugin was built against. */
  apiVersion: string;
  /** Semver range of the host config-sdk this plugin requires. */
  requiresSdk?: string;
  hooks: PluginHook[];
  /** Capabilities this plugin provides to the ecosystem. */
  capabilities?: string[];
  /** Capabilities (host or peer plugins) this plugin requires. */
  requiresCapabilities?: string[];
  dependencies?: PluginDependency[];
}

export interface PluginRuntimeContext {
  pluginId: string;
  config: ConfigReader;
  log: (message: string) => void;
}

export interface PluginImplementation {
  init?(ctx: PluginRuntimeContext): void | Promise<void>;
  start?(ctx: PluginRuntimeContext): void | Promise<void>;
  stop?(ctx: PluginRuntimeContext): void | Promise<void>;
  onConfigurationChanged?(event: {
    revision: number;
    scope: unknown;
    changedKeys: string[];
    actor: string;
    correlationId: string;
    timestamp: Date;
  }, ctx: PluginRuntimeContext): void | Promise<void>;
}

export interface PluginRegistration {
  manifest: PluginManifest;
  status: PluginStatus;
  initError?: string;
  lastStartedAt?: number;
  lastStoppedAt?: number;
  startCount: number;
  stopCount: number;
}

export interface PluginReport {
  host: {
    apiVersion: string;
    sdkVersion: string;
  };
  plugins: PluginRegistration[];
  capabilities: { capability: string; provider: string }[];
  registeredCount: number;
  activeCount: number;
  errorCount: number;
}

export interface PluginManagerOptions {
  sdk: ConfigReader;
  bus?: ConfigEventBus;
  /** Plugin SDK API version the host implements. */
  apiVersion?: string;
  /** Config-sdk version the host ships. */
  sdkVersion?: string;
  /** Host capabilities (outside the plugin ecosystem) available to plugins. */
  hostCapabilities?: string[];
  now?: () => number;
}
