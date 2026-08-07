// ConfigCenter — Configuration SDK.
// Narrow, role-limited interfaces so subsystems only see what they need.
// ConfigReader + ConfigResolver implemented in Milestone 1. ConfigSubscriber +
// ConfigAdmin are stubs reserved for later milestones (their contracts defined).
// Enforcement via DI + architecture tests + dependency rules, not the compiler.

import type {
  ConfigScope,
  ConfigValue,
  ResolutionContext,
  ResolvedValue,
} from "./types";
import type { ConfigurationResolver } from "./resolver";

// Read path — every subsystem reads config through this.
export interface ConfigReader {
  get(key: string, ctx?: ResolutionContext): Promise<ResolvedValue>;
  getMany(keys: string[], ctx?: ResolutionContext): Promise<ResolvedValue[]>;
}

// Resolution path — effective config + trace (Resolved Viewer).
export interface ConfigResolver {
  effective(ctx: ResolutionContext): Promise<Record<string, ConfigValue>>;
  resolve(key: string, ctx: ResolutionContext): Promise<ResolvedValue>;
  trace(key: string, ctx: ResolutionContext): Promise<ResolvedValue[]>;
}

// Subscription path — receive notifications (no values).
export interface ConfigSubscriberAdapter {
  subscribeChanged(
    filter: { keys?: string[]; scope?: Partial<ConfigScope> },
    handler: (event: { revision: number; changedKeys: string[]; correlationId: string }) => void,
  ): string;
  unsubscribe(id: string): void;
}

// Admin / write path — future milestones (pipeline, import/export, snapshot).
export interface ConfigAdmin {
  // Milestone 1: no write API. Reserved interface shape.
  readonly readonly: true;
}

export interface ConfigSDK extends ConfigReader, ConfigResolver {}

export class ConfigurationSDK implements ConfigReader, ConfigResolver {
  constructor(
    private readonly resolver: ConfigurationResolver,
    private readonly defaultContext?: ResolutionContext,
  ) {}

  // ConfigReader
  async get(key: string, ctx?: ResolutionContext): Promise<ResolvedValue> {
    return this.resolver.resolve(key, ctx ?? this.defaultCtx());
  }
  async getMany(keys: string[], ctx?: ResolutionContext): Promise<ResolvedValue[]> {
    return this.resolver.resolveMany(keys, ctx ?? this.defaultCtx());
  }

  // ConfigResolver
  async resolve(key: string, ctx: ResolutionContext): Promise<ResolvedValue> {
    return this.resolver.resolve(key, ctx);
  }
  async trace(key: string, ctx: ResolutionContext): Promise<ResolvedValue[]> {
    return this.resolver.trace(key, ctx);
  }
  async effective(ctx: ResolutionContext): Promise<Record<string, ConfigValue>> {
    return this.resolver.effective(ctx);
  }

  private defaultCtx(): ResolutionContext {
    return this.defaultContext ?? {};
  }
}

export function createConfigSDK(
  resolver: ConfigurationResolver,
  defaultCtx?: ResolutionContext,
): ConfigurationSDK {
  return new ConfigurationSDK(resolver, defaultCtx);
}