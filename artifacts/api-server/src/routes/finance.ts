import { Router } from "express";
import { db, transactionsTable, journalEntriesTable, ledgerEntriesTable, accountsTable, accountingPeriodsTable } from "@workspace/db";
import { eq, desc, sql, and, inArray, gte, lte, isNull } from "drizzle-orm";
import { requireAuth, requireBranchAccess, canAccessBranch } from "../middlewares/requireAuth";
import {
  initializeDefaultCOA,
  getAllAccounts,
  getAccountByCode,
  getAccountById,
  createTransaction,
  getJournalEntriesByTransaction,
  getLedgerByAccount,
  getAccountBalances,
  generateTrialBalance,
  generateBalanceSheet,
  generateProfitLoss,
  generateCashflow,
  generateEquityStatement,
  getGeneralLedger,
  getTimeline,
  getCashPosition,
  getCashPositionItems,
  createDailySnapshot,
  getDailySnapshots,
  getInsightData,
  getHealthData,
  getExportData,
  generateCSV,
  generateExcel,
  generatePDFPlaceholder,
} from "../finance/services";
import { PeriodManager } from "../finance/services/PeriodManager";
import { ClosingEngine } from "../finance/services/ClosingEngine";
import { ValidationEngine } from "../finance/services/ValidationEngine";
import { AccountingHealthCache } from "../finance/services/AccountingHealthCache";

const router = Router();

router.get("/finance/accounts", requireAuth, async (_req, res) => {
  try {
    await initializeDefaultCOA();
    const accounts = await getAllAccounts();
    return res.json(accounts);
  } catch (err: any) {
    console.error("GET /finance/accounts error:", err);
    return res.status(500).json({ error: "Gagal mengambil data akun" });
  }
});

router.get("/finance/accounts/:code", requireAuth, async (req, res) => {
  try {
    const account = await getAccountByCode(req.params["code"]);
    if (!account) return res.status(404).json({ error: "Akun tidak ditemukan" });
    return res.json(account);
  } catch (err: any) {
    console.error("GET /finance/accounts/:code error:", err);
    return res.status(500).json({ error: "Gagal mengambil data akun" });
  }
});

router.post("/finance/transactions", requireAuth, requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, type, category, description, amount, accountId, referenceType, referenceId, referenceCode, sourceModule, notes, date } = req.body;

    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });
    if (!type) return res.status(400).json({ error: "type wajib diisi" });
    if (!category) return res.status(400).json({ error: "category wajib diisi" });
    if (!description) return res.status(400).json({ error: "description wajib diisi" });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "amount harus lebih dari 0" });

    // Pre-posting validation
    const postingValidation = await ValidationEngine.validatePrePosting({
      branchId: Number(branchId),
      category: String(category),
      amount: Number(amount),
      accountId: accountId ? Number(accountId) : undefined,
      date: date ? new Date(String(date)) : new Date(),
    });

    if (!postingValidation.valid) {
      return res.status(400).json({
        error: "Transaksi ditolak — validasi gagal",
        validationErrors: postingValidation.errors,
      });
    }

    const result = await createTransaction({
      branchId: Number(branchId),
      type: String(type),
      category: String(category),
      description: String(description).trim(),
      amount: Number(amount),
      accountId: accountId ? Number(accountId) : undefined,
      referenceType: referenceType ? String(referenceType) : undefined,
      referenceId: referenceId ? Number(referenceId) : undefined,
      referenceCode: referenceCode ? String(referenceCode) : undefined,
      sourceModule: sourceModule ? String(sourceModule) : undefined,
      notes: notes ? String(notes).trim() : undefined,
      createdBy: req.user?.id ? Number(req.user.id) : undefined,
    });

    AccountingHealthCache.invalidate();
    return res.status(201).json(result);
  } catch (err: any) {
    console.error("POST /finance/transactions error:", err);
    return res.status(500).json({ error: err.message || "Gagal membuat transaksi" });
  }
});

// Void a transaction (set status to voided, proper accounting)
router.patch("/finance/transactions/:id/void", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Transaction not found" });
    if (existing.status === "voided") return res.status(400).json({ error: "Already voided" });
    if (existing.referenceType === "order") return res.status(400).json({ error: "Cannot void POS orders, void the order instead" });

    await db.update(transactionsTable)
      .set({ status: "voided", notes: (existing.notes ? existing.notes + " | " : "") + "Voided by user", updatedAt: new Date() })
      .where(eq(transactionsTable.id, id));

    // Create reversal journal entries (swap debit/credit to cancel original)
    const originalJournals = await db.select().from(journalEntriesTable).where(eq(journalEntriesTable.transactionId, id));
    for (const je of originalJournals) {
      const [reversal] = await db.insert(journalEntriesTable).values({
        transactionId: id,
        accountId: je.accountId,
        debit: je.credit,  // swap debit ↔ credit
        credit: je.debit,
        description: "REVERSAL: " + (je.description || existing.description),
      }).returning();

      // Update ledger for reversal
      const [lastLedger] = await db.select()
        .from(ledgerEntriesTable)
        .where(eq(ledgerEntriesTable.accountId, je.accountId))
        .orderBy(sql`${ledgerEntriesTable.id} DESC`)
        .limit(1);
      const prevBalance = lastLedger ? parseFloat(lastLedger.runningBalance) : 0;
      const revDebit = parseFloat(reversal.debit);
      const revCredit = parseFloat(reversal.credit);

      // Get account's normal balance
      const acct = await getAccountById(je.accountId);
      const isDebitNormal = acct?.normalBalance === "debit";
      const newBalance = isDebitNormal ? prevBalance + revDebit - revCredit : prevBalance - revDebit + revCredit;

      await db.insert(ledgerEntriesTable).values({
        accountId: je.accountId,
        journalEntryId: reversal.id,
        transactionId: id,
        date: new Date(),
        description: "REVERSAL: " + (je.description || existing.description),
        debit: reversal.debit,
        credit: reversal.credit,
        runningBalance: String(newBalance),
      });
    }

    await PeriodManager.writeAuditLog({
      action: "VOID_TRANSACTION", userId: req.user?.id,
      periodId: undefined, reason: `Voided transaction #${id}: ${existing.description}`,
      changes: JSON.stringify({ id, amount: existing.amount, category: existing.category }),
    });

    AccountingHealthCache.invalidate();
    return res.json({ success: true, message: "Transaction voided" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/finance/transactions", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    if (branchId && !(await canAccessBranch(req, branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(branchId ? eq(transactionsTable.branchId, branchId) : undefined)
      .orderBy(desc(transactionsTable.createdAt));

    return res.json(rows);
  } catch (err: any) {
    console.error("GET /finance/transactions error:", err);
    return res.status(500).json({ error: "Gagal mengambil data transaksi" });
  }
});

router.get("/finance/journal/:transactionId", requireAuth, async (req, res) => {
  try {
    const transactionId = Number(req.params["transactionId"]);
    if (isNaN(transactionId)) return res.status(400).json({ error: "ID tidak valid" });

    const entries = await getJournalEntriesByTransaction(transactionId);
    return res.json(entries);
  } catch (err: any) {
    console.error("GET /finance/journal/:transactionId error:", err);
    return res.status(500).json({ error: "Gagal mengambil data jurnal" });
  }
});

router.get("/finance/ledger/:accountId", requireAuth, async (req, res) => {
  try {
    const accountId = Number(req.params["accountId"]);
    if (isNaN(accountId)) return res.status(400).json({ error: "ID tidak valid" });

    const entries = await getLedgerByAccount(accountId);
    return res.json(entries);
  } catch (err: any) {
    console.error("GET /finance/ledger/:accountId error:", err);
    return res.status(500).json({ error: "Gagal mengambil data ledger" });
  }
});

function parseReportFilters(req: any) {
  const branchIdsRaw = req.query["branchIds"] as string | undefined;
  const branchIds = branchIdsRaw ? branchIdsRaw.split(",").map(Number).filter(n => !isNaN(n)) : undefined;
  const startDate = req.query["startDate"] ? new Date(req.query["startDate"] as string) : undefined;
  const endDate = req.query["endDate"] ? new Date(req.query["endDate"] as string + "T23:59:59.999Z") : undefined;
  return { branchIds, startDate, endDate };
}

router.get("/finance/balances", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const balances = await getAccountBalances(filters);
    return res.json(balances);
  } catch (err: any) {
    console.error("GET /finance/balances error:", err);
    return res.status(500).json({ error: "Gagal mengambil data saldo" });
  }
});

router.get("/finance/trial-balance", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const trialBalance = await generateTrialBalance(filters);
    return res.json(trialBalance);
  } catch (err: any) {
    console.error("GET /finance/trial-balance error:", err);
    return res.status(500).json({ error: "Gagal mengambil data trial balance" });
  }
});

router.get("/finance/balance-sheet", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const balanceSheet = await generateBalanceSheet(filters);
    return res.json(balanceSheet);
  } catch (err: any) {
    console.error("GET /finance/balance-sheet error:", err);
    return res.status(500).json({ error: "Gagal mengambil data balance sheet" });
  }
});

router.get("/finance/profit-loss", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const profitLoss = await generateProfitLoss(filters);
    return res.json(profitLoss);
  } catch (err: any) {
    console.error("GET /finance/profit-loss error:", err);
    return res.status(500).json({ error: "Gagal mengambil data profit loss" });
  }
});

router.get("/finance/cashflow", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const cashflow = await generateCashflow(filters);
    return res.json(cashflow);
  } catch (err: any) {
    console.error("GET /finance/cashflow error:", err);
    return res.status(500).json({ error: "Gagal mengambil data cashflow" });
  }
});

router.get("/finance/general-ledger", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const accountId = req.query["accountId"] ? parseInt(req.query["accountId"] as string) : undefined;
    const ledger = await getGeneralLedger({ ...filters, accountId });
    return res.json(ledger);
  } catch (err: any) {
    console.error("GET /finance/general-ledger error:", err);
    return res.status(500).json({ error: "Gagal mengambil data general ledger" });
  }
});

router.get("/finance/equity-statement", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const equityStmt = await generateEquityStatement(filters);
    return res.json(equityStmt);
  } catch (err: any) {
    console.error("GET /finance/equity-statement error:", err);
    return res.status(500).json({ error: "Gagal mengambil data equity statement" });
  }
});

router.get("/finance/dashboard", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const branchIdsRaw = req.query["branchIds"] as string | undefined;
    const branchIds = branchIdsRaw ? branchIdsRaw.split(",").map(Number).filter(n => !isNaN(n)) : undefined;
    const startDate = req.query["startDate"] ? new Date(req.query["startDate"] as string) : undefined;
    const endDate = req.query["endDate"] ? new Date(req.query["endDate"] as string + "T23:59:59.999Z") : undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build where clause for branch+date filtering
    const dateStart = startDate || today;
    const dateEnd = endDate || undefined;
    const condBranch: any[] = [];
    if (branchIds && branchIds.length > 0) {
      condBranch.push(inArray(transactionsTable.branchId, branchIds));
    } else if (branchId) {
      condBranch.push(sql`${transactionsTable.branchId} = ${branchId}`);
    }
    // Exclude voided transactions
    condBranch.push(sql`${transactionsTable.status} != 'voided'`);
    const branchCond = condBranch.length > 0 ? and(...condBranch) : undefined;

    const baseWhere = and(
      branchCond,
      gte(transactionsTable.createdAt, dateStart),
      dateEnd ? lte(transactionsTable.createdAt, dateEnd) : undefined,
    );

    const [todayTransactions, allIncomeResult, allExpenseResult, balances] = await Promise.all([
      db.select().from(transactionsTable).where(baseWhere),
      // Income filtered by same branch+date
      db
        .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.type, "income"), branchCond, gte(transactionsTable.createdAt, dateStart), dateEnd ? lte(transactionsTable.createdAt, dateEnd) : undefined)),
      // Expenses by category, filtered by same branch+date
      db
        .select({
          category: transactionsTable.category,
          total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)`,
        })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.type, "expense"), branchCond, gte(transactionsTable.createdAt, dateStart), dateEnd ? lte(transactionsTable.createdAt, dateEnd) : undefined))
        .groupBy(transactionsTable.category),
      getAccountBalances(),
    ]);

    const todayIncome = parseFloat(allIncomeResult[0]?.total || "0");

    // All-branch COGS
    const allCOGSResult = allExpenseResult.find(r => r.category === "cogs");
    const todayCOGS = parseFloat(allCOGSResult?.total || "0");

    // All-branch operating expenses
    const todayOperatingExpense = allExpenseResult
      .filter(r => r.category !== "cogs")
      .reduce((sum, r) => sum + parseFloat(r.total || "0"), 0);

    const todayExpense = todayCOGS + todayOperatingExpense;

    const cashAccount = balances.find((b) => b.accountCode === "1000");
    const bankAccount = balances.find((b) => b.accountCode === "1100");
    const ewalletAccount = balances.find((b) => b.accountCode === "1250");
    const arAccount = balances.find((b) => b.accountCode === "1300");
    const apAccount = balances.find((b) => b.accountCode === "2000");

    const cashBalance = (cashAccount?.balance || 0)
      + (bankAccount?.balance || 0)
      + (ewalletAccount?.balance || 0);

    const cashPosition = {
      cash: cashAccount?.balance || 0,
      bank: bankAccount?.balance || 0,
      eWallet: ewalletAccount?.balance || 0,
      accountsReceivable: arAccount?.balance || 0,
      accountsPayable: apAccount?.balance || 0,
      total: (cashAccount?.balance || 0) + (bankAccount?.balance || 0) + (ewalletAccount?.balance || 0) + (arAccount?.balance || 0) - (apAccount?.balance || 0),
    };

    const [healthData, insightData, currentPeriod, accountingHealth] = await Promise.all([
      branchId ? getHealthData(branchId, { cash: cashAccount?.balance || 0, bank: bankAccount?.balance || 0, ewallet: ewalletAccount?.balance || 0 }) : null,
      branchId ? getInsightData(branchId) : null,
      PeriodManager.getCurrentPeriod(),
      AccountingHealthCache.get({ branchIds: branchIds || (branchId ? [branchId] : undefined) }).catch(() => null),
    ]);

    return res.json({
      cashBalance,
      todayIncome,
      todayCOGS,
      todayOperatingExpense,
      todayExpense,
      profitToday: todayIncome - todayCOGS - todayOperatingExpense,
      hasData: todayTransactions.length > 0,
      accountingPeriod: currentPeriod ? {
        id: currentPeriod.id,
        name: currentPeriod.name,
        startDate: currentPeriod.startDate,
        endDate: currentPeriod.endDate,
        status: currentPeriod.status,
        remainingDays: currentPeriod.status === "OPEN"
          ? Math.max(0, Math.ceil((new Date(currentPeriod.endDate).getTime() - Date.now()) / 86400000))
          : 0,
      } : null,
      cashPosition,
      health: healthData,
      insight: insightData,
      accountingHealth,
    });
  } catch (err: any) {
    console.error("GET /finance/dashboard error:", err);
    return res.status(500).json({ error: "Gagal mengambil data dashboard" });
  }
});

router.get("/finance/timeline", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const search = req.query["search"] as string | undefined;
    const category = req.query["category"] as string | undefined;
    const startDate = req.query["startDate"] ? new Date(req.query["startDate"] as string) : undefined;
    const endDate = req.query["endDate"] ? new Date(req.query["endDate"] as string) : undefined;
    const page = req.query["page"] ? Number(req.query["page"]) : 1;
    const limit = req.query["limit"] ? Number(req.query["limit"]) : 20;

    if (branchId && !(await canAccessBranch(req, branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    const result = await getTimeline({
      branchId,
      search,
      category,
      startDate,
      endDate,
      page,
      limit,
    });

    return res.json(result);
  } catch (err: any) {
    console.error("GET /finance/timeline error:", err);
    return res.status(500).json({ error: "Gagal mengambil data timeline" });
  }
});

router.get("/finance/cash-position", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const position = await getCashPosition(branchId);
    const items = await getCashPositionItems(branchId);
    return res.json({ position, items });
  } catch (err: any) {
    console.error("GET /finance/cash-position error:", err);
    return res.status(500).json({ error: "Gagal mengambil data cash position" });
  }
});

router.get("/finance/health", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });

    const health = await getHealthData(branchId);
    return res.json(health);
  } catch (err: any) {
    console.error("GET /finance/health error:", err);
    return res.status(500).json({ error: "Gagal mengambil data health" });
  }
});

router.get("/finance/insight", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });

    const insight = await getInsightData(branchId);
    return res.json(insight);
  } catch (err: any) {
    console.error("GET /finance/insight error:", err);
    return res.status(500).json({ error: "Gagal mengambil data insight" });
  }
});

router.get("/finance/snapshots", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const days = req.query["days"] ? Number(req.query["days"]) : 30;

    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });
    if (!(await canAccessBranch(req, branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    const snapshots = await getDailySnapshots(branchId, days);
    return res.json(snapshots);
  } catch (err: any) {
    console.error("GET /finance/snapshots error:", err);
    return res.status(500).json({ error: "Gagal mengambil data snapshots" });
  }
});

router.post("/finance/snapshots", requireAuth, requireBranchAccess((req) => Number(req.body.branchId)), async (req, res) => {
  try {
    const { branchId, date } = req.body;
    if (!branchId) return res.status(400).json({ error: "branchId wajib diisi" });

    const snapshot = await createDailySnapshot(Number(branchId), date ? new Date(date) : undefined);
    return res.status(201).json(snapshot);
  } catch (err: any) {
    console.error("POST /finance/snapshots error:", err);
    return res.status(500).json({ error: "Gagal membuat snapshot" });
  }
});

router.get("/finance/export", requireAuth, async (req, res) => {
  try {
    const branchId = req.query["branchId"] ? Number(req.query["branchId"]) : undefined;
    const startDate = req.query["startDate"] ? new Date(req.query["startDate"] as string) : undefined;
    const endDate = req.query["endDate"] ? new Date(req.query["endDate"] as string) : undefined;
    const category = req.query["category"] as string | undefined;
    const type = req.query["type"] as string | undefined;
    const format = (req.query["format"] as string) || "csv";

    if (branchId && !(await canAccessBranch(req, branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    const data = await getExportData({ branchId, startDate, endDate, category, type });

    if (format === "csv") {
      const csv = generateCSV(data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=finance-export.csv");
      return res.send(csv);
    } else if (format === "excel") {
      const excel = generateExcel(data);
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Content-Disposition", "attachment; filename=finance-export.xml");
      return res.send(excel);
    } else if (format === "pdf") {
      const pdf = generatePDFPlaceholder(data);
      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", "attachment; filename=finance-export.html");
      return res.send(pdf);
    }

    return res.json(data);
  } catch (err: any) {
    console.error("GET /finance/export error:", err);
    return res.status(500).json({ error: "Gagal mengambil data export" });
  }
});

// ── T14B: Accounting Period Management ──

router.get("/finance/periods", requireAuth, async (_req, res) => {
  try {
    const periods = await PeriodManager.getAllPeriods();
    const current = await PeriodManager.getCurrentPeriod();
    return res.json({ periods, currentPeriod: current });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/finance/periods", requireAuth, async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: "name, startDate, endDate required" });
    }
    const period = await PeriodManager.createPeriod(name, new Date(startDate), new Date(endDate));
    await PeriodManager.writeAuditLog({
      action: "CREATE_PERIOD", userId: req.user?.id,
      periodId: period.id, reason: `Created ${name}`,
    });
    return res.status(201).json(period);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/finance/periods/:id/close", requireAuth, async (req, res) => {
  try {
    const periodId = parseInt(req.params.id);
    const result = await PeriodManager.closePeriod(periodId, req.user?.id);
    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/finance/periods/:id/execute-closing", requireAuth, async (req, res) => {
  try {
    const periodId = parseInt(req.params.id);
    const result = await ClosingEngine.executeClosing(periodId, req.user?.id);
    if (!result.success) return res.status(400).json(result);
    AccountingHealthCache.invalidate();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/finance/periods/:id/validate-closing", requireAuth, async (req, res) => {
  try {
    const periodId = parseInt(req.params.id);
    const validation = await ClosingEngine.validatePeriod(periodId);
    return res.json(validation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/finance/periods/:id/reopen", requireAuth, async (req, res) => {
  try {
    const periodId = parseInt(req.params.id);
    const { reason } = req.body;
    const result = await PeriodManager.reopenPeriod(periodId, reason || "Manual reopen", req.user?.id);
    if (!result.success) return res.status(400).json(result);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/finance/snapshots", requireAuth, async (req, res) => {
  try {
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : undefined;
    const snapshots = await PeriodManager.getSnapshots(periodId);
    return res.json(snapshots);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/finance/audit-logs", requireAuth, async (req, res) => {
  try {
    const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : undefined;
    const logs = await PeriodManager.getAuditLogs(periodId);
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── T15: Accounting Validation Engine ──

router.get("/finance/validation", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const report = await ValidationEngine.runFullValidation(filters);
    return res.json(report);
  } catch (err: any) {
    console.error("GET /finance/validation error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/finance/validation/issues", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const report = await ValidationEngine.runFullValidation(filters);
    const issues = report.checks.filter((c) => c.status !== "passed");
    return res.json({ issues, summary: report.summary, overallScore: report.overallScore });
  } catch (err: any) {
    console.error("GET /finance/validation/issues error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/finance/validation/run", requireAuth, async (req, res) => {
  try {
    const { branchIds, startDate, endDate, periodId } = req.body || {};
    const filters: any = {};
    if (branchIds) filters.branchIds = Array.isArray(branchIds) ? branchIds : [branchIds];
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (periodId) {
      const period = await PeriodManager.getPeriodById(periodId);
      if (period) {
        filters.startDate = period.startDate;
        filters.endDate = period.endDate;
      }
    }
    const report = await ValidationEngine.runFullValidation(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    return res.json(report);
  } catch (err: any) {
    console.error("POST /finance/validation/run error:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/finance/validation/fix", requireAuth, async (req, res) => {
  try {
    const { issueNames } = req.body || {};
    const namesToFix: string[] = issueNames
      ? (Array.isArray(issueNames) ? issueNames : [issueNames])
      : [];

    const filters = req.body?.periodId
      ? { startDate: (await PeriodManager.getPeriodById(req.body.periodId))?.startDate, endDate: undefined }
      : undefined;

    const report = await ValidationEngine.runFullValidation(filters);
    const fixable = report.checks.filter(
      (c) => c.status !== "passed" && c.autoFix && (namesToFix.length === 0 || namesToFix.includes(c.name))
    );

    const fixes: { name: string; success: boolean; detail: string }[] = [];

    for (const issue of fixable) {
      try {
        if (issue.name === "Orphan Journal Entries") {
          await db.execute(sql`
            DELETE FROM ${journalEntriesTable}
            WHERE ${journalEntriesTable.transactionId} NOT IN (
              SELECT id FROM ${transactionsTable}
            )
          `);
          fixes.push({ name: issue.name, success: true, detail: "Orphan journal entries deleted" });
        } else if (issue.name === "Orphan Ledger Entries") {
          await db.execute(sql`
            DELETE FROM ${ledgerEntriesTable}
            WHERE ${ledgerEntriesTable.journalEntryId} NOT IN (
              SELECT id FROM ${journalEntriesTable}
            )
          `);
          fixes.push({ name: issue.name, success: true, detail: "Orphan ledger entries deleted" });
        } else if (issue.name === "Zero-Amount Journal Entries") {
          await db.execute(sql`
            DELETE FROM ${journalEntriesTable}
            WHERE ${journalEntriesTable.debit}::numeric = 0
            AND ${journalEntriesTable.credit}::numeric = 0
          `);
          fixes.push({ name: issue.name, success: true, detail: "Zero-amount journal entries deleted" });
        } else if (issue.name === "Missing Ledger Posting") {
          // Recreate ledger entries from journal entries that are missing them
          await db.execute(sql`
            INSERT INTO ${ledgerEntriesTable} (account_id, journal_entry_id, transaction_id, date, description, debit, credit, running_balance)
            SELECT
              je.account_id, je.id, je.transaction_id,
              COALESCE(t.created_at, NOW()), je.description, je.debit, je.credit,
              COALESCE((
                SELECT SUM(
                  CASE WHEN a.normal_balance = 'debit'
                    THEN le2.debit::numeric - le2.credit::numeric
                    ELSE le2.credit::numeric - le2.debit::numeric
                  END
                ) FROM ${ledgerEntriesTable} le2
                JOIN ${accountsTable} a ON a.id = le2.account_id
                WHERE le2.account_id = je.account_id
                AND le2.id < COALESCE((SELECT MAX(le3.id) FROM ${ledgerEntriesTable} le3 WHERE le3.account_id = je.account_id), 0)
              ), 0) + CASE WHEN a.normal_balance = 'debit'
                THEN je.debit::numeric - je.credit::numeric
                ELSE je.credit::numeric - je.debit::numeric
              END
            FROM ${journalEntriesTable} je
            JOIN ${accountsTable} a ON a.id = je.account_id
            LEFT JOIN ${transactionsTable} t ON t.id = je.transaction_id
            LEFT JOIN ${ledgerEntriesTable} le ON le.journal_entry_id = je.id
            WHERE le.id IS NULL
          `);
          fixes.push({ name: issue.name, success: true, detail: "Missing ledger postings recreated" });
        } else if (issue.name === "Closing Integrity") {
          // Regenerate snapshots for closed periods missing them
          const closedPeriods = await db
            .select({ id: accountingPeriodsTable.id, name: accountingPeriodsTable.name })
            .from(accountingPeriodsTable)
            .where(
              and(
                eq(accountingPeriodsTable.status, "CLOSED"),
                isNull(accountingPeriodsTable.snapshotId),
              )
            );
          for (const p of closedPeriods) {
            await ClosingEngine.executeClosing(p.id, req.user?.id);
          }
          fixes.push({ name: issue.name, success: true, detail: `Snapshots regenerated for ${closedPeriods.length} periods` });
        } else {
          fixes.push({ name: issue.name, success: false, detail: "No auto-fix implementation for this issue" });
        }
      } catch (fixErr: any) {
        fixes.push({ name: issue.name, success: false, detail: fixErr.message });
      }
    }

    // Re-run validation after fixes to get updated report
    const updatedReport = await ValidationEngine.runFullValidation(filters);

    return res.json({
      fixes,
      total: fixes.length,
      successful: fixes.filter((f) => f.success).length,
      updatedReport,
    });
  } catch (err: any) {
    console.error("POST /finance/validation/fix error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ── Accounting Health ──

router.get("/finance/accounting-health", requireAuth, async (req, res) => {
  try {
    const filters = parseReportFilters(req);
    const health = await AccountingHealthCache.get(filters);
    return res.json(health);
  } catch (err: any) {
    console.error("GET /finance/accounting-health error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Transaction date validation middleware
router.use("/finance/transactions", async (req, res, next) => {
  if (req.method === "POST" && req.body) {
    try {
      const date = req.body.date ? new Date(req.body.date) : new Date();
      const branchId = req.body.branchId;
      const validation = await PeriodManager.validateTransactionDate(date, branchId);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.message });
      }
      // Attach periodId to the transaction
      if (validation.period) {
        (req as any).financePeriod = validation.period;
      }
    } catch (err) {
      // Continue without validation if period system fails
    }
  }
  next();
});

export default router;
