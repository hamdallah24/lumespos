// FOUNDATION FILE — Modification Policy: Only bug fixes and extensions. ADR Required. Owner: CTO.
// ECP-040: Tool Adapter — Stateless tool execution
// Responsibilities: tool dispatch, tool implementations, tool definitions
// No Governor. No lifecycle. No policy. No LLM communication.

import { exec } from "child_process";
import { existsSync } from "fs";
import { readdir, stat, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve } from "path";
import { promisify } from "util";
import { execSync } from "child_process";

const execP = promisify(exec);

// ── Config ──

export const PROJECT_ROOT = resolve(process.cwd().includes("artifacts") ? "../.." : ".");

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
  const resp = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${path}?ref=${branch}`, {
    headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github.v3+json" },
  });
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

// ── Local Tools ──

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

// ── Tool Registry ──

export const LOCAL_TOOLS: ToolDef[] = [
  { name: "listDirectory", description: "List files and folders in a directory path within the project.", parameters: { type: "object", properties: { path: { type: "string", description: "Absolute or relative path to directory, e.g., artifacts/pos-app/src/pages" } }, required: ["path"] } },
  { name: "readFile", description: "Read content of a file within the project. Returns max 5000 chars.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file, e.g., artifacts/pos-app/src/pages/products.tsx" } }, required: ["path"] } },
  { name: "searchContent", description: "Search for text pattern in project files using grep.", parameters: { type: "object", properties: { path: { type: "string", description: "Directory to search in" }, pattern: { type: "string", description: "Text pattern to search for" } }, required: ["path", "pattern"] } },
  { name: "writeFile", description: "Create a new file or overwrite an existing file. Creates parent directories automatically.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to new file" }, content: { type: "string", description: "Full file content" } }, required: ["path", "content"] } },
  { name: "editFile", description: "Edit an existing file by replacing a specific text block. Search text must be EXACT match (including whitespace) and unique in the file.", parameters: { type: "object", properties: { path: { type: "string", description: "Path to file to edit" }, search: { type: "string", description: "Exact text to find (must appear exactly once)" }, replace: { type: "string", description: "Replacement text" } }, required: ["path", "search", "replace"] } },
  { name: "execCommand", description: "Execute a safe shell command. Allowed: git, pnpm, npm, pm2, node, tsc, npx, ls, cat, echo, uptime. Max 30s timeout.", parameters: { type: "object", properties: { command: { type: "string", description: "Command to run, e.g., git status, pnpm build, pm2 restart pos-api" } }, required: ["command"] } },
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

// ── File Read with Fallback ──

export async function readFileWithFallback(path: string, branch = "main"): Promise<string> {
  const localPath = path.startsWith("/") ? path : `/home/ubuntu/lumespos/${path}`;
  try {
    const local = await readLocalFile(localPath);
    if (local && !local.startsWith("Error:")) {
      console.log("[FileRead] Local hit:", localPath.slice(0, 80));
      return local;
    }
  } catch { console.log("[FileRead] Local miss:", localPath.slice(0, 60)); }
  try {
    const gh = await fetchGitHubFile(path, branch);
    if (gh.content) {
      console.log("[FileRead] GitHub hit:", path);
      return `✅ ${path} (GitHub):\n\`\`\`\n${gh.content.slice(0, 5000)}\n\`\`\``;
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

// ADR-009 Phase 1: Structured ToolResult with status.
// Extension only — executeToolCall preserved for backward compat.
// Roadmap: Release N+1 migrate all callers → N+2 delete executeToolCall.

export interface ToolResult {
  name: string;
  output: string;
  status: "ok" | "error";
  durationMs: number;
}

export async function executeToolWithResult(name: string, args: Record<string, any>): Promise<ToolResult> {
  const t0 = Date.now();
  try {
    const output = await executeToolCall(name, args);
    return {
      name,
      output: String(output || "(no output)").slice(0, 2000),
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
