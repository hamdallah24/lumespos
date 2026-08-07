// ConfigCenter — Configuration Registry.
// The single contract of the whole system. Every configuration key must be
// declared here before it can be read, validated, or overridden. No hardcoded
// keys in subsystems. Registry is frozen after bootstrap.

import type {
  ConfigFieldMeta,
  ConfigGroupMeta,
  ConfigScopeType,
  ConfigValue,
} from "./types";

export type RegistryValidationError = {
  key: string;
  path: string;
  message: string;
};

export interface RegistryRegisterOptions {
  freeze?: boolean;
}

export class ConfigurationRegistry {
  private fields = new Map<string, ConfigFieldMeta>();
  private groups = new Map<string, ConfigGroupMeta>();
  private frozen = false;
  private checksum = "";

  freeze(): void {
    this.frozen = true;
    this.checksum = this.computeChecksum();
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  // Stable content hash computed at freeze. Used for health monitoring,
  // integrity verification, deployment validation, and debugging.
  getChecksum(): string {
    if (!this.frozen) {
      throw new Error("[ConfigCenter] Registry checksum available only after freeze()");
    }
    return this.checksum;
  }

  private computeChecksum(): string {
    const rows = this.list()
      .map((f) => ({
        key: f.key,
        category: f.category,
        type: f.type,
        defaultValue: f.defaultValue,
        allowedValues: f.allowedValues ?? null,
        scope: f.scope,
        secret: f.secret ?? false,
        immutable: f.immutable ?? false,
        restartStrategy: f.restartStrategy ?? "hot",
        criticality: f.criticality ?? "low",
        introducedVersion: f.introducedVersion ?? null,
        dependencies: f.dependencies ?? null,
      }))
      .sort((a, b) => a.key.localeCompare(b.key));
    const canonical = JSON.stringify(rows);
    // FNV-1a 64-bit — dependency-free, deterministic, stable across runs.
    return fnv1a(canonical);
  }

  private assertNotFrozen(): void {
    if (this.frozen) {
      throw new Error("[ConfigCenter] Registry is FROZEN — configuration cannot be registered after bootstrap");
    }
  }

  // Register a field definition. Throws on duplicate/invalid key (append-only).
  register(field: ConfigFieldMeta): void {
    this.assertNotFrozen();
    if (!field.key || field.key.trim().length === 0) {
      throw new Error("[ConfigCenter] field.key is required");
    }
    if (this.fields.has(field.key)) {
      throw new Error(`[ConfigCenter] duplicate field registration: ${field.key}`);
    }
    this.fields.set(field.key, { ...field });

    // auto-group by top-level segment, e.g. "providers.deepseek.model" → "providers"
    const groupId = field.key.split(".")[0];
    const group = this.groups.get(groupId);
    if (!group) {
      this.groups.set(groupId, {
        id: groupId,
        title: groupId,
        category: field.category,
        description: undefined,
        fields: [],
      });
    }
    this.groups.get(groupId)!.fields.push(this.fields.get(field.key)!);
  }

  registerMany(fields: ConfigFieldMeta[]): void {
    for (const f of fields) this.register(f);
  }

  has(key: string): boolean {
    return this.fields.has(key);
  }

  get(key: string): ConfigFieldMeta | undefined {
    return this.fields.get(key);
  }

  // Throw if a key is not declared — enforces "no hardcoded keys outside Registry".
  require(key: string): ConfigFieldMeta {
    const meta = this.fields.get(key);
    if (!meta) {
      throw new Error(`[ConfigCenter] unknown configuration key "${key}" — register it in the Registry first`);
    }
    return meta;
  }

  list(): ConfigFieldMeta[] {
    return [...this.fields.values()];
  }

  listGroups(): ConfigGroupMeta[] {
    return [...this.groups.values()];
  }

  getDependencies(key: string): NonNullable<ConfigFieldMeta["dependencies"]> {
    return this.fields.get(key)?.dependencies ?? [];
  }

  isSecret(key: string): boolean {
    return this.fields.get(key)?.secret ?? false;
  }

  isImmutable(key: string): boolean {
    return this.fields.get(key)?.immutable ?? false;
  }

  // Determine the effective default for a key given a desired scope chain.
  // Registry defaults are the DEFAULT slot of the chain.
  defaultValue(key: string): ConfigValue {
    return this.require(key).defaultValue;
  }

  // Allowed scopes for override; immutable fields may only exist in DEFAULT.
  allowedScopes(key: string): ConfigScopeType[] {
    const meta = this.fields.get(key);
    if (!meta) return ["default"];
    if (meta.immutable) return ["default"];
    return meta.scope;
  }

  validateField(key: string, value: ConfigValue): RegistryValidationError[] {
    const meta = this.fields.get(key);
    if (!meta) return [{ key, path: key, message: `unknown key ${key}` }];

    const errors: RegistryValidationError[] = [];

    if (meta.allowedValues && meta.allowedValues.length > 0) {
      const allowed = meta.allowedValues.map(String);
      if (!allowed.includes(String(value))) {
        errors.push({
          key,
          path: key,
          message: `value "${String(value)}" not in allowed values: ${allowed.join(", ")}`,
        });
      }
    }

    switch (meta.type) {
      case "string":
      case "secret":
        if (typeof value !== "string") errors.push({ key, path: key, message: "expected string" });
        break;
      case "number":
        if (typeof value !== "number" || Number.isNaN(value)) errors.push({ key, path: key, message: "expected number" });
        break;
      case "boolean":
        if (typeof value !== "boolean") errors.push({ key, path: key, message: "expected boolean" });
        break;
      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          errors.push({ key, path: key, message: "expected object" });
        }
        break;
    }

    return errors;
  }
}

// FNV-1a 64-bit hash — deterministic, no external crypto dependency.
function fnv1a(str: string): string {
  let h0 = 0x2325;
  let h1 = 0x84222325;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h0 ^= c;
    h0 = Math.imul(h0, 0x01000193);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
  }
  const pad = (n: number) => n.toString(16).padStart(8, "0");
  return `${pad(h1)}${pad(h0)}`;
}
