import { pgTable, bigserial, serial, text, integer, numeric, timestamp, date, unique } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const attendanceRecordsTable = pgTable(
  "attendance_records",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    checkIn: timestamp("check_in", { withTimezone: true }),
    checkOut: timestamp("check_out", { withTimezone: true }),
    breakStart: timestamp("break_start", { withTimezone: true }),
    breakEnd: timestamp("break_end", { withTimezone: true }),
    overtimeStart: timestamp("overtime_start", { withTimezone: true }),
    overtimeEnd: timestamp("overtime_end", { withTimezone: true }),
    status: text("status").notNull().default("present"), // present | absent | late | half_day | leave
    lateMinutes: integer("late_minutes").default(0),
    earlyLeaveMinutes: integer("early_leave_minutes").default(0),
    overtimeMinutes: integer("overtime_minutes").default(0),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uniq_attendance_date").on(t.employeeId, t.date)],
);

export type AttendanceRecord = typeof attendanceRecordsTable.$inferSelect;
