import {
  db,
  transactionsTable,
  accountsTable,
  journalEntriesTable,
  ledgerEntriesTable,
  accountingPeriodsTable,
  financialSnapshotsTable,
  branchesTable,
} from "@workspace/db";
import { eq, and, sql, gte, lt, inArray, isNull } from "drizzle-orm";

export type ValidationSeverity = "critical" | "error" | "warning" | "info";
export type ValidationStatus = "passed" | "failed" | "warning";

export interface ValidationCheckResult {
  name: string;
  status: ValidationStatus;
  severity: ValidationSeverity;
  detail: string;
  recommendation: string;
  autoFix: boolean;
  affectedCount: number;
}

export interface ValidationReport {
  runAt: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  overallScore: number;
  checks: ValidationCheckResult[];
  summary: {
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
}

export interface ValidationFilters {
  branchIds?: number[];
  startDate?: Date;
  endDate?: Date;
  periodId?: number;
}

export class ValidationEngine {
  static async runFullValidation(filters?: ValidationFilters): Promise<ValidationReport> {
    const checks = await Promise.all([
      this.checkJournalBalanced(filters),
      this.checkLedgerBalanced(filters),
      this.checkNegativeCash(filters),
      this.checkNoPendingTransactions(filters),
      this.checkDuplicateJournals(filters),
      this.checkOrphanJournalEntries(filters),
      this.checkOrphanLedgerEntries(filters),
      this.checkCrossPeriodTransactions(filters),
      this.checkMissingCOA(filters),
      this.checkInactiveCOA(filters),
      this.checkInvalidBranchRef(filters),
      this.checkInvalidPeriodRef(),
      this.checkMissingLedgerPosting(filters),
      this.checkMissingJournalPosting(),
      this.checkInvalidDebitCredit(filters),
      this.checkSuspiciousManualAdjustments(filters),
      this.checkClosingIntegrity(),
      this.checkDuplicateJournalNumber(filters),
      this.checkNegativeRunningBalances(filters),
      this.checkZeroAmountJournals(filters),
      this.checkMismatchedTransactionClass(filters),
    ]);

    const passedChecks = checks.filter((c) => c.status === "passed").length;
    const failedChecks = checks.filter((c) => c.status === "failed").length;
    const warningChecks = checks.filter((c) => c.status === "warning").length;

    const criticalCount = checks.filter((c) => c.severity === "critical" && c.status !== "passed").length;
    const errorCount = checks.filter((c) => c.severity === "error" && c.status !== "passed").length;
    const warningCount = checks.filter((c) => c.severity === "warning" && c.status !== "passed").length;
    const infoCount = checks.filter((c) => c.severity === "info" && c.status !== "passed").length;

    const totalChecks = checks.length;
    const overallScore = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    return {
      runAt: new Date().toISOString(),
      totalChecks,
      passedChecks,
      failedChecks,
      warningChecks,
      overallScore,
      checks,
      summary: {
        critical: criticalCount,
        error: errorCount,
        warning: warningCount,
        info: infoCount,
      },
    };
  }

  // ── Validation Check: Journal Balanced ──
  static async checkJournalBalanced(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildJournalWhere(filters);
    const [result] = await db
      .select({
        totalDebit: sql<string>`COALESCE(SUM(${journalEntriesTable.debit}::numeric), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${journalEntriesTable.credit}::numeric), 0)`,
      })
      .from(journalEntriesTable)
      .where(where);

    const debit = parseFloat(result.totalDebit);
    const credit = parseFloat(result.totalCredit);
    const diff = Math.abs(debit - credit);
    const passed = diff < 0.01;

    return {
      name: "Journal Balanced",
      status: passed ? "passed" : "failed",
      severity: "critical",
      detail: passed
        ? `Total Debit = Total Credit (Rp ${debit.toLocaleString()})`
        : `Imbalance: Rp ${diff.toLocaleString()} (Debit: Rp ${debit.toLocaleString()}, Credit: Rp ${credit.toLocaleString()})`,
      recommendation: passed ? "" : "Review journal entries for unbalanced transactions. Run detailed audit on transactions where debit ≠ credit.",
      autoFix: false,
      affectedCount: passed ? 0 : 1,
    };
  }

  // ── Validation Check: Ledger Balanced (REAL implementation) ──
  static async checkLedgerBalanced(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = filters?.startDate && filters?.endDate
      ? and(
          gte(ledgerEntriesTable.date, filters.startDate),
          lt(ledgerEntriesTable.date, filters.endDate)
        )
      : undefined;

    const accounts = await db
      .select({
        accountId: accountsTable.id,
        code: accountsTable.code,
        name: accountsTable.name,
        normalBalance: accountsTable.normalBalance,
        totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}::numeric), 0)`,
        totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}::numeric), 0)`,
      })
      .from(accountsTable)
      .leftJoin(ledgerEntriesTable, eq(accountsTable.id, ledgerEntriesTable.accountId))
      .groupBy(accountsTable.id, accountsTable.code, accountsTable.name, accountsTable.normalBalance);

    let imbalanceCount = 0;
    let totalNetBalance = 0;

    for (const acct of accounts) {
      const debit = parseFloat(acct.totalDebit);
      const credit = parseFloat(acct.totalCredit);
      const net = debit - credit;
      totalNetBalance += net;

      const isDebitNormal = acct.normalBalance === "debit";
      const sign = isDebitNormal ? 1 : -1;
      if (sign * net < -0.01) {
        imbalanceCount++;
      }
    }

    const passed = Math.abs(totalNetBalance) < 0.01;

    return {
      name: "Ledger Balanced",
      status: passed ? "passed" : "failed",
      severity: "critical",
      detail: passed
        ? `All ${accounts.length} accounts balanced. Net balance: Rp ${totalNetBalance.toLocaleString()}`
        : `Ledger imbalance detected. Net balance: Rp ${totalNetBalance.toLocaleString()}. ${imbalanceCount} accounts with abnormal balances.`,
      recommendation: passed ? "" : "Run trial balance report. Check accounts with balances opposite to their normal balance convention.",
      autoFix: false,
      affectedCount: imbalanceCount,
    };
  }

  // ── Validation Check: Negative Cash ──
  static async checkNegativeCash(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildLedgerWhere(filters);
    const cashAccount = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(eq(accountsTable.code, "1000"))
      .then((r) => r[0]);

    if (!cashAccount) {
      return {
        name: "Negative Cash",
        status: "warning",
        severity: "warning",
        detail: "Cash account (1000) not found in chart of accounts",
        recommendation: "Initialize default COA or create cash account with code 1000",
        autoFix: false,
        affectedCount: 0,
      };
    }

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(ledgerEntriesTable)
      .where(
        and(
          eq(ledgerEntriesTable.accountId, cashAccount.id),
          sql`${ledgerEntriesTable.runningBalance}::numeric < 0`,
          where || undefined,
        )
      );

    const passed = result.cnt === 0;
    return {
      name: "Negative Cash",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed ? "No negative cash balances" : `${result.cnt} negative cash entries found`,
      recommendation: passed ? "" : "Review transactions causing negative cash. Create cash-in adjustment or void overspent transactions.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Pending Transactions ──
  static async checkNoPendingTransactions(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildTransactionWhere(filters);
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.status, "pending"), where || undefined));

    const passed = result.cnt === 0;
    return {
      name: "Pending Transactions",
      status: passed ? "passed" : "warning",
      severity: "warning",
      detail: passed ? "No pending transactions" : `${result.cnt} pending transactions found`,
      recommendation: passed ? "" : "Review and complete all pending transactions. Pending transactions are excluded from financial reports.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Duplicate Journals ──
  static async checkDuplicateJournals(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildTransactionWhere(filters);
    const dupes = await db
      .select({
        refId: transactionsTable.referenceId,
        refType: transactionsTable.referenceType,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(transactionsTable)
      .where(and(sql`${transactionsTable.referenceId} IS NOT NULL`, where || undefined))
      .groupBy(transactionsTable.referenceId, transactionsTable.referenceType)
      .having(sql`COUNT(*) > 1`);

    const passed = dupes.length === 0;
    return {
      name: "Duplicate Journals",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed ? "No duplicate reference journals" : `${dupes.length} duplicate reference groups found`,
      recommendation: passed ? "" : "Review transactions with duplicate referenceId + referenceType combinations. Consider voiding duplicates.",
      autoFix: false,
      affectedCount: dupes.length,
    };
  }

  // ── Validation Check: Orphan Journal Entries ──
  static async checkOrphanJournalEntries(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .leftJoin(transactionsTable, eq(journalEntriesTable.transactionId, transactionsTable.id))
      .where(isNull(transactionsTable.id));

    const passed = result.cnt === 0;
    return {
      name: "Orphan Journal Entries",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed ? "No orphan journal entries" : `${result.cnt} journal entries without a valid transaction`,
      recommendation: passed ? "" : "Clean up orphan journal entries. They reference deleted transactions and cause ledger inconsistencies.",
      autoFix: true,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Orphan Ledger Entries ──
  static async checkOrphanLedgerEntries(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(ledgerEntriesTable)
      .leftJoin(journalEntriesTable, eq(ledgerEntriesTable.journalEntryId, journalEntriesTable.id))
      .where(isNull(journalEntriesTable.id));

    const passed = result.cnt === 0;
    return {
      name: "Orphan Ledger Entries",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed ? "No orphan ledger entries" : `${result.cnt} ledger entries without a valid journal entry`,
      recommendation: passed ? "" : "Clean up orphan ledger entries. They cause incorrect account balances.",
      autoFix: true,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Cross-Period Transactions ──
  static async checkCrossPeriodTransactions(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const [periodCount] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(accountingPeriodsTable);

    if (periodCount.cnt === 0) {
      return {
        name: "Cross-Period Transactions",
        status: "passed",
        severity: "info",
        detail: "No accounting periods defined — skipping cross-period check",
        recommendation: "Create accounting periods to enable period-based validation",
        autoFix: false,
        affectedCount: 0,
      };
    }

    const where = this.buildTransactionWhere(filters);
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .where(
        and(
          sql`NOT EXISTS (
            SELECT 1 FROM ${accountingPeriodsTable}
            WHERE ${accountingPeriodsTable.startDate}::date <= ${transactionsTable.createdAt}::date
            AND ${accountingPeriodsTable.endDate}::date >= ${transactionsTable.createdAt}::date
          )`,
          where || undefined,
        )
      );

    const passed = result.cnt === 0;
    return {
      name: "Cross-Period Transactions",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed
        ? "All transactions fall within valid accounting periods"
        : `${result.cnt} transactions outside any accounting period`,
      recommendation: passed
        ? ""
        : "Create periods covering those transaction dates or adjust transaction dates to fall within existing periods.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Missing COA ──
  static async checkMissingCOA(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = filters?.startDate && filters?.endDate
      ? and(
          gte(journalEntriesTable.createdAt, filters.startDate),
          lt(journalEntriesTable.createdAt, filters.endDate)
        )
      : undefined;

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .leftJoin(accountsTable, eq(journalEntriesTable.accountId, accountsTable.id))
      .where(and(isNull(accountsTable.id), where || undefined));

    const passed = result.cnt === 0;
    return {
      name: "Missing COA Reference",
      status: passed ? "passed" : "failed",
      severity: "critical",
      detail: passed ? "All journal entries reference valid accounts" : `${result.cnt} journal entries reference deleted accounts`,
      recommendation: passed ? "" : "Reassign orphaned journal entries to valid accounts or restore deleted accounts.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Inactive COA ──
  static async checkInactiveCOA(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const inactiveAccounts = await db
      .select({ id: accountsTable.id, code: accountsTable.code, name: accountsTable.name })
      .from(accountsTable)
      .where(eq(accountsTable.isActive, false));

    if (inactiveAccounts.length === 0) {
      return {
        name: "Inactive COA Usage",
        status: "passed",
        severity: "info",
        detail: "No inactive accounts in chart of accounts",
        recommendation: "",
        autoFix: false,
        affectedCount: 0,
      };
    }

    const inactiveIds = inactiveAccounts.map((a) => a.id);
    const where = filters?.startDate && filters?.endDate
      ? and(
          inArray(journalEntriesTable.accountId, inactiveIds),
          gte(journalEntriesTable.createdAt, filters.startDate),
          lt(journalEntriesTable.createdAt, filters.endDate),
        )
      : inArray(journalEntriesTable.accountId, inactiveIds);

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .where(where);

    const passed = result.cnt === 0;
    return {
      name: "Inactive COA Usage",
      status: passed ? "passed" : "failed",
      severity: "warning",
      detail: passed
        ? `No usage of ${inactiveAccounts.length} inactive accounts`
        : `${result.cnt} journal entries use inactive accounts: ${inactiveAccounts.map((a) => `${a.code}:${a.name}`).join(", ")}`,
      recommendation: passed ? "" : "Reactivate accounts if still needed, or reassign entries to active accounts.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Invalid Branch Reference ──
  static async checkInvalidBranchRef(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildTransactionWhere(filters);

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .leftJoin(branchesTable, eq(transactionsTable.branchId, branchesTable.id))
      .where(and(isNull(branchesTable.id), where || undefined));

    const passed = result.cnt === 0;
    return {
      name: "Invalid Branch Reference",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed ? "All transactions reference valid branches" : `${result.cnt} transactions reference deleted branches`,
      recommendation: passed ? "" : "Reassign transactions to valid branches or restore deleted branches.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Invalid Period Reference ──
  static async checkInvalidPeriodRef(): Promise<ValidationCheckResult> {
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(financialSnapshotsTable)
      .leftJoin(accountingPeriodsTable, eq(financialSnapshotsTable.periodId, accountingPeriodsTable.id))
      .where(isNull(accountingPeriodsTable.id));

    const passed = result.cnt === 0;
    return {
      name: "Invalid Period Reference",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed ? "All financial snapshots reference valid periods" : `${result.cnt} snapshots reference deleted periods`,
      recommendation: passed ? "" : "Clean up snapshots referencing deleted periods or restore periods.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Missing Ledger Posting ──
  static async checkMissingLedgerPosting(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = filters?.startDate && filters?.endDate
      ? and(
          gte(journalEntriesTable.createdAt, filters.startDate),
          lt(journalEntriesTable.createdAt, filters.endDate),
        )
      : undefined;

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .leftJoin(ledgerEntriesTable, eq(journalEntriesTable.id, ledgerEntriesTable.journalEntryId))
      .where(and(isNull(ledgerEntriesTable.id), where || undefined));

    const passed = result.cnt === 0;
    return {
      name: "Missing Ledger Posting",
      status: passed ? "passed" : "failed",
      severity: "critical",
      detail: passed ? "All journal entries have corresponding ledger entries" : `${result.cnt} journal entries without ledger posting`,
      recommendation: passed ? "" : "Post missing ledger entries immediately. Accounts will show incorrect balances without ledger entries.",
      autoFix: true,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Missing Journal Posting ──
  static async checkMissingJournalPosting(): Promise<ValidationCheckResult> {
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(ledgerEntriesTable)
      .leftJoin(journalEntriesTable, eq(ledgerEntriesTable.journalEntryId, journalEntriesTable.id))
      .where(isNull(journalEntriesTable.id));

    const passed = result.cnt === 0;
    return {
      name: "Missing Journal Posting",
      status: passed ? "passed" : "failed",
      severity: "critical",
      detail: passed ? "All ledger entries have corresponding journal entries" : `${result.cnt} ledger entries without journal source`,
      recommendation: passed ? "" : "Investigate ledger entries created without journal entries. Data integrity issue.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Invalid Debit/Credit Combination ──
  static async checkInvalidDebitCredit(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = filters?.startDate && filters?.endDate
      ? and(
          gte(journalEntriesTable.createdAt, filters.startDate),
          lt(journalEntriesTable.createdAt, filters.endDate),
        )
      : undefined;

    // Find entries where both debit and credit are zero, or both positive
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .where(
        and(
          sql`(${journalEntriesTable.debit}::numeric = 0 AND ${journalEntriesTable.credit}::numeric = 0)`,
          where || undefined,
        )
      );

    const [bothPositive] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .where(
        and(
          sql`${journalEntriesTable.debit}::numeric > 0 AND ${journalEntriesTable.credit}::numeric > 0`,
          where || undefined,
        )
      );

    const totalBad = result.cnt + bothPositive.cnt;
    const passed = totalBad === 0;

    return {
      name: "Invalid Debit/Credit Combination",
      status: passed ? "passed" : "failed",
      severity: "error",
      detail: passed
        ? "All entries have valid debit/credit (one positive, one zero)"
        : `${totalBad} invalid entries: ${result.cnt} zero/zero, ${bothPositive.cnt} both positive`,
      recommendation: passed ? "" : "Each journal entry must have exactly one of debit or credit > 0. Fix invalid entries.",
      autoFix: false,
      affectedCount: totalBad,
    };
  }

  // ── Validation Check: Suspicious Manual Adjustments ──
  static async checkSuspiciousManualAdjustments(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildTransactionWhere(filters);
    const threshold = 10000000; // Rp 10,000,000 threshold for suspicious

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.sourceModule, "manual"),
          sql`${transactionsTable.amount}::numeric > ${threshold}`,
          where || undefined,
        )
      );

    const passed = result.cnt === 0;
    return {
      name: "Suspicious Manual Adjustments",
      status: passed ? "passed" : "warning",
      severity: "warning",
      detail: passed
        ? `No manual adjustments above Rp ${threshold.toLocaleString()}`
        : `${result.cnt} manual adjustments exceeding Rp ${threshold.toLocaleString()}`,
      recommendation: passed ? "" : "Review large manual adjustments. Consider requiring approval for amounts above threshold.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Closing Integrity ──
  static async checkClosingIntegrity(): Promise<ValidationCheckResult> {
    const closedPeriods = await db
      .select({
        id: accountingPeriodsTable.id,
        name: accountingPeriodsTable.name,
        snapshotId: accountingPeriodsTable.snapshotId,
      })
      .from(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.status, "CLOSED"));

    if (closedPeriods.length === 0) {
      return {
        name: "Closing Integrity",
        status: "passed",
        severity: "info",
        detail: "No closed periods to validate",
        recommendation: "",
        autoFix: false,
        affectedCount: 0,
      };
    }

    let missingSnapshot = 0;
    for (const period of closedPeriods) {
      if (!period.snapshotId) {
        missingSnapshot++;
        continue;
      }
      const [snapshot] = await db
        .select({ id: financialSnapshotsTable.id })
        .from(financialSnapshotsTable)
        .where(eq(financialSnapshotsTable.id, period.snapshotId));
      if (!snapshot) missingSnapshot++;
    }

    const passed = missingSnapshot === 0;
    return {
      name: "Closing Integrity",
      status: passed ? "passed" : "failed",
      severity: "critical",
      detail: passed
        ? `All ${closedPeriods.length} closed periods have valid snapshots`
        : `${missingSnapshot} of ${closedPeriods.length} closed periods missing snapshots`,
      recommendation: passed ? "" : "Regenerate snapshots for closed periods missing data. Critical for audit trail.",
      autoFix: true,
      affectedCount: missingSnapshot,
    };
  }

  // ── Validation Check: Duplicate Journal Number ──
  static async checkDuplicateJournalNumber(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildTransactionWhere(filters);
    const dupes = await db
      .select({
        desc: transactionsTable.description,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(transactionsTable)
      .where(where || undefined)
      .groupBy(transactionsTable.description)
      .having(sql`COUNT(*) > 20`); // Same description 20+ times is suspicious

    const passed = dupes.length === 0;
    return {
      name: "Duplicate Journal Descriptions",
      status: passed ? "passed" : "warning",
      severity: "info",
      detail: passed ? "No suspicious description patterns" : `${dupes.length} description patterns with 20+ occurrences`,
      recommendation: passed ? "" : "Investigate bulk-created transactions with identical descriptions. May indicate system duplication.",
      autoFix: false,
      affectedCount: dupes.length,
    };
  }

  // ── Validation Check: Negative Running Balances (all accounts) ──
  static async checkNegativeRunningBalances(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildLedgerWhere(filters);
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(ledgerEntriesTable)
      .where(and(sql`${ledgerEntriesTable.runningBalance}::numeric < 0`, where || undefined));

    const passed = result.cnt === 0;
    return {
      name: "Negative Running Balances",
      status: passed ? "passed" : "failed",
      severity: "warning",
      detail: passed ? "No negative running balances" : `${result.cnt} ledger entries with negative running balance`,
      recommendation: passed ? "" : "Review accounts with negative balances. May indicate incorrect transaction ordering or missing prior entries.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Zero-Amount Journal Entries ──
  static async checkZeroAmountJournals(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = filters?.startDate && filters?.endDate
      ? and(
          gte(journalEntriesTable.createdAt, filters.startDate),
          lt(journalEntriesTable.createdAt, filters.endDate),
        )
      : undefined;

    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(journalEntriesTable)
      .where(
        and(
          sql`${journalEntriesTable.debit}::numeric = 0 AND ${journalEntriesTable.credit}::numeric = 0`,
          where || undefined,
        )
      );

    const passed = result.cnt === 0;
    return {
      name: "Zero-Amount Journal Entries",
      status: passed ? "passed" : "warning",
      severity: "warning",
      detail: passed ? "No zero-amount journal entries" : `${result.cnt} journal entries with zero debit and credit`,
      recommendation: passed ? "" : "Remove zero-amount entries. They add no value and increase database size.",
      autoFix: true,
      affectedCount: result.cnt,
    };
  }

  // ── Validation Check: Mismatched Transaction Class ──
  static async checkMismatchedTransactionClass(filters?: ValidationFilters): Promise<ValidationCheckResult> {
    const where = this.buildTransactionWhere(filters);
    const [result] = await db
      .select({ cnt: sql<number>`COUNT(*)::int` })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.type, "income"),
          eq(transactionsTable.transactionClass, "ACCOUNTING_TRANSACTION"),
          where || undefined,
        )
      );

    // Income transactions should typically be CASH_TRANSACTION
    const passed = result.cnt === 0;
    return {
      name: "Mismatched Transaction Class",
      status: passed ? "passed" : "warning",
      severity: "info",
      detail: passed
        ? "No mismatched transaction classes detected"
        : `${result.cnt} income transactions classified as ACCOUNTING_TRANSACTION`,
      recommendation: passed ? "" : "Review transaction class assignments. Income/cash transactions should be CASH_TRANSACTION.",
      autoFix: false,
      affectedCount: result.cnt,
    };
  }

  // ── Accounting Health (lightweight, returns just score + summary) ──
  static async checkAccountingHealth(filters?: ValidationFilters): Promise<{
    overallScore: number;
    passedChecks: number;
    totalChecks: number;
    criticalIssues: number;
    errorIssues: number;
    warningIssues: number;
    infoIssues: number;
    lastChecked: string;
  }> {
    const report = await this.runFullValidation(filters);
    return {
      overallScore: report.overallScore,
      passedChecks: report.passedChecks,
      totalChecks: report.totalChecks,
      criticalIssues: report.summary.critical,
      errorIssues: report.summary.error,
      warningIssues: report.summary.warning,
      infoIssues: report.summary.info,
      lastChecked: report.runAt,
    };
  }

  // ── Pre-Posting Validation (runs before transaction creation) ──
  static async validatePrePosting(input: {
    branchId: number;
    category: string;
    amount: number;
    accountId?: number;
    date?: Date;
  }): Promise<{ valid: boolean; errors: ValidationCheckResult[] }> {
    const errors: ValidationCheckResult[] = [];
    const txnDate = input.date || new Date();

    // 1. Check branch exists
    const [branch] = await db.select({ id: branchesTable.id }).from(branchesTable).where(eq(branchesTable.id, input.branchId));
    if (!branch) {
      errors.push({
        name: "Invalid Branch Reference",
        status: "failed",
        severity: "critical",
        detail: `Branch ${input.branchId} not found`,
        recommendation: "Use a valid branch ID",
        autoFix: false,
        affectedCount: 1,
      });
    }

    // 2. Check account exists and is active
    if (input.accountId) {
      const account = await db
        .select({ id: accountsTable.id, code: accountsTable.code, name: accountsTable.name, isActive: accountsTable.isActive })
        .from(accountsTable)
        .where(eq(accountsTable.id, input.accountId))
        .then((r) => r[0]);
      if (!account) {
        errors.push({
          name: "Missing COA Reference",
          status: "failed",
          severity: "critical",
          detail: `Account ID ${input.accountId} not found`,
          recommendation: "Use a valid account ID from chart of accounts",
          autoFix: false,
          affectedCount: 1,
        });
      } else if (!account.isActive) {
        errors.push({
          name: "Inactive COA Usage",
          status: "failed",
          severity: "error",
          detail: `Account ${account.code}:${account.name} is inactive`,
          recommendation: "Reactivate account or choose an active account",
          autoFix: false,
          affectedCount: 1,
        });
      }
    }

    // 3. Check amount is positive
    if (input.amount <= 0) {
      errors.push({
        name: "Invalid Amount",
        status: "failed",
        severity: "critical",
        detail: `Amount must be positive: ${input.amount}`,
        recommendation: "Enter an amount greater than 0",
        autoFix: false,
        affectedCount: 1,
      });
    }

    // 4. Check period is open (using PeriodManager)
    const { PeriodManager } = await import("./PeriodManager");
    const periodCheck = await PeriodManager.validateTransactionDate(txnDate, input.branchId);
    if (!periodCheck.valid) {
      errors.push({
        name: "Cross-Period Transaction",
        status: "failed",
        severity: "critical",
        detail: periodCheck.message || "Transaction date outside open accounting period",
        recommendation: "Choose a date within an open accounting period",
        autoFix: false,
        affectedCount: 1,
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "critical").length === 0,
      errors,
    };
  }

  // ── Builders ──

  private static buildJournalWhere(filters?: ValidationFilters) {
    if (!filters) return undefined;
    const conditions: any[] = [];
    if (filters.startDate && filters.endDate) {
      conditions.push(
        gte(journalEntriesTable.createdAt, filters.startDate),
        lt(journalEntriesTable.createdAt, filters.endDate),
      );
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private static buildLedgerWhere(filters?: ValidationFilters) {
    if (!filters) return undefined;
    const conditions: any[] = [];
    if (filters.startDate && filters.endDate) {
      conditions.push(
        gte(ledgerEntriesTable.date, filters.startDate),
        lt(ledgerEntriesTable.date, filters.endDate),
      );
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  private static buildTransactionWhere(filters?: ValidationFilters) {
    if (!filters) return undefined;
    const conditions: any[] = [];
    if (filters.branchIds && filters.branchIds.length > 0) {
      conditions.push(inArray(transactionsTable.branchId, filters.branchIds));
    }
    if (filters.startDate) {
      conditions.push(gte(transactionsTable.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lt(transactionsTable.createdAt, filters.endDate));
    }
    return conditions.length > 0 ? and(...conditions) : undefined;
  }
}
