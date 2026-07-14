export * from "./types";
export {
  registerPlugin, unregisterPlugin, getPlugin, getPluginStatus,
  getAllPlugins, getPluginsByHook, getActivePlugins, clearPlugins,
} from "./PluginRegistry";
export { PluginManager } from "./PluginManager";
export { PluginProvider } from "./PluginProvider";
export { createPluginContext, clearPluginState, clearAllState } from "./PluginHost";

let initialized = false;

export function initializePluginArchitecture(): void {
  if (initialized) return;
  initialized = true;
  console.log(`[PA] Plugin Architecture initialized — Registry + Manager + Host ready`);
}
