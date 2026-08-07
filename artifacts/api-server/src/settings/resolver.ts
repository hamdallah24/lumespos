// ConfigCenter — Configuration Resolver.
// Owns inheritance + merge chain + effective configuration. Reads overrides
// from a settings source (in-memory/DB-backed store). Produces Resolved
// Configuration for DEFAULT → WORKSPACE → BRANCH → EXECUTIVE → ROLE.
// No APPLY: resolved values are derived from the committed store only.

import { ConfigurationRegistry } from "./registry";
import { ConfigMetrics } from "./metrics";
import type {
  ConfigScope,
  ConfigValue,
  ResolutionContext,
  ResolvedValue,
} from "./types";

// A raw override set scoped at a single level of the chain.
export interface ScopedOverrideSet {
  scope: ConfigScope;
  values: Record<string, ConfigValue>;
}

export interface SettingsSource {
  // All committed override sets, grouped by dimension. Resolver orders them.
  loadOverrides(): Promise<ScopedOverrideSet[]>;
  // Monotonic revision of the underlying store (for cache invalidation).
  currentRevision(): Promise<number>;
}

const SCOPE_ORDER: ConfigScope["type"][] = [
  "default",
  "workspace",
  "branch",
  "executive",
];

// A per-context, pre-ordered list of override layers. Most specific LAST.
type Layer = { scope: ConfigScope; values: Record<string, ConfigValue> };

export class ConfigurationResolver {
  private cache = new Map<string, Layer[]>();
  private cacheRevision = -1;

  constructor(
    private readonly registry: ConfigurationRegistry,
    private readonly source: SettingsSource,
    private readonly metrics?: Pick<ConfigMetrics, "increment" | "timeAsync">,
  ) {}

  async warm(): Promise<void> {
    this.cacheRevision = await this.source.currentRevision();
    this.cache.clear();
  }

  invalidate(): void {
    this.cache.clear();
  }

  get lastRevision(): number {
    return this.cacheRevision;
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  // Order committed override sets by scope specificity for a given context.
  // Immutable/registered keys with no override fall back to registry defaults.
  private orderLayers(
    overrides: ScopedOverrideSet[],
    ctx: ResolutionContext,
  ): Layer[] {
    const buckets = new Map<ConfigScope["type"], Layer>();
    for (const type of SCOPE_ORDER) buckets.set(type, { scope: { type }, values: {} });

    for (const set of overrides) {
      const applicable =
        (set.scope.type === "workspace" && set.scope.workspaceId === ctx.workspaceId) ||
        (set.scope.type === "branch" && set.scope.branchId === ctx.branchId) ||
        (set.scope.type === "executive" && set.scope.executiveRole === ctx.executiveRole) ||
        set.scope.type === "default";
      if (!applicable) continue;
      const bucket = buckets.get(set.scope.type)!;
      // Preserve full scope coordinates so ResolvedValue.source is accurate.
      bucket.scope = { ...set.scope };
      Object.assign(bucket.values, set.values);
    }

    // Drop empty scopes that don't apply to the context (keeps chain tight).
    const layers: Layer[] = [];
    for (const type of SCOPE_ORDER) {
      if (type === "default") {
        layers.push(buckets.get("default")!);
        continue;
      }
      if (
        (type === "workspace" && ctx.workspaceId == null) ||
        (type === "branch" && ctx.branchId == null) ||
        (type === "executive" && ctx.executiveRole == null)
      ) {
        continue;
      }
      layers.push(buckets.get(type)!);
    }
    return layers;
  }

  private resolveInLayers(key: string, layers: Layer[]): ResolvedValue {
    const meta = this.registry.require(key);
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (Object.prototype.hasOwnProperty.call(layer.values, key)) {
        return {
          key,
          value: layer.values[key],
          source: layer.scope,
          inherited: layer.scope.type !== "default",
        };
      }
    }
    return { key, value: meta.defaultValue, source: { type: "default" }, inherited: false };
  }

  private async getLayers(ctx: ResolutionContext): Promise<Layer[]> {
    const signature = `${ctx.workspaceId ?? "·"}|${ctx.branchId ?? "·"}|${ctx.executiveRole ?? "·"}`;
    const cached = this.cache.get(signature) as Layer[] | undefined;
    if (cached) {
      this.metrics?.increment("cache_hit");
      return cached;
    }
    this.metrics?.increment("cache_miss");
    const overrides = await this.source.loadOverrides();
    const layers = this.orderLayers(overrides, ctx);
    this.cache.set(signature, layers);
    return layers;
  }

  async resolve(key: string, ctx: ResolutionContext): Promise<ResolvedValue> {
    if (!this.metrics) {
      const layers = await this.getLayers(ctx);
      return this.resolveInLayers(key, layers);
    }
    return this.metrics.timeAsync("resolver_latency_ms", async () => {
      const layers = await this.getLayers(ctx);
      return this.resolveInLayers(key, layers);
    });
  }

  async resolveMany(keys: string[], ctx: ResolutionContext): Promise<ResolvedValue[]> {
    if (!this.metrics) {
      const layers = await this.getLayers(ctx);
      return keys.map((k) => this.resolveInLayers(k, layers));
    }
    return this.metrics.timeAsync("resolver_latency_ms", async () => {
      const layers = await this.getLayers(ctx);
      return keys.map((k) => this.resolveInLayers(k, layers));
    });
  }

  // Effective configuration for a context — every registered key merged.
  async effective(ctx: ResolutionContext): Promise<Record<string, ConfigValue>> {
    const keys = this.registry.list().map((f) => f.key);
    const resolved = await this.resolveMany(keys, ctx);
    const out: Record<string, ConfigValue> = {};
    for (const r of resolved) out[r.key] = r.value;
    return out;
  }

  // Expose the ordered layers for a context (used by Resolved Configuration Viewer).
  async trace(key: string, ctx: ResolutionContext): Promise<ResolvedValue[]> {
    const layers = await this.getLayers(ctx);
    const meta = this.registry.require(key);
    const trace: ResolvedValue[] = [];
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const has = Object.prototype.hasOwnProperty.call(layer.values, key);
      trace.push({
        key,
        value: has ? layer.values[key] : meta.defaultValue,
        source: layer.scope,
        inherited: !has,
      });
    }
    return trace.reverse();
  }
}
