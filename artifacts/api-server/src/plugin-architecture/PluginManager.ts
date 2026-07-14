import type { Plugin, PluginHook, PluginHookResult, PluginStatus } from "./types";
import { registerPlugin, unregisterPlugin, getAllPlugins, getPlugin, setPluginStatus, getPluginsByHook, getPluginStatus } from "./PluginRegistry";
import { createPluginContext, clearPluginState } from "./PluginHost";

export const PluginManager = {
  register(plugin: Plugin): boolean {
    return registerPlugin(plugin);
  },

  unregister(id: string): boolean {
    const p = getPlugin(id);
    if (!p) return false;
    const ctx = createPluginContext(id, {});
    try { p.stop?.(ctx); } catch { /* non-critical */ }
    clearPluginState(id);
    return unregisterPlugin(id);
  },

  async initialize(id: string, config?: Record<string, unknown>): Promise<boolean> {
    const p = getPlugin(id);
    if (!p) return false;
    const status = getPluginStatus(id);
    if (status === "active" || status === "initialized") return true;
    try {
      const ctx = createPluginContext(id, config);
      await p.init(ctx);
      setPluginStatus(id, "initialized");
      return true;
    } catch (e) {
      setPluginStatus(id, "error");
      console.error(`[PluginManager] Failed to init plugin ${id}:`, e);
      return false;
    }
  },

  async start(id: string): Promise<boolean> {
    const p = getPlugin(id);
    if (!p) return false;
    const status = getPluginStatus(id);
    if (status === "active") return true;
    if (status !== "initialized") {
      const ok = await this.initialize(id);
      if (!ok) return false;
    }
    try {
      const ctx = createPluginContext(id, p.manifest);
      await p.start?.(ctx);
      setPluginStatus(id, "active");
      return true;
    } catch (e) {
      setPluginStatus(id, "error");
      console.error(`[PluginManager] Failed to start plugin ${id}:`, e);
      return false;
    }
  },

  async stop(id: string): Promise<boolean> {
    const p = getPlugin(id);
    if (!p) return false;
    try {
      const ctx = createPluginContext(id, {});
      await p.stop?.(ctx);
      setPluginStatus(id, "inactive");
      return true;
    } catch (e) {
      console.error(`[PluginManager] Failed to stop plugin ${id}:`, e);
      return false;
    }
  },

  async executeHook(hook: PluginHook, payload: unknown): Promise<PluginHookResult[]> {
    const matching = getPluginsByHook(hook);
    const results: PluginHookResult[] = [];

    for (const plugin of matching) {
      if (!plugin.execute) continue;
      const status = getPluginStatus(plugin.manifest.id);
      if (status !== "active" && status !== "initialized") continue;

      const start = Date.now();
      try {
        const ctx = createPluginContext(plugin.manifest.id, plugin.manifest);
        const result = await plugin.execute(hook, payload, ctx);
        results.push({
          pluginId: plugin.manifest.id,
          hook,
          success: true,
          result,
          durationMs: Date.now() - start,
        });
      } catch (e) {
        results.push({
          pluginId: plugin.manifest.id,
          hook,
          success: false,
          error: String(e),
          durationMs: Date.now() - start,
        });
      }
    }

    return results;
  },

  getStatus(id: string): PluginStatus | undefined {
    return getPluginStatus(id);
  },

  getAll(): Plugin[] {
    return getAllPlugins();
  },
};
