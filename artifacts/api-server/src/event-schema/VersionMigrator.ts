import { getSchema } from "./EventSchemaRegistry";

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations = new Map<string, Map<number, Map<number, MigrationFn>>>();

export function registerMigration(
  eventType: string,
  fromVersion: number,
  toVersion: number,
  fn: MigrationFn,
): void {
  if (!migrations.has(eventType)) {
    migrations.set(eventType, new Map());
  }
  const fromMap = migrations.get(eventType)!;
  if (!fromMap.has(fromVersion)) {
    fromMap.set(fromVersion, new Map());
  }
  fromMap.get(fromVersion)!.set(toVersion, fn);
}

export function migrate(
  eventType: string,
  data: Record<string, unknown>,
  fromVersion: number,
  toVersion: number,
): Record<string, unknown> {
  if (fromVersion === toVersion) return data;
  const fromMap = migrations.get(eventType);
  if (!fromMap) throw new Error(`No migrations for ${eventType}`);
  const toMap = fromMap.get(fromVersion);
  if (!toMap) throw new Error(`No migration from v${fromVersion} for ${eventType}`);
  const fn = toMap.get(toVersion);
  if (!fn) throw new Error(`No migration from v${fromVersion} to v${toVersion} for ${eventType}`);
  return fn(data);
}

export function migrateToLatest(
  eventType: string,
  data: Record<string, unknown>,
  currentVersion: number,
): { data: Record<string, unknown>; version: number } {
  const latest = getSchema(eventType);
  if (!latest) return { data, version: currentVersion };
  const targetVersion = latest.version;
  if (currentVersion >= targetVersion) return { data, version: currentVersion };

  let migrated = { ...data };
  let version = currentVersion;
  while (version < targetVersion) {
    const nextVersion = findNextVersion(eventType, version);
    if (!nextVersion) break;
    migrated = migrate(eventType, migrated, version, nextVersion);
    version = nextVersion;
  }
  return { data: migrated, version };
}

function findNextVersion(eventType: string, currentVersion: number): number | undefined {
  const fromMap = migrations.get(eventType);
  if (!fromMap) return undefined;
  const toMap = fromMap.get(currentVersion);
  if (!toMap) return undefined;
  const keys = Array.from(toMap.keys()).sort((a, b) => a - b);
  return keys[0];
}
