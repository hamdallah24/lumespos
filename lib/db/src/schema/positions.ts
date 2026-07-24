import { pgTable, serial, text, integer, numeric, boolean, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const positionsTable = pgTable("positions", {
  id: serial("id").primaryKey(),
  positionCode: varchar("position_code", { length: 20 }),
  title: text("title").notNull(),
  departmentId: integer("department_id"),
  grade: text("grade"),
  level: text("level"),
  reportsToPositionId: integer("reports_to_position_id"),
  successorPositionId: integer("successor_position_id"),
  baseSalary: numeric("base_salary", { precision: 14, scale: 2 }).notNull().default("0"),
  responsibilities: text("responsibilities"),
  requiredSkills: text("required_skills"),
  competencyTags: text("competency_tags"),
  minExperience: integer("min_experience"),
  employmentType: varchar("employment_type", { length: 30 }).notNull().default("full_time"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPositionSchema = createInsertSchema(positionsTable).omit({ id: true, createdAt: true });
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type Position = typeof positionsTable.$inferSelect;
