import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const LEAVE_TYPES = ["annual", "sick", "permission", "maternity", "paternity", "unpaid"] as const;
export const LEAVE_STATUS_FLOW: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  rejected: ["draft"],
  completed: [],
  cancelled: [],
};

export const leaveRequestsTable = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "restrict" }),
  leaveType: text("leave_type").notNull(), // annual | sick | permission | maternity | paternity | unpaid
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("draft"), // draft | submitted | approved | rejected | completed | cancelled
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;
