import { getSchema, getSchemaVersions } from "./EventSchemaRegistry";

export type CompatibilityResult = {
  compatible: boolean;
  breakingChanges: string[];
  warnings: string[];
};

export function checkFieldCompatibility(
  oldSchema: Record<string, string>,
  newSchema: Record<string, string>,
): CompatibilityResult {
  const breaking: string[] = [];
  const warnings: string[] = [];

  for (const [field, type] of Object.entries(oldSchema)) {
    if (!(field in newSchema)) {
      warnings.push(`Field "${field}" removed`);
    } else if (newSchema[field] !== type) {
      breaking.push(`Field "${field}" type changed from "${type}" to "${newSchema[field]}"`);
    }
  }

  for (const [field] of Object.entries(newSchema)) {
    if (!(field in oldSchema)) {
      warnings.push(`Field "${field}" added (optional assumed)`);
    }
  }

  return {
    compatible: breaking.length === 0,
    breakingChanges: breaking,
    warnings,
  };
}

export function checkEventCompatibility(eventType: string, fromVersion: number, toVersion: number): CompatibilityResult {
  const versions = getSchemaVersions(eventType);
  if (!versions.includes(fromVersion)) {
    return { compatible: false, breakingChanges: [`Version v${fromVersion} not found for ${eventType}`], warnings: [] };
  }
  if (!versions.includes(toVersion)) {
    return { compatible: false, breakingChanges: [`Version v${toVersion} not found for ${eventType}`], warnings: [] };
  }
  const from = getSchema(eventType, fromVersion);
  const to = getSchema(eventType, toVersion);
  if (!from || !to) {
    return { compatible: false, breakingChanges: ["Schema not found"], warnings: [] };
  }
  return { compatible: true, breakingChanges: [], warnings: [] };
}
