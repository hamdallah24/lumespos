import { Router } from "express";
import { db, ordersTable, orderItemsTable, productsTable, productVariantsTable, semiFinishedTable, ingredientsTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { canAccessBranch, requireAuth, requireRole } from "../middlewares/requireAuth";
import { getRecipeRows, adjustInventory, type Executor } from "../services/inventory";
import { EventPublisher } from "../event-bus";
import { createOrderCreatedEvent, createOrderCompletedEvent } from "../events";

const router = Router();

const PPN_RATE = 0.11; // 11% PPN Indonesia (hanya aktif jika diaktifkan)

const toOrder = (row: Record<string, any> & { itemCount?: number }) => ({
  id: row.id,
  branchId: row.branchId,
  cashierName: row.cashierName,
  cashierId: row.cashierId,
  subtotal: parseFloat(row.subtotal ?? row.total),
  discount: parseFloat(row.discount ?? "0"),
  discountType: row.discountType ?? "none",
  taxAmount: parseFloat(row.taxAmount ?? "0"),
  total: parseFloat(row.total),
  totalCogs: parseFloat(row.totalCogs),
  amountPaid: parseFloat(row.amountPaid),
  change: parseFloat(row.change),
  paymentMethod: row.paymentMethod,
  status: row.status,
  voidReason: row.voidReason ?? null,
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
      const [y, m, d] = date.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      conditions.push(gte(ordersTable.createdAt, start));
      conditions.push(lte(ordersTable.createdAt, end));
    } else if (startDate) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      conditions.push(gte(ordersTable.createdAt, s));
      if (endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        conditions.push(lte(ordersTable.createdAt, e));
      }
    }
    if (status) conditions.push(eq(ordersTable.status, status));
    else conditions.push(sql`${ordersTable.status} != 'voided'`); // Exclude voided by default
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
      const [y, m, d] = date.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d, 23, 59, 59, 999);
      aggConditions.push(gte(ordersTable.createdAt, start));
      aggConditions.push(lte(ordersTable.createdAt, end));
    } else if (startDate) {
      const [sy, sm, sd] = startDate.split("-").map(Number);
      const s = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      aggConditions.push(gte(ordersTable.createdAt, s));
      if (endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        const e = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        aggConditions.push(lte(ordersTable.createdAt, e));
      }
    }
    if (status) aggConditions.push(eq(ordersTable.status, status));
    else aggConditions.push(sql`${ordersTable.status} != 'voided'`);

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
    const { branchId, cashierName, cashierId, paymentMethod, amountPaid, items, discount, discountType, applyTax } = req.body as {
      branchId?: number | null;
      cashierName?: string;
      cashierId?: number | null;
      paymentMethod: string;
      amountPaid: number;
      items: Array<{
        productId?: number | null;
        productVariantId?: number | null;
        productName?: string;
        price?: number;
        quantity: number;
      }>;
      discount?: number;
      discountType?: "none" | "percentage" | "fixed";
      applyTax?: boolean;
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
      let subtotal = 0;
      let totalCogs = 0;
      const itemRows: Array<{
        productId: number | null;
        productVariantId: number | null;
        productName: string;
        quantity: number;
        priceAtSale: string;
        subtotal: string;
      }> = [];

      for (const item of items) {
        if (item.productId) {
          const [prod] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
          if (!prod) throw new Error(`Product ${item.productId} not found`);
          
          let price: number;
          if (item.productVariantId) {
            const [variant] = await tx.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.productVariantId));
            price = variant ? parseFloat(variant.price) : parseFloat(prod.price);
          } else {
            price = parseFloat(prod.price);
          }
          const itemSubtotal = price * item.quantity;
          subtotal += itemSubtotal;
          
          // Tentukan target BOM (produk atau varian)
          const parentType = item.productVariantId ? "product_variant" : "product";
          const parentId = item.productVariantId ?? prod.id;
          
          // Ambil BOM (resep) dari produk atau varian
          let recipe = await getRecipeRows(tx, parentType, parentId);
          
          // Fallback: jika varian tidak punya resep, gunakan resep produk induk
          if (recipe.length === 0 && parentType === "product_variant") {
            recipe = await getRecipeRows(tx, "product", prod.id);
          }
          
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
            subtotal: String(itemSubtotal),
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
        } else {
          // Manual custom order
          const price = item.price ?? 0;
          const itemSubtotal = price * item.quantity;
          subtotal += itemSubtotal;
          itemRows.push({
            productId: null,
            productVariantId: null,
            productName: item.productName || "Custom Order",
            quantity: item.quantity,
            priceAtSale: String(price),
            subtotal: String(itemSubtotal),
          });
        }
      }

      // Hitung diskon
      const validDiscountType = discountType && ["percentage", "fixed"].includes(discountType) ? discountType : "none";
      let discountAmount = 0;
      if (validDiscountType === "percentage" && discount && discount > 0) {
        discountAmount = Math.min(subtotal * (discount / 100), subtotal);
      } else if (validDiscountType === "fixed" && discount && discount > 0) {
        discountAmount = Math.min(discount, subtotal);
      }

      const afterDiscount = subtotal - discountAmount;
      const taxAmount = applyTax ? Math.round(afterDiscount * PPN_RATE) : 0;
      const total = afterDiscount + taxAmount;

      const change = Math.max(0, amountPaid - total);
      const [created] = await tx
        .insert(ordersTable)
        .values({
          branchId: validBranchId,
          cashierName: cashierName ?? null,
          cashierId: cashierId ?? null,
          subtotal: String(subtotal),
          discount: String(discountAmount),
          discountType: validDiscountType,
          taxAmount: String(taxAmount),
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

    const itemsPayload = items.map((item): any => ({
      productId: item.productId ?? null,
      productVariantId: item.productVariantId ?? null,
      quantity: item.quantity,
      price: item.price ?? 0,
    }));

    EventPublisher.publish(createOrderCreatedEvent({
      branchId: validBranchId,
      orderId: order.id,
      total: parseFloat(order.total),
      totalCogs: parseFloat(order.totalCogs),
      paymentMethod: order.paymentMethod,
      cashierName: cashierName ?? null,
      items: itemsPayload,
    }));

    EventPublisher.publish(createOrderCompletedEvent({
      branchId: validBranchId,
      orderId: order.id,
      total: parseFloat(order.total),
      totalCogs: parseFloat(order.totalCogs || "0"),
      paymentMethod: order.paymentMethod,
    }));

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
      subtotal: parseFloat(order.subtotal ?? order.total),
      discount: parseFloat(order.discount ?? "0"),
      discountType: order.discountType ?? "none",
      taxAmount: parseFloat(order.taxAmount ?? "0"),
      total: parseFloat(order.total),
      totalCogs: parseFloat(order.totalCogs),
      amountPaid: parseFloat(order.amountPaid),
      change: parseFloat(order.change),
      paymentMethod: order.paymentMethod,
      status: order.status,
      voidReason: order.voidReason ?? null,
      createdAt: order.createdAt.toISOString(),
      items: items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productVariantId: i.productVariantId,
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

// POST /api/orders/:id/void (batalkan transaksi, kembalikan stok)
router.post("/orders/:id/void", requireAuth, requireRole("owner", "manager"), async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const { reason } = req.body as { reason?: string };

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (order.status === "voided") {
      return res.status(400).json({ error: "Order already voided" });
    }
    if (!order.branchId || !(await canAccessBranch(req, order.branchId))) {
      return res.status(403).json({ error: "Forbidden branch" });
    }

    // Void dalam transaction: update status + kembalikan stok
    await db.transaction(async (tx: Executor) => {
      // Update order status
      await tx
        .update(ordersTable)
        .set({
          status: "voided",
          voidReason: reason ?? "Dibatalkan",
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, id));

      // Kembalikan stok untuk setiap item
      const items = await tx.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      for (const item of items) {
        if (item.productId) {
          const parentType = item.productVariantId ? "product_variant" : "product";
          const parentId = item.productVariantId ?? item.productId;
          let recipe = await getRecipeRows(tx, parentType as any, parentId);

          // Fallback: jika varian tidak punya resep, gunakan resep produk
          if (recipe.length === 0 && parentType === "product_variant" && item.productId) {
            recipe = await getRecipeRows(tx, "product", item.productId);
          }

          for (const comp of recipe) {
            const totalRestore = comp.quantity * item.quantity;
            if (comp.componentType === "semi_finished") {
              await adjustInventory(tx, order.branchId!, "semi_finished", comp.componentId, totalRestore);
            } else if (comp.componentType === "ingredient") {
              await adjustInventory(tx, order.branchId!, "ingredient", comp.componentId, totalRestore);
            }
          }
        }
      }
    });

    return res.json({ success: true, message: "Order voided successfully" });
  } catch (err) {
    console.error("POST /orders/:id/void error:", err);
    const message = err instanceof Error ? err.message : "Failed to void order";
    return res.status(400).json({ error: message });
  }
});

// POST /api/orders/batch (sync offline orders)
router.post("/orders/batch", requireAuth, async (req, res) => {
  try {
    const { orders } = req.body as {
      orders: Array<{
        branchId?: number | null;
        cashierName?: string;
        cashierId?: number | null;
        paymentMethod: string;
        amountPaid: number;
        items: Array<{
          productId?: number | null;
          productVariantId?: number | null;
          productName?: string;
          price?: number;
          quantity: number;
        }>;
        discount?: number;
        discountType?: "none" | "percentage" | "fixed";
        applyTax?: boolean;
      }>;
    };

    if (!orders?.length) {
      return res.status(400).json({ error: "orders array is required" });
    }

    const results: Array<{ success: boolean; orderId?: number; error?: string }> = [];

    for (const orderData of orders) {
      try {
        const { branchId, cashierName, cashierId, paymentMethod, amountPaid, items, discount, discountType, applyTax } = orderData;

        if (!items?.length) {
          results.push({ success: false, error: "items are required" });
          continue;
        }

        let validBranchId = branchId ?? (req.user as any)?.branchId ?? 1;
        if (typeof validBranchId !== "number") validBranchId = Number(validBranchId);
        if (isNaN(validBranchId) || validBranchId <= 0) {
          results.push({ success: false, error: "Invalid branchId" });
          continue;
        }
        if (!(await canAccessBranch(req, validBranchId))) {
          results.push({ success: false, error: "Forbidden branch" });
          continue;
        }

        const order = await db.transaction(async (tx: Executor) => {
          let subtotal = 0;
          let totalCogs = 0;
          const itemRows: Array<{
            productId: number | null;
            productVariantId: number | null;
            productName: string;
            quantity: number;
            priceAtSale: string;
            subtotal: string;
          }> = [];

          for (const item of items) {
            if (item.productId) {
              const [prod] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
              if (!prod) throw new Error(`Product ${item.productId} not found`);

              let price: number;
              if (item.productVariantId) {
                const [variant] = await tx.select().from(productVariantsTable).where(eq(productVariantsTable.id, item.productVariantId));
                price = variant ? parseFloat(variant.price) : parseFloat(prod.price);
              } else {
                price = parseFloat(prod.price);
              }
              const itemSubtotal = price * item.quantity;
              subtotal += itemSubtotal;

              const parentType = item.productVariantId ? "product_variant" : "product";
              const parentId = item.productVariantId ?? prod.id;
              let recipe = await getRecipeRows(tx, parentType, parentId);
              if (recipe.length === 0 && parentType === "product_variant") {
                recipe = await getRecipeRows(tx, "product", prod.id);
              }

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
                subtotal: String(itemSubtotal),
              });

              for (const comp of recipe) {
                const totalNeed = comp.quantity * item.quantity;
                if (comp.componentType === "semi_finished") {
                  await adjustInventory(tx, validBranchId, "semi_finished", comp.componentId, -totalNeed);
                } else if (comp.componentType === "ingredient") {
                  await adjustInventory(tx, validBranchId, "ingredient", comp.componentId, -totalNeed);
                }
              }
            } else {
              const price = item.price ?? 0;
              const itemSubtotal = price * item.quantity;
              subtotal += itemSubtotal;
              itemRows.push({
                productId: null,
                productVariantId: null,
                productName: item.productName || "Custom Order",
                quantity: item.quantity,
                priceAtSale: String(price),
                subtotal: String(itemSubtotal),
              });
            }
          }

          const validDiscountType = discountType && ["percentage", "fixed"].includes(discountType) ? discountType : "none";
          let discountAmount = 0;
          if (validDiscountType === "percentage" && discount && discount > 0) {
            discountAmount = Math.min(subtotal * (discount / 100), subtotal);
          } else if (validDiscountType === "fixed" && discount && discount > 0) {
            discountAmount = Math.min(discount, subtotal);
          }

          const afterDiscount = subtotal - discountAmount;
          const taxAmount = applyTax ? Math.round(afterDiscount * PPN_RATE) : 0;
          const total = afterDiscount + taxAmount;
          const change = Math.max(0, amountPaid - total);

          const [created] = await tx
            .insert(ordersTable)
            .values({
              branchId: validBranchId,
              cashierName: cashierName ?? null,
              cashierId: cashierId ?? null,
              subtotal: String(subtotal),
              discount: String(discountAmount),
              discountType: validDiscountType,
              taxAmount: String(taxAmount),
              total: String(total),
              totalCogs: String(totalCogs),
              amountPaid: String(amountPaid),
              change: String(change),
              paymentMethod: paymentMethod ?? "cash",
              status: "completed",
            })
            .returning();

          await tx.insert(orderItemsTable).values(itemRows.map((r) => ({ ...r, orderId: created.id })));
          return created;
        });

        const itemsPayload = items.map((item) => ({
          productId: item.productId ?? null,
          productVariantId: item.productVariantId ?? null,
          quantity: item.quantity,
          price: item.price ?? 0,
        }));

        EventPublisher.publish(createOrderCreatedEvent({
          branchId: validBranchId,
          orderId: order.id,
          total: parseFloat(order.total),
          totalCogs: parseFloat(order.totalCogs),
          paymentMethod: order.paymentMethod,
          cashierName: cashierName ?? null,
          items: itemsPayload,
        }));

        EventPublisher.publish(createOrderCompletedEvent({
          branchId: validBranchId,
          orderId: order.id,
          total: parseFloat(order.total),
          totalCogs: parseFloat(order.totalCogs || "0"),
          paymentMethod: order.paymentMethod,
        }));

        results.push({ success: true, orderId: order.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create order";
        console.error("Batch order error:", message);
        results.push({ success: false, error: message });
      }
    }

    return res.json(results);
  } catch (err) {
    console.error("POST /orders/batch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
