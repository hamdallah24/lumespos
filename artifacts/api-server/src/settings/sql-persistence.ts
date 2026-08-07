// ConfigCenter — SQL persistence layer (optional, production only).
// Runs OUTSIDE the runtime ConfigCenter so the in-memory SettingsStore stays the
// single source of truth for logic AND tests. This layer:
//   1. ensure(): creates the settings tables if absent (idempotent).
//   2. hydrate(): loads committed override sets from `settings` back into the
//      store at boot, so values survive a restart.
//   3. persist(): writes the current override set to `settings` +
//      `settings_revision`.
//
// Row mapping: the store keeps a flat leaf map `Record<"group.leaf", value>`.
// We map EACH leaf to one row (key_group = full dotted leaf path, category =
// top segment) so writes round-trip losslessly on hydrate.
//
// Deliberately defensive: any DB failure logs a warn and leaves runtime untouched.

import type { SettingsStore } from "./store";
import type { ConfigScope, ConfigValue } from "./types";
import type { db as dbClient } from "@workspace/db";

type DbClient = typeof dbClient;

function categoryOf(key: string): string {
  return key.split(".")[0] ?? "misc";
}

function scopeKey(scope: ConfigScope): string {
  return JSON.stringify({
    type: scope.type,
    workspaceId: scope.workspaceId ?? null,
    branchId: scope.branchId ?? null,
    executiveRole: scope.executiveRole ?? null,
  });
}

interface PersistLeaf {
  scope: ConfigScope;
  values: Record<string, ConfigValue>;
}

async function getDbClient(): Promise<DbClient | null> {
  try {
    const mod = await import("@workspace/db");
    return (mod as { db?: DbClient }).db ?? null;
  } catch {
    return null;
  }
}

/**
 * Idempotently ensure the settings tables exist. Safe to call every boot.
 * Uses raw DDL because the settings tables predate the migration chain and no
 * migration file / runner exists for them.
 */
export async function ensureSettingsTables(): Promise<boolean> {
  const db = await getDbClient();
  if (!db) return false;
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "config_version" integer NOT NULL DEFAULT 1,
        "scope" text NOT NULL,
        "workspace_id" integer,
        "branch_id" integer,
        "executive_role" text,
        "category" text NOT NULL,
        "key_group" text NOT NULL,
        "value" jsonb NOT NULL,
        "secret" boolean NOT NULL DEFAULT false,
        "immutable" boolean NOT NULL DEFAULT false,
        "criticality" text NOT NULL DEFAULT 'low',
        "documentation_url" text,
        "tags" jsonb NOT NULL DEFAULT '[]',
        "restart_strategy" text NOT NULL DEFAULT 'hot',
        "enabled" boolean NOT NULL DEFAULT true,
        "created_by" integer,
        "updated_by" integer,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "settings_revision" (
        "id" serial PRIMARY KEY NOT NULL,
        "setting_id" integer NOT NULL,
        "revision_no" integer NOT NULL,
        "config_version" integer NOT NULL DEFAULT 1,
        "value" jsonb NOT NULL,
        "state" text NOT NULL DEFAULT 'committed',
        "correlation_id" text,
        "changed_by" integer,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    return true;
  } catch (err) {
    console.warn("[ConfigCenter] ensure tables skipped:", (err as Error)?.message);
    return false;
  }
}

/**
 * Hydrate the in-memory settings store from the `settings` table.
 * No-op (false) when the table/client is unavailable.
 */
export async function hydrateSettings(sqlStore: SettingsStore): Promise<boolean> {
  const db = await getDbClient();
  if (!db) return false;

  try {
    const { settingsTable } = await import("@workspace/db");
    const rows = await db.select().from(settingsTable);

    const groups = new Map<string, PersistLeaf>();
    for (const row of rows) {
      const scope: ConfigScope = {
        type: (row.scope as ConfigScope["type"]) ?? "default",
        workspaceId: row.workspaceId ?? null,
        branchId: row.branchId ?? null,
        executiveRole: (row.executiveRole ?? null) as ConfigScope["executiveRole"],
      };
      const key = scopeKey(scope);
      const entry = groups.get(key) ?? { scope, values: {} };
      entry.values[String(row.keyGroup)] = row.value as ConfigValue;
      groups.set(key, entry);
    }

    let revision = groups.size;
    try {
      const { settingsRevisionTable } = await import("@workspace/db");
      const drizzle2 = await import("drizzle-orm");
      const revs = await db
        .select({ r: settingsRevisionTable.revisionNo })
        .from(settingsRevisionTable)
        .orderBy(drizzle2.desc(settingsRevisionTable.revisionNo))
        .limit(1);
      revision = Number(revs?.[0]?.r ?? groups.size);
    } catch {
      revision = groups.size;
    }

    sqlStore.seedFromPersisted([...groups.values()], revision);
    return true;
  } catch (err) {
    console.warn("[SettingsCenter] hydrate skipped:", (err as Error)?.message);
    return false;
  }
}

/**
 * Persist the current override set to `settings` + `settings_revision`.
 * Rewrites each leaf row for the scope; no-op on DB failure.
 */
export async function persistSettings(sqlStore: SettingsStore): Promise<boolean> {
  const db = await getDbClient();
  if (!db) return false;

  try {
    const { settingsTable, settingsRevisionTable } = await import("@workspace/db");
    const drizzle = await import("drizzle-orm");

    const overrides = await sqlStore.loadOverrides();
    if (!overrides.length) return true;

    for (const set of overrides) {
      const existing = await db
        .select({ id: settingsTable.id })
        .from(settingsTable)
        .where(buildScopeWhere(drizzle, settingsTable, set.scope));
      if (existing.length > 0) {
        await db
          .delete(settingsTable)
          .where(drizzle.inArray(settingsTable.id, existing.map((e) => e.id)));
      }

      let firstId: number | undefined;
      for (const [key, value] of Object.entries(set.values)) {
        const inserted = await db
          .insert(settingsTable)
          .values(buildRow(set.scope, key, value))
          .returning({ id: settingsTable.id });
        firstId = firstId ?? inserted?.[0]?.id;
      }

      if (firstId != null) {
        const revisionNo = await sqlStore.currentRevision();
        await db
          .insert(settingsRevisionTable)
          .values({
            settingId: firstId,
            revisionNo,
            configVersion: 1,
            value: { __revision: true } as never,
            state: "committed",
            correlationId: `persist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          } as never);
      }
    }
    return true;
  } catch (err) {
    console.warn("[SettingsCenter] persist skipped:", (err as Error)?.message);
    return false;
  }
}

function buildRow(scope: ConfigScope, key: string, value: ConfigValue) {
  return {
    configVersion: 1,
    scope: scope.type,
    workspaceId: scope.workspaceId ?? null,
    branchId: scope.branchId ?? null,
    executiveRole: scope.executiveRole ?? null,
    category: categoryOf(key),
    keyGroup: key,
    value: value as never,
    secret: false,
    immutable: false,
    criticality: "low",
    enabled: true,
  } as never;
}

function buildScopeWhere(drizzle: any, t: any, scope: ConfigScope) {
  const { and, eq } = drizzle;
  const n = (v: unknown) => (v == null ? null : v);
  return and(
    eq(t.scope, scope.type),
    eq(t.workspaceId, n(scope.workspaceId)),
    eq(t.branchId, n(scope.branchId)),
    eq(t.executiveRole, n(scope.executiveRole)),
  );
}