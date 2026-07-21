import { db, transactionsTable, accountsTable, ledgerEntriesTable, journalEntriesTable } from "@workspace/db";
import { eq, and, sql, gte, lt } from "drizzle-orm";
import { PeriodManager } from "./PeriodManager";
import { getAccountByCode, getAccountById } from "./chartOfAccounts";
import { ValidationEngine, type ValidationCheckResult, type ValidationReport } from "./ValidationEngine";

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

    const filters = { startDate: period.startDate, endDate: period.endDate };
    const report = await ValidationEngine.runFullValidation(filters);
    const warnings: string[] = [];

    // Map ValidationEngine results to ClosingCheck format
    const checks: ClosingCheck[] = report.checks.map((c: ValidationCheckResult) => ({
      name: c.name,
      passed: c.status === "passed",
      detail: c.detail,
      critical: c.severity === "critical",
    }));

    for (const check of checks) {
      if (!check.passed) {
        warnings.push(check.detail);
      }
    }

    const criticalFailed = checks.filter(c => c.critical && !c.passed).length;
    const passedChecks = checks.filter(c => c.passed).length;
    const totalChecks = checks.length;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

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
    const balances = await this.getAccountBalances();

    // Find revenue accounts (credit-normal) and expense accounts (debit-normal)
    const revenueAccountCodes = ["4000", "4100", "4200"];
    const expenseAccountCodes = ["5000", "6000", "6100", "6200", "6300", "6400", "6500"];

    let totalRevenue = 0;
    let totalExpense = 0;

    const revenueLines: { accountId: number; amount: number }[] = [];
    const expenseLines: { accountId: number; amount: number }[] = [];

    for (const code of revenueAccountCodes) {
      const balance = balances[code] || 0;
      if (balance > 0) {
        const account = await getAccountByCode(code);
        if (account) {
          revenueLines.push({ accountId: account.id, amount: balance });
          totalRevenue += balance;
        }
      }
    }

    for (const code of expenseAccountCodes) {
      const balance = balances[code] || 0;
      if (balance > 0) {
        const account = await getAccountByCode(code);
        if (account) {
          expenseLines.push({ accountId: account.id, amount: balance });
          totalExpense += balance;
        }
      }
    }

    if (totalRevenue === 0 && totalExpense === 0) {
      await PeriodManager.writeAuditLog({ action: "CLOSING_JOURNAL", userId, periodId: period.id, reason: "No revenue or expense to close" });
      return;
    }

    // Create a closing transaction header
    const [closingTxn] = await db.insert(transactionsTable).values({
      branchId: 1,
      type: "closing",
      category: "period_closing",
      description: `Closing entries for ${period.name}`,
      amount: String(Math.abs(totalRevenue - totalExpense)),
      referenceType: "closing",
      referenceId: period.id,
      sourceModule: "closing_engine",
      transactionClass: "ACCOUNTING_TRANSACTION",
      status: "completed",
      createdBy: userId,
    }).returning();

    // Insert closing journal entries:
    // 1. Debit each revenue account → zeroes them out (credit-normal, so debit reduces)
    const closingLines: { accountId: number; debit: number; credit: number; description: string }[] = [];

    for (const line of revenueLines) {
      closingLines.push({
        accountId: line.accountId,
        debit: line.amount,
        credit: 0,
        description: `Close Revenue: ${line.amount}`,
      });
    }

    // 2. Credit each expense account → zeroes them out (debit-normal, so credit reduces)
    for (const line of expenseLines) {
      closingLines.push({
        accountId: line.accountId,
        debit: 0,
        credit: line.amount,
        description: `Close Expense: ${line.amount}`,
      });
    }

    // 3. Net income goes to Retained Earnings (3100)
    const netIncome = totalRevenue - totalExpense;
    const retainedEarningsAccount = await getAccountByCode("3100");
    if (retainedEarningsAccount && netIncome !== 0) {
      if (netIncome > 0) {
        closingLines.push({
          accountId: retainedEarningsAccount.id,
          debit: 0,
          credit: netIncome,
          description: "Net income transferred to Retained Earnings",
        });
      } else {
        closingLines.push({
          accountId: retainedEarningsAccount.id,
          debit: Math.abs(netIncome),
          credit: 0,
          description: "Net loss transferred to Retained Earnings",
        });
      }
    }

    // Insert all closing journal entries and update ledger
    for (const line of closingLines) {
      const [je] = await db.insert(journalEntriesTable).values({
        transactionId: closingTxn.id,
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
        description: line.description,
      }).returning();

      const account = await getAccountById(line.accountId);
      const isDebitNormal = account?.normalBalance === "debit";
      const [lastLedger] = await db.select()
        .from(ledgerEntriesTable)
        .where(eq(ledgerEntriesTable.accountId, line.accountId))
        .orderBy(sql`${ledgerEntriesTable.id} DESC`)
        .limit(1);
      const prevBalance = lastLedger ? parseFloat(lastLedger.runningBalance) : 0;
      const newBalance = isDebitNormal
        ? prevBalance + line.debit - line.credit
        : prevBalance - line.debit + line.credit;

      await db.insert(ledgerEntriesTable).values({
        accountId: line.accountId,
        journalEntryId: je.id,
        transactionId: closingTxn.id,
        date: new Date(),
        description: line.description,
        debit: String(line.debit),
        credit: String(line.credit),
        runningBalance: String(newBalance),
      });
    }

    await PeriodManager.writeAuditLog({
      action: "CLOSING_JOURNAL",
      userId,
      periodId: period.id,
      reason: "Auto-generated closing journal with proper revenue/expense closure",
      changes: JSON.stringify({ revenue: totalRevenue, expense: totalExpense, netIncome, retainedEarnings: netIncome }),
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
        normalBalance: accountsTable.normalBalance,
        totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
      })
      .from(accountsTable)
      .leftJoin(ledgerEntriesTable, eq(accountsTable.id, ledgerEntriesTable.accountId))
      .groupBy(accountsTable.code, accountsTable.normalBalance);

    const balances: Record<string, number> = {};
    for (const row of rows) {
      const totalDebit = parseFloat(row.totalDebit);
      const totalCredit = parseFloat(row.totalCredit);
      balances[row.code] = row.normalBalance === "debit"
        ? totalDebit - totalCredit
        : totalCredit - totalDebit;
    }
    return balances;
  }
}
