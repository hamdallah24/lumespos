import { pgTable, serial, integer, text, varchar, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { employeesTable } from "./employees";

export const employeeDocumentsTable = pgTable("employee_documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 30 }).notNull(),
  docName: varchar("doc_name", { length: 100 }).notNull(),
  fileUrl: text("file_url"),
  status: varchar("status", { length: 20 }).notNull().default("missing"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  expiresAt: date("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const EMPLOYEE_DOC_TYPES = ["KTP", "NPWP", "SIM", "Contract", "Certificate", "Medical", "Other"] as const;
export const DOC_STATUS = ["missing", "uploaded", "expired", "pending_review"] as const;

export type EmployeeDocument = typeof employeeDocumentsTable.$inferSelect;
