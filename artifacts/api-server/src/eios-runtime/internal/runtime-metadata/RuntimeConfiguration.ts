export type ConfigLayer = "system" | "environment" | "tenant" | "branch" | "developer" | "override";

interface ConfigValue {
  value: unknown;
  layer: ConfigLayer;
}

const store = new Map<string, ConfigValue>();

export const RuntimeConfiguration = {
  set(key: string, value: unknown, layer: ConfigLayer = "system"): void {
    const existing = store.get(key);
    const layerOrder: ConfigLayer[] = ["system", "environment", "tenant", "branch", "developer", "override"];
    if (existing && layerOrder.indexOf(layer) < layerOrder.indexOf(existing.layer)) {
      return;
    }
    store.set(key, { value, layer });
  },

  get<T>(key: string, defaultValue?: T): T | undefined {
    const entry = store.get(key);
    return (entry?.value as T) ?? defaultValue;
  },

  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of store) {
      result[key] = entry.value;
    }
    return result;
  },

  getLayer(key: string): ConfigLayer | undefined {
    return store.get(key)?.layer;
  },

  clear(): void {
    store.clear();
  },

  // Predefined config keys with defaults
  defaults: {
    pipelineTimeout: 30000,
    stageTimeout: 5000,
    maxRetries: 2,
    heartbeatIntervalMs: 30000,
    schedulerIntervalMs: 30000,
    governanceCheckIntervalMs: 60000,
    maxQueueSize: 100,
    maxParallelism: 4,
  },
};
