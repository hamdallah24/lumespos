import { pgTable, serial, text, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { departmentsTable } from "./departments";
import { positionsTable } from "./positions";
import { usersTable } from "./users";

export const EMPLOYEE_STATUS = [
  "candidate", "hired", "probation", "active",
  "suspended", "resigned", "terminated", "archived",
] as const;

export const VALID_TRANSITIONS: Record<string, string[]> = {
  candidate: ["hired"],
  hired: ["probation", "terminated"],
  probation: ["active", "terminated"],
  active: ["suspended", "resigned", "terminated"],
  suspended: ["active", "resigned", "terminated"],
  resigned: ["archived"],
  terminated: ["archived"],
  archived: [],
};

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  employeeCode: text("employee_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  photoUrl: text("photo_url"),
  positionId: integer("position_id").references(() => positionsTable.id, { onDelete: "restrict" }),
  departmentId: integer("department_id").references(() => departmentsTable.id, { onDelete: "restrict" }),
  managerId: integer("manager_id"),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "restrict" }),
  warehouseId: integer("warehouse_id"),
  hireDate: date("hire_date").notNull(),
  resignationDate: date("resignation_date"),
  probationEndDate: date("probation_end_date"),
  employmentType: text("employment_type").notNull().default("full_time"),
  status: text("status").notNull().default("candidate"),
  costCenter: text("cost_center"),
  shiftGroup: text("shift_group"),
  nationalIdType: text("national_id_type").default("KTP"),
  idNumber: text("id_number"),
  phone: text("phone"),
  address: text("address"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  taxId: text("tax_id"),
  baseSalary: numeric("base_salary", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
