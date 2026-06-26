// ─────────────────────────────────────────────────────────────
// AI CODEGEN — Code Generator Pipeline (analyze → generate → validate → commit)
// Ported from n8n Code Generator Stage 4 workflow. All Telegram nodes removed.
// ─────────────────────────────────────────────────────────────
import { callDeepSeek, fetchGitHubFile, remember, clearMemory, GITHUB_PAT, GITHUB_REPO } from "./ai-helpers";

const BRANCH = "Staging";
const GITHUB_API = "https://api.github.com/repos";
const GH_JSON_HEADERS = {
  Authorization: `Bearer ${GITHUB_PAT}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

// ─────────────────────────────────────────────────────────────
// 1. CODEGEN SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────
const CODEGEN_PROMPT = `Kamu adalah Code Generator untuk Lume's Everywhere — POS app monorepo (pnpm workspace).
Stack: React 18 + Vite + Tailwind + Framer Motion + Lucide (frontend), Express + Drizzle ORM + PostgreSQL Neon.tech (backend).
Repo: hamdallah24/lumespos, branch: Staging.

TUGASMU: TULIS perubahan kode dalam format SEARCH-AND-REPLACE.
JANGAN tulis ulang seluruh file — cuma bagian yg berubah.

FORMAT OUTPUT WAJIB (JSON only, no markdown, no backticks):
{
  "files": [
    {
      "path": "artifacts/pos-app/src/components/NamaFile.tsx",
      "edits": [{ "search": "teks persis di file", "replace": "teks pengganti" }],
      "commit_message": "feat: deskripsi singkat perubahan"
    }
  ]
}

ATURAN KETAT:
1. Field "search" HARUS teks PERSIS (karakter-per-karakter, termasuk indentasi) dari file asli.
2. "search" harus CUKUP UNIK dan cukup PANJANG (min 3 baris konteks) — cuma boleh match 1x.
3. "replace" adalah teks pengganti LENGKAP dengan indentasi konsisten.
4. JANGAN ubah bagian yg tidak relevan.
5. Syntax wajib valid: bracket/brace/paren seimbang, import baru disertakan.
6. Jika buat file BARU (belum ada), gunakan search="" dan replace berisi SELURUH isi file baru.
7. Maks 1500 karakter per edit.

Jika ga yakin atau butuh lebih banyak konteks, beri tahu di field "needs_more_context": true.`;

// ─────────────────────────────────────────────────────────────
// 2. VALIDATOR (Pure JS — ported from n8n Self-Healing Layer 2)
// ─────────────────────────────────────────────────────────────
interface Edit {
  search: string;
  replace: string;
}
interface GenFile {
  path: string;
  edits: Edit[];
  commit_message: string;
}
interface GenOutput {
  files?: GenFile[];
  needs_more_context?: boolean;
}
interface ValError {
  type: string;
  path?: string;
  detail: string;
}

function checkBalanced(text: string): boolean {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const closers = new Set(Object.values(pairs));
  const stack: string[] = [];
  let inStr: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = text[i - 1];
    if (inStr) { if (ch === inStr && prev !== "\\") inStr = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (closers.has(ch)) { if (stack.pop() !== ch) return false; }
  }
  return stack.length === 0;
}

function validateEdits(files: GenFile[], fetchedContent: Record<string, string>): { valid: boolean; errors: ValError[]; patched: Record<string, { content: string; sha: string | null; msg: string }> } {
  const errors: ValError[] = [];
  const patched: Record<string, { content: string; sha: string | null; msg: string }> = {};

  if (!files || files.length === 0) {
    errors.push({ type: "empty_output", detail: "Code Generator tidak menghasilkan file apapun." });
    return { valid: false, errors, patched: {} };
  }

  for (const file of files) {
    if (!file.path || !Array.isArray(file.edits) || file.edits.length === 0) {
      errors.push({ type: "malformed_entry", path: file.path, detail: "File entry tidak lengkap." });
      continue;
    }

    // File BARU — tidak perlu validasi search
    if (file.edits.length === 1 && file.edits[0].search === "" && !fetchedContent[file.path]) {
      if (!checkBalanced(file.edits[0].replace)) {
        errors.push({ type: "unbalanced_brackets", path: file.path, detail: "File baru memiliki bracket tidak seimbang." });
        continue;
      }
      patched[file.path] = { content: file.edits[0].replace, sha: null, msg: file.commit_message || `add ${file.path}` };
      continue;
    }

    const original = fetchedContent[file.path];
    if (typeof original !== "string") {
      errors.push({ type: "unknown_file", path: file.path, detail: "File tidak ditemukan. Pastikan path benar." });
      continue;
    }

    let working = original;
    let fileErr = false;

    for (const edit of file.edits) {
      if (!edit.search || typeof edit.search !== "string" || typeof edit.replace !== "string") {
        errors.push({ type: "malformed_edit", path: file.path, detail: "search/replace kosong atau tipe salah." });
        fileErr = true; continue;
      }

      const count = working.split(edit.search).length - 1;
      if (count === 0) {
        errors.push({ type: "search_not_found", path: file.path, detail: `"${edit.search.slice(0, 60)}..." tidak ditemukan di file.` });
        fileErr = true; continue;
      }
      if (count > 1) {
        errors.push({ type: "search_ambiguous", path: file.path, detail: `"${edit.search.slice(0, 60)}..." match ${count}x (harus 1x).` });
        fileErr = true; continue;
      }
      working = working.replace(edit.search, edit.replace);
    }

    if (!fileErr) {
      if (!checkBalanced(working)) {
        errors.push({ type: "unbalanced_brackets", path: file.path, detail: "Hasil patch memiliki bracket tidak seimbang." });
        fileErr = true;
      }
    }
    if (!fileErr) {
      patched[file.path] = { content: working, sha: null, msg: file.commit_message || `update ${file.path}` };
    }
  }

  return { valid: errors.length === 0 && Object.keys(patched).length > 0, errors, patched };
}

// ─────────────────────────────────────────────────────────────
// 3. GITHUB COMMIT
// ─────────────────────────────────────────────────────────────
async function commitFile(path: string, content: string, sha: string | null, message: string): Promise<string | null> {
  const body: any = { message, content: Buffer.from(content).toString("base64"), branch: BRANCH };
  if (sha) body.sha = sha;

  const resp = await fetch(`${GITHUB_API}/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: GH_JSON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as any;
    console.error(`[codegen] Commit failed for ${path}: ${resp.status} ${err.message || err}`);
    return err.message || `HTTP ${resp.status}`;
  }
  const data = await resp.json();
  return (data as any).commit?.sha || "ok";
}

// ─────────────────────────────────────────────────────────────
// 4. MAIN PIPELINE
// ─────────────────────────────────────────────────────────────
export async function generateAndCommit(userMessage: string, userId: number): Promise<string> {
  if (!GITHUB_PAT) return "❌ GITHUB_PAT belum diset. Tidak bisa generate kode.";

  // ── PHASE 1: Intent + Fetch file ──
  const lower = userMessage.toLowerCase();
  let targetPath = "";

  // Try to extract file path from message
  const pathMatch = lower.match(/(?:di\s+)?(?:file\s+)?(?:path\s+)?(artifacts\/\S+\.[a-z]+)/i);
  if (pathMatch) targetPath = pathMatch[1];
  else {
    // Heuristic: if message mentions "komponen" or "component" → frontend
    if (/komponen|component|components|halaman|page/i.test(lower)) targetPath = "artifacts/pos-app/src/components/";
    else if (/route|routes|endpoint|api/i.test(lower)) targetPath = "artifacts/api-server/src/routes/";
    else if (/schema|table|migration/i.test(lower)) targetPath = "lib/db/src/schema/";
  }

  // Fetch existing file content
  let fileContent = "";
  let fileSha = "";
  if (targetPath && !targetPath.endsWith("/")) {
    const f = await fetchGitHubFile(targetPath, BRANCH);
    fileContent = f.content;
    fileSha = f.sha;
  }

  // ── PHASE 2: Generate code (DeepSeek) ──
  const userCtx = `REQUEST: ${userMessage}
BRANCH TARGET: ${BRANCH}
TARGET PATH: ${targetPath || "(tentukan sendiri)"}
${fileContent ? `ISI FILE SAAT INI:\n\`\`\`\n${fileContent.slice(0, 4000)}\n\`\`\`` : "FILE BELUM ADA — buat file baru."}`;

  let rawOutput = await callDeepSeek(CODEGEN_PROMPT, userCtx, userId, "codegen", 2000);

  // ── PHASE 3: Parse + Validate + Repair (max 2 attempts) ──
  let parsed: GenOutput;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let cleaned = rawOutput.trim();
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
      parsed = JSON.parse(cleaned);
    } catch {
      if (attempt < 2) {
        // Retry with error feedback
        rawOutput = await callDeepSeek(CODEGEN_PROMPT,
          `${userCtx}\n\nOUTPUT SEBELUMNYA INVALID JSON. Coba lagi dengan format JSON yang benar.`,
          userId, "codegen", 2000);
        continue;
      }
      return "❌ Code Generator gagal menghasilkan JSON valid setelah 3x percobaan.";
    }

    if ((parsed as any).needs_more_context) {
      return "❌ Code Generator butuh lebih banyak konteks. Coba sebutkan file path spesifik atau jelaskan lebih detail.";
    }

    const files = parsed.files || [];
    const fetched: Record<string, string> = {};
    const fetchedSha: Record<string, string> = {};
    if (targetPath && !targetPath.endsWith("/")) { fetched[targetPath] = fileContent; fetchedSha[targetPath] = fileSha; }

    // Fetch additional files mentioned in edits
    for (const f of files) {
      if (f.path && !fetched[f.path]) {
        const result = await fetchGitHubFile(f.path, BRANCH);
        if (result.content) { fetched[f.path] = result.content; fetchedSha[f.path] = result.sha; }
      }
    }

    const { valid, errors, patched } = validateEdits(files, fetched);

    if (valid) {
      // ── PHASE 4: Commit ──
      const results: string[] = [];
      for (const [path, p] of Object.entries(patched)) {
        const existingSha = fetchedSha[path] || null;
        const result = await commitFile(path, p.content, existingSha, p.msg);
        results.push(result ? `✅ ${path}` : `❌ ${path}`);
      }

      const allOk = results.every(r => r.startsWith("✅"));
      const summary = results.join("\n");
      const reply = allOk
        ? `✅ Code generated & committed ke branch \`${BRANCH}\`!\n\n${summary}\n\nPull request atau cek langsung di repo.`
        : `⚠️ Sebagian commit gagal:\n\n${summary}\n\nCek log untuk detail.`;
      remember(userId, "codegen", userMessage, reply);
      return reply;
    }

    // Validation failed — retry with errors
    if (attempt < 2) {
      const errList = errors.map(e => `- [${e.type}] ${e.path || ""}: ${e.detail}`).join("\n");
      rawOutput = await callDeepSeek(CODEGEN_PROMPT,
        `${userCtx}\n\nVALIDASI GAGAL dengan error:\n${errList}\n\nPerbaiki output kamu.`,
        userId, "codegen", 2000);
      continue;
    }

    const errList = errors.map(e => `❌ [${e.type}] ${e.path || ""}: ${e.detail}`).join("\n");
    return `❌ Validasi gagal setelah 3x percobaan:\n\n${errList}`;
  }

  return "❌ Code Generator gagal. Coba lagi dengan deskripsi yg lebih jelas.";
}

// ─────────────────────────────────────────────────────────────
// 5. SIMPLE PARSE — for quick file read (used by CTO tab)
// ─────────────────────────────────────────────────────────────
export async function quickAnalyzeFile(path: string, question: string): Promise<string> {
  const result = await fetchGitHubFile(path, BRANCH);
  if (!result.content) return `File "${path}" tidak ditemukan di branch ${BRANCH}.`;
  const reply = await callDeepSeek(
    `Kamu adalah code reviewer untuk repo hamdallah24/lumespos (branch ${BRANCH}).`,
    `PERTANYAAN: ${question}\n\nFILE: ${path}\n\`\`\`\n${result.content.slice(0, 5000)}\n\`\`\``,
    0, "codegen", 1200);
  return reply || "Tidak bisa menganalisis file.";
}
