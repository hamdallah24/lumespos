import type { Plugin, PluginManifest, PluginStatus } from "./types";

const plugins = new Map<string, { plugin: Plugin; status: PluginStatus }>();
const MAX_PLUGINS = 100;

export function registerPlugin(plugin: Plugin): boolean {
  if (plugins.has(plugin.manifest.id)) return false;
  if (plugins.size >= MAX_PLUGINS) return false;
  plugins.set(plugin.manifest.id, { plugin, status: "registered" });
  return true;
}

export function unregisterPlugin(id: string): boolean {
  return plugins.delete(id);
}

export function getPlugin(id: string): Plugin | undefined {
  return plugins.get(id)?.plugin;
}

export function getPluginStatus(id: string): PluginStatus | undefined {
  return plugins.get(id)?.status;
}

export function setPluginStatus(id: string, status: PluginStatus): boolean {
  const entry = plugins.get(id);
  if (!entry) return false;
  entry.status = status;
  return true;
}

export function getAllPlugins(): Plugin[] {
  return Array.from(plugins.values()).map(e => e.plugin);
}

export function getPluginsByHook(hook: string): Plugin[] {
  return getAllPlugins().filter(p => p.manifest.hooks.includes(hook as any));
}

export function getActivePlugins(): Plugin[] {
  return getAllPlugins().filter(p => {
    const status = plugins.get(p.manifest.id)?.status;
    return status === "active" || status === "initialized";
  });
}

export function clearPlugins(): void {
  plugins.clear();
}
