// ─────────────────────────────────────────────────────────────
// AI CODEGEN — Code Generator Pipeline (analyze → generate → validate → commit)
// Ported from n8n Code Generator Stage 4 workflow. All Telegram nodes removed.
// ─────────────────────────────────────────────────────────────
import { callDeepSeek, fetchGitHubFile, remember, clearMemory, GITHUB_PAT, GITHUB_REPO, GITHUB_RAW } from "./ai-helpers";
import { exec } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { dirname } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const ROOT = "/home/ubuntu/lumespos";

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
const CODEGEN_PROMPT = `Kamu Code Generator Lume's POS (React+Express+Drizzle+PostgreSQL). Repo: hamdallah24/lumespos, branch: Staging.
OUTPUT WAJIB — JSON SEARCH-AND-REPLACE (no markdown, no backticks):
{"files":[{"path":"artifacts/pos-app/src/components/Foo.tsx","edits":[{"search":"teks persis","replace":"teks baru"}],"commit_message":"feat: deskripsi"}]}

  ATURAN:
1. "search" HARUS teks PERSIS dari file asli karakter-per-karakter (termasuk indentasi).
2. "search" cukup unik (cuma match 1x), min 3 baris konteks.
3. "replace" indentasi konsisten, bracket seimbang, import disertakan.
4. Jika kamu lihat "FILE UTAMA" ADA ISINYA → WAJIB EDIT file itu (search & replace). JANGAN PERNAH buat file baru dgn nama berbeda!
5. HANYA buat file baru (search="" dan replace=seluruh isi file) jika userCtx bilang "BUAT FILE BARU".
6. Maks 1500 karakter per edit.

KAMU LIHAT ISI BEBERAPA FILE di system prompt ini. Edit file yg paling pas. Selalu COBA generate — sistem retry 3x. JANGAN "needs_more_context" kecuali benar-benar ga ada file relevan.`;

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
export interface ProgressEvent { step: string; detail: string; }

function translateError(errors: ValError[]): string {
  if (errors.length === 0) return "";
  const lines: string[] = [];
  for (const e of errors) {
    const p = e.path ? ` (${e.path.split("/").pop()})` : "";
    switch (e.type) {
      case "search_not_found": lines.push(`Kode yg mau diganti tidak cocok dengan file asli — mungkin spasi atau indentasi beda${p}.`); break;
      case "search_ambiguous": lines.push(`Potongan kode muncul lebih dari 1x di file${p} — harus unik biar cuma 1 yg berubah.`); break;
      case "unbalanced_brackets": lines.push(`Kurung kurawal/kurung buka-tutup tidak seimbang${p} — cek ulah bracket.`); break;
      case "unknown_file": lines.push(`File "${e.path}" tidak ditemukan di repo.`); break;
      case "malformed_entry": lines.push(`Format perubahan tidak lengkap${p}.`); break;
      case "malformed_edit": lines.push(`Data perubahan rusak${p} — ulang lagi.`); break;
      case "empty_output": lines.push("AI tidak menghasilkan perubahan apapun."); break;
      default: lines.push(`${e.detail}${p ? ` — ${e.path?.split("/").pop()}` : ""}`); break;
    }
  }
  // Deduplicate
  return [...new Set(lines)].join("\n");
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
// 3.5 TYPECHECK HELPER
// ─────────────────────────────────────────────────────────────
async function runTypeCheck(patched: Record<string, { content: string }>): Promise<string | null> {
  const paths: string[] = [];
  for (const [p, { content }] of Object.entries(patched)) {
    const fullPath = `${ROOT}/${p}`;
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
    paths.push(fullPath);
  }
  try {
    const ws = paths.some(p => p.includes("artifacts/pos-app")) ? "pos-app" : "api-server";
    await execAsync(`cd ${ROOT} && pnpm --filter ./artifacts/${ws} run typecheck 2>&1`, { timeout: 30000 });
    return null; // PASS
  } catch (e: any) {
    const stderr = e.stderr || e.stdout || String(e);
    // Filter: hanya gagal kalau error ada di file yg diubah
    const patchedNames = Object.keys(patched).map(p => {
      // Extract relative path within workspace: artifacts/pos-app/src/foo.ts → src/foo.ts
      const parts = p.split("/");
      const wsIdx = parts.indexOf("pos-app") >= 0 ? parts.indexOf("pos-app") : parts.indexOf("api-server");
      return wsIdx >= 0 ? parts.slice(wsIdx + 1).join("/") : p.split("/").pop() || "";
    });
    const lines = stderr.split("\n");
    const relevant = lines.filter((line: string) =>
      patchedNames.some((n: string) => n && line.includes(n)) && line.includes("error TS")
    );

    if (relevant.length === 0) return null; // pre-existing errors di file lain → ignore

    // Revert written files
    for (const p of paths) {
      try { await execAsync(`cd ${ROOT} && git checkout -- ${p.replace(ROOT + "/", "")}`); } catch {}
      try { unlinkSync(p); } catch {}
    }
    return relevant.join("\n").slice(0, 2000);
  }
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
export async function generateAndCommit(userMessage: string, userId: number, onProgress?: (evt: ProgressEvent) => void, prefetchedFiles?: Record<string, string>): Promise<string> {
  const log = (step: string, detail: string) => onProgress?.({ step, detail });

  if (!GITHUB_PAT) {
    log("error", "GitHub token belum diset. Hubungi admin.");
    return "❌ GITHUB_PAT belum diset. Tidak bisa generate kode.";
  }

  // ── PHASE 1: Intent + Fetch file ──
  log("search", "Mencari file yg perlu diubah...");
  const lower = userMessage.toLowerCase();
  let targetPath = "";

  // Priority: prefetched (dari repo) > heuristic
  if (prefetchedFiles && Object.keys(prefetchedFiles).length > 0) {
    targetPath = Object.keys(prefetchedFiles)[0] || "";
  } else {
    if (/komponen|component|components/i.test(lower)) targetPath = "artifacts/pos-app/src/components/";
    else if (/halaman|page/i.test(lower)) targetPath = "artifacts/pos-app/src/pages/";
    else if (/route|routes|endpoint|api/i.test(lower)) targetPath = "artifacts/api-server/src/routes/";
    else if (/schema|table|migration/i.test(lower)) targetPath = "lib/db/src/schema/";
  }

  // Fetch existing file content
  let fileContent = "";
  let fileSha = "";
  let relatedContext = "";
  if (targetPath && !targetPath.endsWith("/")) {
    log("search", targetPath ? `Membaca ${targetPath.split("/").pop() || targetPath}...` : "Mencari file...");
    if (prefetchedFiles?.[targetPath]) {
      fileContent = prefetchedFiles[targetPath];
      fileSha = ""; // prefetched dari main, sha tidak relevan
    } else {
      let f = await fetchGitHubFile(targetPath, BRANCH);
      if (!f.content) f = await fetchGitHubFile(targetPath, "main");
      fileContent = f.content;
      fileSha = f.sha;
    }

    // ── PHASE 1.5: Find related files ──
    // Get directory of target file and list siblings
    const dirPath = targetPath.split("/").slice(0, -1).join("/");
    try {
      const dirList = await fetch(`${GITHUB_RAW}/${GITHUB_REPO}/contents/${dirPath}?ref=${BRANCH}`, {
        headers: { Authorization: `Bearer ${GITHUB_PAT}`, Accept: "application/vnd.github+json" },
      });
      if (dirList.ok) {
        const items = await dirList.json() as any[];
        // Fetch sibling files (max 5) for context
        const siblings = items.filter(i => i.type === "file" && i.name !== targetPath.split("/").pop()).slice(0, 5);
        const relatedParts: string[] = [];
        for (const s of siblings) {
          const rf = await fetchGitHubFile(s.path, BRANCH);
          if (rf.content && rf.content.length < 5000) {
            relatedParts.push(`--- FILE: ${s.path} ---\n${rf.content}\n--- END ---`);
          }
        }
        if (relatedParts.length > 0) relatedContext = "\n\nFILE TERKAIT (mungkin perlu diupdate juga):\n" + relatedParts.join("\n\n");
      }
    } catch { /* skip if can't get siblings */ }

    // Also extract imports from target and try to fetch them
    const importMatches = fileContent.match(/import\s+.*from\s+['"](\.\/[^'"]+)['"]/g);
    if (importMatches) {
      const importedPaths = importMatches.map(m => {
        const p = m.match(/from\s+['"](\.\/[^'"]+)['"]/)?.[1];
        if (!p) return null;
        // Resolve relative path
        const parts = targetPath.split("/");
        parts.pop();
        for (const seg of (p + ".tsx").split("/")) {
          if (seg === "..") parts.pop();
          else if (seg !== ".") parts.push(seg);
        }
        return parts.join("/");
      }).filter(Boolean) as string[];

      const importedParts: string[] = [];
      for (const ip of importedPaths.slice(0, 3)) {
        const rf = await fetchGitHubFile(ip, BRANCH);
        if (rf.content && rf.content.length < 5000) {
          importedParts.push(`--- IMPORT: ${ip} ---\n${rf.content}\n--- END ---`);
        }
      }
      if (importedParts.length > 0) relatedContext += "\n\nFILE DI-IMPORT (komponen yg dipakai):\n" + importedParts.join("\n\n");
    }
  }

  // ── PHASE 2: Generate code (DeepSeek) ──
  log("generate", "✍️ AI sedang menulis kode...");

  // File content masuk system prompt (max 4000), bukan user message (max 2000)
  let fileContext = "";
  if (fileContent) {
    fileContext += `\n\nFILE UTAMA (${targetPath}):\n\`\`\`\n${fileContent.slice(0, 1200)}\n\`\`\``;
  }
  if (prefetchedFiles) {
    let count = 0;
    for (const [p, content] of Object.entries(prefetchedFiles)) {
      if (p !== targetPath && content && count < 2) {
        fileContext += `\n\nFILE LAIN (${p}):\n\`\`\`\n${content.slice(0, 600)}\n\`\`\``;
        count++;
      }
    }
  }
  if (relatedContext) {
    fileContext += `\n\n${relatedContext.slice(0, 200)}`;
  }
  const fullSystem = CODEGEN_PROMPT + fileContext;

  const userCtx = `REQUEST: ${userMessage.slice(0, 800)}
${fileContent ? `EDIT FILE INI: ${targetPath} (SUDAH ada — WAJIB search & replace, JANGAN buat file baru!)` : `BUAT FILE BARU: ${targetPath} (belum ada di repo — tulis full code dari nol)`}
${Object.keys(prefetchedFiles || {}).length > 0 ? `FILE LAIN TERSEDIA: ${Object.keys(prefetchedFiles!).filter(p => p !== targetPath).join(", ")}` : ""}
BRANCH: ${BRANCH}`;

  let rawOutput = await callDeepSeek(fullSystem, userCtx, userId, "codegen", 2000);

  // ── PHASE 3: Parse + Validate + Repair (max 2 attempts) ──
  log("validate", "🔍 Memeriksa kode yg dihasilkan (format, bracket, pencocokan)...");
  let parsed: GenOutput;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let cleaned = rawOutput.trim();
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
      parsed = JSON.parse(cleaned);
    } catch {
      if (attempt < 2) {
        log("retry", "Format kode tidak valid — minta AI perbaiki...");
        rawOutput = await callDeepSeek(fullSystem,
          `${userCtx}\n\nOUTPUT SEBELUMNYA INVALID JSON. Coba lagi dengan format JSON yang benar.`,
          userId, "codegen", 2000);
        continue;
      }
      log("error", "AI tidak bisa menghasilkan kode yg valid. Coba lagi dengan deskripsi yg lebih spesifik.");
      return "❌ Code Generator gagal menghasilkan JSON valid setelah 3x percobaan.";
    }

    if ((parsed as any).needs_more_context) {
      if (attempt < 2) {
        log("retry", "AI minta konteks lebih — dipaksa coba lagi...");
        rawOutput = await callDeepSeek(fullSystem,
          `${userCtx}\n\nKAMU BILANG "needs_more_context". JANGAN — COBA generate kode apapun. Gunakan informasi yg sudah ada. Validator akan cek nanti.`,
          userId, "codegen", 2000);
        continue;
      }
      log("error", "AI tetap tidak bisa generate — beri deskripsi lebih detail.");
      return "❌ Code Generator butuh lebih banyak konteks. Coba sebutkan file path spesifik atau jelaskan lebih detail.";
    }

    const files = parsed.files || [];
    log("generate", `✍️ Kode untuk ${files.length} file dihasilkan.`);

    // Level 3 — anti-new-file: kalau targetFile ada isinya tapi AI malah bikin file baru
    if (fileContent && files.length >= 1 && !files.some(f => f.path === targetPath)
        && files[0].edits?.[0]?.search === "" && attempt < 2) {
      log("retry", `AI buat file baru "${files[0].path}" — harusnya edit "${targetPath}". Dipaksa ulang...`);
      rawOutput = await callDeepSeek(fullSystem,
        `${userCtx}\n\nSALAH! Kamu buat file baru "${files[0].path}". File "${targetPath}" SUDAH disediakan isinya di system prompt. EDIT file itu pakai search & replace. JANGAN buat file baru!`,
        userId, "codegen", 2000);
      continue;
    }

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
      // ── PHASE 3.5: TypeCheck before commit ──
      if (Object.keys(patched).length > 0) {
        const fileNames = Object.keys(patched).map(p => p.split("/").pop()).join(", ");
        log("typecheck", `🔨 Cek tipe TypeScript untuk ${fileNames}...`);
      }
      const tscErr = await runTypeCheck(patched);
      for (const p of Object.keys(patched)) {
        try { await execAsync(`cd ${ROOT} && git checkout -- ${p}`); } catch {}
      }
      if (tscErr) {
        const shortErr = tscErr.includes("error TS")
          ? tscErr.replace(/[\s\S]*?(error TS\d+:\s*[^\n]+)[\s\S]*/, "$1").slice(0, 150)
          : tscErr.slice(0, 150);
        if (attempt < 2) {
          log("retry", `TypeScript error: "${shortErr}" — minta AI perbaiki tipe...`);
          rawOutput = await callDeepSeek(fullSystem,
            `${userCtx}\n\nTypeCheck GAGAL:\n${tscErr.slice(0, 1500)}\n\nPerbaiki. Pastikan import benar, tipe valid, tidak ada properti yg tidak ada.`,
            userId, "codegen", 2000);
          continue;
        }
        log("error", `Gagal — kode tidak lulus TypeCheck. Masalah: ${shortErr}. Coba ulang dengan deskripsi lebih jelas.`);
        return `❌ TypeCheck gagal setelah 3x percobaan:\n\n\`\`\`\n${tscErr.slice(0, 1000)}\n\`\`\``;
      }

      // ── PHASE 4: Commit ──
      const results: string[] = [];
      let committed = 0;
      let failed = 0;
      for (const [path, p] of Object.entries(patched)) {
        log("commit", `💾 Menyimpan ${path.split("/").pop()} ke GitHub (branch ${BRANCH})...`);
        const existingSha = fetchedSha[path] || null;
        const result = await commitFile(path, p.content, existingSha, p.msg);
        if (result) { results.push(`✅ ${path}`); committed++; }
        else { results.push(`❌ ${path}`); failed++; log("error", `Gagal menyimpan ${path.split("/").pop()} ke GitHub.`); }
      }

      const allOk = results.every(r => r.startsWith("✅"));
      const summary = results.join("\n");
      if (allOk) {
        log("done", `✅ Sukses! ${committed} file sudah tersimpan di branch ${BRANCH}.`);
      } else {
        log("error", `⚠️ ${committed} berhasil, ${failed} gagal. Cek log untuk detail.`);
      }
      const reply = allOk
        ? `✅ Code generated & committed ke branch \`${BRANCH}\`!\n\n${summary}\n\nPull request atau cek langsung di repo.`
        : `⚠️ Sebagian commit gagal:\n\n${summary}\n\nCek log untuk detail.`;
      remember(userId, "codegen", userMessage, reply);
      return reply;
    }

    // Validation failed — retry with errors
    if (attempt < 2) {
      const errList = errors.map(e => `- [${e.type}] ${e.path || ""}: ${e.detail}`).join("\n");
      const humanErr = translateError(errors);
      log("retry", `Kode belum sesuai: ${humanErr.slice(0, 120)} (dicoba lagi)...`);
      rawOutput = await callDeepSeek(fullSystem,
        `${userCtx}\n\nVALIDASI GAGAL dengan error:\n${errList}\n\nPerbaiki output kamu.`,
        userId, "codegen", 2000);
      continue;
    }

    log("error", `Gagal setelah 3x percobaan. ${translateError(errors).slice(0, 200)}`);
    const errList = errors.map(e => `❌ [${e.type}] ${e.path || ""}: ${e.detail}`).join("\n");
    return `❌ Validasi gagal setelah 3x percobaan:\n\n${errList}`;
  }

  log("error", "Code Generator gagal setelah beberapa percobaan. Coba deskripsi yg lebih spesifik.");
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
