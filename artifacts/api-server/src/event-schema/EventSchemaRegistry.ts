type SchemaStatus = "active" | "deprecated" | "sunset";

interface SchemaDefinition {
  version: number;
  validate: (data: unknown) => boolean;
  status: SchemaStatus;
  deprecatedAt?: Date;
  sunsetAt?: Date;
  migratedToVersion?: number;
}

const registry = new Map<string, SchemaDefinition[]>();

export function registerSchema(
  eventType: string,
  version: number,
  validateFn: (data: unknown) => boolean,
): void {
  const existing = registry.get(eventType) ?? [];
  if (existing.some((s) => s.version === version)) return;
  existing.push({ version, validate: validateFn, status: "active" });
  existing.sort((a, b) => b.version - a.version);
  registry.set(eventType, existing);
}

export function getSchema(
  eventType: string,
  version?: number,
): SchemaDefinition | undefined {
  const versions = registry.get(eventType);
  if (!versions || versions.length === 0) return undefined;
  if (version !== undefined) return versions.find((s) => s.version === version);
  return versions[0];
}

export function validateEventData(
  eventType: string,
  version: number,
  data: unknown,
): { valid: boolean; error?: string } {
  const schema = getSchema(eventType, version);
  if (!schema) return { valid: true };
  if (schema.status === "sunset") {
    return { valid: false, error: `Event ${eventType} v${version} is sunset` };
  }
  try {
    const ok = schema.validate(data);
    return ok ? { valid: true } : { valid: false, error: `Validation failed for ${eventType}` };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

export function deprecateSchema(eventType: string, version: number, migratedTo?: number): boolean {
  const versions = registry.get(eventType);
  if (!versions) return false;
  const schema = versions.find((s) => s.version === version);
  if (!schema) return false;
  schema.status = "deprecated";
  schema.deprecatedAt = new Date();
  if (migratedTo !== undefined) schema.migratedToVersion = migratedTo;
  return true;
}

export function sunsetSchema(eventType: string, version: number): boolean {
  const versions = registry.get(eventType);
  if (!versions) return false;
  const schema = versions.find((s) => s.version === version);
  if (!schema) return false;
  schema.status = "sunset";
  schema.sunsetAt = new Date();
  return true;
}

export function getSchemaVersions(eventType: string): number[] {
  return (registry.get(eventType) ?? []).map((s) => s.version).sort((a, b) => b - a);
}

export function isCompatible(eventType: string, fromVersion: number, toVersion: number): boolean {
  const versions = registry.get(eventType);
  if (!versions) return false;
  const from = versions.find((s) => s.version === fromVersion);
  const to = versions.find((s) => s.version === toVersion);
  if (!from || !to) return false;
  if (from.status === "sunset" || to.status === "sunset") return false;
  return true;
}

export function getAllRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

export function getSchemaStats(): Record<string, { versions: number; active: number; deprecated: number; sunset: number }> {
  const stats: Record<string, any> = {};
  for (const [eventType, versions] of registry) {
    stats[eventType] = {
      versions: versions.length,
      active: versions.filter((v) => v.status === "active").length,
      deprecated: versions.filter((v) => v.status === "deprecated").length,
      sunset: versions.filter((v) => v.status === "sunset").length,
    };
  }
  return stats;
}
