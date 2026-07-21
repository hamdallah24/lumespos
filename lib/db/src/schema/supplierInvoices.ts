import { pgTable, serial, text, integer, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { purchaseOrdersTable } from "./purchaseOrders";

export const supplierInvoicesTable = pgTable("supplier_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "restrict" }),
  poId: integer("po_id").notNull().references(() => purchaseOrdersTable.id, { onDelete: "restrict" }),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"), // draft → submitted → approved → paid → voided
  notes: text("notes"),
  threeWayMatchStatus: text("three_way_match_status").default("pending"), // pending | passed | failed
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupplierInvoiceSchema = createInsertSchema(supplierInvoicesTable).omit({ id: true, createdAt: true });
export type InsertSupplierInvoice = z.infer<typeof insertSupplierInvoiceSchema>;
export type SupplierInvoice = typeof supplierInvoicesTable.$inferSelect;
