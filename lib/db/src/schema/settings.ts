import { pgTable, serial, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { branchesTable } from "./branches";

// ConfigCenter — Single Source of Truth for LUMÉ'S Cloud OS Configuration.
// Milestone 1 foundation. Scope chain: DEFAULT → WORKSPACE → BRANCH → EXECUTIVE → ROLE.

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  // Schema version that produced this row (config_version). Migration/back-compat aware.
  configVersion: integer("config_version").notNull().default(1),
  scope: text("scope").notNull(), // default | workspace | branch | executive
  workspaceId: integer("workspace_id"),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  executiveRole: text("executive_role"), // CEO | COO | CFO | CMO | CHRO | CAIO | CKO | CTO
  category: text("category").notNull(),
  // Group namespace, e.g. "providers.deepseek" or "executives.CEO.model". No hardcoded keys outside Registry.
  keyGroup: text("key_group").notNull(),
  // Values may be a single leaf or a keyed object for a group.
  value: jsonb("value").notNull(),
  // Secret=true → value is a pointer/hash; plaintext never leaves server.
  secret: boolean("secret").notNull().default(false),
  immutable: boolean("immutable").notNull().default(false),
  criticality: text("criticality").notNull().default("low"), // low | medium | high | critical
  documentationUrl: text("documentation_url"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  restartStrategy: text("restart_strategy").notNull().default("hot"), // hot | reload | restart | manual
  enabled: boolean("enabled").notNull().default(true),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settingsRevisionTable = pgTable("settings_revision", {
  id: serial("id").primaryKey(),
  settingId: integer("setting_id").notNull().references(() => settingsTable.id, { onDelete: "cascade" }),
  revisionNo: integer("revision_no").notNull(),
  configVersion: integer("config_version").notNull().default(1),
  value: jsonb("value").notNull(),
  state: text("state").notNull().default("committed"), // committed | rolled_back
  correlationId: text("correlation_id"),
  changedBy: integer("changed_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settingsSnapshotTable = pgTable("settings_snapshot", {
  id: serial("id").primaryKey(),
  // snapshotId (uuid) — stable business identifier surfaced to the API.
  snapshotId: text("snapshot_id").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // origin: manual | automatic | pre_deploy | scheduled | rollback | migration
  triggerType: text("trigger_type").notNull(), // manual | automatic | pre_deploy | scheduled | rollback | migration
  environment: text("environment").notNull(), // production | development | testing | staging
  configVersion: integer("config_version").notNull().default(1),
  scopeType: text("scope_type").notNull().default("default"), // default | workspace | branch | executive
  workspaceId: integer("workspace_id"),
  branchId: integer("branch_id").references(() => branchesTable.id, { onDelete: "set null" }),
  executiveRole: text("executive_role"),
  scopeKey: text("scope_key"), // optional: workspace/branch scope snapshot
  payload: jsonb("payload").notNull(), // effective configuration (Resolver output)
  changes: jsonb("changes").notNull(), // captured override set (Store)
  checksum: text("checksum").notNull(), // payload content hash
  registryChecksum: text("registry_checksum").notNull(),
  revisionNo: integer("revision_no").notNull(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | ARCHIVED | PINNED | RESTORED | EXPIRED
  pinned: boolean("pinned").notNull().default(false),
  fingerprint: jsonb("fingerprint").notNull(), // { checksum, registryChecksum, configVersion, revisionNo }
  metadata: jsonb("metadata").notNull(), // { actor, correlationId, pipelineStage, reason, sourceRevision }
  sourceSnapshotId: integer("source_snapshot_id"),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settingsDependencyTable = pgTable("settings_dependency", {
  id: serial("id").primaryKey(),
  fromGroup: text("from_group").notNull(), // e.g. "business-intelligence"
  toGroup: text("to_group").notNull(), // e.g. "forecast"
  type: text("type").notNull(), // requires | disables | enables | conflicts
  configVersion: integer("config_version").notNull().default(1),
});

export const settingsPackageTable = pgTable("settings_package", {
  id: serial("id").primaryKey(),
  packageId: text("package_id").notNull(), // e.g. "restaurant"
  version: text("version").notNull(),
  manifest: jsonb("manifest").notNull(),
  status: text("status").notNull().default("draft"), // draft | staging | applied | active | uninstalled
  installedBy: integer("installed_by").references(() => usersTable.id, { onDelete: "set null" }),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settingsAuditTable = pgTable("settings_audit", {
  id: serial("id").primaryKey(),
  revisionId: integer("revision_id").references(() => settingsRevisionTable.id, { onDelete: "set null" }),
  action: text("action").notNull(), // create | update | commit | rollback | restore | install_package | uninstall_package
  fieldPath: text("field_path"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  pipelineState: text("pipeline_state"), // state machine step where action occurred
  correlationId: text("correlation_id"),
  changedBy: integer("changed_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export const insertSettingsRevisionSchema = createInsertSchema(settingsRevisionTable).omit({ id: true, createdAt: true });
export const insertSettingsSnapshotSchema = createInsertSchema(settingsSnapshotTable).omit({ id: true, createdAt: true });
export const updateSettingsSnapshotSchema = createInsertSchema(settingsSnapshotTable).partial().omit({ id: true, createdAt: true });
export const insertSettingsDependencySchema = createInsertSchema(settingsDependencyTable).omit({ id: true });
export const insertSettingsPackageSchema = createInsertSchema(settingsPackageTable).omit({ id: true, createdAt: true });
export const insertSettingsAuditSchema = createInsertSchema(settingsAuditTable).omit({ id: true, createdAt: true });

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
export type SettingsRevision = typeof settingsRevisionTable.$inferSelect;
export type SettingsSnapshot = typeof settingsSnapshotTable.$inferSelect;
export type SettingsDependency = typeof settingsDependencyTable.$inferSelect;
export type SettingsPackage = typeof settingsPackageTable.$inferSelect;
export type SettingsAudit = typeof settingsAuditTable.$inferSelect;
