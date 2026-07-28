// FOUNDATION FILE — Modification Policy: Only bug fixes and extensions. ADR Required. Owner: CTO.
// ECP-040: Tool Adapter — Stateless tool execution
// Responsibilities: tool dispatch, tool implementations, tool definitions
// No Governor. No lifecycle. No policy. No LLM communication.

import { exec } from "child_process";
import { existsSync } from "fs";
import { readdir, stat, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve } from "path";
import { promisify } from "util";
import { aiMissionService } from "../../services/ai-mission-service";
import { execSync } from "child_process";
import { db, ordersTable, orderItemsTable, expensesTable, productsTable, ingredientsTable, semiFinishedTable, currentInventoryTable, shiftAuditsTable } from "@workspace/db";
import { eq, gte, lte, and, sum, count, sql, desc } from "drizzle-orm";

const execP = promisify(exec);

// ── Config ──

// Find monorepo root by walking up for pnpm-workspace.yaml or artifacts/
function findProjectRoot(): string {
  let dir = process.cwd().replace(/\\/g, "/");
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return resolve(dir);
    if (existsSync(resolve(dir, "artifacts"))) return resolve(dir);
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}
export const PROJECT_ROOT = findProjectRoot();

// Resolve user-provided path relative to PROJECT_ROOT (not CWD)
function resolveProjectPath(p: string): string {
  if (p.startsWith("/")) return resolve(p);
  // If already absolute via resolve(), use as-is
  const abs = resolve(p);
  if (abs.startsWith(PROJECT_ROOT)) return abs;
  return resolve(PROJECT_ROOT, p);
}

export const GITHUB_PAT = process.env.GITHUB_PAT || "";
export const GITHUB_REPO = "hamdallah24/lumespos";
export const GITHUB_RAW = "https://api.github.com/repos";
const GITHUB_API = "https://api.github.com/repos";
const GITHUB_BRANCH = "main";

export const SSH_HOST = process.env.SSH_HOST || "";
export const SSH_USER = process.env.SSH_USER || "";
export const SSH_PASS = process.env.SSH_PASSWORD || "";
export const SSH_KEY_PATH = process.env.SSH_KEY_PATH || "";

// ── Types ──

export interface ToolDef { name: string; description: string; parameters: Record<string, any>; }

// ── GitHub ──

export async function fetchGitHubFile(path: string, branch = "main"): Promise<{ content: string; status: number; sha: string }> {
  if (!GITHUB_PAT) return { content: "", status: 0, sha: "" };
  const url = `${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 15000);
  let resp;
  try {
    resp = await fetch(url, { headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github+json" }, signal: controller.signal });
  } finally { clearTimeout(tid); }
  if (!resp.ok) {
    console.error(`[ai] GitHub fetch ${resp.status}: ${url}`);
    return { content: "", status: resp.status, sha: "" };
  }
  const json = await resp.json() as any;
  const content = json.content ? Buffer.from(json.content, "base64").toString("utf-8") : "";
  return { content, status: 200, sha: json.sha || "" };
}

export async function fetchGitHubDir(path: string, branch = "main"): Promise<string> {
  if (!GITHUB_PAT) return "Error: GITHUB_PAT tidak dikonfigurasi.";
  let resp;
  try {
    resp = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`, {
      headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3+json" },
      signal: AbortSignal.timeout(15000),
    });
  } catch { return `Error: Timeout/Gagal menghubungi GitHub — ${path}`; }
  if (!resp.ok) return `Error: GitHub ${resp.status} — ${path} tidak ditemukan di branch ${branch}.`;
  const items = await resp.json().catch(() => []);
  if (!Array.isArray(items)) return "Error: Response GitHub bukan array.";
  return items.map((i: any) => `${i.type === "dir" ? "📁" : "📄"} ${i.name}`).join("\n");
}

// ── Dynamic Repo Search ──

let treeCache: { ts: number; paths: string[] } | null = null;

export async function searchRepoFiles(query: string): Promise<string[]> {
  if (!GITHUB_PAT) return [];

  if (!treeCache || Date.now() - treeCache.ts > 300000) {
    let resp;
    try {
      resp = await fetch(`${GITHUB_API}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH || "main"}?recursive=true`, {
        headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(15000),
      });
    } catch { return []; }
    if (!resp.ok) return [];
    const json = await resp.json() as any;
    const paths: string[] = (json.tree || [])
      .filter((t: any) => t.type === "blob"
        && /\.(tsx?|jsx?|json|css|md)$/.test(t.path)
        && !t.path.includes("node_modules/")
        && !t.path.includes(".pnpm/")
        && !t.path.includes("/dist/")
        && !t.path.includes("-lock.json")
        && !t.path.includes("@radix-ui")
        && !t.path.includes(".local/")
        && !t.path.includes(".cache/")
      )
      .map((t: any) => t.path);
    treeCache = { ts: Date.now(), paths };
  }

  const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2);
  const scored = treeCache.paths.map((path: string) => {
    const lower = path.toLowerCase();
    const fname = (path.split("/").pop() || "").replace(/\.[^.]+$/, "").toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (fname === kw) { score += 20; }
      else if (fname.startsWith(kw)) { score += 12; }
      else if (fname.includes(kw)) { score += 8; }
      else if (lower.includes(kw)) { score += 3; }
    }
    return { path, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(s => s.path);
}

// ── SSH ──

export function sshExec(cmd: string): Promise<string> {
  return new Promise((resolve) => {
    if (!SSH_HOST || !SSH_USER) { resolve("ERROR: SSH_HOST atau SSH_USER tidak dikonfigurasi."); return; }
    let sshCmd: string;
    if (SSH_KEY_PATH) {
      sshCmd = `ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -o BatchMode=yes ${SSH_USER}@${SSH_HOST} "${cmd}"`;
    } else if (SSH_PASS) {
      sshCmd = `SSHPASS='${SSH_PASS}' sshpass -e ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "${cmd}"`;
    } else {
      resolve("ERROR: SSH_PASS atau SSH_KEY_PATH tidak dikonfigurasi."); return;
    }
    exec(sshCmd, { timeout: 30000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message) : (stdout || "no output"));
    });
  });
}

// ── Import Graph ──

const IMPORT_RE = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?)\s+from\s+)?['"]([^'"]+)['"]/g;

export async function getDependencies(filePath: string): Promise<string> {
  const variants = resolvePathVariants(filePath);
  let full = "";
  for (const v of variants) {
    if (existsSync(v)) { full = v; break; }
  }
  if (!full) return `Error: File ${filePath} tidak ditemukan.`;
  try {
    const content = await readFile(full, "utf-8");
    const imports: string[] = [];
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      const specifier = match[1];
      if (!specifier.startsWith(".") && !specifier.startsWith("/")) continue;
      const resolved = resolve(dirname(full), specifier);
      const relative = resolved.startsWith(PROJECT_ROOT) ? resolved.slice(PROJECT_ROOT.length + 1).replace(/\\/g, "/") : specifier;
      if (!imports.includes(relative)) imports.push(relative);
    }
    if (imports.length === 0) return "(no internal imports)";
    return imports.map(p => `  → ${p}`).join("\n");
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

// ── Local Tools ──

const SAFE_DIRS = [PROJECT_ROOT, join(PROJECT_ROOT, "artifacts"), join(PROJECT_ROOT, "lib")];
function isPathSafe(p: string): boolean { return SAFE_DIRS.some(d => resolve(p).startsWith(d)); }

// Try multiple path variants for search/read fallback
function resolvePathVariants(raw: string): string[] {
  const candidates: string[] = [];
  const abs = resolveProjectPath(raw);
  candidates.push(abs);
  // Remove monorepo root prefix if redundant
  const rel = abs.replace(/\\/g, "/").replace(PROJECT_ROOT.replace(/\\/g, "/") + "/", "");
  // Try common aliases
  const altPaths = [
    rel,
    rel.replace(/^artifacts\/[^/]+\/src\//, "src/"),
    rel.replace(/^artifacts\/[^/]+\/src\/pages\//, "pages/"),
    rel.replace(/^lib\/db\/src\//, "db/"),
    rel.replace(/^artifacts\/api-server\/src\//, "api/"),
  ];
  for (const alt of altPaths) {
    const candidate = resolve(PROJECT_ROOT, alt);
    if (candidate !== abs && !candidates.includes(candidate)) candidates.push(candidate);
  }
  return candidates;
}

export async function listLocalDir(dirPath: string): Promise<string> {
  const variants = resolvePathVariants(dirPath);
  for (const full of variants) {
    if (!isPathSafe(full)) continue;
    if (!existsSync(full)) continue;
    try {
      const items = await readdir(full, { withFileTypes: true });
      const result = await Promise.all(items.map(async d => {
        if (d.isDirectory()) return `📁 ${d.name}`;
        const s = await stat(join(full, d.name));
        return `📄 ${d.name} (${s.size} bytes)`;
      }));
      return result.join("\n");
    } catch { /* try next variant */ }
  }
  return `Error: Directory ${dirPath} tidak ditemukan.`;
}

export async function readLocalFile(filePath: string, maxChars = 50000): Promise<string> {
  const variants = resolvePathVariants(filePath);
  for (const full of variants) {
    if (!isPathSafe(full)) continue;
    if (!existsSync(full)) continue;
    try {
      const content = await readFile(full, "utf-8");
      return content.length > maxChars ? content.slice(0, maxChars) + `\n\n... (truncated, ${content.length - maxChars} chars remaining)` : content;
    } catch { /* try next variant */ }
  }
  return `Error: File ${filePath} tidak ditemukan.`;
}

export async function searchLocalContent(dirPath: string, pattern: string): Promise<string> {
  const variants = resolvePathVariants(dirPath);
  for (const full of variants) {
    if (!isPathSafe(full)) continue;
    if (!existsSync(full)) continue;
    try {
      const cmd = process.platform === "win32"
        ? `findstr /s /i /n "${pattern}" "${full}\\*" 2>nul`
        : `grep -rn --include="*.ts" --include="*.tsx" --include="*.json" "${pattern}" "${full}" 2>/dev/null | head -30`;
      const { stdout } = await execP(cmd, { timeout: 5000, cwd: PROJECT_ROOT });
      const result = stdout.trim();
      if (result) return result;
    } catch { /* try next variant */ }
  }
  return `Tidak ditemukan "${pattern}" di ${dirPath}`;
}

export async function writeLocalFile(filePath: string, content: string): Promise<string> {
  const full = resolve(filePath);
  if (!isPathSafe(full)) return `Error: Path ${filePath} di luar project.`;
  try {
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
    return `✅ File ${filePath} berhasil ditulis (${content.length} chars).`;
  } catch (e: any) { return `Error: ${e.message}`; }
}

export async function editLocalFile(filePath: string, search: string, replace: string): Promise<string> {
  const full = resolve(filePath);
  if (!isPathSafe(full)) return `Error: Path ${filePath} di luar project.`;
  if (!existsSync(full)) return `Error: File ${filePath} tidak ditemukan.`;
  try {
    let content = await readFile(full, "utf-8");
    const count = content.split(search).length - 1;
    if (count === 0) return `Error: "search" tidak ditemukan di file.`;
    if (count > 1) return `Error: "search" muncul ${count}x (harus tepat 1x).`;
    content = content.replace(search, replace);
    await writeFile(full, content);
    return `✅ File ${filePath} berhasil diedit (1 replacement).`;
  } catch (e: any) { return `Error: ${e.message}`; }
}

export async function execLocalCommand(command: string): Promise<string> {
  const allowed = ["git", "pnpm", "npm", "pm2", "node", "tsc", "npx", "ls", "cat", "echo", "uptime"];
  const cmdName = command.trim().split(/\s+/)[0];
  if (!allowed.includes(cmdName)) return `Error: Command "${cmdName}" tidak diizinkan. Allowed: ${allowed.join(", ")}`;
  if (cmdName === "git") {
    const subCmd = command.trim().split(/\s+/)[1] || "";
    const allowedGit = ["status", "diff", "checkout", "merge", "push", "pull", "fetch", "branch", "log", "remote", "add", "commit"];
    if (subCmd && !allowedGit.includes(subCmd)) return `Error: Git subcommand "${subCmd}" tidak diizinkan. Allowed: ${allowedGit.join(", ")}`;
  }
  try {
    const { stdout, stderr } = await execP(command, { timeout: 30000, cwd: PROJECT_ROOT });
    return (stdout || stderr || "(no output)").trim();
  } catch (e: any) { return `Error: ${e.stderr?.toString() || e.message}`; }
}

// ── Merge & Deploy ──

export async function mergeDeploy(onStep?: (step: string, detail: string) => void): Promise<{ ok: boolean; summary: string }> {
  const log = (s: string, d: string) => { onStep?.(s, d); console.log(`[merge] ${s}: ${d.slice(0, 100)}`); };
  try {
    log("sync", "Syncing Staging ← main...");
    execSync("git fetch", { cwd: PROJECT_ROOT, timeout: 15000 });
    execSync("git checkout Staging && git merge main --no-edit && git push origin Staging", { cwd: PROJECT_ROOT, timeout: 30000 });

    log("merge", "Merging main ← Staging...");
    execSync("git checkout main && git merge Staging --no-edit", { cwd: PROJECT_ROOT, timeout: 15000 });

    const diff = execSync("git diff HEAD~1 --name-only", { cwd: PROJECT_ROOT, timeout: 5000 }).toString().trim();

    log("build_api", "Building API server...");
    execSync("pnpm --filter ./artifacts/api-server run build 2>&1", { cwd: PROJECT_ROOT, timeout: 60000 });

    log("build_ui", "Building frontend...");
    execSync("pnpm --filter ./artifacts/pos-app run build 2>&1", { cwd: PROJECT_ROOT, timeout: 60000 });

    execSync("git push origin main", { cwd: PROJECT_ROOT, timeout: 15000 });

    log("done", "Build selesai. Silakan restart via VPS tab → 'restart api'");
    return { ok: true, summary: `✅ Merge & build selesai.\nFiles changed: ${diff.slice(0, 500)}\n\nRestart: buka VPS tab → "restart api"` };
  } catch (e: any) {
    const errMsg = e.stderr?.toString() || e.message || String(e);
    log("error", errMsg.slice(0, 200));
    return { ok: false, summary: `❌ Gagal: ${errMsg.slice(0, 300)}` };
  }
}

// ── Business Data Tool Handlers ──

function todayRange() {
  const s = new Date(); s.setHours(0,0,0,0);
  const e = new Date(); e.setHours(23,59,59,999);
  return { s, e };
}

function makeBranchFilter(branchId?: number, table?: any) {
  const t = table || ordersTable;
  return branchId ? eq(t.branchId, branchId) : undefined;
}

async function handleGetSalesSummary(args: Record<string, any>): Promise<string> {
  try {
    const { s, e } = todayRange();
    const bf = makeBranchFilter(args.branchId);
    const [stats] = await db.select({
      revenue: sum(ordersTable.total), orders: count(ordersTable.id),
    }).from(ordersTable).where(and(gte(ordersTable.createdAt, s), lte(ordersTable.createdAt, e), bf));
    const [exp] = await db.select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(gte(expensesTable.createdAt, s), lte(expensesTable.createdAt, e), args.branchId ? eq(expensesTable.branchId, args.branchId) : undefined));
    return JSON.stringify({
      todayRevenue: parseFloat(stats?.revenue ?? "0"),
      todayOrders: stats?.orders ?? 0,
      todayExpenses: parseFloat(exp?.total ?? "0"),
    }, null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetFinancialReport(args: Record<string, any>): Promise<string> {
  try {
    const start = args.startDate ? new Date(args.startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; })();
    const end = args.endDate ? new Date(args.endDate) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();
    const bf = makeBranchFilter(args.branchId);
    const [stats] = await db.select({
      grossRevenue: sum(ordersTable.total), totalCogs: sum(ordersTable.totalCogs),
    }).from(ordersTable).where(and(gte(ordersTable.createdAt, start), lte(ordersTable.createdAt, end), bf));
    const [exp] = await db.select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(gte(expensesTable.createdAt, start), lte(expensesTable.createdAt, end), args.branchId ? eq(expensesTable.branchId, args.branchId) : undefined));
    const gr = parseFloat(stats?.grossRevenue ?? "0");
    const tc = parseFloat(stats?.totalCogs ?? "0");
    const te = parseFloat(exp?.total ?? "0");
    const gp = gr - tc;
    const np = gp - te;
    return JSON.stringify({ grossRevenue: gr, totalCogs: tc, totalExpenses: te, grossProfit: gp, netProfit: np, grossMarginPct: gr > 0 ? (gp/gr)*100 : 0, netMarginPct: gr > 0 ? (np/gr)*100 : 0 }, null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetTopProducts(args: Record<string, any>): Promise<string> {
  try {
    const limit = args.limit || 5;
    const { s, e } = todayRange();
    const bf = makeBranchFilter(args.branchId);
    if (args.period === "week") { s.setDate(s.getDate() - 7); }
    else if (args.period === "month") { s.setMonth(s.getMonth() - 1); }
    const rows = await db.select({
      productId: orderItemsTable.productId, productName: orderItemsTable.productName,
      totalSold: sum(orderItemsTable.quantity), totalRevenue: sum(orderItemsTable.subtotal),
    }).from(orderItemsTable).innerJoin(ordersTable, eq(ordersTable.id, orderItemsTable.orderId))
      .where(and(gte(ordersTable.createdAt, s), lte(ordersTable.createdAt, e), bf))
      .groupBy(orderItemsTable.productId, orderItemsTable.productName)
      .orderBy(sql`sum(${orderItemsTable.quantity}) desc`).limit(limit);
    return JSON.stringify(rows.map(r => ({ productId: r.productId, productName: r.productName, totalSold: Number(r.totalSold ?? 0), totalRevenue: parseFloat(r.totalRevenue ?? "0") })), null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetLowStockItems(args: Record<string, any>): Promise<string> {
  try {
    const bf = args.branchId ? eq(ingredientsTable.branchId, args.branchId) : undefined;
    const rows = await db.select({
      id: ingredientsTable.id, name: ingredientsTable.name, unit: ingredientsTable.unit,
      currentStock: currentInventoryTable.currentStock, minimalStock: ingredientsTable.minimalStock,
    }).from(ingredientsTable).leftJoin(currentInventoryTable,
      and(eq(currentInventoryTable.itemType, "ingredient"), eq(currentInventoryTable.itemId, ingredientsTable.id), bf ? eq(currentInventoryTable.branchId, args.branchId) : undefined))
      .where(and(bf, sql`${currentInventoryTable.currentStock} <= ${ingredientsTable.minimalStock}`))
      .limit(50);
    const sfRows = await db.select({
      id: semiFinishedTable.id, name: semiFinishedTable.name, unit: semiFinishedTable.unit,
      currentStock: currentInventoryTable.currentStock,
    }).from(semiFinishedTable).leftJoin(currentInventoryTable,
      and(eq(currentInventoryTable.itemType, "semi_finished"), eq(currentInventoryTable.itemId, semiFinishedTable.id), bf ? eq(currentInventoryTable.branchId, args.branchId) : undefined))
      .where(and(sql`${currentInventoryTable.currentStock} <= 0`, bf)).limit(50);
    return JSON.stringify({ lowIngredients: rows, lowSemiFinished: sfRows }, null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetInventoryLevels(args: Record<string, any>): Promise<string> {
  try {
    const bf = args.branchId ? eq(ingredientsTable.branchId, args.branchId) : undefined;
    const ing = await db.select({
      id: ingredientsTable.id, name: ingredientsTable.name, unit: ingredientsTable.unit,
      currentStock: currentInventoryTable.currentStock, minimalStock: ingredientsTable.minimalStock,
    }).from(ingredientsTable).leftJoin(currentInventoryTable,
      and(eq(currentInventoryTable.itemType, "ingredient"), eq(currentInventoryTable.itemId, ingredientsTable.id)))
      .where(bf).limit(100);
    const sf = await db.select({
      id: semiFinishedTable.id, name: semiFinishedTable.name, unit: semiFinishedTable.unit,
      currentStock: currentInventoryTable.currentStock,
    }).from(semiFinishedTable).leftJoin(currentInventoryTable,
      and(eq(currentInventoryTable.itemType, "semi_finished"), eq(currentInventoryTable.itemId, semiFinishedTable.id)))
      .limit(100);
    return JSON.stringify({ ingredients: ing, semiFinished: sf }, null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetOrderHistory(args: Record<string, any>): Promise<string> {
  try {
    const limit = args.limit || 20;
    const bf = makeBranchFilter(args.branchId);
    const rows = await db.select({
      id: ordersTable.id, total: ordersTable.total, paymentMethod: ordersTable.paymentMethod,
      cashierName: ordersTable.cashierName, createdAt: ordersTable.createdAt,
    }).from(ordersTable).where(bf).orderBy(desc(ordersTable.id)).limit(limit);
    return JSON.stringify(rows.map(r => ({ ...r, total: parseFloat(r.total ?? "0") })), null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetExpenseList(args: Record<string, any>): Promise<string> {
  try {
    const limit = args.limit || 20;
    const conditions: any[] = [];
    if (args.branchId) conditions.push(eq(expensesTable.branchId, args.branchId));
    if (args.startDate) conditions.push(gte(expensesTable.createdAt, new Date(args.startDate)));
    if (args.endDate) conditions.push(lte(expensesTable.createdAt, new Date(args.endDate)));
    const rows = await db.select().from(expensesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(expensesTable.id)).limit(limit);
    return JSON.stringify(rows.map(r => ({ ...r, amount: parseFloat(r.amount ?? "0") })), null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetShiftAuditSummary(args: Record<string, any>): Promise<string> {
  try {
    const bf = args.branchId ? eq(shiftAuditsTable.branchId, args.branchId) : undefined;
    const rows = await db.select().from(shiftAuditsTable).where(bf).orderBy(desc(shiftAuditsTable.id)).limit(10);
    return JSON.stringify(rows.map(r => ({
      id: r.id, cashierId: r.cashierId, shiftStart: r.shiftStart, shiftEnd: r.shiftEnd,
      openingBalance: parseFloat(r.openingBalance ?? "0"), closingBalance: parseFloat(r.closingBalance ?? "0"),
      expectedBalance: parseFloat(r.expectedBalance ?? "0"), status: r.status, notes: r.notes,
    })), null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetCashierPerformance(args: Record<string, any>): Promise<string> {
  try {
    const bf = makeBranchFilter(args.branchId);
    const conditions: any[] = [sql`${ordersTable.cashierId} is not null`, bf];
    if (args.startDate) conditions.push(gte(ordersTable.createdAt, new Date(args.startDate)));
    if (args.endDate) conditions.push(lte(ordersTable.createdAt, new Date(args.endDate)));
    const rows = await db.select({
      cashierId: ordersTable.cashierId, cashierName: ordersTable.cashierName,
      totalOrders: count(ordersTable.id), totalRevenue: sum(ordersTable.total),
    }).from(ordersTable).where(and(...conditions))
      .groupBy(ordersTable.cashierId, ordersTable.cashierName)
      .orderBy(sql`sum(${ordersTable.total}) desc`);
    return JSON.stringify(rows.map(r => ({ cashierId: r.cashierId, cashierName: r.cashierName ?? "Unknown", totalOrders: r.totalOrders, totalRevenue: parseFloat(r.totalRevenue ?? "0") })), null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

async function handleGetSalesChart(args: Record<string, any>): Promise<string> {
  try {
    const start = args.startDate ? new Date(args.startDate) : (() => { const d = new Date(); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; })();
    const end = args.endDate ? new Date(args.endDate) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d; })();
    const bf = makeBranchFilter(args.branchId);
    const days: any[] = [];
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    for (let i = 0; i <= Math.min(diffDays, 31); i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      const dS = new Date(d); dS.setHours(0,0,0,0);
      const dE = new Date(d); dE.setHours(23,59,59,999);
      const [stats] = await db.select({ revenue: sum(ordersTable.total), orders: count(ordersTable.id) })
        .from(ordersTable).where(and(gte(ordersTable.createdAt, dS), lte(ordersTable.createdAt, dE), bf));
      days.push({ date: dS.toISOString().split("T")[0], revenue: parseFloat(stats?.revenue ?? "0"), orders: stats?.orders ?? 0 });
    }
    return JSON.stringify(days, null, 2);
  } catch (e: any) { return `Error: ${e.message}`; }
}

// ── Business handler dispatch ──

function getBusinessData(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "getSalesSummary": return handleGetSalesSummary(args);
    case "getFinancialReport": return handleGetFinancialReport(args);
    case "getTopProducts": return handleGetTopProducts(args);
    case "getLowStockItems": return handleGetLowStockItems(args);
    case "getInventoryLevels": return handleGetInventoryLevels(args);
    case "getOrderHistory": return handleGetOrderHistory(args);
    case "getExpenseList": return handleGetExpenseList(args);
    case "getShiftAuditSummary": return handleGetShiftAuditSummary(args);
    case "getCashierPerformance": return handleGetCashierPerformance(args);
    case "getSalesChart": return handleGetSalesChart(args);
    default: return Promise.resolve(`Error: Unknown business tool "${name}"`);
  }
}

// ── Tool Registry ──

export const LOCAL_TOOLS: ToolDef[] = [
  { name: "listDirectory", description: "List files and folders in a directory path within the project.", parameters: { type: "object", properties: { path: { type: "string", description: "Absolute or relative path to directory, e.g., artifacts/pos-app/src/pages" } }, required: ["path"] } },
   { name: "readFile", description: "Read content of a file within the project. Returns max 50000 chars (full content for most files). For larger files, use execCommand with: node -e console.log(require('fs').readFileSync('path','utf-8'))", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file, e.g., artifacts/pos-app/src/pages/products.tsx" } }, required: ["path"] } },
  { name: "searchContent", description: "Search for text pattern in project files using grep.", parameters: { type: "object", properties: { path: { type: "string", description: "Directory to search in" }, pattern: { type: "string", description: "Text pattern to search for" } }, required: ["path", "pattern"] } },
  { name: "writeFile", description: "Create a new file or overwrite an existing file. Creates parent directories automatically.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to new file" }, content: { type: "string", description: "Full file content" } }, required: ["path", "content"] } },
  { name: "editFile", description: "Edit an existing file by replacing a specific text block. Search text must be EXACT match (including whitespace) and unique in the file.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file to edit" }, search: { type: "string", description: "Exact text to find (must appear exactly once)" }, replace: { type: "string", description: "Replacement text" } }, required: ["path", "search", "replace"] } },
  { name: "execCommand", description: "Execute a safe shell command. Allowed: git, pnpm, npm, pm2, node, tsc, npx, ls, cat, echo, uptime. Max 30s timeout.", parameters: { type: "object", properties: { command: { type: "string", description: "Command to run, e.g., git status, pnpm build, pm2 restart pos-api" } }, required: ["command"] } },
  // Business data tools
  { name: "getSalesSummary", description: "Get today's sales summary (revenue, orders, expenses).", parameters: { type: "object", properties: { branchId: { type: "number" } } } },
  { name: "getFinancialReport", description: "Get financial report (gross revenue, COGS, expenses, profit, margins).", parameters: { type: "object", properties: { branchId: { type: "number" }, startDate: { type: "string" }, endDate: { type: "string" } } } },
  { name: "getTopProducts", description: "Get top selling products.", parameters: { type: "object", properties: { branchId: { type: "number" }, limit: { type: "number" }, period: { type: "string" } } } },
  { name: "getSalesChart", description: "Get sales chart data (daily/hourly).", parameters: { type: "object", properties: { branchId: { type: "number" }, startDate: { type: "string" }, endDate: { type: "string" } } } },
  { name: "getCashierPerformance", description: "Get cashier performance data.", parameters: { type: "object", properties: { branchId: { type: "number" }, startDate: { type: "string" }, endDate: { type: "string" } } } },
  { name: "getLowStockItems", description: "Get items with stock below minimal threshold.", parameters: { type: "object", properties: { branchId: { type: "number" } } } },
  { name: "getInventoryLevels", description: "Get all inventory levels.", parameters: { type: "object", properties: { branchId: { type: "number" } } } },
  { name: "getOrderHistory", description: "Get recent orders.", parameters: { type: "object", properties: { branchId: { type: "number" }, limit: { type: "number" } } } },
  { name: "getExpenseList", description: "Get expense list.", parameters: { type: "object", properties: { branchId: { type: "number" }, limit: { type: "number" }, startDate: { type: "string" }, endDate: { type: "string" } } } },
  { name: "getShiftAuditSummary", description: "Get shift audit summary.", parameters: { type: "object", properties: { branchId: { type: "number" } } } },
  { name: "createMission", description: "Create a new mission in the system (write operation). Routes through ExecutionEngine per Truth Bound Rule 4.", parameters: { type: "object", properties: { userId: { type: "number" }, title: { type: "string" }, objective: { type: "string" }, mode: { type: "string" }, complexity: { type: "string" }, status: { type: "string" } }, required: ["userId", "title", "objective"] } },
];

// ── Tool Labels ──

const toolLabelMap: Record<string, string> = {
  listDirectory: "📁 Melihat folder...",
  readFile: "📄 Membaca file...",
  searchContent: "🔎 Mencari di codebase...",
  getDependencies: "🔗 Cek import graph...",
  execCommand: "⚙️ Menjalankan perintah...",
  sshExec: "🖥️ SSH ke VPS...",
  fetchGitHubFile: "📂 GitHub fetch...",
  fetchGitHubDir: "📁 List GitHub...",
};

export function getToolLabel(name: string): string {
  return toolLabelMap[name] ?? `⚙️ ${name}...`;
}

// ── Path normalizer: absolute → relative untuk GitHub API ──

const PROJECT_PREFIXES = [
  PROJECT_ROOT + "/",
  PROJECT_ROOT,
];

function normalizePathForGitHub(path: string): string {
  for (const prefix of PROJECT_PREFIXES) {
    if (path.startsWith(prefix)) return path.slice(prefix.length);
  }
  return path;
}

// ── File Read with Fallback ──

export async function readFileWithFallback(path: string, branch = "main"): Promise<string> {
  const localPath = resolveProjectPath(path);
  try {
    const local = await readLocalFile(localPath);
    if (local && !local.startsWith("Error:")) {
      console.log("[FileRead] Local hit:", localPath.slice(0, 80));
      return local;
    }
  } catch { console.log("[FileRead] Local miss:", localPath.slice(0, 60)); }
  // Fallback GitHub dengan path ternormalisasi
  const ghPath = normalizePathForGitHub(path);
  try {
    const gh = await fetchGitHubFile(ghPath, branch);
    if (gh.content) {
      console.log("[FileRead] GitHub hit:", ghPath);
      return `✅ ${ghPath} (GitHub):\n\`\`\`\n${gh.content.slice(0, 5000)}\n\`\`\``;
    }
  } catch {}
  return `Error: File "${path}" tidak ditemukan (local maupun GitHub).`;
}

// ── Tool Dispatch ──

export async function executeToolCall(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "listDirectory": {
      const dir = args.path || ".";
      const local = await listLocalDir(dir);
      if (!local.startsWith("Error:")) return local;
      const gh = await fetchGitHubDir(dir);
      return gh || local;
    }
    case "readFile": {
      const p = args.path || "";
      const local = await readLocalFile(p);
      if (!local.startsWith("Error:")) return local;
      const gh = await fetchGitHubFile(p, "main");
      if (gh.content) return `✅ ${p} (GitHub):\n\`\`\`\n${gh.content.slice(0, 50000)}\n\`\`\``;
      return local;
    }
    case "searchContent": return searchLocalContent(args.path || ".", args.pattern || "");
    case "writeFile": return writeLocalFile(args.path || "", args.content || "");
    case "editFile": return editLocalFile(args.path || "", args.search || "", args.replace || "");
    case "execCommand": return execLocalCommand(args.command || "");
    case "getDependencies": return getDependencies(args.path || "");
    case "fetchGitHubFile": {
      // VPS-first: coba local dulu
      const rawPath = args.path || "";
      const local = await readLocalFile(rawPath);
      if (!local.startsWith("Error:")) return local;
      // Fallback GitHub dengan path ternormalisasi
      const ghPath = normalizePathForGitHub(rawPath);
      const r = await fetchGitHubFile(ghPath, args.branch || "main");
      if (r.content) return `✅ ${ghPath} (GitHub):\n\`\`\`\n${r.content.slice(0, 5000)}\n\`\`\``;
      return `Error: File "${rawPath}" tidak ditemukan (local maupun GitHub branch ${args.branch || "main"}).`;
    }
    case "fetchGitHubDir": {
      const d = await fetchGitHubDir(args.path || "", args.branch || "main");
      return d || `Error: Directory "${args.path}" tidak ditemukan di GitHub.`;
    }
    case "sshExec": {
      const r = await sshExec(args.command || "");
      return r || "Error: SSH command gagal atau tidak ada output.";
    }
    case "createMission": {
      const dbId = await aiMissionService.create(args.userId, args.title, args.objective, args.mode || "cto", args.complexity || "medium", args.status || "CREATED");
      return JSON.stringify({ id: dbId, success: true });
    }
    // Business data tools
    default: {
      if (["getSalesSummary","getFinancialReport","getTopProducts","getSalesChart","getCashierPerformance","getLowStockItems","getInventoryLevels","getOrderHistory","getExpenseList","getShiftAuditSummary"].includes(name)) {
        return getBusinessData(name, args);
      }
      return `Error: Unknown tool "${name}"`;
    }
  }
}

// ADR-009 Phase 1: Structured ToolResult with status.
// Extension only — executeToolCall preserved for backward compat.
// Roadmap: Release N+1 migrate all callers → N+2 delete executeToolCall.

export interface ToolResult {
  name: string;
  output: string;
  summary?: string;  // ADR-010 Phase 2: compressed version for context
  status: "ok" | "error";
  durationMs: number;
}

export async function executeToolWithResult(name: string, args: Record<string, any>): Promise<ToolResult> {
  const t0 = Date.now();
  try {
    const output = await executeToolCall(name, args);
    const resultOutput = String(output || "(no output)").slice(0, 2000);
    return {
      name,
      output: resultOutput,
      summary: resultOutput.length > 600
        ? resultOutput.slice(0, 300) + `... [${resultOutput.length - 600} chars truncated] ...` + resultOutput.slice(-300)
        : undefined,
      status: output.startsWith("Error:") ? "error" : "ok",
      durationMs: Date.now() - t0,
    };
  } catch (e: any) {
    return {
      name,
      output: `Error: ${e?.message || "tool failed"}`,
      status: "error",
      durationMs: Date.now() - t0,
    };
  }
}
