import { pgTable, serial, integer, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const missionsTable = pgTable("ai_missions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  objective: text("objective").notNull().default(""),
  mode: varchar("mode", { length: 20 }).notNull().default("cto"),
  status: varchar("status", { length: 20 }).notNull().default("CREATED"),
  complexity: varchar("complexity", { length: 20 }).notNull().default("medium"),
  strategy: varchar("strategy", { length: 20 }),
  progress: integer("progress").notNull().default(0),
  evidenceQuality: integer("evidence_quality").notNull().default(0),
  confidence: integer("confidence").notNull().default(0),
  cyclesExecuted: integer("cycles_executed").notNull().default(0),
  currentGoal: text("current_goal"),
  result: text("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const missionSnapshotsTable = pgTable("ai_mission_snapshots", {
  id: serial("id").primaryKey(),
  missionId: integer("mission_id").notNull().references(() => missionsTable.id, { onDelete: "cascade" }),
  cycle: integer("cycle").notNull(),
  strategy: text("strategy"),
  stage: text("stage"),
  progress: integer("progress").notNull().default(0),
  currentGoal: text("current_goal"),
  toolCalls: jsonb("tool_calls"),
  evidenceQuality: integer("evidence_quality"),
  confidence: integer("confidence"),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Mission = typeof missionsTable.$inferSelect;
export type InsertMission = typeof missionsTable.$inferInsert;
export type MissionSnapshot = typeof missionSnapshotsTable.$inferSelect;
export type InsertMissionSnapshot = typeof missionSnapshotsTable.$inferInsert;
