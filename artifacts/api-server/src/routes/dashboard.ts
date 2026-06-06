import { Router } from "express";
import { db, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { eq, gte, lte, and, sum, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

  const [todayStats] = await db
    .select({
      revenue: sum(ordersTable.total),
      orders: count(ordersTable.id),
    })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, today), lte(ordersTable.createdAt, todayEnd)));

  const [yesterdayStats] = await db
    .select({
      revenue: sum(ordersTable.total),
      orders: count(ordersTable.id),
    })
    .from(ordersTable)
    .where(and(gte(ordersTable.createdAt, yesterday), lte(ordersTable.createdAt, yesterdayEnd)));

  const [productCounts] = await db
    .select({ total: count(productsTable.id), lowStock: sql<number>`sum(case when ${productsTable.stock} <= 5 then 1 else 0 end)` })
    .from(productsTable)
    .where(eq(productsTable.isActive, true));

  const todayRevenue = parseFloat(todayStats?.revenue ?? "0");
  const todayOrders = todayStats?.orders ?? 0;
  const yRevenue = parseFloat(yesterdayStats?.revenue ?? "0");
  const yOrders = yesterdayStats?.orders ?? 0;

  res.json({
    todayRevenue,
    todayOrders,
    totalProducts: productCounts?.total ?? 0,
    lowStockCount: Number(productCounts?.lowStock ?? 0),
    todayRevenueDiff: yRevenue > 0 ? ((todayRevenue - yRevenue) / yRevenue) * 100 : 0,
    todayOrdersDiff: yOrders > 0 ? ((todayOrders - yOrders) / yOrders) * 100 : 0,
  });
});

router.get("/dashboard/top-products", async (req, res) => {
  const limit = Number(req.query["limit"] ?? 5);
  const rows = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      totalSold: sum(orderItemsTable.quantity),
      totalRevenue: sum(orderItemsTable.subtotal),
    })
    .from(orderItemsTable)
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

router.get("/dashboard/sales-chart", async (req, res) => {
  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dEnd = new Date(d);
    dEnd.setHours(23, 59, 59, 999);

    const [stats] = await db
      .select({ revenue: sum(ordersTable.total), orders: count(ordersTable.id) })
      .from(ordersTable)
      .where(and(gte(ordersTable.createdAt, d), lte(ordersTable.createdAt, dEnd)));

    days.push({
      date: d.toISOString().split("T")[0],
      revenue: parseFloat(stats?.revenue ?? "0"),
      orders: stats?.orders ?? 0,
    });
  }
  res.json(days);
});

export default router;
