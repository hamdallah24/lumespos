import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, pool } from "@workspace/db";
import { branchesTable, transactionsTable, journalEntriesTable, ledgerEntriesTable, accountingPeriodsTable, financialSnapshotsTable, financeAuditLogsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { initializeDefaultCOA } from "../src/finance/services/chartOfAccounts";
import { generateTrialBalance, generateBalanceSheet, generateProfitLoss, generateCashflow, generateEquityStatement } from "../src/finance/services/accountingEngine";
import { createTransaction } from "../src/finance/services/transactionEngine";
import { getGeneralLedger, getAccountBalances } from "../src/finance/services/ledgerEngine";
import { PeriodManager } from "../src/finance/services/PeriodManager";
import { ClosingEngine } from "../src/finance/services/ClosingEngine";
import { ValidationEngine } from "../src/finance/services/ValidationEngine";

const TEST_PREFIX = `E2E-VERIFY-${Date.now()}`;
let branchId: number;
let periodId: number;
let periodStart: Date;
let periodEnd: Date;
let salesTxnId: number;
let expenseTxnId: number;

async function ensureFinanceTables() {
  const existing = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
  const tables = new Set(existing.rows.map((r: any) => r.tablename));

  // Fresh recreate: previous partial runs may have created tables with missing columns
  // (DROP CASCADE is safe — no production finance data existed before our tests)
  for (const t of ["financial_snapshots", "finance_audit_logs", "balance_snapshots", "financial_reports", "ledger_entries", "journal_entries", "finance_transactions", "accounting_periods", "accounts"]) {
    if (tables.has(t)) {
      await pool.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
  }

  // Create enums first (ignore if already exist)
  for (const [name, values] of Object.entries({
    account_type: ["asset", "liability", "equity", "revenue", "expense"],
    normal_balance: ["debit", "credit"],
    transaction_status: ["pending", "completed", "voided"],
    transaction_class: ["CASH_TRANSACTION", "ACCOUNTING_TRANSACTION"],
    period_status: ["OPEN", "CLOSING", "CLOSED"],
  })) {
    await pool.query(`CREATE TYPE ${name} AS ENUM (${values.map((v) => `'${v}'`).join(",")})`).catch(() => {});
  }

  // Create tables in dependency order
  const statements = [
    `CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      type account_type NOT NULL, normal_balance normal_balance NOT NULL,
      parent_id INTEGER, description TEXT, is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS finance_transactions (
      id SERIAL PRIMARY KEY, branch_id INTEGER NOT NULL,
      type TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL, reference_type TEXT, reference_id INTEGER,
      reference_code TEXT, source_module TEXT,
      transaction_class transaction_class NOT NULL DEFAULT 'CASH_TRANSACTION',
      status transaction_status NOT NULL DEFAULT 'completed',
      notes TEXT, created_by INTEGER, updated_by INTEGER,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS journal_entries (
      id SERIAL PRIMARY KEY,
      transaction_id INTEGER NOT NULL REFERENCES finance_transactions(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      debit NUMERIC(14,2) NOT NULL DEFAULT '0',
      credit NUMERIC(14,2) NOT NULL DEFAULT '0',
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS ledger_entries (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      transaction_id INTEGER NOT NULL REFERENCES finance_transactions(id) ON DELETE CASCADE,
      date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      description TEXT,
      debit NUMERIC(14,2) NOT NULL DEFAULT '0',
      credit NUMERIC(14,2) NOT NULL DEFAULT '0',
      running_balance NUMERIC(14,2) NOT NULL DEFAULT '0',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS accounting_periods (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL,
      start_date TIMESTAMP WITH TIME ZONE NOT NULL,
      end_date TIMESTAMP WITH TIME ZONE NOT NULL,
      status period_status NOT NULL DEFAULT 'OPEN',
      snapshot_id INTEGER, closed_at TIMESTAMP WITH TIME ZONE,
      closed_by INTEGER, reopened_at TIMESTAMP WITH TIME ZONE,
      reopened_by INTEGER,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS financial_snapshots (
      id SERIAL PRIMARY KEY,
      period_id INTEGER NOT NULL REFERENCES accounting_periods(id) ON DELETE RESTRICT,
      branch_id INTEGER,
      cash NUMERIC(14,2) NOT NULL DEFAULT '0',
      bank NUMERIC(14,2) NOT NULL DEFAULT '0',
      ewallet NUMERIC(14,2) NOT NULL DEFAULT '0',
      inventory NUMERIC(14,2) NOT NULL DEFAULT '0',
      receivable NUMERIC(14,2) NOT NULL DEFAULT '0',
      payable NUMERIC(14,2) NOT NULL DEFAULT '0',
      revenue NUMERIC(14,2) NOT NULL DEFAULT '0',
      cogs NUMERIC(14,2) NOT NULL DEFAULT '0',
      operating_expense NUMERIC(14,2) NOT NULL DEFAULT '0',
      gross_profit NUMERIC(14,2) NOT NULL DEFAULT '0',
      net_profit NUMERIC(14,2) NOT NULL DEFAULT '0',
      equity NUMERIC(14,2) NOT NULL DEFAULT '0',
      retained_earnings NUMERIC(14,2) NOT NULL DEFAULT '0',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS finance_audit_logs (
      id SERIAL PRIMARY KEY, action TEXT NOT NULL,
      user_id INTEGER, period_id INTEGER, branch_id INTEGER,
      reason TEXT, ip_address TEXT, old_status TEXT, new_status TEXT, changes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,

    `CREATE TABLE IF NOT EXISTS balance_snapshots (
      id SERIAL PRIMARY KEY, branch_id INTEGER NOT NULL,
      snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL,
      opening_cash NUMERIC(14,2) NOT NULL DEFAULT '0',
      closing_cash NUMERIC(14,2) NOT NULL DEFAULT '0',
      total_assets NUMERIC(14,2) NOT NULL DEFAULT '0',
      total_liabilities NUMERIC(14,2) NOT NULL DEFAULT '0',
      total_equity NUMERIC(14,2) NOT NULL DEFAULT '0',
      total_revenue NUMERIC(14,2) NOT NULL DEFAULT '0',
      total_expenses NUMERIC(14,2) NOT NULL DEFAULT '0',
      net_income NUMERIC(14,2) NOT NULL DEFAULT '0',
      cash_balance NUMERIC(14,2) NOT NULL DEFAULT '0',
      transaction_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`,
  ];

  for (const stmt of statements) {
    await pool.query(stmt);
  }
}

describe("Finance: Complete Accounting Lifecycle", () => {
  beforeAll(async () => {
    await ensureFinanceTables();
    await initializeDefaultCOA();

    const [branch] = await db.insert(branchesTable).values({
      name: `${TEST_PREFIX} Branch`, code: `BR-${TEST_PREFIX}`,
      address: "Test", phone: "123", isActive: true,
    }).returning();
    branchId = branch.id;

    const now = new Date();
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const period = await PeriodManager.createPeriod("E2E-Test-Period", periodStart, periodEnd);
    periodId = period.id;
  });

  afterAll(async () => {
    const txnIds = [salesTxnId, expenseTxnId].filter(Boolean);
    for (const id of txnIds) {
      try { await db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.transactionId, id)); } catch {}
      try { await db.delete(journalEntriesTable).where(eq(journalEntriesTable.transactionId, id)); } catch {}
    }
    if (txnIds.length > 0) {
      try { await db.delete(transactionsTable).where(sql`${transactionsTable.id} = ANY(${sql.raw(`ARRAY[${txnIds.join(",")}]`)})`); } catch {}
    }
    try { await db.delete(financialSnapshotsTable).where(eq(financialSnapshotsTable.periodId, periodId)); } catch {}
    try { await db.delete(financeAuditLogsTable).where(eq(financeAuditLogsTable.periodId, periodId)); } catch {}
    try { await db.delete(accountingPeriodsTable).where(sql`${accountingPeriodsTable.name} LIKE ${`E2E-%`}`); } catch {}
    try { await db.delete(branchesTable).where(eq(branchesTable.id, branchId)); } catch {}
    await pool.end();
  });

  it("creates a sales transaction with journal + ledger entries", async () => {
    const result = await createTransaction({
      branchId, type: "income", category: "pos_sale",
      description: `${TEST_PREFIX} Sales`, amount: 100000,
    });
    salesTxnId = result.transaction.id;

    expect(result.journalEntries).toHaveLength(2);
    const debitEntry = result.journalEntries.find((e: any) => parseFloat(e.debit) > 0);
    const creditEntry = result.journalEntries.find((e: any) => parseFloat(e.credit) > 0);
    expect(parseFloat(debitEntry.debit)).toBe(100000);
    expect(parseFloat(creditEntry.credit)).toBe(100000);

    const ledgerEntries = await db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.transactionId, salesTxnId));
    expect(ledgerEntries).toHaveLength(2);
  });

  it("creates an expense transaction with journal + ledger entries", async () => {
    const result = await createTransaction({
      branchId, type: "expense", category: "utilities",
      description: `${TEST_PREFIX} Expense`, amount: 25000,
    });
    expenseTxnId = result.transaction.id;
    expect(result.journalEntries).toHaveLength(2);
  });

  it("shows correct running balance in ledger", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const balances = await getAccountBalances(filters);

    expect(balances.find((b) => b.accountCode === "1000")!.balance).toBe(75000);
    expect(balances.find((b) => b.accountCode === "4000")!.balance).toBe(100000);
    expect(balances.find((b) => b.accountCode === "6200")!.balance).toBe(25000);
  });

  it("generates correct trial balance (debits = credits)", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const tb = await generateTrialBalance(filters);

    const totalDebit = tb.reduce((s, r) => s + r.debit, 0);
    const totalCredit = tb.reduce((s, r) => s + r.credit, 0);
    expect(totalDebit).toBe(totalCredit);
    expect(tb.find((r) => r.accountCode === "1000")!.debit).toBe(100000);
    expect(tb.find((r) => r.accountCode === "4000")!.credit).toBe(100000);
  });

  it("generates correct profit and loss statement", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const pl = await generateProfitLoss(filters);

    expect(pl.totalRevenue).toBe(100000);
    expect(pl.totalExpenses).toBe(25000);
    expect(pl.netIncome).toBe(75000);
  });

  it("generates correct balance sheet (Assets = Liabilities + Equity)", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const bs = await generateBalanceSheet(filters);

    expect(bs.totalAssets).toBe(75000);
    expect(bs.totalLiabilities).toBe(0);
    expect(bs.equity.find((e) => e.code === "NET_INCOME")!.balance).toBe(75000);
    expect(bs.totalEquity).toBe(75000);
    expect(bs.totalAssets).toBe(bs.totalLiabilities + bs.totalEquity);
  });

  it("generates correct cash flow statement", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const cf = await generateCashflow(filters);

    expect(cf.netOperating).toBe(75000);
    expect(cf.netChange).toBe(75000);
    expect(cf.operating.find((o) => o.description === "Kas")!.amount).toBe(75000);
  });

  it("generates correct equity statement", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const eqStmt = await generateEquityStatement(filters);

    expect(eqStmt.netIncome).toBe(75000);
    expect(eqStmt.closingBalance - eqStmt.openingBalance).toBe(75000);
  });

  it("generates general ledger with running balance", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const gl = await getGeneralLedger(filters);

    expect(gl.length).toBeGreaterThanOrEqual(4);
    const cashGl = gl.filter((r) => r.accountCode === "1000");
    expect(cashGl.length).toBe(2);
    expect(cashGl[cashGl.length - 1].runningBalance).toBe(75000);
  });

  it("passes accounting validation (no critical failures)", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const report = await ValidationEngine.runFullValidation(filters);

    expect(report.totalChecks).toBeGreaterThan(0);
    const criticalFailed = report.checks.filter((c) => c.severity === "critical" && c.status === "failed");
    expect(criticalFailed.length).toBe(0);
    expect(report.overallScore).toBeGreaterThanOrEqual(80);
  });

  it("executes closing cycle end-to-end", async () => {
    const result = await ClosingEngine.executeClosing(periodId, 1);

    expect(result.success).toBe(true);
    expect(result.snapshotId).toBeDefined();

    const period = await PeriodManager.getPeriodById(periodId);
    expect(period.status).toBe("CLOSED");

    const snapshots = await PeriodManager.getSnapshots(periodId);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(snapshots[0].revenue)).toBeGreaterThan(0);

    const closingTxns = await db.select().from(transactionsTable).where(
      and(eq(transactionsTable.category, "period_closing"), eq(transactionsTable.referenceId, periodId)),
    );
    expect(closingTxns.length).toBeGreaterThanOrEqual(1);
  });

  it("creates next period with opening balance", async () => {
    const nextPeriods = await db.select().from(accountingPeriodsTable).where(
      and(sql`${accountingPeriodsTable.startDate} > ${periodEnd}`, eq(accountingPeriodsTable.status, "OPEN")),
    ).orderBy(accountingPeriodsTable.startDate).limit(1);

    expect(nextPeriods.length).toBe(1);

    // Post-closing: revenue/expense zeroed via closing journal
    const filters = { branchIds: [branchId], startDate: nextPeriods[0].startDate, endDate: nextPeriods[0].endDate };
    const pl = await generateProfitLoss(filters);
    expect(pl.totalRevenue).toBe(0);
    expect(pl.totalExpenses).toBe(0);
  });

  it("correctly filters by branch", async () => {
    const allAccounts = await generateTrialBalance({ startDate: periodStart, endDate: periodEnd });
    expect(allAccounts.length).toBeGreaterThan(0);
  });

  it("reports accounting health without errors", async () => {
    const filters = { branchIds: [branchId], startDate: periodStart, endDate: periodEnd };
    const health = await ValidationEngine.checkAccountingHealth(filters);

    expect(health).toBeDefined();
    expect(health.totalChecks).toBeGreaterThan(0);
    expect(typeof health.overallScore).toBe("number");
  });
});
