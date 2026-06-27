// ─────────────────────────────────────────────────────────────
// AI BUSINESS — executeOperation (dispatched via JSON from COO)
// ─────────────────────────────────────────────────────────────
import { db, ingredientsTable, semiFinishedTable, productsTable, productVariantsTable, expensesTable, ordersTable, orderItemsTable, stockAdjustmentsTable, recipesTable, currentInventoryTable } from "@workspace/db";
import { eq, and, gte, lte, sum, desc, sql } from "drizzle-orm";
import { listInventoryForBranch, adjustInventory, applyMovingAverage, getRecipeRows, getInventoryStock } from "../services/inventory";

// ── HELPERS ──
async function getComponentCost(tx: any, componentType: string, componentId: number): Promise<number> {
  if (componentType === "semi_finished") {
    const [sf] = await tx.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, componentId));
    return sf ? parseFloat(sf.c) : 0;
  }
  const [ing] = await tx.select({ c: ingredientsTable.costPricePerUnit }).from(ingredientsTable).where(eq(ingredientsTable.id, componentId));
  return ing ? parseFloat(ing.c) : 0;
}

async function getCurrentStockLocal(tx: any, branchId: number, itemId: number): Promise<number> {
  const [stock] = await tx.select({ s: currentInventoryTable.currentStock }).from(currentInventoryTable)
    .where(and(eq(currentInventoryTable.itemType, "semi_finished"), eq(currentInventoryTable.itemId, itemId), eq(currentInventoryTable.branchId, branchId)));
  return stock ? parseFloat(stock.s) : 0;
}

// ─────────────────────────────────────────────────────────────
// EXECUTE OPERATIONS
// ─────────────────────────────────────────────────────────────

export type OpResult = string;

export async function executeOperation(action: string, params: Record<string, any>, branchId: number): Promise<OpResult> {
  const bid = branchId;

  switch (action) {

    case "add_stock": {
      const { itemId, itemType, qty, price } = params;
      if (!itemId || !qty) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      await db.transaction(async (tx) => {
        await adjustInventory(tx, bid, it, itemId, qty);
        if (price && price > 0) await applyMovingAverage(tx, bid, itemId, qty, price);
        await tx.insert(stockAdjustmentsTable).values({
          branchId: bid, itemType: it, itemId,
          adjustmentType: "in", quantity: String(qty),
          purchasePriceTotal: price > 0 ? String(price) : null,
          notes: `via COO: tambah stok` + (price > 0 ? ` (Rp ${price.toLocaleString("id-ID")})` : ""),
        });
      });
      return "ok";
    }

    case "reduce_stock": {
      const { itemId, itemType, qty } = params;
      if (!itemId || !qty) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      await db.transaction(async (tx) => {
        await adjustInventory(tx, bid, it, itemId, -qty);
        await tx.insert(stockAdjustmentsTable).values({
          branchId: bid, itemType: it, itemId, adjustmentType: "out",
          quantity: String(qty), notes: `via COO: kurangi stok`,
        });
      });
      return "ok";
    }

    case "correct_stock": {
      const { itemId, itemType, target } = params;
      if (!itemId || target === undefined) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      const all = await listInventoryForBranch(bid);
      const found = all.find((i) => i.itemId === itemId && i.itemType === it);
      if (!found) return "Item tidak ditemukan.";
      const delta = target - found.currentStock;
      const adjType = delta >= 0 ? "in" : "loss";
      await db.transaction(async (tx) => {
        await adjustInventory(tx, bid, it, itemId, delta);
        await tx.insert(stockAdjustmentsTable).values({
          branchId: bid, itemType: it, itemId, adjustmentType: adjType,
          quantity: String(Math.abs(delta)), notes: `via COO: koreksi stok jadi ${target}`,
        });
      });
      return "ok";
    }

    case "loss_correction": {
      const { itemId, itemType, qty } = params;
      if (!itemId || !qty) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      await db.transaction(async (tx) => {
        await adjustInventory(tx, bid, it, itemId, -qty);
        await tx.insert(stockAdjustmentsTable).values({
          branchId: bid, itemType: it, itemId, adjustmentType: "loss",
          quantity: String(-qty), notes: `via COO: koreksi hilang`,
        });
      });
      return "ok";
    }

    case "add_semi_finished": {
      const { name, unit, yieldQuantity, yieldUnit } = params;
      if (!name) return "Nama tidak boleh kosong.";
      await db.insert(semiFinishedTable).values({
        branchId: bid, name,
        unit: unit || "gram",
        yieldQuantity: yieldQuantity || 1,
        yieldUnit: yieldUnit || "pcs",
      });
      return "ok";
    }

    case "add_ingredient": {
      const { name, unit } = params;
      if (!name) return "Nama bahan tidak boleh kosong.";
      await db.insert(ingredientsTable).values({ branchId: bid, name, unit: unit || "ml" });
      return "ok";
    }

    case "add_product": {
      const { name, price } = params;
      if (!name || !price) return "Parameter tidak lengkap.";
      await db.insert(productsTable).values({ branchId: bid, name, price: String(price) });
      return "ok";
    }

    case "add_variant": {
      const { productId, variantName, price } = params;
      if (!productId || !variantName || !price) return "Parameter tidak lengkap.";
      await db.insert(productVariantsTable).values({ productId, name: variantName, price: String(price) });
      return "ok";
    }

    case "update_price": {
      const { productId, price } = params;
      if (!productId || !price) return "Parameter tidak lengkap.";
      await db.update(productsTable).set({ price: String(price) }).where(eq(productsTable.id, productId));
      return "ok";
    }

    case "deactivate_product": {
      const { productId } = params;
      if (!productId) return "Parameter tidak lengkap.";
      await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, productId));
      return "ok";
    }

    case "add_expense": {
      const { description, amount } = params;
      if (!amount) return "Nominal pengeluaran tidak boleh kosong.";
      await db.insert(expensesTable).values({ branchId: bid, description: description || "Pengeluaran", amount: String(amount) });
      return "ok";
    }

    case "add_recipe": {
      const { parentType, parentId, components, ingredientId, quantity, componentType } = params;
      if (!parentType || !parentId) return "Parameter tidak lengkap.";
      if (components && Array.isArray(components)) {
        await db.transaction(async (tx) => {
          for (const comp of components) {
            if (!comp.componentId || !comp.quantity) continue;
            await tx.insert(recipesTable).values({
              parentType, parentId,
              componentType: comp.componentType || "ingredient",
              componentId: comp.componentId,
              quantity: String(comp.quantity),
            });
          }
        });
        return "ok";
      }
      if (!ingredientId || !quantity) return "Parameter tidak lengkap.";
      await db.insert(recipesTable).values({
        parentType, parentId, componentType: componentType || "ingredient", componentId: ingredientId, quantity: String(quantity),
      });
      return "ok";
    }

    case "produce": {
      const { itemId, producedWeight } = params;
      if (!itemId || !producedWeight) return "Parameter tidak lengkap.";
      let totalCost = 0;
      await db.transaction(async (tx) => {
        const recipe = await getRecipeRows(tx, "semi_finished", itemId);
        if (recipe.length === 0) throw new Error("Resep belum diisi.");
        for (const r of recipe) {
          const c = await getComponentCost(tx, r.componentType, r.componentId);
          totalCost += c * r.quantity;
          await adjustInventory(tx, bid, r.componentType, r.componentId, -r.quantity);
        }
        const hpp = totalCost / producedWeight;
        const oldStock = await getCurrentStockLocal(tx, bid, itemId);
        const [sf] = await tx.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId));
        const oldHpp = parseFloat(sf?.c || "0");
        const avg = (oldStock * oldHpp + totalCost) / (oldStock + producedWeight);
        await adjustInventory(tx, bid, "semi_finished", itemId, producedWeight);
        await tx.update(semiFinishedTable).set({ costPricePerUnit: String(avg) }).where(eq(semiFinishedTable.id, itemId));
      });
      return "ok";
    }

    default:
      return `Aksi "${action}" belum didukung.`;
  }
}
