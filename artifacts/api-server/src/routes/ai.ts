import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { db, ingredientsTable, semiFinishedTable, productsTable, expensesTable, ordersTable, stockAdjustmentsTable } from "@workspace/db";
import { eq, and, gte, lte, sum } from "drizzle-orm";
import { listInventoryForBranch, LOW_STOCK_DEFAULT, adjustInventory } from "../services/inventory";
import { exec } from "child_process";

const router = Router();

const N8N_CODE_GEN_WEBHOOK_URL = process.env.N8N_CODE_GEN_WEBHOOK_URL || "";
const GITHUB_PAT = process.env.GITHUB_PAT || "";
const GITHUB_REPO = "hamdallah24/pos-app";
const GITHUB_RAW = "https://api.github.com/repos";
const GH_HEADERS = { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3.raw" };
const SSH_HOST = process.env.SSH_HOST || "";
const SSH_USER = process.env.SSH_USER || "";
const SSH_PASS = process.env.SSH_PASSWORD || "";

// ─────────────────────────────────────────────────────────────
// 1. DEEPSEEK / SUMOPOD HELPER
// ─────────────────────────────────────────────────────────────
async function callDeepSeek(system: string, user: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { console.error("[ai] DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL not set"); return ""; }
  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system.slice(0, 4000) },
          { role: "user", content: user.slice(0, 2000) },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error(`[ai] DeepSeek HTTP ${resp.status}: ${err.slice(0, 200)}`);
      return "";
    }
    const json = await resp.json();
    return (json as any).choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[ai] callDeepSeek fetch error:", err);
    return "";
  }
}

// ─────────────────────────────────────────────────────────────
// 2. BANG — CTO ORCHESTRATOR PROMPT
// ─────────────────────────────────────────────────────────────
const BANG_ORCHESTRATOR = `KAMU: BANG — CTO Orchestrator Lume's Everywhere.
Tugas: PILIH 1 specialist → JAWAB sebagai specialist itu.

TIM DEV (pilih yg paling relevan ke pesan user):
- APIK — Backend Dev: Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, REST API, middleware, routes. Path: artifacts/api-server/src/
- KITA — Frontend Dev: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons, TypeScript. Path: artifacts/pos-app/src/
- BASU — Database Spec: PostgreSQL (Neon.tech), Drizzle schema, migration, index, query optimization. Path: lib/db/src/schema/
- OPIK — DevOps Eng: PM2, Nginx, Ubuntu 22.04, SSL, VPS Alibaba (43.157.227.205), GitHub CI/CD
- COBA — QA Engineer: Testing, debugging, error analysis, edge cases, regression. Semua stack.
- AMAN — Security Spec: Auth (Passport.js), Google OAuth, CSRF (csrf-csrf), CORS, rate limiting, session (connect-pg-simple)
- LAJU — Performance Eng: Bundle size, lazy loading (React.lazy), code splitting, caching, Lighthouse. Bundler: Vite/Rollup
- CANT — UI/UX Designer: Mobile-first 360px, touch target 48px, glassmorphism (#1565FF), dark mode, accessibility (WCAG)

FORMAT WAJIB (selalu pakai format ini):
[NAMA] — [Role]:
[Jawaban kamu. Maks 1500 karakter.]

TAMBAHAN untuk COBA & AMAN:
Jika perlu liat kode, sebut path file spesifik dengan format: \`path/file:linenum\`

ATURAN:
1. HANYA jawab sebagai 1 specialist
2. JANGAN jawab sebagai BANG (kecuali user tanya arsitektur/struktur/refactor/design pattern)
3. Jika user tanya soal arsitektur/sistem → jawab sebagai BANG langsung
4. JANGAN panggil >1 specialist tanpa konfirmasi user
5. Singkat, konkret, beri contoh kode jika relevan
6. Bahasa Indonesia, profesional, maks 1500 karakter

STACK UMUM:
Repo: hamdallah24/lumespos (pnpm monorepo)
Branch: main (production), Staging (development)
Auth: Google OAuth + invite code SIGNUP_CODE
Table: users, branches, products, orders, expenses, ingredients, semi_finished, recipes, inventory, shift_audits, user_branches`;

// ─────────────────────────────────────────────────────────────
// 3. SPECIALIST PROMPT SHORTS (appended by orchestrator selection)
// ─────────────────────────────────────────────────────────────
const SPECIALIST_NOTE: Record<string, string> = {
  backend: `[KONTEKS TAMBAHAN UNTUK APIK]
Stack: Node.js Express TS + Drizzle ORM + PostgreSQL Neon.tech. Path: artifacts/api-server/src/
Routes: auth, products, orders, expenses, inventory, semiFinished, dashboard, users, shiftAudits, storage
Middleware: requireAuth.ts, requireRole, requireBranchAccess
Response selalu: res.json({ reply: "..." }), bukan res.send()
SEBUT path file yg relevan.`,
  frontend: `[KONTEKS TAMBAHAN UNTUK KITA]
Stack: React 18 + Vite + Tailwind CSS + Framer Motion + Lucide Icons. Path: artifacts/pos-app/src/
Mobile 360px, touch target >=48px, primary #1565FF, dark mode: dark: prefix
Design: rounded-2xl (16px), glass: backdrop-blur-xl border-[#1565FF]/10
SEBUT path file yg relevan.`,
  database: `[KONTEKS TAMBAHAN UNTUK BASU]
Stack: PostgreSQL Neon.tech + Drizzle ORM. Path: lib/db/src/schema/
Tables: branches, categories, expenses, products, product_variants, orders, order_items, users, ingredients, semi_finished, recipes, current_inventory, stock_adjustments, shift_audits, user_branches
SEBUT table name, field name, dan usulkan index.`,
  devops: `[KONTEKS TAMBAHAN UNTUK OPIK]
VPS: Ubuntu 22.04 Alibaba Cloud, IP 43.157.227.205, Domain: 43.157.227.205.nip.io
PM2: pos-api (fork mode), Nginx: reverse proxy ke localhost:3000, path: /etc/nginx/sites-available/pos
Build: pnpm --filter ./artifacts/api-server run build, Restart: pm2 restart pos-api
Proyek root: ~/lumespos/, API dist: artifacts/api-server/dist/index.mjs`,
  qa: `[KONTEKS TAMBAHAN UNTUK COBA]
Stack: full Lume's (Express + React + PostgreSQL). Semua path valid.
Tugas: diagnosa bug/error/crash. SEBUT file path + nomor baris yg dicurigai.
Test scenarios: auth (login/signup/Google), CSRF, cart, payment (Tunai/QRIS/Online), shift (start/end + stok + foto), inventory, dashboard.
File kunci: artifacts/api-server/src/routes/, artifacts/pos-app/src/components/`,
  security: `[KONTEKS TAMBAHAN UNTUK AMAN]
Auth: Passport.js Google OAuth 2.0 + email/password + SIGNUP_CODE invite.
CSRF: csrf-csrf, cookie pos-csrf, sameSite=lax, skip /api/auth/* dan /auth/*
Session: express-session + connect-pg-simple, httpOnly, sameSite=lax, secure (production)
CORS: CORS_ORIGINS env, Helmet CSP: app.ts
Rate limit: express-rate-limit 600/15min, trust proxy enabled
File upload: multer local dir /uploads
SEBUT path file + nomor baris yg relevan.`,
  architect: `[KONTEKS TAMBAHAN UNTUK BANG]
BANG — Software Architect. Full stack Lume's monorepo.
Struktur: artifacts/api-server/ (Express), artifacts/pos-app/ (React), lib/db/ (Drizzle schema), lib/api-client-react/ (shared types)
Key files: artifacts/api-server/src/app.ts (config), artifacts/api-server/src/routes/ (semua route),
artifacts/pos-app/src/App.tsx (router), artifacts/pos-app/src/components/layout.tsx (layout)
HANYA analisis arsitektur, struktur folder, design pattern, scalable solution.`,
  performance: `[KONTEKS TAMBAHAN UNTUK LAJU]
Bundle: Vite + Rollup, chunks >500KB. Entry: artifacts/pos-app/src/main.tsx
Caching: Nginx immutable untuk assets, no-store untuk index.html, __BUILD_ID__ cache busting
Lazy: React.lazy + Suspense, dynamic import(). Image: loading="lazy"
Target: mobile 4G, FCP <2s, LCP <2.5s, TBT <200ms, CLS <0.1`,
  ux: `[KONTEKS TAMBAHAN UNTUK CANT]
Design system: Mobile 360px, touch target 48px, primary #1565FF, dark: #071426, bg: #F8FBFC
Radius: rounded-2xl (16px), Glass: backdrop-blur-xl border-[#1565FF]/10, shadow-lg shadow-[#1565FF]/5
Komponen: card-responsive (clamp), FAB 64px, bottom nav 72px, header 72px
Accessibility: WCAG AA, aria-label, role, keyboard nav, focus-visible ring`,
};

// ─────────────────────────────────────────────────────────────
// 4. CHAT & BISNIS SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────
const CHAT_SYSTEM = `Kamu asisten ramah Lume's Everywhere — aplikasi POS kuliner.
Jawab santai, hangat, bantu brainstorming ide bisnis, resep, tips marketing.
Maks 500 karakter. Bahasa Indonesia. Jangan teknis kecuali diminta.
Jika user butuh bantuan teknis, arahkan ke tab CTO.`;

const BISNIS_SYSTEM = `Kamu asisten bisnis Lume's Everywhere — aplikasi POS kuliner.
Jawab pertanyaan bisnis: analisis, saran, ide marketing, strategi harga, tren kuliner, efisiensi operasional.
Jika user tanya data spesifik (stok, menu, laporan), arahkan: "Coba ketik 'cek stok menipis', 'lihat menu', atau 'laporan keuangan' ya bos."
Singkat, padat, maks 500 karakter. Bahasa Indonesia. JANGAN bilang "aku belum bisa akses" — kamu BISA bantu analisis bisnis.`;

// ─────────────────────────────────────────────────────────────
// 5. GITHUB FILE HELPERS
// ─────────────────────────────────────────────────────────────
async function fetchGitHubFile(path: string, branch = "main"): Promise<string> {
  if (!GITHUB_PAT) return "";
  const resp = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`, { headers: GH_HEADERS });
  return resp.ok ? resp.text() : "";
}

async function fetchGitHubDir(path: string, branch = "main"): Promise<string> {
  if (!GITHUB_PAT) return "";
  const resp = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) return "";
  const items = await resp.json().catch(() => []);
  if (!Array.isArray(items)) return "";
  return items.map((i: any) => `${i.type === "dir" ? "📁" : "📄"} ${i.name}`).join("\n");
}

// ─────────────────────────────────────────────────────────────
// 6. SSH HELPER
// ─────────────────────────────────────────────────────────────
function sshExec(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    if (!SSH_HOST || !SSH_USER || !SSH_PASS) { resolve(""); return; }
    const sshCmd = `sshpass -p '${SSH_PASS}' ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "${cmd}"`;
    exec(sshCmd, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message) : (stdout || "no output"));
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 7. BUSINESS HANDLER
// ─────────────────────────────────────────────────────────────
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

  // ── TAMBAH STOK: "tambah stok air 19000 ml" ──
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

  // ── KURANGI STOK: "kurangi stok air 500" ──
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

  // ── KOREKSI HILANG: "koreksi hilang air 200" ──
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

  // ── KOREKSI STOK JADI: "koreksi stok air jadi 1000" ──
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

  // ── UBAH HARGA PRODUK: "ubah harga Nasi Goreng jadi 25000" ──
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

  // ── HAPUS PRODUK: "hapus Nasi Goreng" / "nonaktifkan Es Teh" ──
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

  // Cari stok spesifik: "cari stok gula", "stok tepung", "berapa stok minyak"
  if (/cari\s+(?:stok\s+)?(\w+)|stok\s+(\w+)|berapa\s+(?:stok\s+)?(\w+)/i.test(lower)) {
    const nameMatch = lower.match(/(?:cari\s+)?(?:stok\s+)?(\w{3,})/i);
    const searchName = nameMatch?.[1] || "";
    if (searchName.length >= 3) {
      const all = await listInventoryForBranch(userBranchId);
      const found = all.filter((i) => i.name.toLowerCase().includes(searchName));
      if (found.length === 0) return `Ga nemu "${searchName}" di inventori cabang ${userBranchId}, bos.`;
      return `Stok di cabang ${userBranchId}:\n${found.map((i) => `• ${i.name}: ${i.currentStock} ${i.unit}`).join("\n")}`;
    }
  }

  // Lihat semua stok / cek stok
  if (/lihat\s+stok|cek\s+stok|inventori|semua\s+(stok|bahan)/i.test(lower)) {
    const all = await listInventoryForBranch(userBranchId);
    if (all.length === 0) return `Inventori cabang ${userBranchId} kosong, bos.`;
    return `📦 Inventori cabang ${userBranchId}:\n${all.map((i) => `• ${i.name}: ${i.currentStock} ${i.unit} (${i.itemType})`).join("\n")}`;
  }

  if (/lihat (bahan|ingredient|bahan baku)|daftar (bahan|ingredient)/i.test(lower)) {
    const items = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada bahan baku di cabang ${userBranchId}.`;
    return `Bahan baku cabang ${userBranchId}:\n${items.map((i) => `• ${i.name} (${i.unit})`).join("\n")}`;
  }
  if (/tambah (bahan|ingredient|bahan baku)/i.test(lower)) {
    const nameMatch = lower.match(/tambah (?:bahan|ingredient|bahan baku)\s+(\w+(?:\s+\w+)*?)(?:\s+\d+|\s*$)/i);
    if (!nameMatch) return "Mau tambah bahan apa? Sebutkan nama bahannya.";
    if (!branchMatch) return "Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.";
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
    if (!branchMatch) return "Mau di cabang mana, bos? 1 (Cilengkrang 1), 2 (Cilengkrang 2), dst.";
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
  if (/laporan|pendapatan|keuntungan|omzet|profit|revenue/i.test(lower)) {
    const now = new Date();
    let start = new Date(now); start.setDate(start.getDate() - 30);
    let end = new Date(now);
    let label = "30 hari terakhir";

    // Range: "dari 12 september 2026 sampai 20 oktober 2026"
    const rangeMatch = lower.match(/dari\s+(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\s+(?:sampai|s\.d|hingga)\s+(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/i);
    if (rangeMatch) {
      const months: Record<string, number> = { januari:0,februari:1,maret:2,april:3,mei:4,juni:5,juli:6,agustus:7,september:8,oktober:9,november:10,desember:11 };
      start = new Date(+rangeMatch[3], months[rangeMatch[2]], +rangeMatch[1], 0, 0, 0, 0);
      end = new Date(+rangeMatch[6], months[rangeMatch[5]], +rangeMatch[4], 23, 59, 59, 999);
      label = `${rangeMatch[1]} ${rangeMatch[2]} ${rangeMatch[3]} — ${rangeMatch[4]} ${rangeMatch[5]} ${rangeMatch[6]}`;
    }

    // "hari ini" / "(untuk)?hari ini" / "today"
    else if (/hari\s*ini|today/i.test(lower)) {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setHours(23, 59, 59, 999);
      label = "hari ini";
    }

    // "kemarin" / "yesterday"
    else if (/kemarin|yesterday/i.test(lower)) {
      start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
      label = "kemarin";
    }

    // "7 hari" / "seminggu" / "minggu ini"
    else if (/7\s*hari|seminggu/i.test(lower)) {
      start = new Date(now); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
      label = "7 hari terakhir";
    }

    // "14 hari" / "2 minggu"
    else if (/14\s*hari|2\s*minggu/i.test(lower)) {
      start = new Date(now); start.setDate(start.getDate() - 14); start.setHours(0, 0, 0, 0);
      label = "14 hari terakhir";
    }

    // "bulan ini" / "this month"
    else if (/bulan\s*ini|this\s*month/i.test(lower)) {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      label = "bulan ini";
    }

    // "bulan lalu" / "last month"
    else if (/bulan\s*lalu|last\s*month/i.test(lower)) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      label = "bulan lalu";
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const [stats] = await db.select({
      grossRevenue: sum(ordersTable.total),
      totalCogs: sum(ordersTable.totalCogs),
    }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), eq(ordersTable.branchId, userBranchId)));
    const [exp] = await db.select({ total: sum(expensesTable.amount) }).from(expensesTable).where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), eq(expensesTable.branchId, userBranchId)));
    const rev = parseFloat(stats?.grossRevenue ?? "0");
    const cogs = parseFloat(stats?.totalCogs ?? "0");
    const expense = parseFloat(exp?.total ?? "0");
    const profit = rev - cogs - expense;
    return `📊 Laporan ${label} — cabang ${userBranchId}:\n• Pendapatan: Rp ${rev.toLocaleString("id-ID")}\n• Bahan baku: Rp ${cogs.toLocaleString("id-ID")}\n• Pengeluaran: Rp ${expense.toLocaleString("id-ID")}\n• Laba bersih: Rp ${profit.toLocaleString("id-ID")}`;
  }
  if (/produksi|bikin (setengah jadi|adonan)/i.test(lower)) {
    if (!branchMatch) return "Produksi di cabang mana, bos?";
    const items = await db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, userBranchId));
    if (items.length === 0) return `Belum ada setengah jadi di cabang ${userBranchId}.`;
    const list = items.map((i) => `• ${i.id}. ${i.name} (${i.unit})`).join("\n");
    return `Yang mau diproduksi apa, bos? Ini daftar setengah jadinya:\n${list}\n\nContoh: "produksi adonan pisang 3kg"`;
  }
  return "";
}

// ─────────────────────────────────────────────────────────────
// 8. ROUTER
// ─────────────────────────────────────────────────────────────
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

      // ── CHAT ──
      case "chat": {
        const reply = await callDeepSeek(CHAT_SYSTEM, clean);
        res.json({ reply: reply || "Chat Agent sedang sibuk, coba lagi ya bos." });
        return;
      }

      // ── CTO ──
      case "cto": {
        const lower = clean.toLowerCase();

        // Baca file GitHub
        if (/baca\s+(file\s+)?\S+\.[a-z]+/i.test(lower) || /lihat\s+(file\s+)?\S+/i.test(lower)) {
          const fileMatch = lower.match(/(?:baca|lihat|read)\s+(?:file\s+)?(\S+\.\w+)/i);
          if (fileMatch) {
            const content = await fetchGitHubFile(fileMatch[1]);
            if (content) {
              res.json({ reply: `📄 ${fileMatch[1]}:\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\`` + (content.length > 3000 ? `\n\n...dipotong (${content.length} karakter total)` : "") });
              return;
            }
            res.json({ reply: `File "${fileMatch[1]}" tidak ditemukan atau GITHUB_PAT belum diset.` });
            return;
          }
        }

        // List direktori GitHub
        if (/list\s+(?:direktori|directory|folder|struktur)/i.test(lower)) {
          const dirMatch = lower.match(/(?:list\s+(?:direktori|directory|folder|struktur)\s+)?(\S+)/i);
          const dir = dirMatch ? dirMatch[1].replace(/(list|direktori|directory|folder|struktur)/i, "").trim() : "";
          const listing = await fetchGitHubDir(dir || "artifacts");
          if (listing) { res.json({ reply: `📁 ${dir || "artifacts"}:\n${listing}` }); return; }
          res.json({ reply: "Direktori tidak ditemukan atau GITHUB_PAT belum diset." });
          return;
        }

        // Code Generator → arahkan ke n8n
        if (/(?:generate|bikin|buat|tulis)\s*(?:kode|code|file|komponen|component|route|endpoint|halaman|page)/i.test(lower)) {
          if (N8N_CODE_GEN_WEBHOOK_URL) {
            const resp = await fetch(N8N_CODE_GEN_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: clean, userId: user.id, userName: user.name }),
            });
            const data = await resp.json().catch(() => ({}));
            const reply = (data as any).reply || (data as any).output || "Code Generator sedang sibuk.";
            res.json({ reply });
            return;
          }
          res.json({ reply: "Code Generator belum dikonfigurasi (N8N_CODE_GEN_WEBHOOK_URL kosong)." });
          return;
        }

        // Dynamic Specialist → BANG orchestrator + DeepSeek
        const bangReply = await callDeepSeek(BANG_ORCHESTRATOR, clean);
        res.json({ reply: bangReply || "BANG sedang sibuk, coba lagi ya bos." });
        return;
      }

      // ── VPS ──
      case "vps": {
        const lower = clean.toLowerCase();
        let cmd = "";

        if (/deploy|git pull/i.test(lower)) {
          res.json({ reply: "Deploy jangan lewat sini ya bos. SSH manual aja:\n```\ngit pull && pnpm build && pm2 restart\n```" });
          return;
        }
        if (/restart/i.test(lower)) {
          res.json({ reply: "Restart jangan lewat sini ya bos. SSH manual:\n```\npm2 restart pos-api\n```" });
          return;
        }
        if (/status|keadaan|info/i.test(lower)) cmd = "pm2 status && echo '---' && free -m && echo '---' && uptime";
        else if (/logs|log/i.test(lower)) cmd = "pm2 logs pos-api --lines 30 --nostream";
        else if (/health|sehat|alive/i.test(lower)) cmd = "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health && echo ' (200=OK)'";
        else if (/ram|memori|memory/i.test(lower)) cmd = "free -m";
        else if (/disk|hardisk|storage/i.test(lower)) cmd = "df -h /";
        else if (/uptime/i.test(lower)) cmd = "uptime";

        if (cmd) {
          const result = await sshExec(cmd);
          if (!result) { res.json({ reply: "Gagal SSH ke VPS. Cek SSH_HOST, SSH_USER, SSH_PASSWORD di .env." }); return; }
          res.json({ reply: `\`\`\`\n${result.slice(0, 3000)}\n\`\`\`` });
          return;
        }
        res.json({ reply: "Command VPS ga dikenal. Coba: status, logs, health, ram, disk, uptime.\nDeploy & restart harus SSH manual ya bos." });
        return;
      }

      // ── BISNIS ──
      case "bisnis":
      default: {
        const biz = await handleBusiness(clean, defaultBranchId);
        if (biz) { res.json({ reply: biz }); return; }
        const fallback = await callDeepSeek(BISNIS_SYSTEM, clean);
        res.json({ reply: fallback || "Maaf, saya belum bisa bantu itu. Coba tanya yang lain ya, bos." });
        return;
      }
    }
  } catch (err) {
    console.error("[ai] Route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
