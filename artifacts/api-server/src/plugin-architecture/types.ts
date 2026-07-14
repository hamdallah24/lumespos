export type PluginStatus = "registered" | "initialized" | "active" | "inactive" | "error";

export type PluginHook =
  | "before_execute"
  | "after_execute"
  | "before_decision"
  | "after_decision"
  | "on_event"
  | "on_situation"
  | "on_plan_create";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  hooks: PluginHook[];
  dependencies?: string[];
}

export interface PluginContext {
  config: Record<string, unknown>;
  logger: (msg: string) => void;
  getState: (key: string) => unknown;
  setState: (key: string, value: unknown) => void;
}

export interface Plugin {
  manifest: PluginManifest;
  init(ctx: PluginContext): Promise<void> | void;
  start?(ctx: PluginContext): Promise<void> | void;
  stop?(ctx: PluginContext): Promise<void> | void;
  execute?(hook: PluginHook, payload: unknown, ctx: PluginContext): Promise<unknown> | unknown;
}

export interface PluginHookResult {
  pluginId: string;
  hook: PluginHook;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

export interface PluginStats {
  total: number;
  active: number;
  inactive: number;
  errored: number;
  hooks: Record<string, number>;
}
