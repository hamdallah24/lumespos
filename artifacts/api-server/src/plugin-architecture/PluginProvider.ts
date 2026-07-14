import type { Plugin, PluginHook, PluginHookResult, PluginManifest, PluginStatus } from "./types";
import { PluginManager } from "./PluginManager";
import { getAllPlugins } from "./PluginRegistry";

export const PluginProvider = {
  register(manifest: PluginManifest, execute: (hook: PluginHook, payload: unknown) => unknown): boolean {
    return PluginManager.register({
      manifest,
      init: () => {},
      execute,
    });
  },

  registerFull(plugin: Plugin): boolean {
    return PluginManager.register(plugin);
  },

  unregister(id: string): boolean {
    return PluginManager.unregister(id);
  },

  initialize(id: string, config?: Record<string, unknown>): Promise<boolean> {
    return PluginManager.initialize(id, config);
  },

  start(id: string): Promise<boolean> {
    return PluginManager.start(id);
  },

  stop(id: string): Promise<boolean> {
    return PluginManager.stop(id);
  },

  executeHook(hook: PluginHook, payload: unknown): Promise<PluginHookResult[]> {
    return PluginManager.executeHook(hook, payload);
  },

  getAll(): Plugin[] {
    return getAllPlugins();
  },

  getStatus(id: string): PluginStatus | undefined {
    return PluginManager.getStatus(id);
  },
};
