// ─────────────────────────────────────────────────────────────
// AI HELPERS — DeepSeek, memory, GitHub, SSH, Local Tools
// ─────────────────────────────────────────────────────────────
import { exec } from "child_process";
import { existsSync } from "fs";
import { readdir, stat, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve } from "path";
import { promisify } from "util";
const execP = promisify(exec);
import { execSync } from "child_process";
import { db, conversationsTable, messagesTable, sharedContextTable, checklistItemsTable } from "@workspace/db";
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

export async function getOrCreateConversation(userId: number, mode: string): Promise<number> {
  // Atomic upsert — no race condition: INSERT if not exists, RETURN id either way
  const result = await db.execute(
    sql`INSERT INTO ai_conversations (user_id, mode, created_at, updated_at)
        VALUES (${userId}, ${mode}, NOW(), NOW())
        ON CONFLICT (user_id, mode) DO UPDATE SET updated_at = NOW()
        RETURNING id`
  );
  return (result.rows[0] as any).id as number;
}

export async function getHistory(userId: number, mode: string, maxContentLength?: number): Promise<ChatMsg[]> {
  try {
    const convId = await getOrCreateConversation(userId, mode);
    const rows = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.id)
      .limit(MAX_MEMORY * 2);
    return rows.map(r => ({
      role: r.role as "user" | "assistant",
      content: maxContentLength && r.content.length > maxContentLength
        ? r.content.slice(0, maxContentLength) + "…"
        : r.content,
    }));
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

// ── SHARED CONTEXT (agent-to-agent communication) ──
export async function saveSharedContext(userId: number, mode: string, summary: string) {
  try {
    await db.insert(sharedContextTable).values({ userId, mode, summary: summary.slice(0, 2000) });
  } catch (e) {
    console.error("[ai] DB saveSharedContext error:", e);
  }
}

export async function getSharedContext(userId: number, limit = 5): Promise<string> {
  try {
    const rows = await db.select()
      .from(sharedContextTable)
      .where(eq(sharedContextTable.userId, userId))
      .orderBy(desc(sharedContextTable.createdAt))
      .limit(limit);
    if (rows.length === 0) return "";
    return rows.map(r => `[${r.mode}] ${r.summary}`).join("\n");
  } catch (e) {
    console.error("[ai] DB getSharedContext error:", e);
    return "";
  }
}

// ── CHECKLIST ITEMS ──
export async function getChecklistItems(conversationId: number): Promise<{ itemKey: string; text: string; checked: boolean }[]> {
  try {
    const rows = await db.select()
      .from(checklistItemsTable)
      .where(eq(checklistItemsTable.conversationId, conversationId))
      .orderBy(checklistItemsTable.createdAt);
    return rows.map(r => ({ itemKey: r.itemKey, text: r.text, checked: r.checked }));
  } catch (e) {
    console.error("[ai] DB getChecklistItems error:", e);
    return [];
  }
}

export async function upsertChecklistItem(conversationId: number, itemKey: string, text: string, checked: boolean) {
  try {
    const existing = await db.select().from(checklistItemsTable)
      .where(and(eq(checklistItemsTable.conversationId, conversationId), eq(checklistItemsTable.itemKey, itemKey)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(checklistItemsTable).set({ checked }).where(eq(checklistItemsTable.id, existing[0].id));
    } else {
      await db.insert(checklistItemsTable).values({ conversationId, itemKey, text, checked });
    }
  } catch (e) {
    console.error("[ai] DB upsertChecklistItem error:", e);
  }
}

export async function clearChecklistItems(conversationId: number) {
  try {
    await db.delete(checklistItemsTable).where(eq(checklistItemsTable.conversationId, conversationId));
  } catch (e) {
    console.error("[ai] DB clearChecklistItems error:", e);
  }
}

// ── DEEPSEEK / SUMOPOD ──
export async function callDeepSeek(system: string, user: string, userId: number, mode: string, maxTokens = 800, jsonMode = false): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { console.error("[ai] DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL not set"); return "ERROR: API key AI belum dikonfigurasi."; }
  try {
    const history = await getHistory(userId, mode);
    const messages: any[] = [{ role: "system", content: system.slice(0, 4000) }];
    for (const h of history) messages.push(h);
    messages.push({ role: "user", content: user.slice(0, 5000) });

    const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
    if (jsonMode) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 30000);
    let resp;
    try {
      resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally { clearTimeout(tid); }
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error(`[ai] DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
      return `ERROR: AI tidak merespon (HTTP ${resp.status}). ${err.slice(0, 100)}`;
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
  if (!GITHUB_PAT) return "Error: GITHUB_PAT tidak dikonfigurasi.";
  const resp = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) return `Error: GitHub ${resp.status} — ${path} tidak ditemukan di branch ${branch}.`;
  const items = await resp.json().catch(() => []);
  if (!Array.isArray(items)) return "Error: Response GitHub bukan array.";
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
    exec(sshCmd, { timeout: 30000 }, (err, stdout, stderr) => {
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

// READ_TOOLS — file analysis only, no SSH, no execCommand
export const READ_TOOLS: ToolDef[] = [
  ...LOCAL_TOOLS.filter(t =>
    ["listDirectory", "readFile", "searchContent", "getDependencies"].includes(t.name)
  ),
  { name: "fetchGitHubFile", description: "Fetch file from GitHub (fallback only — use readFile for local first).", parameters: { type: "object", properties: { path: { type: "string", description: "Path relative to repo root" }, branch: { type: "string", description: "Branch (default: main)" } }, required: ["path"] } },
  { name: "fetchGitHubDir", description: "List directory from GitHub (fallback only).", parameters: { type: "object", properties: { path: { type: "string" }, branch: { type: "string" } }, required: ["path"] } },
];

// DEVOPS_TOOLS — includes SSH + execCommand for VPS operations
export const DEVOPS_TOOLS: ToolDef[] = [
  ...READ_TOOLS,
  LOCAL_TOOLS.find(t => t.name === "execCommand")!,
  {
    name: "sshExec",
    description: "Run shell command on VPS via SSH. Only for: pm2 status/logs, git pull/merge, deploy, nginx, systemctl, server ops.",
    parameters: { type: "object", properties: { command: { type: "string", description: "e.g., pm2 status, cd ~/lumespos && git pull, free -m" } }, required: ["command"] }
  },
];

// Backward compat
export const EXPLORE_TOOLS = READ_TOOLS;

// Tool labels for progress status
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

function getToolLabel(name: string): string {
  return toolLabelMap[name] ?? `⚙️ ${name}...`;
}

// Local-first file reader — tries VPS first, GitHub fallback
export async function readFileWithFallback(path: string, branch = "main"): Promise<string> {
  const localPath = path.startsWith("/") ? path : `/home/ubuntu/lumespos/${path}`;
  try {
    const local = await readLocalFile(localPath);
    if (local && !local.startsWith("Error:")) {
      console.log("[FileRead] Local hit:", localPath.slice(0, 80));
      return local;
    }
  } catch { console.log("[FileRead] Local miss:", localPath.slice(0, 60)); }
  // GitHub fallback
  try {
    const gh = await fetchGitHubFile(path, branch);
    if (gh.content) {
      console.log("[FileRead] GitHub hit:", path);
      return `✅ ${path} (GitHub):\n\`\`\`\n${gh.content.slice(0, 5000)}\n\`\`\``;
    }
  } catch {}
  return `Error: File "${path}" tidak ditemukan (local maupun GitHub).`;
}

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
      if (gh.content) return `✅ ${p} (GitHub):\n\`\`\`\n${gh.content.slice(0, 5000)}\n\`\`\``;
      return local;
    }
    case "searchContent": return searchLocalContent(args.path || ".", args.pattern || "");
    case "writeFile": return writeLocalFile(args.path || "", args.content || "");
    case "editFile": return editLocalFile(args.path || "", args.search || "", args.replace || "");
    case "execCommand": return execLocalCommand(args.command || "");
    case "getDependencies": return getDependencies(args.path || "");
    case "fetchGitHubFile": {
      const r = await fetchGitHubFile(args.path || "", args.branch || "main");
      if (r.content) return `✅ ${args.path} (GitHub):\n\`\`\`\n${r.content.slice(0, 5000)}\n\`\`\``;
      return `Error: File "${args.path}" tidak ditemukan di GitHub (branch: ${args.branch || "main"}).`;
    }
    case "fetchGitHubDir": {
      const d = await fetchGitHubDir(args.path || "", args.branch || "main");
      return d || `Error: Directory "${args.path}" tidak ditemukan di GitHub.`;
    }
    case "sshExec": {
      const r = await sshExec(args.command || "");
      return r || "Error: SSH command gagal atau tidak ada output.";
    }
    default: return `Error: Unknown tool "${name}"`;
  }
}

// DSML parser — detect hallucinated tool call tags in model output
function parseDSMLToolCalls(text: string): any[] | null {
  if (!text?.includes("<｜｜DSML｜｜tool_calls>")) return null;
  const toolCalls: any[] = [];
  const invokeRegex = /<｜｜DSML｜｜invoke name="([^"]+)">([\s\S]*?)<\/｜｜DSML｜｜invoke>/g;
  const paramRegex = /<｜｜DSML｜｜parameter name="([^"]+)"[^>]*>([\s\S]*?)<\/｜｜DSML｜｜parameter>/g;
  let invokeMatch;
  while ((invokeMatch = invokeRegex.exec(text)) !== null) {
    const toolName = invokeMatch[1];
    const paramBlock = invokeMatch[2];
    const args: Record<string, string> = {};
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramBlock)) !== null) {
      args[paramMatch[1]] = paramMatch[2].trim();
    }
    toolCalls.push({ id: `call_${Date.now()}_${toolCalls.length}`, type: "function", function: { name: toolName, arguments: JSON.stringify(args) } });
  }
  return toolCalls.length > 0 ? toolCalls : null;
}

function stripDSML(text: string): string {
  return text.replace(/<｜｜DSML｜｜[\s\S]*?>/g, "").replace(/<\/｜｜DSML｜｜[\s\S]*?>/g, "").trim();
}

function validateMessageSequence(msgs: any[]) {
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "assistant" && m.tool_calls?.length > 0) {
      const next = msgs[i + 1];
      if (!next || next.role !== "tool") {
        throw new Error(`Invalid sequence at index ${i}: assistant tool_calls not followed by tool message. Next role: ${next?.role ?? "nothing"}`);
      }
    }
  }
}

// ── SPRINT 1: Validator — contamination detection + completion checks ──

interface ValidationResult {
  isValid: boolean;
  cleanedText: string;
  warnings: string[];
}

function validateResponse(text: string): ValidationResult {
  if (!text) return { isValid: true, cleanedText: text, warnings: [] };
  const warnings: string[] = [];
  let cleaned = text;

  // Contamination detection — shell commands leaking into response
  const shellCommandLines = text.split("\n").filter(line =>
    /^(cd |grep |wc |find |ls |cat |head |tail |pm2 |ssh |scp |sudo |pnpm |npm |git )/.test(line.trim()) ||
    /\|(\||\s*)/.test(line.trim()) ||
    /&&/.test(line.trim()) ||
    /2>\/dev\/null/.test(line)
  );

  // Contamination detection — garbled/corrupted text patterns
  const garbledPatterns = [
    /(artifacts\w+\.\.\.\w+)/,  // path fragments merged (e.g., "artifactsplos-appmage")
    /(\w+\|\w+\|\w+)/,            // pipe-separated fragments
    /(\w+\\\.\\\.)/,              // escaped dots in text
    /undefined(?=[a-z])/i,        // "undefined" merged with next word
  ];

  if (shellCommandLines.length > 0) {
    warnings.push(`CONTAMINATION: ${shellCommandLines.length} shell command(s) detected in response`);
    cleaned = cleaned.split("\n").filter(line => !shellCommandLines.includes(line)).join("\n");
  }

  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) {
      warnings.push(`CONTAMINATION: garbled/corrupted text pattern detected`);
      break;
    }
  }

  // Completion check — response should be substantive
  if (text.length < 20 && !/^(ok|ya|tidak|yes|no|done)$/i.test(text.trim())) {
    warnings.push(`INCOMPLETE: response too short (${text.length} chars)`);
  }

  // DSML check — if stripDSML already ran but fragments remain
  if (/<｜｜DSML｜｜/i.test(text) || /<\/｜｜DSML｜｜/i.test(text)) {
    warnings.push("DSML_FRAGMENT: tool call tags still present in response");
    cleaned = stripDSML(cleaned);
  }

  return {
    isValid: warnings.length === 0 || warnings.every(w => !w.startsWith("DSML_FRAGMENT")),
    cleanedText: cleaned.trim() || text.trim(),
    warnings,
  };
}

// ── SPRINT 1: Memory Bridge — history truncation + contamination filter ──

function filterContamination(history: ChatMsg[]): ChatMsg[] {
  const shellCmdRe = /^(cd |grep |wc |find |ls |cat |head |tail |pm2 |ssh |scp |sudo |pnpm |npm |git )/;

  return history.map(msg => {
    if (msg.role !== "assistant") return msg;
    // Check if message contains execution commands as main content
    const lines = msg.content.split("\n").filter(l => l.trim());
    const cmdLineCount = lines.filter(l => shellCmdRe.test(l.trim())).length;
    // If >30% of lines are shell commands, this is likely contamination
    if (cmdLineCount > 0 && cmdLineCount / Math.max(lines.length, 1) > 0.3) {
      return { ...msg, content: "[content filtered — contamination detected]" };
    }
    // Strip DSML fragments from history
    if (typeof msg.content === "string" && /<｜｜DSML｜｜/i.test(msg.content)) {
      return { ...msg, content: stripDSML(msg.content) };
    }
    return msg;
  });
}

export async function callDeepSeekWithTools(
  system: string, user: string, userId: number, mode: string, tools: ToolDef[], maxTokens = 2000,
  onProgress?: (msg: string) => void,
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { console.error("[ai] DeepSeek key/base not set"); return ""; }

  const history = await getHistory(userId, mode, 400);
  const filteredHistory = filterContamination(history);
  const messages: any[] = [{ role: "system", content: system.slice(0, 5000) }];
  for (const h of filteredHistory) messages.push(h);
  messages.push({ role: "user", content: user.slice(0, 5000) });

  const toolsPayload = tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));

  const MAX_ROUNDS = 3;
  const TIMEOUT_MS = 30000;

  // ── SANITIZE ──
  function sanitizeMessages(msgs: any[]): any[] {
    return msgs
      .filter(m => m !== null && m !== undefined && m.role)
      .map(m => {
        let content: string | null;
        if (m.content === undefined) content = null;
        else if (typeof m.content === "string") content = m.content;
        else content = JSON.stringify(m.content);
        return { ...m, content };
      });
  }

  // ── DEBUG LOG ──
  const logPayload = (label: string, msgs: any[], r: number) => {
    console.log(`[DeepSeek ${label}]`, JSON.stringify({
      round: r + 1, totalRounds: MAX_ROUNDS,
      messageCount: msgs.length,
      messages: msgs.map(m => ({
        role: m.role,
        contentType: typeof m.content,
        contentPreview: JSON.stringify(m.content)?.slice(0, 120),
        tool_call_id: m.tool_call_id ?? null,
        tool_calls: m.tool_calls?.map((tc: any) => ({ id: tc.id, name: tc.function?.name })) ?? null,
      })),
    }, null, 2));
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // ── INPUT VALIDATION ──
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m || typeof m !== "object") throw new Error(`Invalid message at index ${i}: not an object`);
      if (!["user", "assistant", "system", "tool"].includes(m.role)) throw new Error(`Invalid role at index ${i}: "${m.role}"`);
      if (m.content === undefined) throw new Error(`message[${i}].content is undefined (role=${m.role})`);
      if (m.tool_calls) {
        for (let j = 0; j < m.tool_calls.length; j++) {
          const tc = m.tool_calls[j];
          if (!tc.id) throw new Error(`message[${i}].tool_calls[${j}].id is empty`);
          if (!tc.function?.name) throw new Error(`message[${i}].tool_calls[${j}].function.name is empty`);
        }
      }
    }

    const cleanMessages = sanitizeMessages(messages);
    validateMessageSequence(cleanMessages);
    logPayload("Request", cleanMessages, round);

    const body: any = { model, messages: cleanMessages, max_tokens: maxTokens, temperature: 0.7 };
    if (tools.length > 0) body.tools = toolsPayload;

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally { clearTimeout(tid); }

    if (!resp.ok) {
      const errorBody = await resp.text().catch(() => "{}");
      let parsedErr: any = {};
      try { parsedErr = JSON.parse(errorBody); } catch { parsedErr = { raw: errorBody }; }
      console.error("[DeepSeek 400 Error]", JSON.stringify({
        status: resp.status,
        errorBody: parsedErr,
        round: round + 1,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
      }, null, 2));
      if (round > 0) {
        throw new Error(`AI engine error at round ${round + 1}/${MAX_ROUNDS}: HTTP ${resp.status}`);
      }
      // Round 0 error: retry without tools
      delete body.tools;
      const retryCtl = new AbortController();
      const retryTid = setTimeout(() => retryCtl.abort(), TIMEOUT_MS);
      let retryResp;
      try {
        retryResp = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify(body),
          signal: retryCtl.signal,
        });
      } finally { clearTimeout(retryTid); }
      if (!retryResp.ok) throw new Error(`AI engine error: HTTP ${resp.status}`);
      const rj = await retryResp.json();
      const rc = (rj as any).choices?.[0]?.message?.content?.trim() || "";
      const validated = validateResponse(rc);
      if (validated.warnings.length > 0) console.warn("[Validator] Retry path warnings:", validated.warnings);
      if (validated.cleanedText) await remember(userId, mode, user, validated.cleanedText);
      return validated.cleanedText;
    }

    const json = await resp.json();
    const msg = (json as any).choices?.[0]?.message;
    if (!msg) return "";

    // No tool calls — check DSML fallback, then final text
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const rawContent = msg.content?.trim() || "";
      // Detect hallucinated DSML tool calls in text output
      const dsmlTools = parseDSMLToolCalls(rawContent);
      if (dsmlTools) {
        msg.tool_calls = dsmlTools;
        // Fall through to tool execution
      } else {
        const content = stripDSML(rawContent);
        const validated = validateResponse(content);
        if (validated.warnings.length > 0) console.warn("[Validator] Normal path warnings:", validated.warnings);
        if (validated.cleanedText) await remember(userId, mode, user, validated.cleanedText);
        return validated.cleanedText;
      }
    }

    // Execute tools — strict shape guaranteed
    const toolResults: any[] = [];
    for (const tc of msg.tool_calls) {
      if (!tc.id) throw new Error(`tool_call_id missing for tool: ${tc.function?.name}`);
      const fn = tc.function;
      let args: Record<string, any> = {};
      try { args = JSON.parse(fn.arguments); } catch { args = {}; }
      const label = getToolLabel(fn.name);
      if (onProgress) onProgress(label);
      try {
        const r = await executeToolCall(fn.name, args);
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: String(r || "(no output)").slice(0, 2000),
        });
      } catch (toolErr: any) {
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: `Error: ${toolErr.message || "tool failed"}`,
        });
      }
    }

    messages.push(msg, ...toolResults);

    // Final round: safety net force text
    if (round === MAX_ROUNDS - 1) {
      const doFinalCall = async (withTools: boolean): Promise<string> => {
        const clean = sanitizeMessages(messages);
        validateMessageSequence(clean);
        logPayload("FinalCall", clean, MAX_ROUNDS - 1);
        const fb: any = { model, messages: clean, max_tokens: 8000, temperature: 0.7 };
        if (withTools) fb.tools = toolsPayload;
        const fc = new AbortController();
        const ft = setTimeout(() => fc.abort(), TIMEOUT_MS);
        let fr;
        try {
          fr = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify(fb),
            signal: fc.signal,
          });
        } finally { clearTimeout(ft); }
        if (!fr.ok) {
          const errText = await fr.text().catch(() => "{}");
          let errParsed: any = {};
          try { errParsed = JSON.parse(errText); } catch { errParsed = { raw: errText }; }
          console.error("[DeepSeek 400 FinalCall]", JSON.stringify({
            status: fr.status, errorBody: errParsed,
            messageCount: clean.length,
            lastMessage: clean[clean.length - 1],
          }, null, 2));
          throw new Error(`AI engine error at final round: HTTP ${fr.status}: ${JSON.stringify(errParsed)}`);
        }
        const fj = await fr.json();
        const fmsg = (fj as any).choices?.[0]?.message;
        if (fmsg?.tool_calls?.length > 0 && withTools) {
          // Strip tool_calls from assistant msg before retrying without tools
          const { tool_calls, ...rest } = fmsg;
          messages.push(rest);
          return doFinalCall(false);
        }
        const fc2 = stripDSML(fmsg?.content?.trim() || "");
        const fallback = stripDSML(msg.content?.trim() || "");
        const finalContent = fc2 || fallback;
        const validated = validateResponse(finalContent);
        if (validated.warnings.length > 0) console.warn("[Validator] Safety net warnings:", validated.warnings);
        if (validated.cleanedText) await remember(userId, mode, user, validated.cleanedText);
        return validated.cleanedText;
      };
      return doFinalCall(true);
    }
  }

  return "";
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
