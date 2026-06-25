// ─────────────────────────────────────────────────────────────
// AI BUSINESS HANDLER — Query DB langsung untuk operasi bisnis
// ─────────────────────────────────────────────────────────────
import { db, ingredientsTable, semiFinishedTable, productsTable, expensesTable, ordersTable, stockAdjustmentsTable, productVariantsTable, recipesTable, currentInventoryTable } from "@workspace/db";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { listInventoryForBranch, LOW_STOCK_DEFAULT, adjustInventory, applyMovingAverage, getRecipeRows, getInventoryStock } from "../services/inventory";

// ── PRODUCTION HELPERS (replikasi dari semiFinished.ts) ──
async function getComponentCost(tx: any, componentType: string, componentId: number): Promise<number> {
  if (componentType === "semi_finished") {
    const [sf] = await tx.select({ costPricePerUnit: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, componentId));
    return sf ? parseFloat(sf.costPricePerUnit) : 0;
  }
  const [ing] = await tx.select({ costPricePerUnit: ingredientsTable.costPricePerUnit }).from(ingredientsTable).where(eq(ingredientsTable.id, componentId));
  return ing ? parseFloat(ing.costPricePerUnit) : 0;
}

async function getCurrentStockLocal(tx: any, branchId: number, itemId: number): Promise<number> {
  const [stock] = await tx.select({ s: currentInventoryTable.currentStock }).from(currentInventoryTable)
    .where(and(eq(currentInventoryTable.itemType, "semi_finished"), eq(currentInventoryTable.itemId, itemId), eq(currentInventoryTable.branchId, branchId)));
  return stock ? parseFloat(stock.s) : 0;
}

// ── PENDING STATE for guardline confirmation ──
const pendingStockIn = new Map<number, { itemId: number; name: string; qty: number; unit: string; branchId: number }>();
const pendingProduction = new Map<number, { itemId: number; name: string; qty: number; branchId: number; components: { type: string; id: number; name: string; qty: number }[] }>();

export async function handleBusiness(msg: string, branchId: number): Promise<string> {
  // Anti-typo: normalize common misspellings
  let normalized = msg.toLowerCase().trim();
  const fixes: [RegExp, string][] = [
    [/setok/gi, "stok"], [/stik/gi, "stok"], [/stol/gi, "stok"],
    [/meniis/gi, "menipis"], [/mnipis/gi, "menipis"], [/menepis/gi, "menipis"],
    [/laoran/gi, "laporan"], [/lapran/gi, "laporan"], [/laporn/gi, "laporan"],
    [/hps/gi, "hapus"], [/hpus/gi, "hapus"],
    [/tmabah/gi, "tambah"], [/tmbah/gi, "tambah"], [/tamabah/gi, "tambah"],
    [/kurangi/gi, "kurangi"], [/kuraing/gi, "kurangi"], [/krangi/gi, "kurangi"],
    [/koreks/gi, "koreksi"], [/korek/gi, "koreksi"], [/kreksi/gi, "koreksi"],
    [/pngeluaran/gi, "pengeluaran"], [/pengeluran/gi, "pengeluaran"],
    [/harg/gi, "harga"], [/hrga/gi, "harga"],
    [/produks/gi, "produksi"], [/produsi/gi, "produksi"],
    [/nonaktip/gi, "nonaktifkan"],
    [/lnjot/gi, "lanjutkan"],
    [/klrif/gi, "klarifikasi"],
    [/brapa/gi, "berapa"],
    [/menu/gi, "menu"],
    [/inventori/gi, "inventori"], [/invntry/gi, "inventori"],
  ];
  for (const [re, replacement] of fixes) {
    normalized = normalized.replace(re, replacement);
  }

  const lower = normalized;
  const bid = branchId;
  const branchMatch = lower.match(/(?:cabang|branch)\s*(?:id\s*)?(\d+)/i);
  const userBranchId = branchMatch ? parseInt(branchMatch[1]) : bid;
  const uid = userBranchId; // use branch as user context for pending maps

  // ── GUARDLINE CONFIRMATION HANDLER ──
  // User replied "ya/setuju/lanjut/jalanin" OR just a number (harga beli)
  const isConfirm = /^(?:ya|y|yes|setuju|lanjutkan|lanjut|ok|oke|jalan|gas)\b/i.test(lower);
  const isNumber = /^\d+$/.test(lower);
  const pendingSI = pendingStockIn.get(uid);
  const pendingPR = pendingProduction.get(uid);

  if (isNumber && pendingSI) {
    // Pure number reply → treat as purchase price
    pendingStockIn.delete(uid);
    const purchaseTotal = parseFloat(lower);
    await db.transaction(async (tx) => {
      await adjustInventory(tx, userBranchId, "ingredient", pendingSI.itemId, pendingSI.qty);
      await applyMovingAverage(tx, userBranchId, pendingSI.itemId, pendingSI.qty, purchaseTotal);
      await tx.insert(stockAdjustmentsTable).values({
        branchId: userBranchId, itemType: "ingredient", itemId: pendingSI.itemId,
        adjustmentType: "in", quantity: String(pendingSI.qty),
        purchasePriceTotal: String(purchaseTotal),
        notes: `via AI: tambah stok (harga total Rp ${purchaseTotal.toLocaleString("id-ID")})`,
      });
    });
    const newHPP = purchaseTotal / pendingSI.qty;
    return `✅ Stok ${pendingSI.name} bertambah ${pendingSI.qty} ${pendingSI.unit}.\nPembelian total: Rp ${purchaseTotal.toLocaleString("id-ID")}\nHPP baru: Rp ${newHPP.toFixed(2)} / ${pendingSI.unit}`;
  }

  if (isConfirm && pendingSI) {
    pendingStockIn.delete(uid);
    const totalPrice = lower.match(/(\d+)/)?.[1];
    const purchaseTotal = totalPrice ? parseFloat(totalPrice) : 0;
    await db.transaction(async (tx) => {
      await adjustInventory(tx, userBranchId, "ingredient", pendingSI.itemId, pendingSI.qty);
      if (purchaseTotal > 0) {
        await applyMovingAverage(tx, userBranchId, pendingSI.itemId, pendingSI.qty, purchaseTotal);
      }
      await tx.insert(stockAdjustmentsTable).values({
        branchId: userBranchId, itemType: "ingredient", itemId: pendingSI.itemId,
        adjustmentType: "in", quantity: String(pendingSI.qty),
        purchasePriceTotal: purchaseTotal > 0 ? String(purchaseTotal) : null,
        notes: "via AI: tambah stok" + (purchaseTotal > 0 ? ` (harga total Rp ${purchaseTotal.toLocaleString("id-ID")})` : " (tanpa HPP)"),
      });
    });
    const priceInfo = purchaseTotal > 0
      ? `Pembelian total: Rp ${purchaseTotal.toLocaleString("id-ID")}. HPP baru: Rp ${(purchaseTotal / pendingSI.qty).toFixed(2)} / ${pendingSI.unit}`
      : "Tanpa harga pembelian (HPP tidak diperbarui).";
    return `✅ Stok ${pendingSI.name} bertambah ${pendingSI.qty} ${pendingSI.unit}. ${priceInfo}`;
  }

  if (isConfirm && pendingPR) {
    pendingProduction.delete(uid);
    const producedWeight = pendingPR.qty;
    const costDetails: string[] = [];
    let totalCost = 0;

    await db.transaction(async (tx) => {
      // 1. Validasi stok komponen (replikasi semiFinished.ts guard rail)
      for (const comp of pendingPR.components) {
        const componentType = comp.type === "ingredient" ? "ingredient" as const : "semi_finished" as const;
        const currentStock = await getInventoryStock(tx, userBranchId, componentType, comp.id);
        if (currentStock < comp.qty) {
          throw new Error(`Stok "${comp.name}" tidak mencukupi! Dibutuhkan ${comp.qty}, tapi sisa stok hanya ${currentStock}.`);
        }
      }

      // 2. Hitung total biaya & kurangi stok (replikasi semiFinished.ts L237-245)
      for (const comp of pendingPR.components) {
        const componentType = comp.type === "ingredient" ? "ingredient" as const : "semi_finished" as const;
        const componentCost = await getComponentCost(tx, comp.type, comp.id);
        totalCost += componentCost * comp.qty;
        await adjustInventory(tx, userBranchId, componentType, comp.id, -comp.qty);
        costDetails.push(`• ${comp.name}: ${comp.qty} × Rp ${componentCost.toFixed(2)} = Rp ${(componentCost * comp.qty).toFixed(2)}`);
      }

      // 3. Hitung HPP baru berdasarkan producedWeight (replikasi semiFinished.ts L248-264)
      const newHpp = totalCost / producedWeight;
      const oldStock = await getCurrentStockLocal(tx, userBranchId, pendingPR.itemId);
      const [sf] = await tx.select({ c: semiFinishedTable.costPricePerUnit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, pendingPR.itemId));
      const oldHpp = parseFloat(sf?.c || "0");
      const oldTotalValue = oldHpp * oldStock;
      const newTotalValue = newHpp * producedWeight;
      const avgHpp = (oldTotalValue + newTotalValue) / (oldStock + producedWeight);

      await tx.update(semiFinishedTable).set({ costPricePerUnit: String(avgHpp) }).where(eq(semiFinishedTable.id, pendingPR.itemId));

      // 4. Tambah stok hasil produksi
      await adjustInventory(tx, userBranchId, "semi_finished", pendingPR.itemId, producedWeight);

      // 5. Simpan HPP di variabel closure untuk response
      (pendingPR as any)._newHpp = newHpp;
      (pendingPR as any)._avgHpp = avgHpp;
      (pendingPR as any)._oldStock = oldStock;
    });

    const sf = await db.select({ u: semiFinishedTable.unit }).from(semiFinishedTable).where(eq(semiFinishedTable.id, pendingPR.itemId)).then(r => r[0]);
    const unit = sf?.u || "unit";
    const batchHpp = (pendingPR as any)._newHpp as number;
    const avgHpp = (pendingPR as any)._avgHpp as number;
    const oldStock = (pendingPR as any)._oldStock as number;
    const used = pendingPR.components.map((c) => `• ${c.name}: -${c.qty}`).join("\n");

    return [
      `✅ Produksi ${producedWeight} ${unit} ${pendingPR.name} selesai!`,
      ``,
      `📦 Bahan terpakai:`,
      used,
      ``,
      `💰 Detail HPP:`,
      ...costDetails,
      ``,
      `Total biaya batch: Rp ${totalCost.toFixed(2)}`,
      `HPP batch ini: Rp ${batchHpp.toFixed(4)} / ${unit}`,
      `HPP rata-rata (${oldStock.toFixed(0)} → ${(oldStock + producedWeight).toFixed(0)} ${unit}): Rp ${avgHpp.toFixed(4)} / ${unit}`,
    ].join("\n");
  }

  if (isConfirm) {
    return "Mau lanjutin apa ya bos? Ga ada perintah yg pending.";
  }

  // User cancelled
  if (/^(?:tidak|batal|n|cancel|ga|gak)\b/i.test(lower)) {
    pendingStockIn.delete(uid);
    pendingProduction.delete(uid);
    return "Ok, dibatalkan bos. Ada yg lain?";
  }

  // ── CEK STOK MENIPIS ──
  if (/(?:stok|bahan).*(menipis|habis|sedikit|kritis|tipis|abis)|low.?stock/i.test(lower)) {
    const all = await listInventoryForBranch(userBranchId);
    const threshold = LOW_STOCK_DEFAULT;
    const low = all.filter((item) => {
      const limit = item.itemType === "ingredient" && item.minimalStock && item.minimalStock > 0 ? item.minimalStock : threshold;
      return item.currentStock < limit;
    });
    if (low.length === 0) return "Stok aman semua, bos. Ga ada yang menipis.";
    const lines = low.slice(0, 10).map((i) => `• ${i.name}: ${i.currentStock} ${i.unit} (min: ${i.minimalStock || threshold} ${i.unit})`);
    return `Stok menipis di cabang ${userBranchId}:\n${lines.join("\n")}` + (low.length > 10 ? `\n...dan ${low.length - 10} lainnya` : "");
  }

  // ── TAMBAH STOK (GUARDLINE: minta harga beli) ──
  if (/tambah\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+(\d+)(?:\s*(ml|l|kg|g|pcs|liter|gram|ons))?/i.test(lower)) {
    const match = lower.match(/tambah\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+(\d+)(?:\s*(ml|l|kg|g|pcs|liter|gram|ons))?/i);
    if (!match) return "Format: tambah stok [nama] [jumlah] [unit]. Contoh: tambah stok air 19000 ml";
    const name = match[1].trim();
    const qty = parseFloat(match[2]);
    const unit = match[3] || "";
    const items = await db.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, userBranchId)));
    const found = items.filter((i) => i.name.toLowerCase().includes(name));
    if (found.length === 0) return `Ga nemu bahan "${name}" di cabang ${userBranchId}. Coba "lihat stok" dulu buat liat daftar.`;
    if (found.length > 1) return `Ditemukan ${found.length} bahan mirip "${name}":\n${found.map((i) => `• ${i.name} (${i.unit})`).join("\n")}\n\nSebutkan nama yg lebih spesifik.`;
    const item = found[0];
    const finalUnit = unit || item.unit;
    if (unit) await db.update(ingredientsTable).set({ unit }).where(eq(ingredientsTable.id, item.id)).catch(() => {});
    // Guardline: store pending, ask for purchase price
    pendingStockIn.set(uid, { itemId: item.id, name: item.name, qty, unit: finalUnit, branchId: userBranchId });
    const stockLine = qty > 0 && item.costPricePerUnit ? `\n• HPP saat ini: Rp ${parseFloat(item.costPricePerUnit).toLocaleString("id-ID")} / ${finalUnit}` : "";
    return `⚠️ Konfirmasi tambah stok:\n• ${item.name}: +${qty} ${finalUnit}${stockLine}\n\n💰 **Beli total berapa?** Balas dengan angka (total harga beli), atau:\n- Balas **ya** kalau gratis / ga perlu update HPP\n- Balas **batal** buat batalkan`;
  }

  // ── KURANGI STOK ──
  if (/kurangi\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+(\d+)/i.test(lower)) {
    const match = lower.match(/kurangi\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+(\d+)/i);
    if (!match) return "Format: kurangi stok [nama] [jumlah]. Contoh: kurangi stok air 500";
    const name = match[1].trim();
    const qty = parseFloat(match[2]);
    const items = await db.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, userBranchId)));
    const found = items.filter((i) => i.name.toLowerCase().includes(name));
    if (found.length === 0) return `Ga nemu "${name}" di cabang ${userBranchId}, bos.`;
    if (found.length > 1) return `Ada ${found.length} bahan mirip:\n${found.map((i) => `• ${i.name}`).join("\n")}\n\nSpesifikin.`;
    const item = found[0];
    await db.transaction(async (tx) => {
      await adjustInventory(tx, userBranchId, "ingredient", item.id, -qty);
      await tx.insert(stockAdjustmentsTable).values({ branchId: userBranchId, itemType: "ingredient", itemId: item.id, adjustmentType: "out", quantity: String(qty), notes: `via AI: kurangi stok` });
    });
    return `✅ Stok ${item.name} berkurang ${qty} ${item.unit}. Cek "cari stok ${name}" buat liat sisa.`;
  }

  // ── KOREKSI HILANG ──
  if (/koreksi\s+hilang\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i.test(lower)) {
    const match = lower.match(/koreksi\s+hilang\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i);
    if (!match) return "Format: koreksi hilang [nama] [jumlah]. Contoh: koreksi hilang air 200";
    const name = match[1].trim();
    const qty = parseFloat(match[2]);
    const items = await db.select().from(ingredientsTable).where(and(eq(ingredientsTable.branchId, userBranchId)));
    const found = items.filter((i) => i.name.toLowerCase().includes(name));
    if (found.length === 0) return `Ga nemu "${name}". Cek "lihat stok" dulu.`;
    if (found.length > 1) return `Ada ${found.length} mirip:\n${found.map((i) => `• ${i.name}`).join("\n")}\n\nSpesifikin.`;
    const item = found[0];
    await db.transaction(async (tx) => {
      await adjustInventory(tx, userBranchId, "ingredient", item.id, -qty);
      await tx.insert(stockAdjustmentsTable).values({ branchId: userBranchId, itemType: "ingredient", itemId: item.id, adjustmentType: "loss", quantity: String(-qty), notes: `via AI: koreksi hilang` });
    });
    return `✅ Stok ${item.name} dikoreksi hilang ${qty} ${item.unit}.`;
  }

  // ── KOREKSI STOK JADI ──
  if (/koreksi\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i.test(lower)) {
    const match = lower.match(/koreksi\s+(?:stok\s+)?(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i);
    if (!match) return "Format: koreksi stok [nama] jadi [jumlah]. Contoh: koreksi stok air jadi 1000";
    const name = match[1].trim();
    const target = parseFloat(match[2]);
    const all = await listInventoryForBranch(userBranchId);
    const found = all.filter((i) => i.name.toLowerCase().includes(name));
    if (found.length === 0) return `Ga nemu "${name}". Cek "lihat stok" dulu.`;
    if (found.length > 1) return `Ada ${found.length} mirip:\n${found.map((i) => `• ${i.name}`).join("\n")}`;
    const item = found[0];
    const delta = target - item.currentStock;
    const adjType = delta >= 0 ? "in" : "loss";
    await db.transaction(async (tx) => {
      await adjustInventory(tx, userBranchId, item.itemType, item.itemId, delta);
      await tx.insert(stockAdjustmentsTable).values({ branchId: userBranchId, itemType: item.itemType, itemId: item.itemId, adjustmentType: adjType, quantity: String(Math.abs(delta)), notes: `via AI: koreksi stok jadi ${target}` });
    });
    return `✅ Stok ${item.name} dikoreksi jadi ${target} ${item.unit} (${delta >= 0 ? "+" : ""}${delta}).`;
  }

  // ── UBAH HARGA ──
  if (/ubah\s+harga\s+(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i.test(lower)) {
    const match = lower.match(/ubah\s+harga\s+(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i);
    if (!match) return "Format: ubah harga [nama produk] jadi [harga]. Contoh: ubah harga Nasi Goreng jadi 25000";
    const name = match[1].trim();
    const price = match[2];
    const items = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    const found = items.filter((p) => p.name.toLowerCase().includes(name));
    if (found.length === 0) return `Ga nemu produk "${name}". Coba "lihat menu" dulu.`;
    if (found.length > 1) return `Ada ${found.length} produk mirip:\n${found.map((p) => `• ${p.name} — Rp ${parseFloat(p.price).toLocaleString("id-ID")}`).join("\n")}\n\nSpesifikin.`;
    const prod = found[0];
    await db.update(productsTable).set({ price }).where(eq(productsTable.id, prod.id));
    return `✅ Harga ${prod.name} diubah: Rp ${parseFloat(prod.price).toLocaleString("id-ID")} → Rp ${parseInt(price).toLocaleString("id-ID")}.`;
  }

  // ── HAPUS PRODUK ──
  if (/hapus\s+(\w+(?:\s+\w+)*)|nonaktifkan\s+(\w+(?:\s+\w+)*)/i.test(lower)) {
    const match = lower.match(/(?:hapus|nonaktifkan)\s+(\w+(?:\s+\w+)*)/i);
    if (!match) return "Format: hapus [nama produk]. Contoh: hapus Nasi Goreng";
    const name = match[1].trim();
    const items = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    const found = items.filter((p) => p.name.toLowerCase().includes(name));
    if (found.length === 0) return `Ga nemu produk "${name}" yg aktif. Coba "lihat menu" dulu.`;
    if (found.length > 1) return `Ada ${found.length} produk mirip:\n${found.map((p) => `• ${p.name}`).join("\n")}\n\nSpesifikin.`;
    await db.update(productsTable).set({ isActive: false }).where(eq(productsTable.id, found[0].id));
    return `✅ ${found[0].name} udah dinonaktifkan. Ga muncul lagi di menu. Bisa diaktifin lagi di halaman Produk.`;
  }

  // ── CARI STOK SPESIFIK ──
  if (/cari\s+(\w{3,})|stok\s+(?!yg\b|menipis|habis|sedikit|kritis|tipis|abis|semua|masuk|in\b|tambah)(\w{3,})/i.test(lower)) {
    const nameMatch = lower.match(/cari\s+(\w{3,})|stok\s+(\w{3,})/i);
    const searchName = (nameMatch?.[1] || nameMatch?.[2] || "").trim();
    if (searchName.length >= 3) {
      const all = await listInventoryForBranch(userBranchId);
      const found = all.filter((i) => i.name.toLowerCase().includes(searchName));
      if (found.length === 0) return `Ga nemu "${searchName}" di inventori cabang ${userBranchId}, bos.`;
      return `Stok di cabang ${userBranchId}:\n${found.map((i) => `• ${i.name}: ${i.currentStock} ${i.unit}`).join("\n")}`;
    }
  }

  // ── LIHAT SEMUA STOK ──
  if (/lihat\s+stok|cek\s+stok|inventori|semua\s+(stok|bahan)/i.test(lower)) {
    const all = await listInventoryForBranch(userBranchId);
    if (all.length === 0) return `Inventori cabang ${userBranchId} kosong, bos.`;
    return `📦 Inventori cabang ${userBranchId}:\n${all.map((i) => `• ${i.name}: ${i.currentStock} ${i.unit} (${i.itemType})`).join("\n")}`;
  }

  // ── LIHAT BAHAN ──
  if (/lihat (bahan|ingredient|bahan baku)|daftar (bahan|ingredient)/i.test(lower)) {
    const items = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada bahan baku di cabang ${userBranchId}.`;
    return `Bahan baku cabang ${userBranchId}:\n${items.map((i) => `• ${i.name} (${i.unit})`).join("\n")}`;
  }

  // ── TAMBAH BAHAN BARU ──
  if (/tambah (bahan|ingredient|bahan baku)/i.test(lower)) {
    const nameMatch = lower.match(/tambah (?:bahan|ingredient|bahan baku)\s+(\w+(?:\s+\w+)*?)(?:\s+\d+|\s*$)/i);
    if (!nameMatch) return "Mau tambah bahan apa? Sebutkan nama bahannya.";
    if (!branchMatch) return "Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.";
    await db.insert(ingredientsTable).values({ branchId: userBranchId, name: nameMatch[1].trim(), unit: "ml" });
    return `Udah, bos! Bahan "${nameMatch[1].trim()}" berhasil ditambah di cabang ${userBranchId}. Jangan lupa atur stok masuknya ya.`;
  }

  // ── LIHAT MENU ──
  if (/lihat (produk|menu)/i.test(lower)) {
    const items = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    if (items.length === 0) return `Belum ada produk di cabang ${userBranchId}.`;
    return `Menu cabang ${userBranchId}:\n${items.map((p) => `• ${p.name} — Rp ${parseFloat(p.price).toLocaleString("id-ID")}`).join("\n")}`;
  }

  // ── TAMBAH PRODUK ──
  if (/tambah (produk|menu)/i.test(lower)) {
    const nameMatch = lower.match(/tambah (?:produk|menu)\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i);
    if (!nameMatch) return "Mau tambah produk apa? Sebutkan nama + harganya. Contoh: tambah menu pisang coklat 15000";
    if (!branchMatch) return "Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.";
    await db.insert(productsTable).values({ branchId: userBranchId, name: nameMatch[1].trim(), price: nameMatch[2] });
    return `Udah! ${nameMatch[1].trim()} seharga Rp ${parseInt(nameMatch[2]).toLocaleString("id-ID")} berhasil ditambah di cabang ${userBranchId}.`;
  }

  // ── TAMBAH MENU + VARIAN (one command: "tambah menu kopi susu varian: kecil 7000, sedang 9000, besar 15000") ──
  if (/tambah\s+(?:menu|produk)\s+(\w+(?:\s+\w+)*?)\s+varian\s*:?\s*(.+)/i.test(lower)) {
    const match = lower.match(/tambah\s+(?:menu|produk)\s+(\w+(?:\s+\w+)*?)\s+varian\s*:?\s*(.+)/i);
    if (!match) return "Format: tambah menu [nama] varian: [nama] [harga], [nama] [harga], ...\nContoh: tambah menu kopi susu varian: kecil 7000, sedang 9000, besar 15000";
    const prodName = match[1].trim();
    const varStr = match[2].trim();

    // Parse variant string: "kecil 7000, sedang 9000, besar 15000"
    const varPairs = varStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    const variants: { name: string; price: string }[] = [];
    for (const pair of varPairs) {
      const vm = pair.match(/(\w+(?:\s+\w+)*?)\s+(\d+)/);
      if (vm) variants.push({ name: vm[1].trim(), price: vm[2] });
    }
    if (variants.length === 0) return "Format varian salah. Contoh: varian: kecil 7000, sedang 9000, besar 15000";

    // Insert product + variants
    const basePrice = variants[0].price;
    const [prod] = await db.insert(productsTable).values({ branchId: userBranchId, name: prodName, price: basePrice }).returning({ id: productsTable.id });
    for (const v of variants) {
      await db.insert(productVariantsTable).values({ productId: prod.id, name: v.name, price: v.price });
    }
    const list = variants.map(v => `• ${v.name}: Rp ${parseInt(v.price).toLocaleString("id-ID")}`).join("\n");
    return `✅ ${prodName} berhasil ditambah dengan ${variants.length} varian:\n${list}\n\nCOGS akan otomatis dihitung saat penjualan jika resep sudah diisi.\nTambah resep: "tambah resep ${prodName} varian [nama varian] butuh [bahan] [qty]"`;
  }

  // ── CATAT PENGELUARAN ──
  if (/catat (pengeluaran|biaya|belanja)/i.test(lower)) {
    const amountMatch = lower.match(/(\d+)/);
    if (!amountMatch) return "Mau catat pengeluaran berapa? Kasih nominalnya.";
    if (!branchMatch) return "Pengeluaran di cabang mana, bos?";
    const amountNum = parseInt(amountMatch[1]);
    await db.insert(expensesTable).values({ branchId: userBranchId, description: lower.replace(/catat (pengeluaran|biaya|belanja)\s*/i, "").trim() || "Pengeluaran", amount: String(amountNum) });
    return `Udah dicatat, bos! Pengeluaran Rp ${amountNum.toLocaleString("id-ID")} di cabang ${userBranchId}.`;
  }

  // ── LAPORAN ──
  if (/laporan|pendapatan|keuntungan|omzet|profit|revenue/i.test(lower)) {
    const now = new Date();
    let start = new Date(now); start.setDate(start.getDate() - 30);
    let end = new Date(now);
    let label = "30 hari terakhir";

    const rangeMatch = lower.match(/dari\s+(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\s+(?:sampai|s\.d|hingga)\s+(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i);
    if (rangeMatch) {
      const months: Record<string, number> = { januari:0,februari:1,maret:2,april:3,mei:4,juni:5,juli:6,agustus:7,september:8,oktober:9,november:10,desember:11 };
      start = new Date(+rangeMatch[3], months[rangeMatch[2]], +rangeMatch[1], 0, 0, 0, 0);
      end = new Date(+rangeMatch[6], months[rangeMatch[5]], +rangeMatch[4], 23, 59, 59, 999);
      label = `${rangeMatch[1]} ${rangeMatch[2]} ${rangeMatch[3]} — ${rangeMatch[4]} ${rangeMatch[5]} ${rangeMatch[6]}`;
    } else if (/hari\s*ini|today/i.test(lower)) {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setHours(23, 59, 59, 999); label = "hari ini";
    } else if (/kemarin|yesterday/i.test(lower)) {
      start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999); label = "kemarin";
    } else if (/7\s*hari|seminggu/i.test(lower)) {
      start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0); label = "7 hari terakhir";
    } else if (/14\s*hari|2\s*minggu/i.test(lower)) {
      start = new Date(now); start.setDate(start.getDate() - 14); start.setHours(0, 0, 0, 0); label = "14 hari terakhir";
    } else if (/bulan\s*ini|this\s*month/i.test(lower)) {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); label = "bulan ini";
    } else if (/bulan\s*lalu|last\s*month/i.test(lower)) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999); label = "bulan lalu";
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [stats] = await db.select({
      grossRevenue: sum(ordersTable.total), totalCogs: sum(ordersTable.totalCogs),
    }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), eq(ordersTable.branchId, userBranchId)));
    const [exp] = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), eq(expensesTable.branchId, userBranchId)));
    const rev = parseFloat(stats?.grossRevenue ?? "0");
    const cogs = parseFloat(stats?.totalCogs ?? "0");
    const expense = parseFloat(exp?.total ?? "0");
    const profit = rev - cogs - expense;
    return `📊 Laporan ${label} — cabang ${userBranchId}:\n• Pendapatan: Rp ${rev.toLocaleString("id-ID")}\n• Bahan baku: Rp ${cogs.toLocaleString("id-ID")}\n• Pengeluaran: Rp ${expense.toLocaleString("id-ID")}\n• Laba bersih: Rp ${profit.toLocaleString("id-ID")}`;
  }

  // ── PRODUKSI (GUARDLINE: cek resep dulu) ──
  if (/produksi\s+(\w+(?:\s+\w+)*?)\s+(\d+)(?:\s*(ml|l|kg|g|pcs|liter|gram|ons))?|bikin\s+(setengah jadi|adonan)/i.test(lower)) {
    // "produksi matcha 1000 gr" or "produksi matcha 1000"
    const prodMatch = lower.match(/produksi\s+(\w+(?:\s+\w+)*?)\s+(\d+)(?:\s*(ml|l|kg|g|pcs|liter|gram|ons))?/i);
    if (prodMatch) {
      const prodName = prodMatch[1].trim();
      const qty = parseFloat(prodMatch[2]);
      const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, userBranchId));
      const found = items.filter((i) => i.name.toLowerCase().includes(prodName));
      if (found.length === 0) return `Ga nemu setengah jadi "${prodName}" di cabang ${userBranchId}. Coba ketik "produksi" buat liat daftar.`;
      if (found.length > 1) return `Ada ${found.length} mirip:\n${found.map((i) => `• ${i.name}`).join("\n")}\n\nSpesifikin.`;
      const item = found[0];

      // Check recipe
      const recipeRows = await db.transaction(async (tx) => getRecipeRows(tx, "semi_finished", item.id));
      if (recipeRows.length === 0) return `⚠️ ${item.name} belum punya resep/BOM!\n\nBuat dulu: "tambah resep ${item.name} butuh [bahan] [qty]"`;

      // Build component summary
      const comps: { type: string; id: number; name: string; qty: number }[] = [];
      const ingItems = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, userBranchId));
      const sfItems = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, userBranchId));
      for (const r of recipeRows) {
        const ing = ingItems.find((i) => i.id === r.componentId);
        const sf = sfItems.find((s) => s.id === r.componentId);
        comps.push({
          type: r.componentType, id: r.componentId,
          name: ing?.name || sf?.name || String(r.componentId),
          qty: r.quantity,
        });
      }

      // Guardline: store pending
      pendingProduction.set(uid, { itemId: item.id, name: item.name, qty, branchId: userBranchId, components: comps });
      const compList = comps.map((c) => `• ${c.name}: ${c.qty}`).join("\n");
      return `⚠️ Konfirmasi produksi:\n• ${item.name}: ${qty} ${item.unit}\n\nBahan yg akan terpakai:\n${compList}\n\nBalas **ya** untuk lanjut, atau **batal** buat batalkan.`;
    }

    // Just "produksi" → list available items
    if (!branchMatch) return "Produksi di cabang mana, bos?";
    const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada setengah jadi di cabang ${userBranchId}.`;
    const list = items.map((i) => `• ${i.id}. ${i.name} (${i.unit})`).join("\n");
    return `Yang mau diproduksi apa, bos? Ini daftar setengah jadinya:\n${list}\n\nContoh: "produksi adonan pisang 3 kg"`;
  }

  // ── LIHAT VARIAN ──
  if (/lihat\s+varian|varian\s+(?:dari\s+)?(\w+)|daftar\s+varian/i.test(lower)) {
    const nameMatch = lower.match(/(?:lihat\s+varian|varian)\s+(?:dari\s+)?(\w+(?:\s+\w+)*)/i);
    const searchName = nameMatch?.[1]?.trim() || "";
    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    const product = searchName ? prods.find((p) => p.name.toLowerCase().includes(searchName)) : null;
    if (!product) return searchName ? `Ga nemu produk "${searchName}". Coba "lihat menu" dulu.` : "Produk mana yg mau dilihat variannya? Contoh: lihat varian Nasi Goreng";
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
    if (variants.length === 0) return `${product.name} belum punya varian, bos.`;
    return `📋 Varian ${product.name}:\n${variants.map((v) => `• ${v.name} — Rp ${parseFloat(v.price).toLocaleString("id-ID")}`).join("\n")}`;
  }

  // ── TAMBAH VARIAN ──
  if (/tambah\s+varian\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i.test(lower)) {
    const match = lower.match(/tambah\s+varian\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i);
    if (!match) return "Format: tambah varian [produk] [nama varian] [harga]. Contoh: tambah varian Nasi Goreng Large 18000";
    const prodName = match[1].trim();
    const varName = match[2].trim();
    const price = match[3];
    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    const product = prods.find((p) => p.name.toLowerCase().includes(prodName));
    if (!product) return `Ga nemu produk "${prodName}". Coba "lihat menu" dulu.`;
    await db.insert(productVariantsTable).values({ productId: product.id, name: varName, price });
    return `✅ Varian "${varName}" seharga Rp ${parseInt(price).toLocaleString("id-ID")} berhasil ditambah ke ${product.name}.`;
  }

  // ── UBAH HARGA VARIAN ──
  if (/ubah\s+(?:harga\s+)?varian\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i.test(lower)) {
    const match = lower.match(/ubah\s+(?:harga\s+)?varian\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*?)\s+jadi\s+(\d+)/i);
    if (!match) return "Format: ubah varian [produk] [nama varian] jadi [harga]. Contoh: ubah varian Nasi Goreng Large jadi 20000";
    const prodName = match[1].trim();
    const varName = match[2].trim();
    const price = match[3];
    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    const product = prods.find((p) => p.name.toLowerCase().includes(prodName));
    if (!product) return `Ga nemu produk "${prodName}".`;
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
    const variant = variants.find((v) => v.name.toLowerCase().includes(varName));
    if (!variant) return `Ga nemu varian "${varName}" di ${product.name}. Coba "lihat varian ${prodName}".`;
    await db.update(productVariantsTable).set({ price }).where(eq(productVariantsTable.id, variant.id));
    return `✅ Varian ${variant.name} di ${product.name}: Rp ${parseFloat(variant.price).toLocaleString("id-ID")} → Rp ${parseInt(price).toLocaleString("id-ID")}.`;
  }

  // ── HAPUS VARIAN ──
  if (/hapus\s+varian\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*)/i.test(lower)) {
    const match = lower.match(/hapus\s+varian\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*)/i);
    if (!match) return "Format: hapus varian [produk] [varian]. Contoh: hapus varian Nasi Goreng Large";
    const prodName = match[1].trim();
    const varName = match[2].trim();
    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    const product = prods.find((p) => p.name.toLowerCase().includes(prodName));
    if (!product) return `Ga nemu produk "${prodName}".`;
    const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
    const variant = variants.find((v) => v.name.toLowerCase().includes(varName));
    if (!variant) return `Ga nemu varian "${varName}" di ${product.name}.`;
    await db.delete(productVariantsTable).where(eq(productVariantsTable.id, variant.id));
    return `✅ Varian "${variant.name}" dihapus dari ${product.name}.`;
  }

// ── HELPER: find recipe parent across product, variant, semi_finished ──
async function findRecipeParent(name: string, branchId: number): Promise<{ parent: { id: number; name: string } | null; parentType: string }> {
  const lower = name.toLowerCase();
  const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branchId), eq(productsTable.isActive, true)));
  const semis = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branchId));

  // Check product → variant combination: "Kopi Susu Kecil"
  for (const p of prods) {
    if (lower.includes(p.name.toLowerCase())) {
      const variants = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, p.id));
      for (const v of variants) {
        if (lower.includes(v.name.toLowerCase())) {
          return { parent: { id: v.id, name: `${p.name} (${v.name})` }, parentType: "product_variant" };
        }
      }
      return { parent: { id: p.id, name: p.name }, parentType: "product" };
    }
  }

  // Check semi_finished
  const semi = semis.find((s) => s.name.toLowerCase().includes(lower));
  if (semi) return { parent: { id: semi.id, name: semi.name }, parentType: "semi_finished" };

  return { parent: null, parentType: "" };
}

  // ── LIHAT RESEP (supports product, semi_finished, product_variant) ──
  if (/lihat\s+resep|resep\s+(\w+)|bom\s+(\w+)/i.test(lower)) {
    const nameMatch = lower.match(/(?:lihat\s+resep|resep|bom)\s+(\w+(?:\s+\w+)*)/i);
    const searchName = nameMatch?.[1]?.trim() || "";
    if (!searchName) return "Resep produk, varian, atau setengah jadi apa yg mau dilihat? Contoh: lihat resep Nasi Goreng";

    const { parent, parentType } = await findRecipeParent(searchName, userBranchId);
    if (!parent) return `Ga nemu "${searchName}" di produk, varian, atau setengah jadi.`;

    const recipes = await db.select().from(recipesTable).where(and(eq(recipesTable.parentType, parentType), eq(recipesTable.parentId, parent.id)));
    if (recipes.length === 0) return `${parent.name} belum punya resep/BOM, bos.`;

    const lines: string[] = [];
    for (const r of recipes) {
      if (r.componentType === "ingredient") {
        const [ing] = await db.select().from(ingredientsTable).where(eq(ingredientsTable.id, r.componentId));
        lines.push(`• ${ing?.name || r.componentId}: ${r.quantity}`);
      } else {
        const [sf] = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.id, r.componentId));
        lines.push(`• ${sf?.name || r.componentId} (setengah jadi): ${r.quantity}`);
      }
    }
    return `📋 Resep ${parent.name}:\n${lines.join("\n")}`;
  }

  // ── TAMBAH RESEP (supports product_variant: "tambah resep Kopi Susu varian Kecil butuh Kopi 0.1") ──
  if (/tambah\s+resep\s+(\w+(?:\s+\w+)*?)\s+(?:varian\s+)?(\w+(?:\s+\w+)*?)\s+butuh\s+(\w+(?:\s+\w+)*?)\s+([\d.]+)/i.test(lower)) {
    // "tambah resep Kopi Susu [varian] Kecil butuh Kopi 0.1"
    const match = lower.match(/tambah\s+resep\s+(\w+(?:\s+\w+)*?)\s+(?:varian\s+)?(\w+(?:\s+\w+)*?)\s+butuh\s+(\w+(?:\s+\w+)*?)\s+([\d.]+)/i);
    if (!match) return "Format: tambah resep [produk] [varian?] butuh [bahan] [qty]. Contoh: tambah resep Nasi Goreng butuh Beras 0.5";
    const parentName = match[1].trim();
    const variantName = match[2].trim();
    const compName = match[3].trim();
    const qty = match[4];
    const branch = userBranchId;

    const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, branch), eq(productsTable.isActive, true)));
    const semis = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branch));
    const ings = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, branch));

    // Try product → variant
    const product = prods.find((p) => p.name.toLowerCase().includes(parentName));
    if (product && variantName) {
      const variant = await db.select().from(productVariantsTable).where(eq(productVariantsTable.productId, product.id));
      const foundVariant = variant.find((v) => v.name.toLowerCase().includes(variantName));
      if (foundVariant) {
        const vName = foundVariant.name;
        // Check if componentName is a keyword like "varian" — skip if so
        if (/varian/i.test(compName)) return "Format: tambah resep [produk] varian [nama varian] butuh [bahan] [qty]";
        let componentType = "";
        let componentId = 0;
        const ing = ings.find((i) => i.name.toLowerCase().includes(compName));
        const sf = semis.find((s) => s.name.toLowerCase().includes(compName));
        if (ing) { componentType = "ingredient"; componentId = ing.id; }
        else if (sf) { componentType = "semi_finished"; componentId = sf.id; }
        else return `Ga nemu bahan "${compName}". Coba "lihat bahan" dulu.`;
        await db.insert(recipesTable).values({ parentType: "product_variant", parentId: foundVariant.id, componentType, componentId, quantity: qty });
        const compLabel = ing?.name || sf?.name || compName;
        return `✅ Resep ${product.name} varian ${vName} ditambah: ${compLabel} × ${qty}.`;
      }
    }

    // Fallback: treat as simple "tambah resep X butuh Y Q"
    // Check if variantName is not actually a variant but part of the parent name
    const { parent, parentType } = await findRecipeParent(`${parentName} ${variantName}`.trim(), branch);
    if (parent) {
      let componentType = "";
      let componentId = 0;
      const ing = ings.find((i) => i.name.toLowerCase().includes(compName));
      const sf = semis.find((s) => s.name.toLowerCase().includes(compName));
      if (ing) { componentType = "ingredient"; componentId = ing.id; }
      else if (sf) { componentType = "semi_finished"; componentId = sf.id; }
      else return `Ga nemu bahan "${compName}". Coba "lihat bahan" dulu.`;
      await db.insert(recipesTable).values({ parentType, parentId: parent.id, componentType, componentId, quantity: qty });
      const compLabel = ing?.name || sf?.name || compName;
      return `✅ Resep ${parent.name} ditambah: ${compLabel} × ${qty}.`;
    }

    return `Ga nemu "${parentName}" di produk, varian, atau setengah jadi.`;
  }

  // ── HAPUS RESEP (supports product_variant) ──
  if (/hapus\s+resep\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*)/i.test(lower)) {
    const match = lower.match(/hapus\s+resep\s+(\w+(?:\s+\w+)*?)\s+(\w+(?:\s+\w+)*)/i);
    if (!match) return "Format: hapus resep [produk] [bahan]. Contoh: hapus resep Nasi Goreng Kecap";
    const parentName = match[1].trim();
    const compName = match[2].trim();
    const branch = userBranchId;

    const { parent, parentType } = await findRecipeParent(parentName, branch);
    if (!parent) return `Ga nemu "${parentName}" di produk, varian, atau setengah jadi.`;

    const recipes = await db.select().from(recipesTable).where(and(eq(recipesTable.parentType, parentType), eq(recipesTable.parentId, parent.id)));
    const ings = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, branch));
    const semis = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, branch));

    let foundId = 0;
    let foundName = "";
    for (const r of recipes) {
      if (r.componentType === "ingredient") {
        const [ing] = await db.select().from(ingredientsTable).where(eq(ingredientsTable.id, r.componentId));
        if (ing?.name.toLowerCase().includes(compName)) { foundId = r.id; foundName = ing.name; break; }
      } else {
        const [sf] = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.id, r.componentId));
        if (sf?.name.toLowerCase().includes(compName)) { foundId = r.id; foundName = sf.name; break; }
      }
    }
    if (!foundId) return `Ga nemu "${compName}" di resep ${parent.name}.`;
    await db.delete(recipesTable).where(eq(recipesTable.id, foundId));
    return `✅ ${foundName} dihapus dari resep ${parent.name}.`;
  }

  return "";
}
