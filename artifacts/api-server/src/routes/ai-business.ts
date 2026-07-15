// ─────────────────────────────────────────────────────────────
// AI BUSINESS — executeOperation (dispatched via JSON from COO)
// ─────────────────────────────────────────────────────────────
import { db, ingredientsTable, semiFinishedTable, productsTable, productVariantsTable, expensesTable, ordersTable, orderItemsTable, stockAdjustmentsTable, recipesTable, currentInventoryTable, shiftAuditsTable, usersTable, branchesTable } from "@workspace/db";
import { eq, and, gte, lte, lt, sum, desc, sql, ilike } from "drizzle-orm";
import { listInventoryForBranch, adjustInventory, applyMovingAverage, getRecipeRows, getInventoryStock } from "../services/inventory";
import { EventPublisher } from "../event-bus";
import { createStockAdjustedEvent, createStockCorrectedEvent, createProductCreatedEvent, createExpenseRecordedEvent, createIngredientConsumedEvent, createBatchProducedEvent, createRecipeChangedEvent, createPriceChangedEvent } from "../events";

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

async function lookupComponent(tx: any, branchId: number, name: string): Promise<{ id: number; type: string } | null> {
  if (name.length < 3) return null;
  const ing = await tx.select({ id: ingredientsTable.id }).from(ingredientsTable)
    .where(and(eq(ingredientsTable.branchId, branchId), ilike(ingredientsTable.name, `%${name}%`))).limit(1);
  if (ing.length > 0) return { id: ing[0].id, type: "ingredient" };
  const sf = await tx.select({ id: semiFinishedTable.id }).from(semiFinishedTable)
    .where(and(eq(semiFinishedTable.branchId, branchId), ilike(semiFinishedTable.name, `%${name}%`))).limit(1);
  if (sf.length > 0) return { id: sf[0].id, type: "semi_finished" };
  return null;
}

async function resolveProductId(name: string, branchId: number): Promise<number | null> {
  if (!name || name.length < 3) return null;
  const [product] = await db.select({ id: productsTable.id }).from(productsTable)
    .where(and(eq(productsTable.branchId, branchId), ilike(productsTable.name, `%${name}%`))).limit(1);
  return product?.id || null;
}

async function resolveItemId(name: string, branchId: number, itemType?: string): Promise<{ id: number; type: string } | null> {
  if (!name || name.length < 3) return null;
  if (!itemType || itemType === "ingredient") {
    const [ing] = await db.select({ id: ingredientsTable.id }).from(ingredientsTable)
      .where(and(eq(ingredientsTable.branchId, branchId), ilike(ingredientsTable.name, `%${name}%`))).limit(1);
    if (ing) return { id: ing.id, type: "ingredient" };
    if (itemType === "ingredient") return null;
  }
  const [sf] = await db.select({ id: semiFinishedTable.id }).from(semiFinishedTable)
    .where(and(eq(semiFinishedTable.branchId, branchId), ilike(semiFinishedTable.name, `%${name}%`))).limit(1);
  if (sf) return { id: sf.id, type: "semi_finished" };
  return null;
}

const UNIT_SCALE: Record<string, Record<string, number>> = {
  ml: { l: 1000, liter: 1000 },
  g: { kg: 1000, kilo: 1000 },
};

function normalizeQty(qty: number, userUnit: string | undefined, baseUnit: string): number {
  if (!userUnit || !baseUnit) return qty;
  const u = userUnit.toLowerCase().trim();
  const b = baseUnit.toLowerCase().trim();
  if (u === b) return qty;
  const factor = UNIT_SCALE[b]?.[u];
  return factor ? qty * factor : qty;
}

// ─────────────────────────────────────────────────────────────
// EXECUTE OPERATIONS
// ─────────────────────────────────────────────────────────────

export type OpResult = string;

export async function executeOperation(action: string, params: Record<string, any>, branchId: number): Promise<OpResult> {
  // branch override from params (LLM intent classifier can set branchId)
  // branchId = 0 or "all" means ALL branches (no branch filter)
  const hasBranchParam = params.branchId !== undefined && params.branchId !== null;
  const bid = hasBranchParam ? (Number(params.branchId) || 0) : branchId;

  switch (action) {

    case "add_stock": {
      let { itemId, itemName, itemType, qty, price, unit } = params;
      if (!itemId && itemName) {
        const resolved = await resolveItemId(itemName, bid, itemType);
        if (!resolved) return `Item "${itemName}" tidak ditemukan.`;
        itemId = resolved.id; itemType = resolved.type;
      }
      if (!itemId || !qty) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      if (unit) {
        const baseUnit = it === "ingredient"
          ? (await db.select({ u: ingredientsTable.unit }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId)).limit(1))[0]?.u
          : (await db.select({ u: semiFinishedTable.unit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId)).limit(1))[0]?.u;
        if (baseUnit) qty = normalizeQty(Number(qty), unit, baseUnit);
      }
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
      const [afterStock] = await db.select({ s: currentInventoryTable.currentStock }).from(currentInventoryTable)
        .where(and(eq(currentInventoryTable.itemType, it), eq(currentInventoryTable.itemId, itemId), eq(currentInventoryTable.branchId, bid))).limit(1);
      const finalStock = afterStock ? parseFloat(afterStock.s) : qty;
      EventPublisher.publish(createStockAdjustedEvent({
        branchId: bid, itemType: it, itemId: Number(itemId),
        delta: Number(qty), newStock: finalStock, previousStock: finalStock - Number(qty),
      }));
      return "ok";
    }

    case "reduce_stock": {
      let { itemId, itemName, itemType, qty, unit } = params;
      if (!itemId && itemName) {
        const resolved = await resolveItemId(itemName, bid, itemType);
        if (!resolved) return `Item "${itemName}" tidak ditemukan.`;
        itemId = resolved.id; itemType = resolved.type;
      }
      if (!itemId || !qty) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      if (unit) {
        const baseUnit = it === "ingredient"
          ? (await db.select({ u: ingredientsTable.unit }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId)).limit(1))[0]?.u
          : (await db.select({ u: semiFinishedTable.unit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId)).limit(1))[0]?.u;
        if (baseUnit) qty = normalizeQty(Number(qty), unit, baseUnit);
      }
      await db.transaction(async (tx) => {
        await adjustInventory(tx, bid, it, itemId, -qty);
        await tx.insert(stockAdjustmentsTable).values({
          branchId: bid, itemType: it, itemId, adjustmentType: "out",
          quantity: String(qty), notes: `via COO: kurangi stok`,
        });
      });
      const [afterStock] = await db.select({ s: currentInventoryTable.currentStock }).from(currentInventoryTable)
        .where(and(eq(currentInventoryTable.itemType, it), eq(currentInventoryTable.itemId, itemId), eq(currentInventoryTable.branchId, bid))).limit(1);
      const finalStock = afterStock ? parseFloat(afterStock.s) : 0;
      EventPublisher.publish(createStockAdjustedEvent({
        branchId: bid, itemType: it, itemId: Number(itemId),
        delta: -Number(qty), newStock: finalStock, previousStock: finalStock + Number(qty),
      }));
      return "ok";
    }

    case "correct_stock": {
      let { itemId, itemName, itemType, target, unit } = params;
      if (!itemId && itemName) {
        const resolved = await resolveItemId(itemName, bid, itemType);
        if (!resolved) return `Item "${itemName}" tidak ditemukan.`;
        itemId = resolved.id; itemType = resolved.type;
      }
      if (!itemId || target === undefined) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      if (unit) {
        const baseUnit = it === "ingredient"
          ? (await db.select({ u: ingredientsTable.unit }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId)).limit(1))[0]?.u
          : (await db.select({ u: semiFinishedTable.unit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId)).limit(1))[0]?.u;
        if (baseUnit) target = normalizeQty(Number(target), unit, baseUnit);
      }
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
      EventPublisher.publish(createStockCorrectedEvent({
        branchId: bid, itemType: it, itemId: Number(itemId),
        previousStock: found.currentStock, correctedStock: Number(target),
        delta: delta, reason: "koreksi via COO",
      }));
      return "ok";
    }

    case "loss_correction": {
      let { itemId, itemName, itemType, qty, unit } = params;
      if (!itemId && itemName) {
        const resolved = await resolveItemId(itemName, bid, itemType);
        if (!resolved) return `Item "${itemName}" tidak ditemukan.`;
        itemId = resolved.id; itemType = resolved.type;
      }
      if (!itemId || !qty) return "Parameter tidak lengkap.";
      const it = itemType || "ingredient";
      if (unit) {
        const baseUnit = it === "ingredient"
          ? (await db.select({ u: ingredientsTable.unit }).from(ingredientsTable).where(eq(ingredientsTable.id, itemId)).limit(1))[0]?.u
          : (await db.select({ u: semiFinishedTable.unit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId)).limit(1))[0]?.u;
        if (baseUnit) qty = normalizeQty(Number(qty), unit, baseUnit);
      }
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
      const [prod] = await db.insert(productsTable).values({ branchId: bid, name, price: String(price) }).returning({ id: productsTable.id });
      EventPublisher.publish(createProductCreatedEvent({
        branchId: bid, productId: prod.id, name, price: Number(price),
      }));
      return "ok";
    }

    case "add_variant": {
      let { productId, productName, variantName, price } = params;
      if (!productId && productName) productId = await resolveProductId(productName, bid);
      if (!productId || !variantName || !price) return "Parameter tidak lengkap.";
      await db.insert(productVariantsTable).values({ productId, name: variantName, price: String(price) });
      return "ok";
    }

    case "update_variant_price": {
      let { productId, productName, variantName, price } = params;
      if (!productId && productName) productId = await resolveProductId(productName, bid);
      if (!productId || !variantName || !price) return "Parameter tidak lengkap.";
      const [variant] = await db.select({ id: productVariantsTable.id, name: productVariantsTable.name, price: productVariantsTable.price }).from(productVariantsTable)
        .where(and(eq(productVariantsTable.productId, productId), ilike(productVariantsTable.name, `%${variantName}%`))).limit(1);
      if (!variant) return `Varian "${variantName}" tidak ditemukan.`;
      const oldPrice = parseFloat(variant.price);
      await db.update(productVariantsTable).set({ price: String(price) }).where(eq(productVariantsTable.id, variant.id));
      EventPublisher.publish(createPriceChangedEvent({
        productVariantId: variant.id, productId: Number(productId),
        variantName: variant.name, oldPrice, newPrice: Number(price),
      }));
      return `✅ Harga varian "${variantName}" diubah menjadi Rp${Number(price).toLocaleString("id-ID")}.`;
    }

    case "add_product_with_variants_and_recipe": {
      const { name, variants, recipe } = params;
      if (!name || !variants || !Array.isArray(variants) || variants.length === 0)
        return "Parameter tidak lengkap.";
      const basePrice = 0;
      let result = "";
      await db.transaction(async (tx) => {
        const matched: { name: string; quantity: number; unit: string; id: number; type: string }[] = [];
        const autoCreated: string[] = [];
        for (const item of recipe || []) {
          if (!item.name || !item.quantity) continue;
          let comp = await lookupComponent(tx, bid, item.name);
          if (!comp) {
            const [ins] = await tx.insert(ingredientsTable).values({ branchId: bid, name: item.name, unit: item.unit || "g" }).returning({ id: ingredientsTable.id });
            comp = { id: ins.id, type: "ingredient" };
            autoCreated.push(item.name);
          }
          matched.push({ ...item, id: comp.id, type: comp.type });
        }
        if (matched.length === 0) throw new Error(`Tidak ada bahan yang ditemukan untuk produk "${name}".`);
        const [product] = await tx.insert(productsTable).values({ branchId: bid, name, price: String(basePrice) }).returning({ id: productsTable.id });
        for (const v of variants) {
          await tx.insert(productVariantsTable).values({ productId: product.id, name: v.name, price: String(v.price) });
        }
        for (const m of matched) {
          await tx.insert(recipesTable).values({ parentType: "product", parentId: product.id, componentType: m.type, componentId: m.id, quantity: String(m.quantity) });
        }
        result = `✅ Produk "${name}" berhasil dibuat\n   Varian: ${variants.map((v: any) => `${v.name} (Rp${Number(v.price).toLocaleString("id-ID")})`).join(", ")}\n   Resep: ${matched.map((m: any) => `${m.name} ${m.quantity}${m.unit || ""} (${m.type === "ingredient" ? "bahan" : "setengah jadi"})`).join(", ")}`;
        if (autoCreated.length > 0) result += `\n   🆕 Bahan baru dibuat: ${autoCreated.join(", ")}`;
      });
      return result;
    }

    case "add_recipe_by_name": {
      const { productName, ingredients } = params;
      if (!productName || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0)
        return "Parameter tidak lengkap.";
      let result = "";
      let productId = 0;
      await db.transaction(async (tx) => {
        const [product] = await tx.select({ id: productsTable.id }).from(productsTable)
          .where(and(eq(productsTable.branchId, bid), ilike(productsTable.name, `%${productName}%`))).limit(1);
        if (!product) throw new Error(`Produk "${productName}" tidak ditemukan.`);
        productId = product.id;
        const matched: { name: string; quantity: number; unit: string; id: number; type: string }[] = [];
        const autoCreated: string[] = [];
        for (const item of ingredients) {
          if (!item.name || !item.quantity) continue;
          let comp = await lookupComponent(tx, bid, item.name);
          if (!comp) {
            const [ins] = await tx.insert(ingredientsTable).values({ branchId: bid, name: item.name, unit: item.unit || "g" }).returning({ id: ingredientsTable.id });
            comp = { id: ins.id, type: "ingredient" };
            autoCreated.push(item.name);
          }
          matched.push({ name: item.name, quantity: item.quantity, unit: item.unit || "", id: comp.id, type: comp.type });
        }
        if (matched.length === 0) throw new Error(`Tidak ada bahan yang ditemukan untuk resep "${productName}".`);
        for (const m of matched) {
          await tx.insert(recipesTable).values({ parentType: "product", parentId: product.id, componentType: m.type, componentId: m.id, quantity: String(m.quantity) });
        }
        result = `✅ Resep "${productName}" ditambahkan: ${matched.map((m: any) => `${m.name} ${m.quantity}${m.unit || ""} (${m.type === "ingredient" ? "bahan" : "setengah jadi"})`).join(", ")}`;
        if (autoCreated.length > 0) result += `\n   🆕 Bahan baru dibuat: ${autoCreated.join(", ")}`;
      });
      EventPublisher.publish(createRecipeChangedEvent({
        productId, productName, branchId: bid, action: "created",
      }));
      return result;
    }

    case "update_recipe": {
      const { productName, ingredients } = params;
      if (!productName || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0)
        return "Parameter tidak lengkap.";
      const productId = await resolveProductId(productName, bid);
      if (!productId) return `Produk "${productName}" tidak ditemukan.`;
      let result = "";
      await db.transaction(async (tx) => {
        await tx.delete(recipesTable).where(and(eq(recipesTable.parentType, "product"), eq(recipesTable.parentId, productId)));
        const matched: { name: string; quantity: number; unit: string; id: number; type: string }[] = [];
        const autoCreated: string[] = [];
        for (const item of ingredients) {
          if (!item.name || !item.quantity) continue;
          let comp = await lookupComponent(tx, bid, item.name);
          if (!comp) {
            const [ins] = await tx.insert(ingredientsTable).values({ branchId: bid, name: item.name, unit: item.unit || "g" }).returning({ id: ingredientsTable.id });
            comp = { id: ins.id, type: "ingredient" };
            autoCreated.push(item.name);
          }
          matched.push({ name: item.name, quantity: item.quantity, unit: item.unit || "", id: comp.id, type: comp.type });
        }
        if (matched.length === 0) throw new Error(`Tidak ada bahan yang ditemukan untuk "${productName}".`);
        for (const m of matched) {
          await tx.insert(recipesTable).values({ parentType: "product", parentId: productId, componentType: m.type, componentId: m.id, quantity: String(m.quantity) });
        }
        result = `✅ Resep "${productName}" diperbarui: ${matched.map((m: any) => `${m.name} ${m.quantity}${m.unit || ""} (${m.type === "ingredient" ? "bahan" : "setengah jadi"})`).join(", ")}`;
        if (autoCreated.length > 0) result += `\n   🆕 Bahan baru dibuat: ${autoCreated.join(", ")}`;
      });
      EventPublisher.publish(createRecipeChangedEvent({
        productId, productName, branchId: bid, action: "updated",
      }));
      return result;
    }

    case "update_price": {
      let { productId, productName, price } = params;
      if (!productId && productName) productId = await resolveProductId(productName, bid);
      if (!productId || !price) return "Parameter tidak lengkap.";
      const [prod] = await db.select({ price: productsTable.price }).from(productsTable).where(eq(productsTable.id, productId));
      if (!prod) return "Produk tidak ditemukan.";
      const [variant] = await db.select({ id: productVariantsTable.id }).from(productVariantsTable).where(eq(productVariantsTable.productId, productId)).limit(1);
      if (variant) return `❌ Produk "${productName}" memiliki varian. Gunakan "update_variant_price" untuk mengubah harga varian.`;
      await db.update(productsTable).set({ price: String(price) }).where(eq(productsTable.id, productId));
      return `✅ Harga produk diubah menjadi Rp${Number(price).toLocaleString("id-ID")}.`;
    }

    case "deactivate_product": {
      let { productId, productName } = params;
      if (!productId && productName) productId = await resolveProductId(productName, bid);
      if (!productId) return "Parameter tidak lengkap.";
      await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, productId));
      return "✅ Produk berhasil dinonaktifkan.";
    }

    case "add_expense": {
      const { description, amount } = params;
      if (!amount) return "Nominal pengeluaran tidak boleh kosong.";
      const [exp] = await db.insert(expensesTable).values({ branchId: bid, description: description || "Pengeluaran", amount: String(amount) }).returning({ id: expensesTable.id });
      EventPublisher.publish(createExpenseRecordedEvent({
        branchId: bid, expenseId: exp.id, amount: Number(amount),
        category: null, description: description || "Pengeluaran",
      }));
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
      let { itemId, itemName, producedWeight } = params;
      if (!itemId && itemName) {
        const resolved = await resolveItemId(itemName, bid, "semi_finished");
        if (!resolved) return `Item "${itemName}" tidak ditemukan.`;
        itemId = resolved.id;
      }
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
      const sfName = await db.select({ name: semiFinishedTable.name }).from(semiFinishedTable).where(eq(semiFinishedTable.id, itemId)).limit(1);
      EventPublisher.publish(createBatchProducedEvent({
        branchId: bid, semiFinishedId: Number(itemId),
        semiFinishedName: sfName[0]?.name ?? `item-${itemId}`,
        producedWeight: Number(producedWeight), totalCost, newHpp: 0,
      }));
      return "ok";
    }

    case "get_inventory_status": {
      if (bid > 0) {
        const all = await listInventoryForBranch(bid);
        if (all.length === 0) return "Inventaris kosong.";
        const grouped: Record<string, { name: string; stock: number; unit: string }[]> = {};
        for (const i of all) {
          const t = i.itemType || "ingredient";
          if (!grouped[t]) grouped[t] = [];
          grouped[t].push({ name: i.name, stock: i.currentStock, unit: i.unit || "" });
        }
        let text = "";
        for (const [type, items] of Object.entries(grouped)) {
          text += `\n${type === "ingredient" ? "BAHAN" : "SETENGAH JADI"}:\n`;
          for (const it of items) text += `  - ${it.name}: ${it.stock} ${it.unit}\n`;
        }
        return text.trim();
      }
      // All branches
      const branches = await db.select({ id: branchesTable.id, name: branchesTable.name }).from(branchesTable);
      const parts: string[] = [];
      for (const b of branches) {
        const inv = await listInventoryForBranch(b.id);
        if (inv.length > 0) {
          parts.push(`\n## Cabang ${b.name} (ID:${b.id})`);
          for (const i of inv) parts.push(`  ${i.itemType === "ingredient" ? "BAHAN" : "SETENGAH JADI"} — ${i.name}: ${i.currentStock} ${i.unit}`);
        }
      }
      return parts.join("\n").trim() || "Tidak ada data inventaris.";
    }

    case "get_sales_summary": {
      const { period, startDate, endDate } = params;
      let dateFilter;
      const now = new Date();
      if (startDate || endDate) {
        const conds: any[] = [];
        if (startDate) conds.push(gte(ordersTable.createdAt, sql`${startDate}::date`));
        if (endDate) conds.push(lte(ordersTable.createdAt, sql`${endDate}::date + interval '1 day'`));
        dateFilter = conds.length > 0 ? and(...conds) : undefined;
      } else if (period === "today") {
        dateFilter = gte(ordersTable.createdAt, sql`CURRENT_DATE`);
      } else if (period === "yesterday") {
        dateFilter = and(gte(ordersTable.createdAt, sql`CURRENT_DATE - INTERVAL '1 day'`), lt(ordersTable.createdAt, sql`CURRENT_DATE`));
      } else if (period === "week") {
        dateFilter = gte(ordersTable.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`);
      } else if (period === "month") {
        dateFilter = gte(ordersTable.createdAt, sql`CURRENT_DATE - INTERVAL '30 days'`);
      } else {
        dateFilter = gte(ordersTable.createdAt, sql`CURRENT_DATE`);
      }
      const branchCond = bid > 0 ? eq(ordersTable.branchId, bid) : undefined;
      const sales = await db
        .select({
          total: sql`COALESCE(SUM(${ordersTable.total}), 0)`,
          count: sql`COUNT(*)`,
        })
        .from(ordersTable)
        .where(and(branchCond, eq(ordersTable.status, "completed"), dateFilter));
      const row = sales[0] as any;
      const periodLabel = startDate ? `${startDate}${endDate ? ` - ${endDate}` : ""}` : period || "Hari Ini";
      const label = bid > 0 ? "" : " (Semua Cabang)";
      return `💰 Ringkasan Penjualan${label}\nPeriode: ${periodLabel}\nTotal: Rp${Number(row.total).toLocaleString("id-ID")}\nTransaksi: ${row.count}`;
    }

    case "get_top_products": {
      const limit = params.limit || 5;
      const branchCond = bid > 0 ? eq(ordersTable.branchId, bid) : undefined;
      const top = await db
        .select({
          name: orderItemsTable.productName,
          totalSold: sql`SUM(${orderItemsTable.quantity})`,
          totalRevenue: sql`SUM(${orderItemsTable.subtotal})`,
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(branchCond)
        .groupBy(orderItemsTable.productName)
        .orderBy(desc(sql`SUM(${orderItemsTable.quantity})`))
        .limit(limit);
      if (top.length === 0) return "Belum ada data penjualan.";
      const label = bid > 0 ? "" : " (Semua Cabang)";
      let text = `🏆 Produk Terlaris${label}:\n`;
      top.forEach((item: any, i: number) => {
        text += `${i + 1}. ${item.name} — ${item.totalSold} terjual (Rp${Number(item.totalRevenue).toLocaleString("id-ID")})\n`;
      });
      return text.trim();
    }

    case "get_products": {
      const branchCond = bid > 0 ? eq(productsTable.branchId, bid) : undefined;
      const allProducts = await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          price: productsTable.price,
          isActive: productsTable.isActive,
          variantId: productVariantsTable.id,
          variantName: productVariantsTable.name,
          variantPrice: productVariantsTable.price,
        })
        .from(productsTable)
        .leftJoin(productVariantsTable, eq(productVariantsTable.productId, productsTable.id))
        .where(branchCond)
        .orderBy(productsTable.name);
      if (allProducts.length === 0) return "Belum ada produk terdaftar.";
      const grouped: Record<string, { price: string; isActive: boolean; variants: { name: string; price: string }[] }> = {};
      for (const p of allProducts) {
        if (!grouped[p.name]) grouped[p.name] = { price: p.price, isActive: p.isActive, variants: [] };
        if (p.variantName) grouped[p.name].variants.push({ name: p.variantName, price: p.variantPrice });
      }
      let text = `📋 Daftar Produk:\n`;
      for (const [name, info] of Object.entries(grouped)) {
        const status = info.isActive ? "✅ Aktif" : "⛔ Nonaktif";
        if (info.variants.length > 0) {
          const varList = info.variants.map(v => `  - ${v.name}: Rp${Number(v.price).toLocaleString("id-ID")}`).join("\n");
          text += `\n${name} (${status})\n${varList}`;
        } else {
          text += `\n${name}: Rp${Number(info.price).toLocaleString("id-ID")} (${status})`;
        }
      }
      return text.trim();
    }

    case "get_shift_audit": {
      const { period, limit: auditLimit } = params;
      const conditions: any[] = bid > 0 ? [eq(shiftAuditsTable.branchId, bid)] : [];
      const now = new Date();
      if (period === "today") {
        conditions.push(gte(shiftAuditsTable.createdAt, sql`CURRENT_DATE`));
      } else if (period === "yesterday") {
        conditions.push(and(gte(shiftAuditsTable.createdAt, sql`CURRENT_DATE - INTERVAL '1 day'`), lt(shiftAuditsTable.createdAt, sql`CURRENT_DATE`)));
      } else if (period === "week") {
        conditions.push(gte(shiftAuditsTable.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`));
      } else if (period === "month") {
        conditions.push(gte(shiftAuditsTable.createdAt, sql`CURRENT_DATE - INTERVAL '30 days'`));
      }
      const audits = await db
        .select({
          id: shiftAuditsTable.id,
          branchId: shiftAuditsTable.branchId,
          status: shiftAuditsTable.status,
          openingBalance: shiftAuditsTable.openingBalance,
          closingBalance: shiftAuditsTable.closingBalance,
          expectedBalance: shiftAuditsTable.expectedBalance,
          shiftStart: shiftAuditsTable.shiftStart,
          shiftEnd: shiftAuditsTable.shiftEnd,
          expectedStockJson: shiftAuditsTable.expectedStockJson,
          actualStockJson: shiftAuditsTable.actualStockJson,
          notes: shiftAuditsTable.notes,
          createdAt: shiftAuditsTable.createdAt,
          branchName: branchesTable.name,
        })
        .from(shiftAuditsTable)
        .leftJoin(branchesTable, eq(shiftAuditsTable.branchId, branchesTable.id))
        .where(and(...conditions))
        .orderBy(desc(shiftAuditsTable.createdAt))
        .limit(auditLimit || 10);
      if (audits.length === 0) return "Belum ada data audit shift.";
      const parts: string[] = [];
      for (const a of audits) {
        const branch = a.branchName || `Cabang ${a.branchId}`;
        parts.push(`\n[AUDIT #${a.id}] ${branch} — Status: ${a.status}`);

        // Cash reconciliation
        const openBal = a.openingBalance ? Number(a.openingBalance) : 0;
        const closeBal = a.closingBalance ? Number(a.closingBalance) : 0;
        const expBal = a.expectedBalance ? Number(a.expectedBalance) : 0;
        const cashDiff = closeBal - expBal;
        parts.push(`   Kas: Buka Rp${openBal.toLocaleString("id-ID")} → Tutup Rp${closeBal.toLocaleString("id-ID")}`);
        parts.push(`   Expected: Rp${expBal.toLocaleString("id-ID")} | Selisih: ${cashDiff >= 0 ? "+" : ""}Rp${cashDiff.toLocaleString("id-ID")}`);
        parts.push(`   Shift: ${a.shiftStart ? a.shiftStart.toLocaleString("id-ID") : "-"} → ${a.shiftEnd ? a.shiftEnd.toLocaleString("id-ID") : "berlangsung"}`);

        // Stock reconciliation (expectedStockJson vs actualStockJson)
        const expected = (a.expectedStockJson as any[]) ?? [];
        const actual = (a.actualStockJson as any[]) ?? [];
        if (expected.length > 0 && actual.length > 0) {
          const actualMap = new Map(actual.map((x: any) => [`${x.itemType}:${x.itemId}`, x]));
          const anomalies: { name: string; expected: number; actual: number; diff: number; loss: number }[] = [];
          for (const exp of expected) {
            const act = actualMap.get(`${exp.itemType}:${exp.itemId}`);
            const actQty = act ? Number(act.quantity) : 0;
            const expQty = Number(exp.quantity);
            const diff = actQty - expQty;
            const pct = expQty > 0 ? (diff / expQty) * 100 : 0;
            if (Math.abs(pct) > 5) {
              anomalies.push({ name: exp.name, expected: expQty, actual: actQty, diff, loss: Math.abs(diff) * (Number(exp.hpp) || Number(exp.costPricePerUnit) || 0) });
            }
          }
          if (anomalies.length > 0) {
            anomalies.sort((a, b) => b.loss - a.loss);
            parts.push(`   📊 Anomali Stok (${anomalies.length} item):`);
            for (const an of anomalies) {
              const flag = Math.abs(an.diff / an.expected) > 0.2 ? "🔴" : Math.abs(an.diff / an.expected) > 0.1 ? "🟡" : "🟢";
              parts.push(`     ${flag} ${an.name}: expected ${an.expected.toFixed(1)} → actual ${an.actual.toFixed(1)} (${an.diff > 0 ? "+" : ""}${an.diff.toFixed(1)}) kerugian Rp${an.loss.toLocaleString("id-ID")}`);
            }
          } else {
            parts.push(`   ✅ Stok: semua dalam batas normal (selisih <5%)`);
          }
        } else {
          parts.push(`   📄 Stok: tidak ada data rekonsiliasi`);
        }

        if (a.notes) {
          const parsedNotes = typeof a.notes === "string" ? (() => { try { return JSON.parse(a.notes); } catch { return a.notes; } })() : a.notes;
          const noteStr = typeof parsedNotes === "object" ? JSON.stringify(parsedNotes) : parsedNotes;
          parts.push(`   📝 Catatan: ${noteStr.substring(0, 300)}`);
        }
      }
      return parts.join("\n").trim();
    }

    case "change_role": {
      let { userId, userEmail, newRole } = params;
      if (!newRole) return "Role baru tidak boleh kosong.";
      const validRoles = ["owner", "manager", "cashier"];
      if (!validRoles.includes(newRole)) return `Role "${newRole}" tidak valid. Pilihan: ${validRoles.join(", ")}`;
      if (!userId && userEmail) {
        const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, userEmail)).limit(1);
        if (!user) return `User dengan email "${userEmail}" tidak ditemukan.`;
        userId = user.id;
      }
      if (!userId) return "Parameter tidak lengkap. Berikan userId atau userEmail.";
      await db.update(usersTable).set({ role: newRole }).where(eq(usersTable.id, userId));
      return `✅ Role user #${userId} diubah menjadi "${newRole}".`;
    }

    case "get_expenses": {
      const { period, category, startDate, endDate } = params;
      const conditions: any[] = bid > 0 ? [eq(expensesTable.branchId, bid)] : [];
      if (category) conditions.push(eq(expensesTable.category, category));
      const now = new Date();
      if (startDate || endDate) {
        if (startDate) conditions.push(gte(expensesTable.createdAt, sql`${startDate}::date`));
        if (endDate) conditions.push(lte(expensesTable.createdAt, sql`${endDate}::date + interval '1 day'`));
      } else if (period === "today") {
        conditions.push(gte(expensesTable.createdAt, sql`CURRENT_DATE`));
      } else if (period === "yesterday") {
        conditions.push(and(gte(expensesTable.createdAt, sql`CURRENT_DATE - INTERVAL '1 day'`), lt(expensesTable.createdAt, sql`CURRENT_DATE`)));
      } else if (period === "week") {
        conditions.push(gte(expensesTable.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`));
      } else if (period === "month") {
        conditions.push(gte(expensesTable.createdAt, sql`CURRENT_DATE - INTERVAL '30 days'`));
      }
      const expenses = await db
        .select({
          total: sql`COALESCE(SUM(${expensesTable.amount}), 0)`,
          count: sql`COUNT(*)`,
          branchName: branchesTable.name,
        })
        .from(expensesTable)
        .leftJoin(branchesTable, eq(expensesTable.branchId, branchesTable.id))
        .where(and(...conditions));
      const row = expenses[0] as any;
      const label = bid > 0 ? "" : " (Semua Cabang)";
      const periodLabel = startDate ? `${startDate}${endDate ? ` - ${endDate}` : ""}` : period || "";
      let text = `💸 Ringkasan Pengeluaran${periodLabel ? ` (${periodLabel})` : ""}${label}`;
      if (category) text += ` - Kategori: ${category}`;
      text += `\nTotal: Rp${Number(row.total).toLocaleString("id-ID")}\nJumlah transaksi: ${row.count}`;
      return text.trim();
    }

    case "list_branches": {
      const branches = await db
        .select({ id: branchesTable.id, name: branchesTable.name, location: branchesTable.location })
        .from(branchesTable)
        .orderBy(branchesTable.id);
      if (branches.length === 0) return "Belum ada cabang terdaftar.";
      let text = `📍 Daftar Cabang (${branches.length}):\n`;
      for (const b of branches) {
        text += `  - ID ${b.id}: ${b.name}${b.location ? ` (${b.location})` : ""}\n`;
      }
      return text.trim();
    }

    case "migrate_branch": {
      const { sourceBranchName, targetBranchName, products, ingredients, recipes, inventory } = params;
      if (!sourceBranchName || !targetBranchName) return "Parameter tidak lengkap. Berikan sourceBranchName dan targetBranchName.";
      const [source] = await db.select({ id: branchesTable.id }).from(branchesTable)
        .where(ilike(branchesTable.name, `%${sourceBranchName}%`)).limit(1);
      if (!source) return `Cabang sumber "${sourceBranchName}" tidak ditemukan.`;
      const [target] = await db.select({ id: branchesTable.id }).from(branchesTable)
        .where(ilike(branchesTable.name, `%${targetBranchName}%`)).limit(1);
      if (!target) return `Cabang target "${targetBranchName}" tidak ditemukan.`;
      const sourceId = source.id;
      const targetId = target.id;
      if (sourceId === targetId) return "Cabang sumber dan target harus berbeda.";
      let migrated = 0;
      await db.transaction(async (tx) => {
        // Migrate products
        if (products !== false) {
          const sourceProducts = await tx.select().from(productsTable).where(eq(productsTable.branchId, sourceId));
          for (const p of sourceProducts) {
            const [existing] = await tx.select({ id: productsTable.id }).from(productsTable)
              .where(and(eq(productsTable.branchId, targetId), eq(productsTable.name, p.name))).limit(1);
            if (!existing) {
              await tx.insert(productsTable).values({ branchId: targetId, name: p.name, price: p.price, isActive: p.isActive });
              migrated++;
            }
          }
        }
        // Migrate ingredients
        if (ingredients !== false) {
          const sourceIngredients = await tx.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, sourceId));
          for (const i of sourceIngredients) {
            const [existing] = await tx.select({ id: ingredientsTable.id }).from(ingredientsTable)
              .where(and(eq(ingredientsTable.branchId, targetId), eq(ingredientsTable.name, i.name))).limit(1);
            if (!existing) {
              await tx.insert(ingredientsTable).values({ branchId: targetId, name: i.name, unit: i.unit });
              migrated++;
            }
          }
        }
        // Migrate semi-finished
        if (recipes !== false) {
          const sourceSf = await tx.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, sourceId));
          for (const sf of sourceSf) {
            const [existing] = await tx.select({ id: semiFinishedTable.id }).from(semiFinishedTable)
              .where(and(eq(semiFinishedTable.branchId, targetId), eq(semiFinishedTable.name, sf.name))).limit(1);
            if (!existing) {
              await tx.insert(semiFinishedTable).values({ branchId: targetId, name: sf.name, unit: sf.unit, yieldQuantity: sf.yieldQuantity, yieldUnit: sf.yieldUnit });
              migrated++;
            }
          }
        }
      });
      return `✅ Migrasi dari "${sourceBranchName}" ke "${targetBranchName}" selesai. ${migrated} item baru dibuat di cabang target.`;
    }

    case "general": {
      return params.query || "Tidak ada pertanyaan.";
    }

    default:
      return `Aksi "${action}" belum didukung.`;
  }
}
