// ─────────────────────────────────────────────────────────────
// AI ROUTER — Smart Backend: Bisnis / Chat / CTO / VPS
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { callDeepSeek, callDeepSeekWithTools, fetchGitHubFile, readLocalFile, listLocalDir, searchLocalContent, sshExec, getHistory, remember, clearMemory, searchRepoFiles, LOCAL_TOOLS, EXPLORE_TOOLS, mergeDeploy, getDependencies, checkRateLimit } from "./ai-helpers";
import { executeOperation } from "./ai-business";
import { BANG_ORCHESTRATOR, CHAT_SYSTEM, COO_SYSTEM } from "./ai-prompts";
import { generateAndCommit } from "./ai-codegen";
import { db, ingredientsTable, semiFinishedTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── CTO STREAMING HELPER ──
async function streamBANGResponse(req: any, res: any, uid: number, clean: string) {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { res.json({ reply: "BANG sedang sibuk (API key belum diset)." }); return; }

  const history = await getHistory(uid, "cto");
  const messages: any[] = [{ role: "system", content: BANG_ORCHESTRATOR.slice(0, 4000) }];
  for (const h of history) messages.push(h);
  messages.push({ role: "user", content: clean.slice(0, 2000) });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  let dsResp;
  try {
    dsResp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: 3000, temperature: 0.7, stream: true }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    res.json({ reply: "BANG sedang sibuk, coba lagi ya bos." });
    return;
  } finally { clearTimeout(timeout); }
  if (!dsResp.ok) {
    const errText = await dsResp.text().catch(() => "");
    console.error(`[ai] BANG stream HTTP ${dsResp.status}: ${errText.slice(0, 300)}`);
    res.json({ reply: "BANG sedang sibuk, coba lagi ya bos." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Cleanup on client disconnect
  let aborted = false;
  req.on("close", () => { aborted = true; controller.abort(); });

  const reader = dsResp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done || aborted) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const content = chunk.choices?.[0]?.delta?.content;
          if (content && !aborted) { fullText += content; res.write(`data: ${JSON.stringify({ delta: content })}\n\n`); }
        } catch { /* skip malformed chunks */ }
      }
    }
  } finally { reader.releaseLock(); }

  if (!aborted) {
    res.write(`data: ${JSON.stringify({ done: true, finalText: fullText })}\n\n`);
    res.end();
    if (fullText) await remember(uid, "cto", clean, fullText);
  }
}

// ── ROUTER ──
router.post("/ai/chat", requireRole("owner"), async (req, res) => {
  try {
    const { message, mode, generateNow } = req.body as { message?: string; mode?: string; generateNow?: boolean };
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const user = req.user!;
    const clean = message.trim();
    const defaultBranchId = user.branchId || 1;
    const m = mode || "bisnis";
    const uid = user.id;

    // Reset memory
    if (/reset|hapus\s*riwayat|mulai\s*baru|clear/i.test(clean.toLowerCase())) {
      await clearMemory(uid, m);
      res.json({ reply: "✅ Riwayat percakapan sudah di-reset. Silakan tanya lagi." });
      return;
    }

    // Rate limit
    const maxReqs = m === "cto" ? (generateNow ? 2 : 10) : (m === "vps" ? 30 : 20);
    const rl = checkRateLimit(uid, m, maxReqs);
    if (!rl.ok) {
      res.status(429).json({ error: `Terlalu banyak permintaan. Coba lagi ${rl.retryAfter} detik lagi.` });
      return;
    }

    switch (m) {

      // ── CHAT ──
      case "chat": {
        const reply = await callDeepSeek(CHAT_SYSTEM, clean, uid, m);
        if (reply.startsWith("ERROR:")) { res.json({ reply }); return; }
        res.json({ reply: reply || "Chat Agent sedang sibuk, coba lagi ya bos." });
        return;
      }

      // ── CTO ──
      case "cto": {
        // Approval → generate kode langsung di backend
        if (generateNow) {
          // SSE streaming — kirim progress langkah demi langkah
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.flushHeaders();

          let aborted = false;
          req.on("close", () => { aborted = true; });

          const sse = (step: string, detail: string) => {
            if (!aborted) res.write(`data: ${JSON.stringify({ step, detail })}\n\n`);
          };

          // Step 1: Cari konteks dari BANG + file repo
          const history = await getHistory(uid, "cto");
          const lastAssistant = [...history].reverse().find(h => h.role === "assistant");
          let codegenInput = clean;

          if (lastAssistant) {
            codegenInput += `\n\n--- ANALISIS BANG SEBELUMNYA ---\n${lastAssistant.content}`;
          }

          sse("search", "🔍 Mencari file yg berkaitan di repo...");

          // ── Layer 1: Parse BANG response — langsung fetch file yg disebut ──
          const prefetched: Record<string, string> = {};

          if (lastAssistant) {
            const pathsFromBANG = (lastAssistant.content.match(/artifacts\/\S+\.[a-z]{2,4}/gi) || [])
              .filter((p: string, i: number, arr: string[]) => arr.indexOf(p) === i);
            const bangResults = await Promise.all(pathsFromBANG.slice(0, 3).map(p => fetchGitHubFile(p, "main")));
            for (let i = 0; i < bangResults.length; i++) {
              const r = bangResults[i];
              if (r.content && r.content.length > 10) prefetched[pathsFromBANG[i]] = r.content;
            }
          }

          // ── Layer 2: searchRepoFiles fallback untuk file tambahan ──
          const searchQuery = lastAssistant ? clean + " " + lastAssistant.content.slice(0, 500) : clean;
          const searchedPaths = await searchRepoFiles(searchQuery);
          if (searchedPaths.length > 0) {
            codegenInput += "\n\nFILE TERKAIT:\n" + searchedPaths.slice(0, 5).join("\n");
            const need = 3 - Object.keys(prefetched).length;
            if (need > 0) {
              const searchResults = await Promise.all(
                searchedPaths.filter(p => !prefetched[p]).slice(0, need).map(p => fetchGitHubFile(p, "main"))
              );
              for (let i = 0; i < searchResults.length; i++) {
                const r = searchResults[i];
                if (r.content && r.content.length > 10) prefetched[searchedPaths[i]] = r.content;
              }
            }
          }

          // Progress
          const n = Object.keys(prefetched).length;
          if (n > 0) {
            const first = Object.keys(prefetched)[0].split("/").pop();
            sse("search", `📄 ${n} file relevan (utama: ${first}), lanjut generate...`);
          } else {
            sse("search", "⚠️ Tidak bisa membaca isi file — generate tetap dilanjutkan...");
          }

          const reply = await generateAndCommit(codegenInput, uid, (evt) => {
            sse(evt.step, evt.detail);
          }, prefetched);

          // Final response
          if (!aborted) {
            res.write(`data: ${JSON.stringify({ step: "final", detail: reply })}\n\n`);
            res.end();
            await remember(uid, m, clean, reply);
          }
          return;
        }

        const lower = clean.toLowerCase();

        // Approval flow — manual type
        if (/^setuju/i.test(lower)) {
          res.json({ reply: "Balas dengan klik tombol SETUJU di bawah proposal ya bos." });
          return;
        }
        if (/^tidak\s*setuju/i.test(lower) || /^batal/i.test(lower)) {
          res.json({ reply: "Baik bos, generate kode dibatalkan. Ada hal lain yg bisa dibantu?" });
          return;
        }

        // Baca file — local VPS first, GitHub fallback, multi-path search
        if (/baca\s+(file\s+)?\S+\.[a-z]+/i.test(lower) || /lihat\s+(file\s+)?\S+/i.test(lower)) {
          const fileMatch = lower.match(/(?:baca|lihat|read)\s+(?:file\s+)?(\S+\.\w+)/i);
          if (fileMatch) {
            const rawPath = fileMatch[1];
            const possiblePaths = [rawPath,
              `artifacts/pos-app/src/components/${rawPath}`, `artifacts/pos-app/src/pages/${rawPath}`, `artifacts/pos-app/src/${rawPath}`,
              `artifacts/api-server/src/routes/${rawPath}`, `artifacts/api-server/src/${rawPath}`, `artifacts/api-server/src/middlewares/${rawPath}`,
              `artifacts/api-server/src/services/${rawPath}`, `lib/db/src/schema/${rawPath}`, `lib/db/src/${rawPath}`,
            ];
            let found = false;
            for (const p of possiblePaths) {
              const content = await readLocalFile(p, 5000);
              if (content && !content.startsWith("Error:")) {
                res.json({ reply: `📄 ${p} (lokal):\n\`\`\`\n${content}\n\`\`\`` + (content.length >= 5000 ? `\n\n...dipotong` : "") });
                found = true; break;
              }
              const result = await fetchGitHubFile(p, "main");
              if (result.content) {
                res.json({ reply: `📄 ${p} (GitHub):\n\`\`\`\n${result.content.slice(0, 3000)}\n\`\`\`` + (result.content.length > 3000 ? `\n\n...dipotong` : "") });
                found = true; break;
              }
            }
            if (!found) res.json({ reply: `❌ File "${rawPath}" tidak ditemukan di lokasi manapun. Coba pakai path lengkap (misal: artifacts/api-server/src/routes/ai.ts)` });
            return;
          }
        }

        // List direktori — local VPS first
        if (/list\s+(?:direktori|directory|folder|struktur)/i.test(lower)) {
          const dirMatch = lower.match(/(?:list\s+(?:direktori|directory|folder|struktur)\s+)?(\S+)/i);
          const dir = dirMatch ? dirMatch[1].replace(/(list|direktori|directory|folder|struktur)/i, "").trim() : "";
          const listing = await listLocalDir(dir || ".");
          if (listing && !listing.startsWith("Error:")) {
            res.json({ reply: `📁 ${dir || "."} (lokal):\n${listing}` }); return;
          }
          res.json({ reply: `❌ Direktori "${dir || "."}" tidak ditemukan.` });
          return;
        }

        // Auto-fetch relevant files for BANG + specialists
        let bangContext = clean;
        const fetchedPairs: string[] = [];
        const fetchedPaths: string[] = [];
        let manifestBlock = "";
        // Only auto-fetch if not already handled by explicit "baca" command
        if (!/baca\s+|lihat\s+|read\s+/i.test(clean)) {
          // Detect file mentions (.tsx, .ts, .json)
          const fileRefs = clean.match(/(\w+\.[a-z]{2,4})/gi);
          if (fileRefs) {
            const refResults = await Promise.all(fileRefs.slice(0, 3).map(async (ref) => {
              const paths = [
                `artifacts/pos-app/src/components/${ref}`,
                `artifacts/pos-app/src/${ref}`,
                `artifacts/api-server/src/routes/${ref}`,
                `artifacts/api-server/src/${ref}`,
                `artifacts/api-server/src/middlewares/${ref}`,
                ref,
              ];
              const results = await Promise.all(paths.map(p => fetchGitHubFile(p, "main")));
              for (let i = 0; i < results.length; i++) {
                if (results[i].content) return { path: paths[i], content: results[i].content };
              }
              return null;
            }));
            for (const r of refResults) {
              if (r) {
                fetchedPaths.push(r.path);
                fetchedPairs.push(`\n\n[FILE: ${r.path}]:\n\`\`\`\n${r.content.slice(0, 2500)}\n\`\`\``);
              }
            }
          }
          // Dynamic search
          const relevantPaths = await searchRepoFiles(clean);
          const seen = new Set(fetchedPaths);
          const unseen = relevantPaths.filter(p => !seen.has(p));
          const need = Math.min(8 - fetchedPairs.length, unseen.length);
          if (need > 0) {
            const targets = unseen.slice(0, need);
            const searchResults = await Promise.all(targets.map(p => fetchGitHubFile(p, "main")));
            for (let i = 0; i < searchResults.length && fetchedPairs.length < 8; i++) {
              const r = searchResults[i];
              if (r.content && r.content.length > 10) {
                fetchedPaths.push(targets[i]);
                fetchedPairs.push(`\n\n[FILE: ${targets[i]}]:\n\`\`\`\n${r.content.slice(0, 2000)}\n\`\`\``);
                seen.add(targets[i]);
              }
            }
          }
          if (fetchedPaths.length > 0) {
            const depResults = await Promise.all(fetchedPaths.map(async (p) => ({ p, deps: await getDependencies(p) })));
            const depMap = new Map(depResults.map(r => [r.p, r.deps]));
            const manifestLines = fetchedPaths.map((p, i) => {
              const dir = p.split("/").slice(0, -1).pop() || "";
              const deps = depMap.get(p) || "";
              const depLine = deps && !deps.startsWith("Error:") && deps !== "(no internal imports)"
                ? `\n     @deps:[${deps.split("\n").map(d => d.replace(/^\s+→\s*/, "").trim()).join(", ")}]`
                : "";
              return `${i + 1}. ${p}   → ${dir}${depLine}`;
            }).join("\n");
            manifestBlock = `\n\n═══════════════════════════════════\n📋 FILE YANG TERSEDIA (sistem sudah membaca isinya):\n${manifestLines}\n═══════════════════════════════════\n` + fetchedPairs.join("");
          }
        }
        bangContext = clean + manifestBlock;

        // ── Pre-call: BANG explore repo with READ-ONLY tools (separate memory) ──
        const exploreCtx = clean + manifestBlock + "\n\n⚠️ Gunakan tools read-only (listDirectory, readFile, searchContent) untuk eksplorasi file tambahan. JANGAN tulis/edit file — hanya BACA dan LAPORKAN file path relevan.";
        const preResult = await callDeepSeekWithTools(
          BANG_ORCHESTRATOR, exploreCtx, uid, "cto_tools", EXPLORE_TOOLS, 500
        );
        if (preResult) {
          bangContext += `\n\n--- HASIL EKSPLORASI ---\n${preResult}`;
        }

        // ── Main: streaming response (no tools, full format) ──
        await streamBANGResponse(req, res, uid, bangContext);
        return;
      }

      // ── VPS (COO JSON translator like Bisnis) ──
      case "vps": {
        const lower = clean.toLowerCase();
        if (/deploy|git pull/i.test(lower)) {
          res.json({ reply: "Deploy jangan lewat sini ya bos. SSH manual aja:\n```\ngit pull && pnpm build && pm2 restart\n```" });
          return;
        }

        const prompt = `${COO_SYSTEM}\n\nOwner (VPS): ${clean}`;
        const raw = await callDeepSeek(prompt, clean, uid, "vps", 400);
        if (raw.startsWith("ERROR:")) { res.json({ reply: raw }); return; }
        if (!raw) { res.json({ reply: "VPS agent sedang sibuk." }); return; }

        let reply = raw;
        const jsonMatch = raw.match(/^\{.+\}/);
        if (jsonMatch) {
          try {
            const action = JSON.parse(jsonMatch[0]);
            const actions = action.actions || (action.action ? [action] : []);
            for (const act of actions) {
              if (!act.action || !act.action.startsWith("ssh_")) continue;
              let cmd = "";
              if (act.action === "ssh_status") cmd = "pm2 status && echo '---' && free -m && echo '---' && uptime";
              else if (act.action === "ssh_logs") cmd = "pm2 logs pos-api --lines 30 --nostream";
              else if (act.action === "ssh_health") cmd = "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health && echo ' (200=OK)'";
              else if (act.action === "ssh_ram") cmd = "free -m";
              else if (act.action === "ssh_disk") cmd = "df -h /";
              else if (act.action === "ssh_uptime") cmd = "uptime";
              else if (act.action === "ssh_restart") cmd = "pm2 restart pos-api";
              if (cmd) {
                const result = await sshExec(cmd);
                if (result) act._sshResult = result;
              }
            }
            reply = raw.replace(jsonMatch[0], "").trim();
            if (!reply && action.response) reply = action.response;
            // Append SSH results if any
            for (const act of actions) {
              if (act._sshResult) reply += `\n\n\`\`\`\n${act._sshResult.slice(0, 2000)}\n\`\`\``;
            }
          } catch { /* invalid JSON */ }
        }

        res.json({ reply: reply || raw });
        return;
      }

      // ── BISNIS (COO JSON action + narration) ──
      case "bisnis":
      default: {
        const prompt = `${COO_SYSTEM}\n\nOwner: ${clean}`;
        const raw = await callDeepSeek(prompt, clean, uid, "bisnis", 800);
        if (raw.startsWith("ERROR:")) { res.json({ reply: raw }); return; }
        if (!raw) { res.json({ reply: "COO sedang sibuk. Coba lagi, bos." }); return; }

        // Parse JSON action di baris 1 (single or array)
        let reply = raw;
        const jsonMatch = raw.match(/^\{.+\}/);
        if (jsonMatch) {
          try {
            const action = JSON.parse(jsonMatch[0]);
            const actions = action.actions || (action.action ? [action] : []);
            for (const act of actions) {
              // Resolve names → IDs before executing
              if (act.params?.itemName) {
                const [ings, semis] = await Promise.all([
                  db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, defaultBranchId)),
                  db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, defaultBranchId)),
                ]);
                const n = act.params.itemName.toLowerCase();
                const found = ings.find(i => i.name.toLowerCase().includes(n))
                  || semis.find(s => s.name.toLowerCase().includes(n));
                if (found) {
                  act.params.itemId = (found as any).id;
                  act.params.itemType = "unit" in found ? (found as any).unit ? "ingredient" : "semi_finished" : "ingredient";
                }
              }
              if (act.params?.productName) {
                const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, defaultBranchId), eq(productsTable.isActive, true)));
                const n = act.params.productName.toLowerCase();
                const found = prods.find(p => p.name.toLowerCase().includes(n));
                if (found) act.params.productId = found.id;
              }
              if (act.params?.parentName) {
                const [prods, semis] = await Promise.all([
                  db.select().from(productsTable).where(and(eq(productsTable.branchId, defaultBranchId), eq(productsTable.isActive, true))),
                  db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, defaultBranchId)),
                ]);
                const n = act.params.parentName.toLowerCase();
                const found = prods.find(p => p.name.toLowerCase().includes(n))
                  || semis.find(s => s.name.toLowerCase().includes(n));
                if (found) {
                  act.params.parentId = (found as any).id;
                  act.params.parentType = (found as any).unit ? "semi_finished" : "product";
                }
              }
              if (act.params?.ingredientName) {
                const ings = await db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, defaultBranchId));
                const n = act.params.ingredientName.toLowerCase();
                const found = ings.find(i => i.name.toLowerCase().includes(n));
                if (found) act.params.ingredientId = found.id;
              }
              if (act.action && act.action !== "general" && act.params) {
                await executeOperation(act.action, act.params, defaultBranchId);
              }
            }
            reply = raw.replace(jsonMatch[0], "").trim();
            if (!reply && action.response) reply = action.response;
          } catch { /* invalid JSON — show raw */ }
        }

        res.json({ reply: reply || raw });
        return;
      }
    }
  } catch (err) {
    console.error("[ai] Route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── MERGE & DEPLOY: Staging → main ──
router.post("/ai/deploy-merge", requireRole("owner"), async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  let aborted = false;
  req.on("close", () => { aborted = true; });
  const sse = (step: string, detail: string) => { if (!aborted) res.write(`data: ${JSON.stringify({ step, detail })}\n\n`); };

  const result = await mergeDeploy((step, detail) => {
    const labels: Record<string, string> = {
      sync: "🔄 Syncing Staging ← main...",
      merge: "🔀 Merging main ← Staging...",
      build_api: "🔨 Building API server...",
      build_ui: "🔨 Building frontend...",
      done: detail,
      error: `❌ ${detail}`,
    };
    sse(step, labels[step] || detail);
  });

  sse("final", result.summary);
  res.end();
});

export default router;
