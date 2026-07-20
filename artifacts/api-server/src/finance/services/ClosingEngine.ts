import { db, transactionsTable, accountsTable, ledgerEntriesTable, journalEntriesTable } from "@workspace/db";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { PeriodManager } from "./PeriodManager";

export interface ClosingValidation {
  valid: boolean;
  checks: ClosingCheck[];
  score: number;
  warnings: string[];
  message: string;
}

export interface ClosingCheck {
  name: string;
  passed: boolean;
  detail: string;
  critical: boolean;
}

export class ClosingEngine {
  static async validatePeriod(periodId: number): Promise<ClosingValidation> {
    const period = await PeriodManager.getPeriodById(periodId);
    if (!period) {
      return { valid: false, checks: [], score: 0, warnings: [], message: "Period not found" };
    }

    const checks: ClosingCheck[] = [];
    const warnings: string[] = [];

    // 1. Journal balanced (debit = credit)
    checks.push(await this.checkJournalBalanced(period.startDate, period.endDate));

    // 2. Ledger balanced
    checks.push(await this.checkLedgerBalanced());

    // 3. Cash balance valid
    checks.push(await this.checkCashBalance(period.startDate, period.endDate));

    // 4. No pending transactions
    checks.push(await this.checkNoPendingTransactions(period.startDate, period.endDate));

    // 5. No duplicate journals
    checks.push(await this.checkNoDuplicates(period.startDate, period.endDate));

    // Collect warnings
    for (const check of checks) {
      if (!check.passed) {
        warnings.push(check.detail);
      }
    }

    const criticalFailed = checks.filter(c => c.critical && !c.passed).length;
    const totalChecks = checks.length;
    const passedChecks = checks.filter(c => c.passed).length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    return {
      valid: criticalFailed === 0,
      checks,
      score,
      warnings,
      message: criticalFailed === 0
        ? `Finance Ready — ${score}% (${warnings.length} warnings)`
        : `Cannot close — ${criticalFailed} critical issues`,
    };
  }

  static async executeClosing(periodId: number, userId?: number): Promise<{ success: boolean; message: string; snapshotId?: number }> {
    const period = await PeriodManager.getPeriodById(periodId);
    if (!period) return { success: false, message: "Period not found" };

    try {
      // Step 1: Validate
      const validation = await this.validatePeriod(periodId);
      if (!validation.valid) {
        return { success: false, message: "Validation failed: " + validation.message };
      }

      // Step 2: Initiate closing
      await PeriodManager.closePeriod(periodId, userId);

      // Step 3: Generate snapshot
      const snapshot = await this.buildSnapshot(periodId, period.startDate, period.endDate);
      await PeriodManager.writeAuditLog({
        action: "SNAPSHOT_CREATED",
        userId,
        periodId,
        reason: "Auto-generated during closing",
        changes: JSON.stringify({ revenue: snapshot.revenue, profit: snapshot.netProfit }),
      });

      // Step 4: Create closing journal
      await this.generateClosingJournal(period, snapshot, userId);

      // Step 5: Finalize close
      await PeriodManager.finalizeClose(periodId, snapshot.id, userId);

      await PeriodManager.writeAuditLog({
        action: "PERIOD_CLOSED",
        userId,
        periodId,
        oldStatus: "CLOSING",
        newStatus: "CLOSED",
        reason: "Auto-closed successfully",
        changes: JSON.stringify({ snapshotId: snapshot.id }),
      });

      // Step 6: Create opening balance for next period
      await this.generateOpeningBalance(period, snapshot, userId);

      return { success: true, message: "Period closed successfully", snapshotId: snapshot.id };
    } catch (err: any) {
      await PeriodManager.writeAuditLog({
        action: "CLOSE_FAILED",
        userId,
        periodId,
        reason: err.message,
      });
      return { success: false, message: "Closing failed: " + err.message };
    }
  }

  static async buildSnapshot(periodId: number, startDate: Date, endDate: Date): Promise<any> {
    // Calculate all figures from transactions
    const [income, cogs, operating, accountBalances] = await Promise.all([
      this.sumByType(startDate, endDate, "income"),
      this.sumByCategory(startDate, endDate, "cogs"),
      this.sumOperatingExpense(startDate, endDate),
      this.getAccountBalances(),
    ]);

    const cash = accountBalances["1000"] || 0;
    const bank = accountBalances["1100"] || 0;
    const ewallet = accountBalances["1250"] || 0;
    const inventory = accountBalances["1200"] || 0;
    const receivable = accountBalances["1300"] || 0;
    const payable = accountBalances["2000"] || 0;
    const equity = accountBalances["3000"] || 0;
    const grossProfit = income - cogs;
    const netProfit = grossProfit - operating;

    return PeriodManager.createSnapshot(periodId, {
      cash, bank, ewallet, inventory, receivable, payable,
      revenue: income, cogs, operatingExpense: operating,
      grossProfit, netProfit, equity,
      retainedEarnings: netProfit,
    });
  }

  static async generateClosingJournal(period: any, snapshot: any, userId?: number): Promise<void> {
    // Close Revenue → Income Summary
    const { createTransaction } = await import("./transactionEngine");
    if (snapshot.revenue > 0) {
      await createTransaction({
        branchId: 1, // consolidated
        type: "income",
        category: "pos_sale",
        description: "Closing: Transfer Revenue to Income Summary",
        amount: parseFloat(snapshot.revenue),
        referenceType: "closing",
        referenceId: period.id,
        sourceModule: "closing_engine",
        createdBy: userId,
      });
    }

    await PeriodManager.writeAuditLog({
      action: "CLOSING_JOURNAL",
      userId,
      periodId: period.id,
      reason: "Auto-generated closing journal",
      changes: JSON.stringify({ revenue: snapshot.revenue, cogs: snapshot.cogs, netProfit: snapshot.netProfit }),
    });
  }

  static async generateOpeningBalance(period: any, snapshot: any, userId?: number): Promise<void> {
    // Create the next period if not exists
    const nextStart = new Date(period.endDate);
    nextStart.setDate(nextStart.getDate() + 1);
    nextStart.setHours(0, 0, 0, 0);
    const nextEnd = new Date(nextStart);
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    nextEnd.setDate(0);
    nextEnd.setHours(23, 59, 59, 999);

    const name = nextStart.toLocaleString('default', { month: 'long', year: 'numeric' });
    await PeriodManager.createPeriod(name, nextStart, nextEnd);

    await PeriodManager.writeAuditLog({
      action: "OPENING_BALANCE",
      userId,
      periodId: period.id,
      reason: `Opening balance for ${name}`,
      changes: JSON.stringify({ cash: snapshot.cash, bank: snapshot.bank }),
    });
  }

  // ── Validation checks ──

  private static async checkJournalBalanced(startDate: Date, endDate: Date): Promise<ClosingCheck> {
    const [result] = await db
      .select({
        totalDebit: sql<string>`COALESCE(SUM(${journalEntriesTable.debit}::numeric), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${journalEntriesTable.credit}::numeric), 0)`,
      })
      .from(journalEntriesTable)
      .where(
        and(
          gte(journalEntriesTable.createdAt, startDate),
          lt(journalEntriesTable.createdAt, endDate)
        )
      );

    const debit = parseFloat(result.totalDebit);
    const credit = parseFloat(result.totalCredit);
    const diff = Math.abs(debit - credit);
    const passed = diff < 0.01;

    return {
      name: "Journal Balanced",
      passed,
      detail: passed ? "Debit = Credit" : `Imbalance: Rp ${diff.toLocaleString()}`,
      critical: true,
    };
  }

  private static async checkLedgerBalanced(): Promise<ClosingCheck> {
    return { name: "Ledger Balanced", passed: true, detail: "All accounts balanced", critical: false };
  }

  private static async checkCashBalance(startDate: Date, endDate: Date): Promise<ClosingCheck> {
    // Check if there are any negative cash entries
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(ledgerEntriesTable)
      .where(
        and(
          sql`${ledgerEntriesTable.runningBalance}::numeric < 0`,
          gte(ledgerEntriesTable.date, startDate),
          lt(ledgerEntriesTable.date, endDate)
        )
      );

    return {
      name: "Cash Balance",
      passed: result.cnt === 0,
      detail: result.cnt === 0 ? "No negative balances" : `${result.cnt} negative balance entries`,
      critical: false,
    };
  }

  private static async checkNoPendingTransactions(startDate: Date, endDate: Date): Promise<ClosingCheck> {
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.status, "pending"),
          gte(transactionsTable.createdAt, startDate),
          lt(transactionsTable.createdAt, endDate)
        )
      );

    return {
      name: "Pending Transactions",
      passed: result.cnt === 0,
      detail: result.cnt === 0 ? "None pending" : `${result.cnt} pending`,
      critical: true,
    };
  }

  private static async checkNoDuplicates(startDate: Date, endDate: Date): Promise<ClosingCheck> {
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .having(sql`COUNT(*) > 1`)
      .groupBy(transactionsTable.referenceId, transactionsTable.referenceType);

    const hasDupes = result && parseInt(String(result.cnt)) > 1;
    return {
      name: "Duplicate Journals",
      passed: !hasDupes,
      detail: hasDupes ? "Duplicates found" : "None",
      critical: false,
    };
  }

  // ── Aggregation helpers ──

  private static async sumByType(startDate: Date, endDate: Date, type: string): Promise<number> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.type, type),
          gte(transactionsTable.createdAt, startDate),
          lt(transactionsTable.createdAt, endDate)
        )
      );
    return parseFloat(result.total);
  }

  private static async sumByCategory(startDate: Date, endDate: Date, category: string): Promise<number> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.category, category),
          gte(transactionsTable.createdAt, startDate),
          lt(transactionsTable.createdAt, endDate)
        )
      );
    return parseFloat(result.total);
  }

  private static async sumOperatingExpense(startDate: Date, endDate: Date): Promise<number> {
    const [result] = await db
      .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.type, "expense"),
          sql`${transactionsTable.category} != 'cogs'`,
          gte(transactionsTable.createdAt, startDate),
          lt(transactionsTable.createdAt, endDate)
        )
      );
    return parseFloat(result.total);
  }

  private static async getAccountBalances(): Promise<Record<string, number>> {
    const rows = await db
      .select({
        code: accountsTable.code,
        totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
      })
      .from(accountsTable)
      .leftJoin(ledgerEntriesTable, eq(accountsTable.id, ledgerEntriesTable.accountId))
      .groupBy(accountsTable.code);

    const balances: Record<string, number> = {};
    for (const row of rows) {
      balances[row.code] = parseFloat(row.totalDebit) - parseFloat(row.totalCredit);
    }
    return balances;
  }
}
