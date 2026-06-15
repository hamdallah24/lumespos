import { pgTable, serial, text, integer, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";
import { usersTable } from "./users";

export const shiftAuditsTable = pgTable("shift_audits", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branchesTable.id, { onDelete: "cascade" }),
  cashierId: integer("cashier_id").references(() => usersTable.id, { onDelete: "set null" }),
  shiftStart: timestamp("shift_start", { withTimezone: true }),
  shiftEnd: timestamp("shift_end", { withTimezone: true }),
  // Kolom baru untuk modal awal dan tutup shift
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  closingBalance: numeric("closing_balance", { precision: 12, scale: 2 }),
  expectedBalance: numeric("expected_balance", { precision: 12, scale: 2 }),
  expectedStockJson: jsonb("expected_stock_json"),
  actualStockJson: jsonb("actual_stock_json"),
  photoProofUrl: text("photo_proof_url"),
  status: text("status").notNull().default("pending"), // pending | verified | discrepancy | active (shift berjalan)
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShiftAuditSchema = createInsertSchema(shiftAuditsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertShiftAudit = z.infer<typeof insertShiftAuditSchema>;
export type ShiftAudit = typeof shiftAuditsTable.$inferSelect;