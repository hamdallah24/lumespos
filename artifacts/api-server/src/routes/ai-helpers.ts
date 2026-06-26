// ─────────────────────────────────────────────────────────────
// AI HELPERS — DeepSeek, memory, GitHub, SSH, Local Tools
// ─────────────────────────────────────────────────────────────
import { exec, execSync } from "child_process";
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, relative, resolve } from "path";

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

// ── MEMORY ──
type ChatMsg = { role: "user" | "assistant"; content: string };
const memory = new Map<string, ChatMsg[]>();
const MAX_MEMORY = 10;

function memoryKey(userId: number, mode: string) { return `${userId}_${mode}`; }

export function getHistory(userId: number, mode: string): ChatMsg[] {
  return memory.get(memoryKey(userId, mode)) || [];
}

export function remember(userId: number, mode: string, userMsg: string, assistantReply: string) {
  const key = memoryKey(userId, mode);
  const msgs = memory.get(key) || [];
  msgs.push({ role: "user", content: userMsg.slice(0, 1000) }, { role: "assistant", content: assistantReply.slice(0, 4000) });
  if (msgs.length > MAX_MEMORY * 2) msgs.splice(0, 2);
  memory.set(key, msgs);
}

export function clearMemory(userId: number, mode: string) {
  memory.delete(memoryKey(userId, mode));
}

// ── DEEPSEEK / SUMOPOD ──
export async function callDeepSeek(system: string, user: string, userId: number, mode: string, maxTokens = 800): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { console.error("[ai] DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL not set"); return ""; }
  try {
    const history = getHistory(userId, mode);
    const messages: any[] = [{ role: "system", content: system.slice(0, 4000) }];
    for (const h of history) messages.push(h);
    messages.push({ role: "user", content: user.slice(0, 2000) });

    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error(`[ai] DeepSeek HTTP ${resp.status}: ${err.slice(0, 300)}`);
      return "";
    }
    const json = await resp.json();
    const content = (json as any).choices?.[0]?.message?.content?.trim() || "";
    if (!content) console.error(`[ai] DeepSeek empty response. finish_reason=${(json as any).choices?.[0]?.finish_reason}`);
    else remember(userId, mode, user, content);
    return content;
  } catch (err) {
    console.error("[ai] callDeepSeek fetch error:", err);
    return "";
  }
}

// ── GITHUB ──
export async function fetchGitHubFile(path: string, branch = "main"): Promise<{ content: string; status: number; sha: string }> {
  if (!GITHUB_PAT) return { content: "", status: 0, sha: "" };
  const url = `${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`;
  // Use JSON API to also get SHA
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github+json" } });
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
    if (!SSH_HOST || !SSH_USER || !SSH_PASS) { resolve(""); return; }
    const sshCmd = `sshpass -p '${SSH_PASS}' ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "${cmd}"`;
    exec(sshCmd, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve(err ? (stderr || err.message) : (stdout || "no output"));
    });
  });
}

// ── LOCAL TOOLS (Fase 1 — VPS filesystem) ──

const SAFE_DIRS = [PROJECT_ROOT, join(PROJECT_ROOT, "artifacts"), join(PROJECT_ROOT, "lib")];
function isPathSafe(p: string): boolean { return SAFE_DIRS.some(d => resolve(p).startsWith(d)); }

export function listLocalDir(dirPath: string): string {
  const full = resolve(dirPath);
  if (!isPathSafe(full)) return `Error: Path ${dirPath} di luar project.`;
  if (!existsSync(full)) return `Error: Directory ${dirPath} tidak ditemukan.`;
  try {
    const items = readdirSync(full, { withFileTypes: true });
    return items.map(d => `${d.isDirectory() ? "📁" : "📄"} ${d.name}${d.isFile() ? ` (${statSync(join(full, d.name)).size} bytes)` : ""}`).join("\n");
  } catch (e: any) { return `Error: ${e.message}`; }
}

export function readLocalFile(filePath: string, maxChars = 5000): string {
  const full = resolve(filePath);
  if (!isPathSafe(full)) return `Error: Path ${filePath} di luar project.`;
  if (!existsSync(full)) return `Error: File ${filePath} tidak ditemukan.`;
  try {
    const content = readFileSync(full, "utf-8");
    return content.length > maxChars ? content.slice(0, maxChars) + `\n\n... (truncated, ${content.length - maxChars} chars remaining)` : content;
  } catch (e: any) { return `Error: ${e.message}`; }
}

export function searchLocalContent(dirPath: string, pattern: string): string {
  const full = resolve(dirPath);
  if (!isPathSafe(full)) return `Error: Path ${dirPath} di luar project.`;
  try {
    const cmd = process.platform === "win32"
      ? `findstr /s /i /n "${pattern}" "${full}\\*" 2>nul`
      : `grep -rn --include="*.ts" --include="*.tsx" --include="*.json" "${pattern}" "${full}" 2>/dev/null | head -30`;
    const result = execSync(cmd, { timeout: 5000, cwd: PROJECT_ROOT }).toString().trim();
    return result || `Tidak ditemukan "${pattern}" di ${dirPath}`;
  } catch { return `Tidak ditemukan "${pattern}" di ${dirPath}`; }
}

export function writeLocalFile(filePath: string, content: string): string {
  const full = resolve(filePath);
  if (!isPathSafe(full)) return `Error: Path ${filePath} di luar project.`;
  try {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    return `✅ File ${filePath} berhasil ditulis (${content.length} chars).`;
  } catch (e: any) { return `Error: ${e.message}`; }
}

export function editLocalFile(filePath: string, search: string, replace: string): string {
  const full = resolve(filePath);
  if (!isPathSafe(full)) return `Error: Path ${filePath} di luar project.`;
  if (!existsSync(full)) return `Error: File ${filePath} tidak ditemukan.`;
  try {
    let content = readFileSync(full, "utf-8");
    const count = content.split(search).length - 1;
    if (count === 0) return `Error: "search" tidak ditemukan di file.`;
    if (count > 1) return `Error: "search" muncul ${count}x (harus tepat 1x).`;
    content = content.replace(search, replace);
    writeFileSync(full, content);
    return `✅ File ${filePath} berhasil diedit (1 replacement).`;
  } catch (e: any) { return `Error: ${e.message}`; }
}

export function execLocalCommand(command: string): string {
  const allowed = ["git", "pnpm", "npm", "pm2", "node", "tsc", "npx", "ls", "cat", "echo", "uptime"];
  const cmdName = command.trim().split(/\s+/)[0];
  if (!allowed.includes(cmdName)) return `Error: Command "${cmdName}" tidak diizinkan. Allowed: ${allowed.join(", ")}`;
  // Allow git subcommands: status, diff, checkout, merge, push, pull, fetch, branch, log
  if (cmdName === "git") {
    const subCmd = command.trim().split(/\s+/)[1] || "";
    const allowedGit = ["status", "diff", "checkout", "merge", "push", "pull", "fetch", "branch", "log", "remote"];
    if (subCmd && !allowedGit.includes(subCmd)) return `Error: Git subcommand "${subCmd}" tidak diizinkan. Allowed: ${allowedGit.join(", ")}`;
  }
  try {
    const result = execSync(command, { timeout: 30000, cwd: PROJECT_ROOT }).toString().trim();
    return result || "(no output)";
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

export const EXPLORE_TOOLS: ToolDef[] = LOCAL_TOOLS.filter(t => ["listDirectory", "readFile", "searchContent"].includes(t.name));

function executeToolCall(name: string, args: Record<string, any>): string {
  switch (name) {
    case "listDirectory": return listLocalDir(args.path || ".");
    case "readFile": return readLocalFile(args.path || "");
    case "searchContent": return searchLocalContent(args.path || ".", args.pattern || "");
    case "writeFile": return writeLocalFile(args.path || "", args.content || "");
    case "editFile": return editLocalFile(args.path || "", args.search || "", args.replace || "");
    case "execCommand": return execLocalCommand(args.command || "");
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

  const history = getHistory(userId, mode);
  const messages: any[] = [{ role: "system", content: system.slice(0, 4000) }];
  for (const h of history) messages.push(h);
  messages.push({ role: "user", content: user.slice(0, 2000) });

  const body: any = { model, messages, max_tokens: maxTokens, temperature: 0.7 };
  if (tools.length > 0) {
    body.tools = tools.map(t => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
  }

  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });
    if (!resp.ok) { console.error(`[ai] DeepSeek tools HTTP ${resp.status}: ${await resp.text().catch(() => "").then((t: any) => t.slice(0, 300))}`); return ""; }

    const json = await resp.json();
    const msg = (json as any).choices?.[0]?.message;
    if (!msg) return "";

    // Tool calls?
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // Execute all tools
      const toolResults: any[] = [];
      for (const tc of msg.tool_calls) {
        const fn = tc.function;
        let args: Record<string, any> = {};
        try { args = JSON.parse(fn.arguments); } catch { args = {}; }
        const result = executeToolCall(fn.name, args);
        toolResults.push({ role: "tool", tool_call_id: tc.id, content: result.slice(0, 3000) });
      }

      // Feed tool results back to DeepSeek
      const followUp: any[] = [...messages, msg, ...toolResults];
      const resp2 = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, messages: followUp, max_tokens: maxTokens, temperature: 0.7 }),
      });
      if (!resp2.ok) return msg.content || "";
      const json2 = await resp2.json();
      const finalContent = (json2 as any).choices?.[0]?.message?.content?.trim() || "";
      if (finalContent) remember(userId, mode, user, finalContent);
      return finalContent || msg.content || "";
    }

    // No tool calls — normal text response
    const content = msg.content?.trim() || "";
    if (content) remember(userId, mode, user, content);
    return content;
  } catch (err) {
    console.error("[ai] callDeepSeekWithTools error:", err);
    return "";
  }
}
