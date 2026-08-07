// ConfigCenter — Default configuration catalog.
// Seeds the Registry with the initial, agreed-upon fields. These mirror the
// pre-existing env constants (llm-adapter, RIC providers) WITHOUT changing
// runtime behavior: they become the DEFAULT slot of the scope chain.

import type { ConfigFieldMeta } from "./types";

const ALL_SCOPES = ["default", "workspace", "branch", "executive"] as const;

export const REGISTRY_CONFIG_VERSION = 1;

export const defaultConfigurationFields: ConfigFieldMeta[] = [
  // ── AI Providers ──
  {
    key: "providers.deepseek.model",
    title: "DeepSeek model",
    category: "providers",
    type: "string",
    defaultValue: "deepseek-chat",
    allowedValues: ["deepseek-chat", "deepseek-v4-flash"],
    scope: [...ALL_SCOPES],
    owner: "llm-adapter",
    criticality: "high",
    tags: ["llm", "default-provider"],
    introducedVersion: "1",
  },
  {
    key: "providers.deepseek.apiKey",
    title: "DeepSeek API key",
    category: "providers",
    type: "secret",
    defaultValue: "",
    scope: ["default"],
    secret: true,
    criticality: "critical",
    tags: ["credentials"],
    introducedVersion: "1",
  },
  {
    key: "providers.deepseek.baseUrl",
    title: "DeepSeek base URL",
    category: "providers",
    type: "string",
    defaultValue: "",
    scope: ["default"],
    tags: ["llm/endpoint"],
    introducedVersion: "1",
  },
  {
    key: "providers.gemini.model",
    title: "Gemini model",
    category: "providers",
    type: "string",
    defaultValue: "gemini-2.5-flash",
    allowedValues: ["gemini-2.5-flash"],
    scope: [...ALL_SCOPES],
    owner: "llm-adapter",
    tags: ["llm/fallback"],
    introducedVersion: "1",
  },
  {
    key: "providers.gemini.apiKey",
    title: "Gemini API key",
    category: "providers",
    type: "secret",
    defaultValue: "",
    scope: ["default"],
    secret: true,
    owner: "llm-adapter",
    tags: ["credentials"],
    introducedVersion: "1",
  },
  {
    key: "providers.defaultProvider",
    title: "Primary LLM provider",
    category: "providers",
    type: "string",
    defaultValue: "deepseek",
    allowedValues: ["deepseek", "gemini"],
    scope: [...ALL_SCOPES],
    owner: "llm-adapter",
    restartStrategy: "reload",
    tags: ["llm/routing"],
    introducedVersion: "1",
  },
  {
    key: "providers.temperature",
    title: "LLM temperature",
    category: "providers",
    type: "number",
    defaultValue: 0.7,
    scope: [...ALL_SCOPES],
    owner: "llm-adapter",
    restartStrategy: "hot",
    tags: ["llm/tuning"],
    introducedVersion: "1",
  },
  {
    key: "providers.maxTokens",
    title: "LLM max tokens",
    category: "providers",
    type: "number",
    defaultValue: 4000,
    scope: [...ALL_SCOPES],
    owner: "llm-adapter",
    restartStrategy: "hot",
    tags: ["llm/tuning"],
    introducedVersion: "1",
  },

  // ── Runtime toggles (feature flags, previously env/in-memory) ──
  {
    key: "runtime.ric.enabled",
    title: "Runtime Intelligence Core",
    category: "runtime",
    type: "boolean",
    defaultValue: true,
    scope: [...ALL_SCOPES],
    owner: "business-os",
    restartStrategy: "reload",
    tags: ["subsystem/runtime"],
    introducedVersion: "1",
  },
  {
    key: "runtime.executive.enabled",
    title: "Executive Runtime",
    category: "runtime",
    type: "boolean",
    defaultValue: true,
    scope: [...ALL_SCOPES],
    owner: "executive-runtime",
    restartStrategy: "reload",
    tags: ["subsystem/runtime"],
    introducedVersion: "1",
  },
  {
    key: "runtime.scheduler.enabled",
    title: "Background schedulers",
    category: "runtime",
    type: "boolean",
    defaultValue: true,
    scope: [...ALL_SCOPES],
    owner: "kernel",
    restartStrategy: "reload",
    tags: ["runtime/schedulers"],
    introducedVersion: "1",
  },
  {
    key: "runtime.businessIntelligence.enabled",
    title: "Business Intelligence",
    category: "runtime",
    type: "boolean",
    defaultValue: true,
    scope: [...ALL_SCOPES],
    owner: "business-os",
    restartStrategy: "reload",
    tags: ["runtime/bi"],
    introducedVersion: "1",
  },

  // ── Executive tuning (per-executive, later bound to each C-level) ──
  ...([
    "CEO", "COO", "CFO", "CMO", "CHRO", "CAIO", "CKO", "CTO",
  ] as const).flatMap<ConfigFieldMeta>((role) => [
    {
      key: `executives.${role}.model`,
      title: `${role} model`,
      category: "executive",
      type: "string",
      defaultValue: "deepseek-chat",
      scope: ["default", "workspace", "executive" as const],
      owner: "executive-runtime",
      restartStrategy: "reload",
      tags: ["executive/llm"],
      introducedVersion: "1",
    },
    {
      key: `executives.${role}.temperature`,
      title: `${role} temperature`,
      category: "executive",
      type: "number",
      defaultValue: 0.7,
      scope: ["default", "workspace", "executive" as const],
      owner: "executive-runtime",
      restartStrategy: "hot",
      tags: ["executive/tuning"],
      introducedVersion: "1",
    },
    {
      key: `executives.${role}.maxTokens`,
      title: `${role} max tokens`,
      category: "executive",
      type: "number",
      defaultValue: 8000,
      scope: ["default", "workspace", "executive" as const],
      owner: "executive-runtime",
      restartStrategy: "reload",
      tags: ["executive/tuning"],
      introducedVersion: "1",
    },
    {
      key: `executives.${role}.enabled`,
      title: `${role} enabled`,
      category: "executive",
      type: "boolean",
      defaultValue: true,
      scope: ["default", "workspace", "executive" as const],
      owner: "executive-runtime",
      restartStrategy: "reload",
      tags: ["executive/runtime"],
      introducedVersion: "1",
    },
  ]),
];

// A shared type helper to keep executive role list in sync with types.
import type { ExecutiveRole } from "./types";

// Pre-register for convenience during bootstrap.
import { ConfigurationRegistry } from "./registry";
export function registerDefaultConfiguration(registry: ConfigurationRegistry, options?: { freeze?: boolean }): void {
  registry.registerMany(defaultConfigurationFields);
  if (options?.freeze) registry.freeze();
}