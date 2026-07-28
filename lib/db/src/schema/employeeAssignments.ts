import { pgTable, serial, integer, varchar, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const employeeAssignmentsTable = pgTable("employee_assignments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  assignmentType: varchar("assignment_type", { length: 30 }).notNull(),
  targetId: integer("target_id"),
  targetName: varchar("target_name", { length: 100 }),
  isPrimary: boolean("is_primary").default(false),
  startDate: date("start_date").notNull().defaultNow(),
  endDate: date("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ASSIGNMENT_TYPES = ["warehouse", "branch", "department", "position", "supervisor", "cost_center", "shift_group"] as const;

export type EmployeeAssignment = typeof employeeAssignmentsTable.$inferSelect;
