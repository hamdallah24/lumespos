// ─────────────────────────────────────────────────────────────
// AI HELPERS — DeepSeek, memory, GitHub, SSH, Local Tools
// ─────────────────────────────────────────────────────────────
import { exec } from "child_process";
import { existsSync } from "fs";
import { readdir, stat, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve } from "path";
import { promisify } from "util";
const execP = promisify(exec);
import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const PROJECT_ROOT = resolve(process.cwd().includes("artifacts") ? "../.." : ".");

export const GITHUB_PAT = process.env.GITHUB_PAT || "";
export const GITHUB_REPO = "hamdallah24/lumespos";
export const GITHUB_RAW = "https://api.github.com/repos";
const GITHUB_API = "https://api.github.com/repos";
const GITHUB_BRANCH = "main";
const GH_HEADERS = { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3.raw" };

export const SSH_HOST = process.env.SSH_HOST || "";
export const SSH_USER = process.env.SSH_USER || "";
export const SSH_PASS = process.env.SSH_PASSWORD || "";
export const SSH_KEY_PATH = process.env.SSH_KEY_PATH || "";

// ── MEMORY (DB-backed) ──
type ChatMsg = { role: "user" | "assistant"; content: string };
const MAX_MEMORY = 10;

async function getOrCreateConversation(userId: number, mode: string): Promise<number> {
  // Atomic upsert — no race condition: INSERT if not exists, RETURN id either way
  const result = await db.execute(
    sql`INSERT INTO ai_conversations (user_id, mode, created_at, updated_at)
        VALUES (${userId}, ${mode}, NOW(), NOW())
        ON CONFLICT (user_id, mode) DO UPDATE SET updated_at = NOW()
        RETURNING id`
  );
  return result.rows[0].id;
}

export async function getHistory(userId: number, mode: string): Promise<ChatMsg[]> {
  try {
    const convId = await getOrCreateConversation(userId, mode);
    const rows = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.id)
      .limit(MAX_MEMORY * 2);
    return rows.map(r => ({ role: r.role as "user" | "assistant", content: r.content }));
  } catch (e) {
    console.error("[ai] DB getHistory error:", e);
    return [];
  }
}

export async function remember(userId: number, mode: string, userMsg: string, assistantReply: string) {
  try {
    const convId = await getOrCreateConversation(userId, mode);
    // Single transaction: INSERT + PRUNE + UPDATE = 1 round trip
    await db.transaction(async (tx) => {
      await tx.insert(messagesTable).values([
        { conversationId: convId, role: "user", content: userMsg.slice(0, 1000) },
        { conversationId: convId, role: "assistant", content: assistantReply.slice(0, 4000) },
      ]);
      // Prune: keep only newest MAX_MEMORY*2 messages
      await tx.execute(
        sql`DELETE FROM ai_messages
            WHERE conversation_id = ${convId}
              AND id NOT IN (
                SELECT id FROM ai_messages
                WHERE conversation_id = ${convId}
                ORDER BY id DESC
                LIMIT ${MAX_MEMORY * 2}
              )`
      );
      await tx.update(conversationsTable)
        .set({ updatedAt: new Date() })
        .where(eq(conversationsTable.id, convId));
    });
  } catch (e) {
    console.error("[ai] DB remember error:", e);
  }
}

export async function clearMemory(userId: number, mode: string) {
  try {
    const existing = await db.select().from(conversationsTable)
      .where(and(eq(conversationsTable.userId, userId), eq(conversationsTable.mode, mode)))
      .limit(1);
    if (existing.length > 0) {
      await db.delete(messagesTable)
        .where(eq(messagesTable.conversationId, existing[0].id));
      await db.delete(conversationsTable).where(eq(conversationsTable.id, existing[0].id));
    }
  } catch (e) {
    console.error("[ai] DB clearMemory error:", e);
  }
}

// ── DEEPSEEK / SUMOPOD ──
export async function callDeepSeek(system: string, user: string, userId: number, mode: string, maxTokens = 800): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { console.error("[ai] DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL not set"); return ""; }
  try {
    const history = await getHistory(userId, mode);
    const messages: any[] = [{ role: "system", content: system.slice(0, 4000) }];
    for (const h of history) messages.push(h);
    messages.push({ role: "user", content: user.slice(0, 2000) });

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    let resp;
    try {
      resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
        signal: controller.signal,
      });
    } finally { clearTimeout(tid); }
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error(`[ai] DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
      return "";
    }
    const json = await resp.json();
    const content = (json as any).choices?.[0]?.message?.content?.trim() || "";
    if (!content) console.error(`[ai] DeepSeek empty response. finish_reason=${(json as any).choices?.[0]?.finish_reason}`);
    else await remember(userId, mode, user, content);
    return content;
  } catch (err) {
    if ((err as any)?.name === "AbortError") { console.error("[ai] DeepSeek timeout"); return "ERROR: Layanan AI tidak merespon (timeout). Coba lagi."; }
    console.error("[ai] callDeepSeek fetch error:", err);
    return `ERROR: Gagal menghubungi AI. ${(err as any)?.message || "Coba lagi."}`;
  }
}

// ── GITHUB ──
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
  if (!GITHUB_PAT) return "";
  const resp = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) return "";
  const items = await resp.json().catch(() => []);
  if (!Array.isArray(items)) return "";
  return items.map((i: any) => `${i.type === "dir" ? "📁" : "📄"} ${i.name}`).join("\n");
}

// ── DYNAMIC REPO SEARCH ──
let treeCache: { ts: number; paths: string[] } | null = null;

export async function searchRepoFiles(query: string): Promise<string[]> {
  if (!GITHUB_PAT) return [];

  // Fetch full repo tree (cached for 5 min)
  if (!treeCache || Date.now() - treeCache.ts > 300000) {
    const resp = await fetch(`${GITHUB_API}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH || "main"}?recursive=true`, {
      headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github+json" },
    });
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
      )
      .map((t: any) => t.path);
    treeCache = { ts: Date.now(), paths };
  }

  // Score each file based on keyword matches in the path
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

  // Return top 8 most relevant file paths
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
    // Prefer key-based auth, fall back to password
    let sshCmd: string;
    if (SSH_KEY_PATH) {
      sshCmd = `ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -o BatchMode=yes ${SSH_USER}@${SSH_HOST} "${cmd}"`;
    } else if (SSH_PASS) {
      // Safer: pipe password via env var read by sshpass -e
      sshCmd = `SSHPASS='${SSH_PASS}' sshpass -e ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "${cmd}"`;
    } else {
      resolve("ERROR: SSH_PASS atau SSH_KEY_PATH tidak dikonfigurasi."); return;
    }
    exec(sshCmd, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message) : (stdout || "no output"));
    });
  });
}

// ── IMPORT GRAPH (Dependency Resolution) ──
const IMPORT_RE = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))?)\s+from\s+)?['"]([^'"]+)['"]/g;

export async function getDependencies(filePath: string): Promise<string> {
  let full = resolve(filePath);
  if (!existsSync(full)) full = resolve(join(PROJECT_ROOT, filePath));
  if (!existsSync(full)) return `Error: File ${filePath} tidak ditemukan.`;
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

// ── LOCAL TOOLS (Fase 1 — VPS filesystem) ──

const SAFE_DIRS = [PROJECT_ROOT, join(PROJECT_ROOT, "artifacts"), join(PROJECT_ROOT, "lib")];
function isPathSafe(p: string): boolean { return SAFE_DIRS.some(d => resolve(p).startsWith(d)); }

export async function listLocalDir(dirPath: string): Promise<string> {
  const full = resolve(dirPath);
  if (!isPathSafe(full)) return `Error: Path ${dirPath} di luar project.`;
  if (!existsSync(full)) return `Error: Directory ${dirPath} tidak ditemukan.`;
  try {
    const items = await readdir(full, { withFileTypes: true });
    const result = await Promise.all(items.map(async d => {
      if (d.isDirectory()) return `📁 ${d.name}`;
      const s = await stat(join(full, d.name));
      return `📄 ${d.name} (${s.size} bytes)`;
    }));
    return result.join("\n");
  } catch (e: any) { return `Error: ${e.message}`; }
}

export async function readLocalFile(filePath: string, maxChars = 5000): Promise<string> {
  const full = resolve(filePath);
  if (!isPathSafe(full)) return `Error: Path ${filePath} di luar project.`;
  if (!existsSync(full)) return `Error: File ${filePath} tidak ditemukan.`;
  try {
    const content = await readFile(full, "utf-8");
    return content.length > maxChars ? content.slice(0, maxChars) + `\n\n... (truncated, ${content.length - maxChars} chars remaining)` : content;
  } catch (e: any) { return `Error: ${e.message}`; }
}

export async function searchLocalContent(dirPath: string, pattern: string): Promise<string> {
  const full = resolve(dirPath);
  if (!isPathSafe(full)) return `Error: Path ${dirPath} di luar project.`;
  try {
    const cmd = process.platform === "win32"
      ? `findstr /s /i /n "${pattern}" "${full}\\*" 2>nul`
      : `grep -rn --include="*.ts" --include="*.tsx" --include="*.json" "${pattern}" "${full}" 2>/dev/null | head -30`;
    const { stdout } = await execP(cmd, { timeout: 5000, cwd: PROJECT_ROOT });
    const result = stdout.trim();
    return result || `Tidak ditemukan "${pattern}" di ${dirPath}`;
  } catch { return `Tidak ditemukan "${pattern}" di ${dirPath}`; }
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
    const allowedGit = ["status", "diff", "checkout", "merge", "push", "pull", "fetch", "branch", "log", "remote"];
    if (subCmd && !allowedGit.includes(subCmd)) return `Error: Git subcommand "${subCmd}" tidak diizinkan. Allowed: ${allowedGit.join(", ")}`;
  }
  try {
    const { stdout, stderr } = await execP(command, { timeout: 30000, cwd: PROJECT_ROOT });
    return (stdout || stderr || "(no output)").trim();
  } catch (e: any) { return `Error: ${e.stderr?.toString() || e.message}`; }
}

// ── MERGE & DEPLOY (Staging → main, NO restart) ──
export async function mergeDeploy(onStep?: (step: string, detail: string) => void): Promise<{ ok: boolean; summary: string }> {
  const log = (s: string, d: string) => { onStep?.(s, d); console.log(`[merge] ${s}: ${d.slice(0, 100)}`); };
  try {
    log("sync", "Syncing Staging ← main...");
    execSync("git fetch", { cwd: PROJECT_ROOT, timeout: 15000 });
    execSync("git checkout Staging && git merge main --no-edit && git push origin Staging", { cwd: PROJECT_ROOT, timeout: 30000 });

    log("merge", "Merging main ← Staging...");
    execSync("git checkout main && git merge Staging --no-edit", { cwd: PROJECT_ROOT, timeout: 15000 });

    // Get list of changed files
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

// ── TOOL CALLING (DeepSeek native, no Mastra) ──

export interface ToolDef { name: string; description: string; parameters: Record<string, any>; }

export const LOCAL_TOOLS: ToolDef[] = [
  { name: "listDirectory", description: "List files and folders in a directory path within the project.", parameters: { type: "object", properties: { path: { type: "string", description: "Absolute or relative path to directory, e.g., artifacts/pos-app/src/pages" } }, required: ["path"] } },
  { name: "readFile", description: "Read content of a file within the project. Returns max 5000 chars.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file, e.g., artifacts/pos-app/src/pages/products.tsx" } }, required: ["path"] } },
  { name: "searchContent", description: "Search for text pattern in project files using grep.", parameters: { type: "object", properties: { path: { type: "string", description: "Directory to search in" }, pattern: { type: "string", description: "Text pattern to search for" } }, required: ["path", "pattern"] } },
  { name: "writeFile", description: "Create a new file or overwrite an existing file. Creates parent directories automatically.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to new file" }, content: { type: "string", description: "Full file content" } }, required: ["path", "content"] } },
  { name: "editFile", description: "Edit an existing file by replacing a specific text block. Search text must be EXACT match (including whitespace) and unique in the file.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file to edit" }, search: { type: "string", description: "Exact text to find (must appear exactly once)" }, replace: { type: "string", description: "Replacement text" } }, required: ["path", "search", "replace"] } },
  { name: "execCommand", description: "Execute a safe shell command. Allowed: git, pnpm, npm, pm2, node, tsc, npx, ls, cat, echo, uptime. Max 30s timeout.", parameters: { type: "object", properties: { command: { type: "string", description: "Command to run, e.g., git status, pnpm build, pm2 restart pos-api" } }, required: ["command"] } },
];

export const EXPLORE_TOOLS: ToolDef[] = [
  ...LOCAL_TOOLS.filter(t => ["listDirectory", "readFile", "searchContent"].includes(t.name)),
  { name: "getDependencies", description: "Read a file and return its internal dependency graph (import paths that start with ./ or ../). Useful to understand which files are connected.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file, e.g., artifacts/pos-app/src/pages/products.tsx" } }, required: ["path"] } },
];

async function executeToolCall(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case "listDirectory": return listLocalDir(args.path || ".");
    case "readFile": return readLocalFile(args.path || "");
    case "searchContent": return searchLocalContent(args.path || ".", args.pattern || "");
    case "writeFile": return writeLocalFile(args.path || "", args.content || "");
    case "editFile": return editLocalFile(args.path || "", args.search || "", args.replace || "");
    case "execCommand": return execLocalCommand(args.command || "");
    case "getDependencies": return getDependencies(args.path || "");
    default: return `Error: Unknown tool "${name}"`;
  }
}

export async function callDeepSeekWithTools(
  system: string, user: string, userId: number, mode: string, tools: ToolDef[], maxTokens = 2000
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { console.error("[ai] DeepSeek key/base not set"); return ""; }

  const history = await getHistory(userId, mode);
  const messages: any[] = [{ role: "system", content: system.slice(0, 4000) }];
  for (const h of history) messages.push(h);
  messages.push({ role: "user", content: user.slice(0, 2000) });

  const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
  if (tools.length > 0) {
    body.tools = tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
  }

  try {
    const controller1 = new AbortController();
    const tid1 = setTimeout(() => controller1.abort(), 30000);
    let resp;
    try {
      resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: controller1.signal,
      });
    } finally { clearTimeout(tid1); }
    if (!resp.ok) { console.error(`[ai] DeepSeek tools HTTP ${resp.status}: ${await resp.text().catch(() => "").then((t: any) => t.slice(0, 300))}`); return ""; }

    const json = await resp.json();
    const msg = (json as any).choices?.[0]?.message;
    if (!msg) return "";

    // Tool calls?
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // Execute all tools (parallel via Promise.all)
      const toolResults: any[] = await Promise.all(msg.tool_calls.map(async (tc: any) => {
        const fn = tc.function;
        let args: Record<string, any> = {};
        try { args = JSON.parse(fn.arguments); } catch { args = {}; }
        const result = await executeToolCall(fn.name, args);
        return { role: "tool", tool_call_id: tc.id, content: result.slice(0, 3000) };
      }));

      // Feed tool results back to DeepSeek
      const followUp: any[] = [...messages, msg, ...toolResults];
      const controller2 = new AbortController();
      const tid2 = setTimeout(() => controller2.abort(), 30000);
      let resp2;
      try {
        resp2 = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: followUp, max_tokens: maxTokens, temperature: 0.7 }),
          signal: controller2.signal,
        });
      } finally { clearTimeout(tid2); }
      if (!resp2.ok) return msg.content || "";
      const json2 = await resp2.json();
      const finalContent = (json2 as any).choices?.[0]?.message?.content?.trim() || "";
      if (finalContent) await remember(userId, mode, user, finalContent);
      return finalContent || msg.content || "";
    }

    // No tool calls — normal text response
    const content = msg.content?.trim() || "";
    if (content) await remember(userId, mode, user, content);
    return content;
  } catch (err) {
    if ((err as any)?.name === "AbortError") { console.error("[ai] callDeepSeekWithTools timeout"); return "ERROR: Layanan AI tidak merespon (timeout). Coba lagi."; }
    console.error("[ai] callDeepSeekWithTools error:", err);
    return `ERROR: ${(err as any)?.message || "Gagal memproses permintaan AI."}`;
  }
}

// ── RATE LIMITER (per-user sliding window) ──
const RATE_WINDOW_MS = 60000;
interface RateEntry { windowStart: number; count: number }
const rateMap = new Map<string, RateEntry>();

export function checkRateLimit(userId: number, mode: string, maxRequests: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${userId}_${mode}`;
  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);
    return { ok: false, retryAfter };
  }
  entry.count++;
  return { ok: true };
}
