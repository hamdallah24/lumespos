// ─────────────────────────────────────────────────────────────
// AI BUSINESS — analyzeIntent + execute operations
// All conversation flows handled by COO DeepSeek
// ─────────────────────────────────────────────────────────────
import { db, ingredientsTable, semiFinishedTable, productsTable, expensesTable, ordersTable, orderItemsTable, stockAdjustmentsTable, productVariantsTable, recipesTable, currentInventoryTable } from "@workspace/db";
import { eq, and, gte, lte, sum, desc, sql } from "drizzle-orm";
import { listInventoryForBranch, LOW_STOCK_DEFAULT, adjustInventory, applyMovingAverage, getRecipeRows, getInventoryStock } from "../services/inventory";

// ── PRODUCTION HELPERS ──
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
// 1. EXECUTE OPERATIONS (called from COO when intent detected)
// ─────────────────────────────────────────────────────────────

export type OpResult = string; // friendly response

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
          notes: price > 0 ? `via COO: tambah stok (Rp ${price.toLocaleString("id-ID")})` : `via COO: tambah stok`,
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

    case "add_product_with_variants": {
      const { name, variants } = params;
      if (!name || !variants?.length) return "Parameter tidak lengkap.";
      const basePrice = String(variants[0].price || 0);
      const [prod] = await db.insert(productsTable).values({ branchId: bid, name, price: basePrice }).returning({ id: productsTable.id });
      for (const v of variants) {
        await db.insert(productVariantsTable).values({ productId: prod.id, name: v.name, price: String(v.price) });
      }
      return "ok";
    }

    case "update_price": {
      const { productId, price } = params;
      if (!productId || !price) return "Parameter tidak lengkap.";
      await db.update(productsTable).set({ price: String(price) }).where(eq(productsTable.id, productId));
      return "ok";
    }

    case "update_variant_price": {
      const { variantId, price } = params;
      if (!variantId || !price) return "Parameter tidak lengkap.";
      await db.update(productVariantsTable).set({ price: String(price) }).where(eq(productVariantsTable.id, variantId));
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
      console.log(`[COO] Expense recorded: ${description || "Pengeluaran"} Rp ${amount} (branch ${bid})`);
      return "ok";
    }

    case "add_recipe": {
      const { parentType, parentId, ingredientId, quantity, componentType } = params;
      if (!parentType || !parentId || !ingredientId || !quantity) return "Parameter tidak lengkap.";
      await db.insert(recipesTable).values({
        parentType, parentId, componentType: componentType || "ingredient", componentId: ingredientId, quantity: String(quantity),
      });
      return "ok";
    }

    case "remove_recipe": {
      const { recipeId } = params;
      if (!recipeId) return "Parameter tidak lengkap.";
      await db.delete(recipesTable).where(eq(recipesTable.id, recipeId));
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
      return "Unknown action: " + action;
  }
}

// ─────────────────────────────────────────────────────────────
// 2. ANALYZE INTENT — detect what user wants + build DB context
// ─────────────────────────────────────────────────────────────

export type Analysis = {
  intent: string;
  params?: Record<string, any>;
  context?: Record<string, any>;
};

export async function analyzeIntent(msg: string, branchId: number): Promise<Analysis> {
  const lower = msg.toLowerCase().trim();

  // ── LOW STOCK ──
  if (/(?:stok|bahan).*(menipis|habis|sedikit|kritis|tipis|abis)|low.?stock/i.test(lower)) {
    const all = await listInventoryForBranch(branchId);
    const low = all.filter((i) => {
      const limit = i.itemType === "ingredient" && i.minimalStock && i.minimalStock > 0 ? i.minimalStock : LOW_STOCK_DEFAULT;
      return i.currentStock < limit;
    });
    return { intent: "check_low_stock", context: { branchId, lowItems: low.slice(0, 15), total: all.length } };
  }

  // ── LIST / SEARCH STOCK ──
  if (/lihat\s+stok|cek\s+stok|inventori|semua\s+(stok|bahan)/i.test(lower)) {
    const all = await listInventoryForBranch(branchId);
    return { intent: "list_inventory", context: { branchId, items: all, total: all.length } };
  }

  if (/cari\s+(\w{3,})|stok\s+(\w{3,})/i.test(lower)) {
    const nameMatch = lower.match(/cari\s+(\w{3,})|stok\s+(\w{3,})/i);
    const search = (nameMatch?.[1] || nameMatch?.[2] || "").trim();
    if (search.length >= 3) {
      const all = await listInventoryForBranch(branchId);
      const found = all.filter((i) => i.name.toLowerCase().includes(search));
      return { intent: "search_stock", context: { branchId, search, items: found } };
    }
  }

  // ── LIST MENU ──
  if (/lihat\s+(produk|menu)/i.test(lower)) {
    const products = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true)));
    return { intent: "list_products", context: { branchId, items: products } };
  }

  // ── LAPORAN ──
  if (/laporan|pendapatan|keuntungan|omzet|profit|revenue/i.test(lower)) {
    const now = new Date();
    let start = new Date(now); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
    let end = new Date(now); end.setHours(23, 59, 59, 999);
    let label = "30 hari terakhir";

    const rangeMatch = lower.match(/dari\s+(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\s+(?:sampai|s\.d|hingga)\s+(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i);
    if (rangeMatch) {
      const months: Record<string, number> = { januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5, juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11 };
      start = new Date(+rangeMatch[3], months[rangeMatch[2]], +rangeMatch[1], 0, 0, 0, 0);
      end = new Date(+rangeMatch[6], months[rangeMatch[5]], +rangeMatch[4], 23, 59, 59, 999);
      label = `${rangeMatch[1]} ${rangeMatch[2]} ${rangeMatch[3]} — ${rangeMatch[4]} ${rangeMatch[5]} ${rangeMatch[6]}`;
    } else if (/hari\s*ini|today/i.test(lower)) { start = new Date(now); start.setHours(0, 0, 0, 0); end = new Date(now); end.setHours(23, 59, 59, 999); label = "hari ini"; }
    else if (/kemarin|yesterday/i.test(lower)) { start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999); label = "kemarin"; }
    else if (/7\s*hari|seminggu/i.test(lower)) { start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); label = "7 hari terakhir"; }
    else if (/14\s*hari|2\s*minggu/i.test(lower)) { start = new Date(now); start.setDate(start.getDate() - 14); start.setHours(0, 0, 0, 0); label = "14 hari terakhir"; }
    else if (/bulan\s*ini/i.test(lower)) { start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); label = "bulan ini"; }
    else if (/bulan\s*lalu/i.test(lower)) { start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0); end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); label = "bulan lalu"; }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [stats] = await db.select({
      revenue: sum(ordersTable.total), cogs: sum(ordersTable.totalCogs), count: sql<number>`count(${ordersTable.id})`,
    }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), eq(ordersTable.branchId, branchId)));
    const [exp] = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), eq(expensesTable.branchId, branchId)));
    const rev = parseFloat(stats?.revenue ?? "0");
    const cogs = parseFloat(stats?.cogs ?? "0");
    const expense = parseFloat(exp?.total ?? "0");

    const topProducts = await db.select({
      name: productsTable.name, total: sum(ordersTable.total), count: sql<number>`count(${ordersTable.id})`,
    }).from(orderItemsTable)
      .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
      .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
      .where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), eq(ordersTable.branchId, branchId)))
      .groupBy(productsTable.name).orderBy(desc(sql`sum(${ordersTable.total})`)).limit(5);

    return { intent: "financial_report", context: { branchId, label, revenue: rev, cogs, expense, profit: rev - cogs - expense, orderCount: stats?.count ?? 0, topProducts } };
  }

  // ── LIST INGREDIENTS ──
  if (/lihat\s+(bahan|ingredient|daftar\s+bahan)/i.test(lower)) {
    const items = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, branchId));
    return { intent: "list_ingredients", context: { branchId, items } };
  }

  // ── PRODUCTION ──
  if (/produksi|bikin\s+setengah\s+jadi/i.test(lower)) {
    const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branchId));
    return { intent: "list_semi_finished", context: { branchId, items } };
  }

  // ── LIST RECIPES ──
  if (/lihat\s+resep|daftar\s+resep/i.test(lower)) {
    const products = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true)));
    const semis = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branchId));
    return { intent: "list_recipes", context: { branchId, products, semiFinished: semis } };
  }

  // ── LIST VARIANTS ──
  if (/lihat\s+varian/i.test(lower)) {
    const products = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true)));
    return { intent: "list_variants", context: { branchId, products } };
  }

  // ── SHIFT ANALYSIS ──
  if (/analisis\s+shift|shift\s+analysis/i.test(lower)) {
    const [latest] = await db.select().from(sql`shift_audits`).where(and(sql`branch_id = ${branchId}`, sql`actual_stock_json IS NOT NULL`)).orderBy(desc(sql`created_at`)).limit(1) as any[];
    if (latest) return { intent: "shift_analysis", context: { shiftId: latest.id, branchId, status: latest.status } };
    return { intent: "shift_analysis", context: { shiftId: null, note: "No shift data found." } };
  }

  // ── STOCK ADJUST INTENT (add/reduce/correct/loss) ──
  // Unified search: ingredients + semi_finished
  const searchAll = async (branchId: number, name: string) => {
    const [ings, semis] = await Promise.all([
      db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, branchId)),
      db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branchId)),
    ]);
    const all = [...ings.map(i => ({ ...i, itemType: "ingredient" as const, itemId: i.id, unit: i.unit, costPricePerUnit: i.costPricePerUnit })),
      ...semis.map(s => ({ ...s, itemType: "semi_finished" as const, itemId: s.id, unit: s.unit, costPricePerUnit: s.costPricePerUnit }))];
    return all.find(i => i.name.toLowerCase().includes(name));
  };

  const stockMatch = lower.match(/tambah\s+(?!produk|menu)(?:stok\s+)?(.+?)\s+(\d+)(?:\s*(?:ml|l|kg|g|pcs|liter|gram|ons|gr))?(?:\s+(\d+))?/i);
  if (stockMatch) {
    const found = await searchAll(branchId, stockMatch[1].trim());
    if (found) {
      const stock = await db.select({ s: currentInventoryTable.currentStock }).from(currentInventoryTable)
        .where(and(eq(currentInventoryTable.itemType, found.itemType), eq(currentInventoryTable.itemId, found.itemId), eq(currentInventoryTable.branchId, branchId)));
      const currentStock = parseFloat(stock[0]?.s || "0");
      const price = stockMatch[3] ? parseFloat(stockMatch[3]) : undefined;
      return { intent: "add_stock", params: { itemId: found.itemId, itemType: found.itemType, name: found.name, qty: parseFloat(stockMatch[2]), unit: found.unit || "unit", currentStock, hpp: parseFloat(found.costPricePerUnit || "0"), price } };
    }
  }

  const reduceMatch = lower.match(/kurangi\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+(\d+)/i);
  if (reduceMatch) {
    const found = await searchAll(branchId, reduceMatch[1].trim());
    if (found) return { intent: "reduce_stock", params: { itemId: found.itemId, itemType: found.itemType, name: found.name, qty: parseFloat(reduceMatch[2]), unit: found.unit || "unit" } };
  }

  const correctMatch = lower.match(/koreksi\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i);
  if (correctMatch) {
    const all = await listInventoryForBranch(branchId);
    const found = all.find((i) => i.name.toLowerCase().includes(correctMatch[1].trim()));
    if (found) return { intent: "correct_stock", params: { itemId: found.itemId, itemType: found.itemType, name: found.name, target: parseFloat(correctMatch[2]), currentStock: found.currentStock, unit: found.unit } };
  }

  const lossMatch = lower.match(/koreksi\s+hilang\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i);
  if (lossMatch) {
    const found = await searchAll(branchId, lossMatch[1].trim());
    if (found) return { intent: "loss_correction", params: { itemId: found.itemId, itemType: found.itemType, name: found.name, qty: parseFloat(lossMatch[2]), unit: found.unit || "unit" } };
  }

  // ── ADD EXPENSE ──
  const expenseMatch = lower.match(/catat\s+(?:pengeluaran|biaya|belanja)\s+(\d+)/i);
  if (expenseMatch) return { intent: "add_expense", params: { amount: parseFloat(expenseMatch[1]) } };

  // ── PRICE CHANGE ──
  const priceMatch = lower.match(/ubah\s+harga\s+(.+?)\s+jadi\s+(\d+)/i);
  if (priceMatch) {
    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true)));
    const found = prods.find((p) => p.name.toLowerCase().includes(priceMatch[1].trim()));
    if (found) return { intent: "update_price", params: { productId: found.id, name: found.name, oldPrice: found.price, newPrice: priceMatch[2] } };
  }

  // ── ADD PRODUCT ──
  const prodMatch = lower.match(/tambah\s+(?:produk|menu)\s+(.+?)\s+(\d{3,})/i);
  if (prodMatch) return { intent: "add_product", params: { name: prodMatch[1].trim(), price: parseInt(prodMatch[2]) } };

  // ── DEACTIVATE ──
  const delMatch = lower.match(/(?:hapus|nonaktifkan)\s+(.+)/i);
  if (delMatch) {
    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true)));
    const found = prods.find((p) => p.name.toLowerCase().includes(delMatch[1].trim()));
    if (found) return { intent: "deactivate_product", params: { productId: found.id, name: found.name } };
  }

  // ── ADD RECIPE ──
  const recipeMatch = lower.match(/tambah\s+resep\s+(\w+(?:\s+\w+)*?)\s+butuh\s+(\w+(?:\s+\w+)*?)\s+([\d.]+)/i);
  if (recipeMatch) {
    const [prods, semis] = await Promise.all([
      db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true))),
      db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branchId)),
    ]);
    const parentName = recipeMatch[1].trim();
    const product = prods.find(p => p.name.toLowerCase().includes(parentName));
    const semi = semis.find(s => s.name.toLowerCase().includes(parentName));
    if (!product && !semi) return { intent: "add_recipe" };
    const parent = product ? { id: product.id, name: product.name, type: "product" } : { id: semi!.id, name: semi!.name, type: "semi_finished" };

    const compName = recipeMatch[2].trim();
    const ings = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, branchId));
    const ing = ings.find(i => i.name.toLowerCase().includes(compName));
    const sComp = semis.find(s => s.name.toLowerCase().includes(compName));
    if (ing) return { intent: "add_recipe", params: { parentType: parent.type, parentId: parent.id, parentName: parent.name, ingredientId: ing.id, ingredientName: ing.name, quantity: recipeMatch[3] } };
    if (sComp) return { intent: "add_recipe", params: { parentType: parent.type, parentId: parent.id, parentName: parent.name, ingredientId: sComp.id, ingredientName: sComp.name, componentType: "semi_finished", quantity: recipeMatch[3] } };
    return { intent: "add_recipe" };
  }

  // ── MULTI-STOCK: "tambah stok: kopi 1000, susu 2000" ──
  const multiMatch = lower.match(/tambah\s+stok\s*:\s*(.+)/i);
  if (multiMatch) {
    const pairs = multiMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const items: any[] = [];
    const allIngs = await db.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, branchId)));
    for (const pair of pairs) {
      const pm = pair.match(/(.+?)\s+(\d+)/);
      if (pm) {
        const name = pm[1].trim();
        const qty = parseFloat(pm[2]);
        const found = allIngs.find((i) => i.name.toLowerCase().includes(name));
        if (found) items.push({ itemId: found.id, name: found.name, qty, unit: found.unit, hpp: parseFloat(found.costPricePerUnit || "0") });
        else items.push({ name, qty, notFound: true });
      }
    }
    if (items.length > 0) return { intent: "multi_add_stock", context: { branchId, items, total: items.length } };
  }

  // ── ANALYSIS / GENERAL ──
  return { intent: "general_analysis" };
}
