import { Router } from "express";
import { db, ordersTable, orderItemsTable, productsTable, productVariantsTable, semiFinishedTable, ingredientsTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { canAccessBranch, requireAuth } from "../middlewares/requireAuth";
import { getRecipeRows, adjustInventory, type Executor } from "../services/inventory";

const router = Router();

const toOrder = (row: typeof ordersTable.$inferSelect & { itemCount?: number }) => ({
  id: row.id,
  branchId: row.branchId,
  cashierName: row.cashierName,
  cashierId: row.cashierId,
  total: parseFloat(row.total),
  totalCogs: parseFloat(row.totalCogs),
  amountPaid: parseFloat(row.amountPaid),
  change: parseFloat(row.change),
  paymentMethod: row.paymentMethod,
  status: row.status,
  createdAt: row.createdAt.toISOString(),
  itemCount: row.itemCount ?? 0,
});

// Helper untuk menghitung HPP dari komponen (semi_finished atau ingredient)
async function getComponentCost(
  tx: Executor,
  componentType: string,
  componentId: number
): Promise<number> {
  if (componentType === "semi_finished") {
    const [sf] = await tx
      .select({ costPricePerUnit: semiFinishedTable.costPricePerUnit })
      .from(semiFinishedTable)
      .where(eq(semiFinishedTable.id, componentId));
    return sf ? parseFloat(sf.costPricePerUnit) : 0;
  } else if (componentType === "ingredient") {
    const [ing] = await tx
      .select({ costPricePerUnit: ingredientsTable.costPricePerUnit })
      .from(ingredientsTable)
      .where(eq(ingredientsTable.id, componentId));
    return ing ? parseFloat(ing.costPricePerUnit) : 0;
  }
  return 0;
}

// GET /api/orders
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const { date, startDate, endDate, status, branchId, paymentMethod } = req.query as {
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      branchId?: string;
      paymentMethod?: string;
    };

    const conditions: any[] = [];
    if (branchId && !(await canAccessBranch(req, Number(branchId)))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }
    if (!branchId && req.user?.role !== "owner" && req.user?.role !== "manager") {
      return res.status(400).json({ error: "branchId required" });
    }
    if (branchId) conditions.push(eq(ordersTable.branchId, Number(branchId)));
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      conditions.push(gte(ordersTable.createdAt, start));
      conditions.push(lte(ordersTable.createdAt, end));
    } else if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      conditions.push(gte(ordersTable.createdAt, s));
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        conditions.push(lte(ordersTable.createdAt, e));
      }
    }
    if (status) conditions.push(eq(ordersTable.status, status));
    if (paymentMethod && paymentMethod !== "all") {
      conditions.push(eq(ordersTable.paymentMethod, paymentMethod));
    }

    const rows = await db
      .select({
        id: ordersTable.id,
        branchId: ordersTable.branchId,
        cashierName: ordersTable.cashierName,
        cashierId: ordersTable.cashierId,
        total: ordersTable.total,
        totalCogs: ordersTable.totalCogs,
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

    const aggConditions: any[] = [];
    if (branchId) aggConditions.push(eq(ordersTable.branchId, Number(branchId)));
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      aggConditions.push(gte(ordersTable.createdAt, start));
      aggConditions.push(lte(ordersTable.createdAt, end));
    } else if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      aggConditions.push(gte(ordersTable.createdAt, s));
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        aggConditions.push(lte(ordersTable.createdAt, e));
      }
    }
    if (status) aggConditions.push(eq(ordersTable.status, status));

    const totalsByMethod = await db
      .select({
        paymentMethod: ordersTable.paymentMethod,
        total: sql<string>`sum(${ordersTable.total})`,
      })
      .from(ordersTable)
      .where(aggConditions.length ? and(...aggConditions) : undefined)
      .groupBy(ordersTable.paymentMethod);

    const summary = { cash: 0, qris: 0, card: 0, total: 0 };
    for (const row of totalsByMethod) {
      const val = parseFloat(row.total);
      summary.total += val;
      if (row.paymentMethod === "cash") summary.cash = val;
      else if (row.paymentMethod === "qris") summary.qris = val;
      else if (row.paymentMethod === "card") summary.card = val;
    }

    return res.json({
      orders: rows.map(toOrder),
      summary,
    });
  } catch (error) {
    console.error("GET /orders error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/orders (membuat transaksi baru)
router.post("/orders", requireAuth, async (req, res) => {
  try {
    const { branchId, cashierName, cashierId, paymentMethod, amountPaid, items } = req.body as {
      branchId?: number | null;
      cashierName?: string;
      cashierId?: number | null;
      paymentMethod: string;
      amountPaid: number;
      items: Array<{ productId: number; productVariantId?: number | null; quantity: number }>;
    };

    // Validasi items
    if (!items?.length) {
      return res.status(400).json({ error: "items are required" });
    }

    // Validasi branchId - pastikan number
    let validBranchId = branchId ?? (req.user as any)?.branchId ?? 1;
    if (typeof validBranchId !== 'number') {
      validBranchId = Number(validBranchId);
    }
    if (isNaN(validBranchId) || validBranchId <= 0) {
      return res.status(400).json({ error: "branchId is required and must be a valid number" });
    }
    if (!(await canAccessBranch(req, validBranchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    // Proses transaksi
    const order = await db.transaction(async (tx: Executor) => {
      let total = 0;
      let totalCogs = 0;
      const itemRows: Array<{
        productId: number;
        productVariantId: number | null;
        productName: string;
        quantity: number;
        priceAtSale: string;
        subtotal: string;
      }> = [];

      for (const item of items) {
        const [prod] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (!prod) throw new Error(`Product ${item.productId} not found`);
        
        let price: number;
        if (item.productVariantId) {
          const [variant] = await tx.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.productVariantId));
          price = variant ? parseFloat(variant.price) : parseFloat(prod.price);
        } else {
          price = parseFloat(prod.price);
        }
        const subtotal = price * item.quantity;
        total += subtotal;
        
        // Tentukan target BOM (produk atau varian)
        const parentType = item.productVariantId ? "product_variant" : "product";
        const parentId = item.productVariantId ?? prod.id;
        
        // Ambil BOM (resep) dari produk atau varian
        const recipe = await getRecipeRows(tx, parentType, parentId);
        
        // Hitung HPP item dari BOM
        let itemCogs = 0;
        for (const comp of recipe) {
          const componentCost = await getComponentCost(tx, comp.componentType, comp.componentId);
          itemCogs += componentCost * comp.quantity;
        }
        totalCogs += itemCogs * item.quantity;

        itemRows.push({
          productId: prod.id,
          productVariantId: item.productVariantId ?? null,
          productName: prod.name,
          quantity: item.quantity,
          priceAtSale: String(price),
          subtotal: String(subtotal),
        });

        // Kurangi stok komponen (semi_finished DAN ingredient) sesuai BOM
        for (const comp of recipe) {
          const totalNeed = comp.quantity * item.quantity;
          
          if (comp.componentType === "semi_finished") {
            await adjustInventory(tx, validBranchId, "semi_finished", comp.componentId, -totalNeed);
          } 
          else if (comp.componentType === "ingredient") {
            await adjustInventory(tx, validBranchId, "ingredient", comp.componentId, -totalNeed);
          }
        }
      }

      const change = Math.max(0, amountPaid - total);
      const [created] = await tx
        .insert(ordersTable)
        .values({
          branchId: validBranchId,
          cashierName: cashierName ?? null,
          cashierId: cashierId ?? null,
          total: String(total),
          totalCogs: String(totalCogs),
          amountPaid: String(amountPaid),
          change: String(change),
          paymentMethod: paymentMethod ?? "cash",
          status: "completed",
        })
        .returning();

      await tx.insert(orderItemsTable).values(itemRows.map((r) => ({ ...r, orderId: created.id })));

      return { ...created, itemCount: itemRows.length };
    });

    return res.status(201).json(toOrder(order));
  } catch (err) {
    console.error("Failed to create order", err);
    const message = err instanceof Error ? err.message : "Failed to create order";
    return res.status(400).json({ error: message });
  }
});

// GET /api/orders/:id (detail)
router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      return res.status(404).json({ error: "Not found" });
    }
    if (!order.branchId || !(await canAccessBranch(req, order.branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));

    return res.json({
      id: order.id,
      branchId: order.branchId,
      cashierName: order.cashierName,
      cashierId: order.cashierId,
      total: parseFloat(order.total),
      totalCogs: parseFloat(order.totalCogs),
      amountPaid: parseFloat(order.amountPaid),
      change: parseFloat(order.change),
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        priceAtSale: parseFloat(i.priceAtSale),
        subtotal: parseFloat(i.subtotal),
      })),
    });
  } catch (error) {
    console.error("GET /orders/:id error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
