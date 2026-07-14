import type { PluginContext } from "./types";

const stateStore = new Map<string, Map<string, unknown>>();

export function createPluginContext(
  pluginId: string,
  config: Record<string, unknown> = {},
): PluginContext {
  if (!stateStore.has(pluginId)) {
    stateStore.set(pluginId, new Map());
  }
  const store = stateStore.get(pluginId)!;

  return {
    config,
    logger: (msg: string) => console.log(`[Plugin:${pluginId}] ${msg}`),
    getState: (key: string) => store.get(key),
    setState: (key: string, value: unknown) => { store.set(key, value); },
  };
}

export function clearPluginState(pluginId: string): void {
  stateStore.delete(pluginId);
}

export function clearAllState(): void {
  stateStore.clear();
}
