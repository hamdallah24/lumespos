// ─────────────────────────────────────────────────────────────
// AI BUSINESS HANDLER — Query DB langsung untuk operasi bisnis
// ─────────────────────────────────────────────────────────────
import { db, ingredientsTable, semiFinishedTable, productsTable, expensesTable, ordersTable, stockAdjustmentsTable } from "@workspace/db";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { listInventoryForBranch, LOW_STOCK_DEFAULT, adjustInventory } from "../services/inventory";

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

  // ── TAMBAH STOK ──
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
    await db.transaction(async (tx) => {
      await adjustInventory(tx, userBranchId, "ingredient", item.id, qty);
      await tx.insert(stockAdjustmentsTable).values({ branchId: userBranchId, itemType: "ingredient", itemId: item.id, adjustmentType: "in", quantity: String(qty), notes: `via AI: tambah stok` });
    });
    return `✅ Stok ${item.name} bertambah ${qty} ${finalUnit}. Cek "cari stok ${name}" buat liat total.`;
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

  // ── PRODUKSI ──
  if (/produksi|bikin (setengah jadi|adonan)/i.test(lower)) {
    if (!branchMatch) return "Produksi di cabang mana, bos?";
    const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada setengah jadi di cabang ${userBranchId}.`;
    const list = items.map((i) => `• ${i.id}. ${i.name} (${i.unit})`).join("\n");
    return `Yang mau diproduksi apa, bos? Ini daftar setengah jadinya:\n${list}\n\nContoh: "produksi adonan pisang 3kg"`;
  }

  return "";
}
