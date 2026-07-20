import { pgTable, serial, integer, text, numeric, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { branchesTable } from "./branches";

export const accountTypeEnum = pgEnum("account_type", ["asset", "liability", "equity", "revenue", "expense"]);
export const normalBalanceEnum = pgEnum("normal_balance", ["debit", "credit"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "voided"]);

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: accountTypeEnum("type").notNull(),
  normalBalance: normalBalanceEnum("normal_balance").notNull(),
  parentId: integer("parent_id"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionsTable = pgTable("finance_transactions", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  referenceCode: text("reference_code"),
  sourceModule: text("source_module"),
  status: transactionStatusEnum("status").notNull().default("completed"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  updatedBy: integer("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => transactionsTable.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => accountsTable.id, { onDelete: "restrict" }),
  debit: numeric("debit", { precision: 14, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).notNull().default("0"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ledgerEntriesTable = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accountsTable.id, { onDelete: "restrict" }),
  journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntriesTable.id, { onDelete: "cascade" }),
  transactionId: integer("transaction_id").notNull().references(() => transactionsTable.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  description: text("description"),
  debit: numeric("debit", { precision: 14, scale: 2 }).notNull().default("0"),
  credit: numeric("credit", { precision: 14, scale: 2 }).notNull().default("0"),
  runningBalance: numeric("running_balance", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const balanceSnapshotsTable = pgTable("balance_snapshots", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "restrict" }),
  snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),
  openingCash: numeric("opening_cash", { precision: 14, scale: 2 }).notNull().default("0"),
  closingCash: numeric("closing_cash", { precision: 14, scale: 2 }).notNull().default("0"),
  totalAssets: numeric("total_assets", { precision: 14, scale: 2 }).notNull().default("0"),
  totalLiabilities: numeric("total_liabilities", { precision: 14, scale: 2 }).notNull().default("0"),
  totalEquity: numeric("total_equity", { precision: 14, scale: 2 }).notNull().default("0"),
  totalRevenue: numeric("total_revenue", { precision: 14, scale: 2 }).notNull().default("0"),
  totalExpenses: numeric("total_expenses", { precision: 14, scale: 2 }).notNull().default("0"),
  netIncome: numeric("net_income", { precision: 14, scale: 2 }).notNull().default("0"),
  cashBalance: numeric("cash_balance", { precision: 14, scale: 2 }).notNull().default("0"),
  transactionCount: integer("transaction_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financialReportsTable = pgTable("financial_reports", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull().references(() => branchesTable.id, { onDelete: "restrict" }),
  reportType: text("report_type").notNull(),
  reportDate: timestamp("report_date", { withTimezone: true }).notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({
  id: true,
  createdAt: true,
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntriesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntriesTable.$inferSelect;
export type BalanceSnapshot = typeof balanceSnapshotsTable.$inferSelect;
export type FinancialReport = typeof financialReportsTable.$inferSelect;
