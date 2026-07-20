import { db, accountingPeriodsTable, financialSnapshotsTable, financeAuditLogsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface PeriodValidation {
  valid: boolean;
  period?: any;
  message?: string;
}

export class PeriodManager {
  static async getCurrentPeriod(): Promise<any> {
    const [row] = await db.select().from(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.status, "OPEN"))
      .orderBy(desc(accountingPeriodsTable.createdAt))
      .limit(1);
    return row || null;
  }

  static async getAllPeriods(): Promise<any[]> {
    return db.select().from(accountingPeriodsTable)
      .orderBy(desc(accountingPeriodsTable.startDate));
  }

  static async getPeriodById(id: number): Promise<any> {
    const [row] = await db.select().from(accountingPeriodsTable)
      .where(eq(accountingPeriodsTable.id, id));
    return row || null;
  }

  static async getPeriodByDate(date: Date): Promise<any> {
    const [row] = await db.select().from(accountingPeriodsTable)
      .where(
        and(
          sql`${accountingPeriodsTable.startDate} <= ${date}`,
          sql`${accountingPeriodsTable.endDate} >= ${date}`
        )
      )
      .limit(1);
    return row || null;
  }

  static async validateTransactionDate(date: Date, branchId?: number): Promise<PeriodValidation> {
    // If no periods exist, allow transaction
    const anyPeriod = await db.select().from(accountingPeriodsTable).limit(1);
    if (anyPeriod.length === 0) return { valid: true };

    const period = await this.getPeriodByDate(date);
    if (!period) {
      return { valid: false, message: "No accounting period covers this date" };
    }
    if (period.status === "CLOSED") {
      return {
        valid: false,
        period,
        message: "Accounting period has been closed. Reopen period or create adjustment journal."
      };
    }
    return { valid: true, period };
  }

  static async createPeriod(name: string, startDate: Date, endDate: Date): Promise<any> {
    const [row] = await db.insert(accountingPeriodsTable).values({
      name, startDate, endDate, status: "OPEN",
    }).returning();
    return row;
  }

  static async closePeriod(periodId: number, userId?: number, ipAddress?: string): Promise<{ success: boolean; message: string }> {
    const period = await this.getPeriodById(periodId);
    if (!period) return { success: false, message: "Period not found" };
    if (period.status === "CLOSED") return { success: false, message: "Period already closed" };
    if (period.status === "CLOSING") return { success: false, message: "Period is already closing" };

    // Set to CLOSING first
    await db.update(accountingPeriodsTable)
      .set({ status: "CLOSING" })
      .where(eq(accountingPeriodsTable.id, periodId));

    // Create audit log
    await this.writeAuditLog({
      action: "CLOSE_PERIOD",
      userId,
      periodId,
      oldStatus: "OPEN",
      newStatus: "CLOSING",
      ipAddress,
      reason: "Period closing initiated",
    });

    return { success: true, message: "Period closing initiated" };
  }

  static async finalizeClose(periodId: number, snapshotId: number, userId?: number): Promise<any> {
    await db.update(accountingPeriodsTable)
      .set({
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: userId,
        snapshotId,
      })
      .where(eq(accountingPeriodsTable.id, periodId));

    return this.getPeriodById(periodId);
  }

  static async reopenPeriod(periodId: number, reason: string, userId?: number, ipAddress?: string): Promise<{ success: boolean; message: string }> {
    const period = await this.getPeriodById(periodId);
    if (!period) return { success: false, message: "Period not found" };
    if (period.status !== "CLOSED") return { success: false, message: "Only closed periods can be reopened" };

    await db.update(accountingPeriodsTable)
      .set({
        status: "OPEN",
        reopenedAt: new Date(),
        reopenedBy: userId,
      })
      .where(eq(accountingPeriodsTable.id, periodId));

    await this.writeAuditLog({
      action: "REOPEN_PERIOD",
      userId,
      periodId,
      oldStatus: "CLOSED",
      newStatus: "OPEN",
      ipAddress,
      reason,
    });

    return { success: true, message: "Period reopened" };
  }

  static async createSnapshot(periodId: number, data: any): Promise<any> {
    const [row] = await db.insert(financialSnapshotsTable).values({
      periodId,
      branchId: data.branchId || null,
      cash: String(data.cash || 0),
      bank: String(data.bank || 0),
      ewallet: String(data.ewallet || 0),
      inventory: String(data.inventory || 0),
      receivable: String(data.receivable || 0),
      payable: String(data.payable || 0),
      revenue: String(data.revenue || 0),
      cogs: String(data.cogs || 0),
      operatingExpense: String(data.operatingExpense || 0),
      grossProfit: String(data.grossProfit || 0),
      netProfit: String(data.netProfit || 0),
      equity: String(data.equity || 0),
      retainedEarnings: String(data.retainedEarnings || 0),
    }).returning();
    return row;
  }

  static async getSnapshots(periodId?: number): Promise<any[]> {
    const q = db.select().from(financialSnapshotsTable).orderBy(desc(financialSnapshotsTable.createdAt));
    if (periodId) {
      return q.where(eq(financialSnapshotsTable.periodId, periodId));
    }
    return q;
  }

  static async writeAuditLog(params: {
    action: string;
    userId?: number;
    periodId?: number;
    branchId?: number;
    reason?: string;
    ipAddress?: string;
    oldStatus?: string;
    newStatus?: string;
    changes?: string;
  }): Promise<void> {
    await db.insert(financeAuditLogsTable).values({
      action: params.action,
      userId: params.userId || null,
      periodId: params.periodId || null,
      branchId: params.branchId || null,
      reason: params.reason || null,
      ipAddress: params.ipAddress || null,
      oldStatus: params.oldStatus || null,
      newStatus: params.newStatus || null,
      changes: params.changes || null,
    });
  }

  static async getAuditLogs(periodId?: number, limit = 50): Promise<any[]> {
    const q = db.select().from(financeAuditLogsTable).orderBy(desc(financeAuditLogsTable.createdAt)).limit(limit);
    if (periodId) {
      return q.where(eq(financeAuditLogsTable.periodId, periodId));
    }
    return q;
  }
}
