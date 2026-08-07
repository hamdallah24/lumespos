// ConfigCenter — shared types for the LUMÉ'S Cloud OS Configuration Center.
// Milestone 1 foundation. No APPLY phase: store/commit is the single source of truth.

export type ConfigScopeType = "default" | "workspace" | "branch" | "executive";

export type ExecutiveRole =
  | "CEO" | "COO" | "CFO" | "CMO" | "CHRO" | "CAIO" | "CKO" | "CTO";

export type RestartStrategy = "hot" | "reload" | "restart" | "manual";

export type Criticality = "low" | "medium" | "high" | "critical";

export type ConfigValue = unknown;
export type ConfigValues = Record<string, ConfigValue>;

// A scope reference. workspaceId/branchId/executiveRole are the coordinate for
// a specific override row; scope type determines which chain slot it occupies.
export interface ConfigScope {
  type: ConfigScopeType;
  workspaceId?: number | null;
  branchId?: number | null;
  executiveRole?: ExecutiveRole | null;
}

// A typed definition for a configuration key. Registry is the ONLY place these
// are declared. UI is generated from metadata — never from ad-hoc hardcoded keys.
export interface ConfigFieldMeta {
  key: string; // dotted path, e.g. "providers.deepseek.model"
  title: string;
  description?: string;
  category: string; // providers | executive | runtime | ...

  type: "string" | "number" | "boolean" | "secret" | "object";
  defaultValue: ConfigValue;
  allowedValues?: string[] | number[];
  // validation: zod schema or custom validator id. Kept declarative so UI + pipeline share it.
  validation?: unknown;

  scope: ConfigScopeType[]; // scopes this field may be overridden at
  owner?: string; // responsible subsystem/owner
  restartStrategy?: RestartStrategy;
  dependencies?: { from: string; to: string; type: "requires" | "disables" | "enables" | "conflicts" }[];
  secret?: boolean;
  immutable?: boolean;
  featureFlag?: boolean;
  experimental?: boolean;
  deprecated?: boolean;
  criticality?: Criticality;
  documentationUrl?: string;
  tags?: string[];
  introducedVersion?: string; // config_version this field was introduced in
}

export interface ConfigGroupMeta {
  id: string; // dotted group path, e.g. "providers"
  title: string;
  category: string;
  description?: string;
  fields: ConfigFieldMeta[];
}

// Resolved configuration for a single key after walking the scope chain.
export interface ResolvedValue<T = ConfigValue> {
  key: string;
  value: T;
  source: ConfigScope; // the scope that actually supplied the value (effective origin)
  inherited: boolean; // true if value came from a less-specific scope (fallback)
}

// A context against which configuration is resolved at read time.
export interface ResolutionContext {
  workspaceId?: number | null;
  branchId?: number | null;
  executiveRole?: ExecutiveRole | null;
}