import { Router } from "express";
import { db, ordersTable, orderItemsTable, productsTable, usersTable, expensesTable } from "@workspace/db";
import { eq, gte, lte, and, sum, count, sql, type SQL } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

function branchFilter(req: { query: Record<string, unknown> }): SQL | undefined {
  const raw = req.query["branchId"];
  if (raw === undefined || raw === null || raw === "") return undefined;
  return eq(ordersTable.branchId, Number(raw));
}

function branchId(req: { query: Record<string, unknown> }): number | undefined {
  const raw = req.query["branchId"];
  if (raw === undefined || raw === null || raw === "") return undefined;
  return Number(raw);
}

router.get("/dashboard/summary", requireRole("owner", "manager"), async (req, res) => {
  const startDateStr = req.query["startDate"] as string | undefined;
  const endDateStr = req.query["endDate"] as string | undefined;

  const currentStart = startDateStr ? new Date(startDateStr) : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
  const currentEnd = endDateStr ? new Date(endDateStr) : (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })();
  if (!startDateStr) currentStart.setHours(0, 0, 0, 0);
  if (endDateStr) currentEnd.setHours(23, 59, 59, 999);
  else currentEnd.setHours(23, 59, 59, 999);

  const periodMs = currentEnd.getTime() - currentStart.getTime() + 1;
  const prevStart = new Date(currentStart.getTime() - periodMs);
  const prevEnd = new Date(currentStart.getTime() - 1);

  const branch = branchFilter(req);
  const expBranch = branchId(req);

  const [currentStats] = await db
    .select({ revenue: sum(ordersTable.total), orders: count(ordersTable.id) })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, currentStart), lte(ordersTable.createdAt, currentEnd), branch));

  const [prevStats] = await db
    .select({ revenue: sum(ordersTable.total), orders: count(ordersTable.id) })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, prevStart), lte(ordersTable.createdAt, prevEnd), branch));

  const [productCounts] = await db
    .select({ total: count(productsTable.id) })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const [currentExp] = await db
    .select({ total: sum(expensesTable.amount) })
    .from(expensesTable)
    .where(and(
      gte(expensesTable.createdAt, currentStart),
      lte(expensesTable.createdAt, currentEnd),
      expBranch ? eq(expensesTable.branchId, expBranch) : undefined,
    ));

  const [prevExp] = await db
    .select({ total: sum(expensesTable.amount) })
    .from(expensesTable)
    .where(and(
      gte(expensesTable.createdAt, prevStart),
      lte(expensesTable.createdAt, prevEnd),
      expBranch ? eq(expensesTable.branchId, expBranch) : undefined,
    ));

  const currentRevenue = parseFloat(currentStats?.revenue ?? "0");
  const currentOrders = currentStats?.orders ?? 0;
  const prevRevenue = parseFloat(prevStats?.revenue ?? "0");
  const prevOrders = prevStats?.orders ?? 0;
  const currentExpenses = parseFloat(currentExp?.total ?? "0");
  const prevExpenses = parseFloat(prevExp?.total ?? "0");

  res.json({
    todayRevenue: currentRevenue,
    todayOrders: currentOrders,
    todayExpenses: currentExpenses,
    totalProducts: productCounts?.total ?? 0,
    lowStockCount: 0,
    todayRevenueDiff: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
    todayOrdersDiff: prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0,
    todayExpensesDiff: prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0,
  });
});

router.get("/dashboard/top-products", requireRole("owner", "manager"), async (req, res) => {
  const limit = Number(req.query["limit"] ?? 5);
  const branch = branchFilter(req);
  const startDate = req.query["startDate"] ? new Date(String(req.query["startDate"])) : undefined;
  const endDate = req.query["endDate"] ? new Date(String(req.query["endDate"])) : undefined;

  const conditions: any[] = [branch];
  if (startDate) { startDate.setHours(0,0,0,0); conditions.push(gte(ordersTable.createdAt, startDate)); }
  if (endDate) { endDate.setHours(23,59,59,999); conditions.push(lte(ordersTable.createdAt, endDate)); }

  const rows = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      totalSold: sum(orderItemsTable.quantity),
      totalRevenue: sum(orderItemsTable.subtotal),
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
    .where(and(...conditions))
    .groupBy(orderItemsTable.productId, orderItemsTable.productName)
    .orderBy(sql`sum(${orderItemsTable.quantity}) desc`)
    .limit(limit);

  res.json(
    rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalSold: Number(r.totalSold ?? 0),
      totalRevenue: parseFloat(r.totalRevenue ?? "0"),
    }))
  );
});

router.get("/dashboard/sales-chart", requireRole("owner", "manager"), async (req, res) => {
  const branch = branchFilter(req);
  const expBranch = branchId(req);
  const startDate = req.query["startDate"] ? new Date(String(req.query["startDate"])) : undefined;
  const endDate = req.query["endDate"] ? new Date(String(req.query["endDate"])) : undefined;

  if (!startDate && !endDate) {
    // fallback 7 hari
    const s = new Date(Date.now() - 6 * 86400000); s.setHours(0,0,0,0);
    const e = new Date(); e.setHours(23,59,59,999);
    return res.json(await getDailyChart(branch, expBranch, s, e));
  }

  const s = new Date(startDate!); s.setHours(0,0,0,0);
  const e = endDate ? new Date(endDate) : new Date(); e.setHours(23,59,59,999);
  const diffMs = e.getTime() - s.getTime();

  if (diffMs <= 86400000) {
    // daily view → hourly
    return res.json(await getHourlyChart(branch, expBranch, s));
  }
  return res.json(await getDailyChart(branch, expBranch, s, e));
});

async function getDailyChart(branch: SQL | undefined, expBranch: number | undefined, start: Date, end: Date) {
  const days: { date: string; revenue: number; orders: number; expenses: number }[] = [];
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  for (let i = 0; i <= diffDays; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
    const [stats] = await db
      .select({ revenue: sum(ordersTable.total), orders: count(ordersTable.id) })
      .from(ordersTable)
      .where(and(gte(ordersTable.createdAt, d), lte(ordersTable.createdAt, dEnd), branch));
    const [exp] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(gte(expensesTable.createdAt, d), lte(expensesTable.createdAt, dEnd), expBranch ? eq(expensesTable.branchId, expBranch) : undefined));
    days.push({ date: d.toISOString().split("T")[0], revenue: parseFloat(stats?.revenue ?? "0"), orders: stats?.orders ?? 0, expenses: parseFloat(exp?.total ?? "0") });
  }
  return days;
}

async function getHourlyChart(branch: SQL | undefined, expBranch: number | undefined, day: Date) {
  const hours: { date: string; revenue: number; orders: number; expenses: number }[] = [];
  for (let h = 0; h < 24; h++) {
    const start = new Date(day); start.setHours(h, 0, 0, 0);
    const end = new Date(day); end.setHours(h, 59, 59, 999);
    const [stats] = await db
      .select({ revenue: sum(ordersTable.total), orders: count(ordersTable.id) })
      .from(ordersTable)
      .where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), branch));
    const [exp] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), expBranch ? eq(expensesTable.branchId, expBranch) : undefined));
    hours.push({ date: `${day.toISOString().split("T")[0]}T${String(h).padStart(2,"0")}:00`, revenue: parseFloat(stats?.revenue ?? "0"), orders: stats?.orders ?? 0, expenses: parseFloat(exp?.total ?? "0") });
  }
  return hours;
}

router.get("/dashboard/cashier-performance", requireRole("owner", "manager"), async (req, res) => {
  const branch = branchFilter(req);
  const startDate = req.query["startDate"] ? new Date(String(req.query["startDate"])) : undefined;
  const endDate = req.query["endDate"] ? new Date(String(req.query["endDate"])) : undefined;

  const conditions: any[] = [sql`${ordersTable.cashierId} is not null`, branch];
  if (startDate) { startDate.setHours(0,0,0,0); conditions.push(gte(ordersTable.createdAt, startDate)); }
  if (endDate) { endDate.setHours(23,59,59,999); conditions.push(lte(ordersTable.createdAt, endDate)); }

  const rows = await db
    .select({
      cashierId: ordersTable.cashierId,
      cashierName: ordersTable.cashierName,
      totalOrders: count(ordersTable.id),
      totalRevenue: sum(ordersTable.total),
    })
    .from(ordersTable)
    .where(and(...conditions))
    .groupBy(ordersTable.cashierId, ordersTable.cashierName)
    .orderBy(sql`sum(${ordersTable.total}) desc`);

  res.json(
    rows.map((r) => ({
      cashierId: r.cashierId!,
      cashierName: r.cashierName ?? "Unknown",
      totalOrders: r.totalOrders,
      totalRevenue: parseFloat(r.totalRevenue ?? "0"),
    }))
  );
});

router.get("/dashboard/financial", requireRole("owner", "manager"), async (req, res) => {
  const branch = branchFilter(req);
  const expBranch = branchId(req);
  const startDate = req.query["startDate"] ? new Date(String(req.query["startDate"])) : undefined;
  const endDate = req.query["endDate"] ? new Date(String(req.query["endDate"])) : undefined;
  const start = startDate || (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
  const end = endDate || (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();
  if (!startDate) start.setHours(0, 0, 0, 0);

  const [stats] = await db
    .select({
      grossRevenue: sum(ordersTable.total),
      totalCogs: sum(ordersTable.totalCogs),
    })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), branch));

  const [expStats] = await db
    .select({ total: sum(expensesTable.amount) })
    .from(expensesTable)
    .where(and(
      gte(expensesTable.createdAt, start),
      lte(expensesTable.createdAt, end),
      expBranch ? eq(expensesTable.branchId, expBranch) : undefined,
    ));

  const grossRevenue = parseFloat(stats?.grossRevenue ?? "0");
  const totalCogs = parseFloat(stats?.totalCogs ?? "0");
  const totalExpenses = parseFloat(expStats?.total ?? "0");
  const grossProfit = grossRevenue - totalCogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;
  const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  res.json({ grossRevenue, totalCogs, totalExpenses, grossProfit, netProfit, grossMarginPct, netMarginPct });
});

// Detail barang terjual per produk + varian
router.get("/dashboard/sold-items", requireRole("owner", "manager"), async (req, res) => {
  try {
    const branch = branchFilter(req);
    const startDate = req.query["startDate"] ? new Date(String(req.query["startDate"])) : undefined;
    const endDate = req.query["endDate"] ? new Date(String(req.query["endDate"])) : undefined;
    const start = startDate || (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
    const end = endDate || (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();
    if (!startDate) start.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        productId: orderItemsTable.productId,
        productName: orderItemsTable.productName,
        variantId: orderItemsTable.productVariantId,
        totalSold: sum(orderItemsTable.quantity),
        totalRevenue: sum(orderItemsTable.subtotal),
      })
      .from(orderItemsTable)
      .innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), branch))
      .groupBy(
        orderItemsTable.productId,
        orderItemsTable.productName,
        orderItemsTable.productVariantId,
      )
      .orderBy(sql`sum(${orderItemsTable.quantity}) desc`);

    // Ambil nama varian
    const variantIds = rows
      .map((r) => r.variantId)
      .filter((v): v is number => v != null);

    let variantNames: Record<number, string> = {};
    if (variantIds.length > 0) {
      const { productVariantsTable } = await import("@workspace/db");
      const { inArray } = await import("drizzle-orm");
      const variants = await db
        .select({ id: productVariantsTable.id, name: productVariantsTable.name })
        .from(productVariantsTable)
        .where(inArray(productVariantsTable.id, variantIds));
      variantNames = Object.fromEntries(variants.map((v) => [v.id, v.name]));
    }

    res.json(rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      variantId: r.variantId ?? null,
      variantName: r.variantId ? (variantNames[r.variantId] ?? null) : null,
      totalSold: Number(r.totalSold ?? 0),
      totalRevenue: parseFloat(r.totalRevenue ?? "0"),
    })));
  } catch (err) {
    console.error("GET /dashboard/sold-items error:", err);
    res.status(500).json({ error: "Gagal mengambil data barang terjual" });
  }
});

export default router;
