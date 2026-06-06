import { Router } from "express";
import { db, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const toOrder = (row: typeof ordersTable.$inferSelect & { itemCount?: number }) => ({
  id: row.id,
  cashierName: row.cashierName,
  cashierId: row.cashierId,
  total: parseFloat(row.total),
  amountPaid: parseFloat(row.amountPaid),
  change: parseFloat(row.change),
  paymentMethod: row.paymentMethod,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  itemCount: row.itemCount ?? 0,
});

router.get("/orders", requireAuth, async (req, res) => {
  const { date, status } = req.query as { date?: string; status?: string };
  const conditions = [];
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(ordersTable.createdAt, start));
    conditions.push(lte(ordersTable.createdAt, end));
  }
  if (status) conditions.push(eq(ordersTable.status, status));

  const rows = await db
    .select({
      id: ordersTable.id,
      cashierName: ordersTable.cashierName,
      cashierId: ordersTable.cashierId,
      total: ordersTable.total,
      amountPaid: ordersTable.amountPaid,
      change: ordersTable.change,
      paymentMethod: ordersTable.paymentMethod,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      itemCount: count(orderItemsTable.id),
    })
    .from(ordersTable)
    .leftJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(ordersTable.id)
    .orderBy(sql`${ordersTable.createdAt} desc`);

  res.json(rows.map(toOrder));
});

router.post("/orders", requireAuth, async (req, res) => {
  const { cashierName, cashierId, paymentMethod, amountPaid, items } = req.body as {
    cashierName?: string;
    cashierId?: number | null;
    paymentMethod: string;
    amountPaid: number;
    items: Array<{ productId: number; quantity: number }>;
  };

  if (!items?.length) {
    res.status(400).json({ error: "items are required" });
    return;
  }

  let total = 0;
  const itemRows: Array<{
    productId: number;
    productName: string;
    quantity: number;
    priceAtSale: string;
    subtotal: string;
  }> = [];

  for (const item of items) {
    const [prod] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!prod) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const price = parseFloat(prod.price);
    const subtotal = price * item.quantity;
    total += subtotal;
    itemRows.push({
      productId: prod.id,
      productName: prod.name,
      quantity: item.quantity,
      priceAtSale: String(price),
      subtotal: String(subtotal),
    });
    await db
      .update(productsTable)
      .set({ stock: Math.max(0, prod.stock - item.quantity) })
      .where(eq(productsTable.id, prod.id));
  }

  const change = Math.max(0, amountPaid - total);
  const [order] = await db
    .insert(ordersTable)
    .values({
      cashierName: cashierName ?? null,
      cashierId: cashierId ?? null,
      total: String(total),
      amountPaid: String(amountPaid),
      change: String(change),
      paymentMethod: paymentMethod ?? "cash",
      status: "completed",
    })
    .returning();

  await db.insert(orderItemsTable).values(
    itemRows.map((r) => ({ ...r, orderId: order.id }))
  );

  res.status(201).json(toOrder({ ...order, itemCount: itemRows.length }));
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const id = Number(req.params["id"]);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));

  res.json({
    ...toOrder({ ...order, itemCount: items.length }),
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      priceAtSale: parseFloat(i.priceAtSale),
      subtotal: parseFloat(i.subtotal),
    })),
  });
});

export default router;
