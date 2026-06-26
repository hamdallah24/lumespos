// ─────────────────────────────────────────────────────────────
// AI HELPERS — DeepSeek, memory, GitHub, SSH
// ─────────────────────────────────────────────────────────────
import { exec } from "child_process";

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
      .filter((t: any) => t.type === "blob" && /\.(tsx?|jsx?|json|css|md)$/.test(t.path))
      .map((t: any) => t.path);
    treeCache = { ts: Date.now(), paths };
  }

  // Score each file based on keyword matches in the path
  const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 2);
  const scored = treeCache.paths.map((path: string) => {
    const lower = path.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 3;              // exact substring match
      else if (kw.length >= 3) {
        // Partial matching: check character overlap
        const chars = new Set(kw);
        const overlap = [...new Set(lower.split("/").pop() || "")].filter(c => chars.has(c)).length;
        score += (overlap / chars.size) * 1;
      }
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
