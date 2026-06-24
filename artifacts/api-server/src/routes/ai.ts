import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { db, ingredientsTable, semiFinishedTable, productsTable, expensesTable, ordersTable } from "@workspace/db";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { listInventoryForBranch, LOW_STOCK_DEFAULT } from "../services/inventory";

const router = Router();

const N8N_CTO_WEBHOOK_URL = process.env.N8N_CTO_WEBHOOK_URL || "";
const N8N_VPS_WEBHOOK_URL = process.env.N8N_VPS_WEBHOOK_URL || "";
const N8N_CHAT_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL || "";

type Intent = {
  action: string;
  branchId: number | null;
  entities: Record<string, string>;
  raw: string;
};

function classifyIntent(msg: string): Intent {
  const lower = msg.toLowerCase().trim();
  const intent: Intent = { action: "chat", branchId: null, entities: {}, raw: msg };

  const branchMatch = lower.match(/(?:cabang|branch|cilengkrang)\s*(?:id\s*)?(\d+)/i);
  if (branchMatch) intent.branchId = parseInt(branchMatch[1]);

  if (/stok (menipis|habis|sedikit|kritis|tipis|abis)|bahan (habis|menipis|sedikit)|low.?stock/i.test(lower)) {
    intent.action = "check_low_stock";
  } else if (/lihat (bahan|ingredient|bahan baku)|daftar (bahan|ingredient)/i.test(lower)) {
    intent.action = "list_ingredients";
  } else if (/tambah (bahan|ingredient|bahan baku)/i.test(lower)) {
    intent.action = "create_ingredient";
    const nameMatch = lower.match(/tambah (?:bahan|ingredient|bahan baku)\s+(\w+(?:\s+\w+)*?)(?:\s+\d+|\s*$)/i);
    if (nameMatch) intent.entities.name = nameMatch[1].trim();
  } else if (/stok (masuk|in|tambah)\b/i.test(lower)) {
    intent.action = "adjust_stock";
  } else if (/produksi|bikin (setengah jadi|adonan)/i.test(lower)) {
    intent.action = "produce";
    const qtyMatch = lower.match(/(\d+)\s*(kg|g|l|ml|pcs|liter|gram|ons)/i);
    if (qtyMatch) { intent.entities.quantity = qtyMatch[1]; intent.entities.unit = qtyMatch[2]; }
  } else if (/lihat (produk|menu|produk menu)/i.test(lower)) {
    intent.action = "list_products";
  } else if (/tambah (produk|menu)/i.test(lower)) {
    intent.action = "create_product";
    const nameMatch = lower.match(/tambah (?:produk|menu)\s+(\w+(?:\s+\w+)*?)\s+(\d+)/i);
    if (nameMatch) { intent.entities.name = nameMatch[1].trim(); intent.entities.price = nameMatch[2]; }
  } else if (/lihat (resep|bom|recipe)/i.test(lower)) {
    intent.action = "list_recipes";
  } else if (/catat (pengeluaran|biaya|belanja)/i.test(lower)) {
    intent.action = "create_expense";
    const amountMatch = lower.match(/(\d+)/);
    if (amountMatch) intent.entities.amount = amountMatch[1];
  } else if (/laporan (keuangan|finansial)|(laporan|pendapatan|keuntungan|omzet|profit|revenue)/i.test(lower)) {
    intent.action = "financial_report";
  } else if (/(?:tambah|buat|bikin)\s+(?:fitur|halaman)/i.test(lower)) {
    intent.action = "cto";
  } else if (/deploy|restart|status (server|vps)/i.test(lower)) {
    intent.action = "vps";
  }

  return intent;
}

async function handleBusiness(intent: Intent, branchId: number): Promise<string> {
  const bid = intent.branchId || branchId;

  switch (intent.action) {
    case "check_low_stock": {
      const all = await listInventoryForBranch(bid);
      const threshold = LOW_STOCK_DEFAULT;
      const low = all.filter((item) => {
        const limit = item.itemType === "ingredient" && item.minimalStock && item.minimalStock > 0 ? item.minimalStock : threshold;
        return item.currentStock < limit;
      });
      if (low.length === 0) return "Stok aman semua, bos. Ga ada yang menipis.";
      const lines = low.slice(0, 10).map((i) => `• ${i.name}: ${i.currentStock} ${i.unit} (min: ${i.minimalStock || threshold} ${i.unit})`);
      return `Stok menipis di cabang ${bid}:\n${lines.join("\n")}` + (low.length > 10 ? `\n...dan ${low.length - 10} lainnya` : "");
    }

    case "list_ingredients": {
      const items = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, bid));
      if (items.length === 0) return `Belum ada bahan baku di cabang ${bid}.`;
      return `Bahan baku cabang ${bid}:\n${items.map((i) => `• ${i.name} (${i.unit})`).join("\n")}`;
    }

    case "create_ingredient": {
      const name = intent.entities.name;
      if (!name) return "Mau tambah bahan apa? Sebutkan nama bahannya.";
      if (!intent.branchId) return `Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.`;
      await db.insert(ingredientsTable).values({ branchId: bid, name, unit: "ml" });
      return `Udah, bos! Bahan "${name}" berhasil ditambah di cabang ${bid}. Jangan lupa atur stok masuknya ya.`;
    }

    case "list_products": {
      const items = await db.select().from(productsTable).where(and(eq(productsTable.branchId, bid), eq(productsTable.isActive, true)));
      if (items.length === 0) return `Belum ada produk di cabang ${bid}.`;
      return `Menu cabang ${bid}:\n${items.map((p) => `• ${p.name} — Rp ${parseFloat(p.price).toLocaleString("id-ID")}`).join("\n")}`;
    }

    case "create_product": {
      const name = intent.entities.name;
      const price = intent.entities.price;
      if (!name) return "Mau tambah produk apa? Sebutkan nama + harganya. Contoh: tambah menu pisang coklat 15000";
      if (!price) return "Harganya berapa, bos?";
      if (!intent.branchId) return `Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.`;
      await db.insert(productsTable).values({ branchId: bid, name, price });
      return `Udah! ${name} seharga Rp ${parseInt(price).toLocaleString("id-ID")} berhasil ditambah di cabang ${bid}.`;
    }

    case "create_expense": {
      const amount = intent.entities.amount;
      if (!amount) return "Mau catat pengeluaran berapa? Kasih nominalnya.";
      if (!intent.branchId) return `Pengeluaran di cabang mana, bos?`;
      const amountNum = parseInt(amount);
      await db.insert(expensesTable).values({ branchId: bid, description: intent.raw.replace(/catat (pengeluaran|biaya|belanja)\s*/i, "").trim() || "Pengeluaran", amount: String(amountNum) });
      return `Udah dicatat, bos! Pengeluaran Rp ${amountNum.toLocaleString("id-ID")} di cabang ${bid}.`;
    }

    case "financial_report": {
      const now = new Date();
      const start = new Date(now); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
      const end = new Date(now); end.setHours(23, 59, 59, 999);
      const [stats] = await db.select({
        grossRevenue: sum(ordersTable.total),
        totalCogs: sum(ordersTable.totalCogs),
      }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), eq(ordersTable.branchId, bid)));
      const [exp] = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), eq(expensesTable.branchId, bid)));
      const rev = parseFloat(stats?.grossRevenue ?? "0");
      const cogs = parseFloat(stats?.totalCogs ?? "0");
      const expense = parseFloat(exp?.total ?? "0");
      const profit = rev - cogs - expense;
      return `📊 Laporan 30 hari terakhir — cabang ${bid}:\n• Pendapatan: Rp ${rev.toLocaleString("id-ID")}\n• Bahan baku: Rp ${cogs.toLocaleString("id-ID")}\n• Pengeluaran: Rp ${expense.toLocaleString("id-ID")}\n• Laba bersih: Rp ${profit.toLocaleString("id-ID")}`;
    }

    case "produce": {
      if (!intent.branchId) return `Produksi di cabang mana, bos?`;
      const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, bid));
      if (items.length === 0) return `Belum ada setengah jadi di cabang ${bid}.`;
      const list = items.map((i) => `• ${i.id}. ${i.name} (${i.unit})`).join("\n");
      return `Yang mau diproduksi apa, bos? Ini daftar setengah jadinya:\n${list}\n\nContoh: "produksi adonan pisang 3kg"`;
    }

    case "list_recipes": {
      return "Resep apa yang mau dilihat? Sebutkan nama produk atau setengah jadinya.";
    }

    case "adjust_stock": {
      if (!intent.branchId) return `Stok masuk di cabang mana, bos?`;
      return "Stok apa yang mau dimasukkan? Sebutkan nama bahannya.";
    }

    default:
      return "";
  }
}

router.post("/ai/chat", requireRole("owner"), async (req, res) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const user = req.user!;
    const clean = message.trim().replace(/^(halo|hallo|helo|hi|hey|hai|siang|pagi|sore|malam|permisi|bro|bang|tolong|bantu)\b[\s,]*/gi, "");
    const intent = classifyIntent(clean);
    const defaultBranchId = user.branchId || 1;

    if (intent.action === "cto" && N8N_CTO_WEBHOOK_URL) {
      const resp = await fetch(N8N_CTO_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, branchId: defaultBranchId, userId: user.id, role: user.role, userName: user.name }),
      });
      const data = await resp.json().catch(() => ({}));
      const reply = (data as Record<string, unknown>).reply || (data as Record<string, unknown>).output || JSON.stringify(data);
      res.json({ reply });
      return;
    }

    if (intent.action === "vps" && N8N_VPS_WEBHOOK_URL) {
      const resp = await fetch(N8N_VPS_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, chat_id: "7218843690" }),
      });
      const data = await resp.json().catch(() => ({}));
      const reply = (data as Record<string, unknown>).reply || (data as Record<string, unknown>).output || JSON.stringify(data);
      res.json({ reply });
      return;
    }

    const businessReply = await handleBusiness(intent, defaultBranchId);
    if (businessReply) {
      res.json({ reply: businessReply });
      return;
    }

    if (N8N_CHAT_WEBHOOK_URL) {
      const resp = await fetch(N8N_CHAT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, userName: user.name }),
      });
      const data = await resp.json().catch(() => ({}));
      const reply = (data as Record<string, unknown>).reply || (data as Record<string, unknown>).output || JSON.stringify(data);
      res.json({ reply });
      return;
    }

    res.json({ reply: "Maaf, saya belum bisa bantu itu. Coba tanya yang lain ya, bos." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
