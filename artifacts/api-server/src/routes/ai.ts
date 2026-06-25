import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { db, ingredientsTable, semiFinishedTable, productsTable, expensesTable, ordersTable } from "@workspace/db";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { listInventoryForBranch, LOW_STOCK_DEFAULT } from "../services/inventory";

const router = Router();

const N8N_CTO_WEBHOOK_URL = process.env.N8N_CTO_WEBHOOK_URL || "";
const N8N_VPS_WEBHOOK_URL = process.env.N8N_VPS_WEBHOOK_URL || "";
const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL || "";

function extractReply(data: Record<string, unknown>): string {
  const raw = (data.reply || data.output || data.result) as string | undefined;
  if (!raw || raw === "{}") return "";
  return raw;
}

async function handleBusiness(msg: string, branchId: number): Promise<string> {
  const lower = msg.toLowerCase().trim();
  const bid = branchId;

  const branchMatch = lower.match(/(?:cabang|branch)\s*(?:id\s*)?(\d+)/i);
  const userBranchId = branchMatch ? parseInt(branchMatch[1]) : bid;

  if (/stok (menipis|habis|sedikit|kritis|tipis|abis)|bahan (habis|menipis|sedikit)|low.?stock/i.test(lower)) {
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

  if (/lihat (bahan|ingredient|bahan baku)|daftar (bahan|ingredient)/i.test(lower)) {
    const items = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada bahan baku di cabang ${userBranchId}.`;
    return `Bahan baku cabang ${userBranchId}:\n${items.map((i) => `• ${i.name} (${i.unit})`).join("\n")}`;
  }

  if (/tambah (bahan|ingredient|bahan baku)/i.test(lower)) {
    const nameMatch = lower.match(/tambah (?:bahan|ingredient|bahan baku)\s+(\w+(?:\s+\w+)*?)(?:\s+\d+|\s*$)/i);
    if (!nameMatch) return "Mau tambah bahan apa? Sebutkan nama bahannya.";
    if (!branchMatch) return `Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.`;
    await db.insert(ingredientsTable).values({ branchId: userBranchId, name: nameMatch[1].trim(), unit: "ml" });
    return `Udah, bos! Bahan "${nameMatch[1].trim()}" berhasil ditambah di cabang ${userBranchId}. Jangan lupa atur stok masuknya ya.`;
  }

  if (/lihat (produk|menu)/i.test(lower)) {
    const items = await db.select().from(productsTable).where(and(eq(productsTable.branchId, userBranchId), eq(productsTable.isActive, true)));
    if (items.length === 0) return `Belum ada produk di cabang ${userBranchId}.`;
    return `Menu cabang ${userBranchId}:\n${items.map((p) => `• ${p.name} — Rp ${parseFloat(p.price).toLocaleString("id-ID")}`).join("\n")}`;
  }

  if (/tambah (produk|menu)/i.test(lower)) {
    const nameMatch = lower.match(/tambah (?:produk|menu)\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i);
    if (!nameMatch) return "Mau tambah produk apa? Sebutkan nama + harganya. Contoh: tambah menu pisang coklat 15000";
    if (!branchMatch) return `Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.`;
    await db.insert(productsTable).values({ branchId: userBranchId, name: nameMatch[1].trim(), price: nameMatch[2] });
    return `Udah! ${nameMatch[1].trim()} seharga Rp ${parseInt(nameMatch[2]).toLocaleString("id-ID")} berhasil ditambah di cabang ${userBranchId}.`;
  }

  if (/catat (pengeluaran|biaya|belanja)/i.test(lower)) {
    const amountMatch = lower.match(/(\d+)/);
    if (!amountMatch) return "Mau catat pengeluaran berapa? Kasih nominalnya.";
    if (!branchMatch) return "Pengeluaran di cabang mana, bos?";
    const amountNum = parseInt(amountMatch[1]);
    await db.insert(expensesTable).values({ branchId: userBranchId, description: lower.replace(/catat (pengeluaran|biaya|belanja)\s*/i, "").trim() || "Pengeluaran", amount: String(amountNum) });
    return `Udah dicatat, bos! Pengeluaran Rp ${amountNum.toLocaleString("id-ID")} di cabang ${userBranchId}.`;
  }

  if (/laporan (keuangan|finansial)|laporan|pendapatan|keuntungan|omzet|profit|revenue/i.test(lower)) {
    const now = new Date();
    const start = new Date(now); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const [stats] = await db.select({
      grossRevenue: sum(ordersTable.total),
      totalCogs: sum(ordersTable.totalCogs),
    }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), eq(ordersTable.branchId, userBranchId)));
    const [exp] = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), eq(expensesTable.branchId, userBranchId)));
    const rev = parseFloat(stats?.grossRevenue ?? "0");
    const cogs = parseFloat(stats?.totalCogs ?? "0");
    const expense = parseFloat(exp?.total ?? "0");
    const profit = rev - cogs - expense;
    return `📊 Laporan 30 hari terakhir — cabang ${userBranchId}:\n• Pendapatan: Rp ${rev.toLocaleString("id-ID")}\n• Bahan baku: Rp ${cogs.toLocaleString("id-ID")}\n• Pengeluaran: Rp ${expense.toLocaleString("id-ID")}\n• Laba bersih: Rp ${profit.toLocaleString("id-ID")}`;
  }

  if (/produksi|bikin (setengah jadi|adonan)/i.test(lower)) {
    if (!branchMatch) return `Produksi di cabang mana, bos?`;
    const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada setengah jadi di cabang ${userBranchId}.`;
    const list = items.map((i) => `• ${i.id}. ${i.name} (${i.unit})`).join("\n");
    return `Yang mau diproduksi apa, bos? Ini daftar setengah jadinya:\n${list}\n\nContoh: "produksi adonan pisang 3kg"`;
  }

  return "";
}

async function callWebhook(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  return data as Record<string, unknown>;
}

router.post("/ai/chat", requireRole("owner"), async (req, res) => {
  try {
    const { message, mode } = req.body as { message?: string; mode?: string };
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const user = req.user!;
    const clean = message.trim();
    const defaultBranchId = user.branchId || 1;
    const m = mode || "bisnis";

    switch (m) {
      case "cto": {
        if (!N8N_CTO_WEBHOOK_URL) break;
        const data = await callWebhook(N8N_CTO_WEBHOOK_URL, { message: clean, branchId: defaultBranchId, userId: user.id, role: user.role, userName: user.name });
        const reply = extractReply(data) || "Maaf, CTO Agent sedang sibuk. Coba lagi nanti ya, bos.";
        res.json({ reply });
        return;
      }

      case "vps": {
        if (!N8N_VPS_WEBHOOK_URL) break;
        const data = await callWebhook(N8N_VPS_WEBHOOK_URL, { message: clean, chat_id: "7218843690" });
        const reply = extractReply(data) || "Maaf, VPS Control sedang sibuk. Coba lagi nanti ya, bos.";
        res.json({ reply });
        return;
      }

      case "chat": {
        if (!N8N_CHAT_WEBHOOK_URL) break;
        const data = await callWebhook(N8N_CHAT_WEBHOOK_URL, { message: clean, userName: user.name });
        const reply = extractReply(data) || "Maaf, Chat Agent sedang sibuk. Coba lagi nanti ya, bos.";
        res.json({ reply });
        return;
      }

      case "bisnis":
      default: {
        const businessReply = await handleBusiness(clean, defaultBranchId);
        if (businessReply) {
          res.json({ reply: businessReply });
          return;
        }
        if (N8N_CHAT_WEBHOOK_URL) {
          const data = await callWebhook(N8N_CHAT_WEBHOOK_URL, { message: clean, userName: user.name });
          const reply = extractReply(data) || "Maaf, saya belum bisa bantu itu. Coba tanya yang lain ya, bos.";
          res.json({ reply });
          return;
        }
        res.json({ reply: "Maaf, saya belum bisa bantu itu. Coba tanya yang lain ya, bos." });
        return;
      }
    }

    res.json({ reply: "Mode tidak tersedia atau webhook belum dikonfigurasi." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
