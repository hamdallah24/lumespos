// ─────────────────────────────────────────────────────────────
// AI ROUTER — Smart Backend: Bisnis / Chat / CTO / VPS
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { callDeepSeek, fetchGitHubFile, fetchGitHubDir, sshExec, getHistory, remember, clearMemory } from "./ai-helpers";
import { executeOperation } from "./ai-business";
import { BANG_ORCHESTRATOR, CHAT_SYSTEM, COO_SYSTEM } from "./ai-prompts";
import { generateAndCommit } from "./ai-codegen";
import { db, ingredientsTable, semiFinishedTable, productsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── CTO STREAMING HELPER ──
async function streamBANGResponse(res: any, uid: number, clean: string) {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { res.json({ reply: "BANG sedang sibuk (API key belum diset)." }); return; }

  const history = getHistory(uid, "cto");
  const messages: any[] = [{ role: "system", content: BANG_ORCHESTRATOR.slice(0, 4000) }];
  for (const h of history) messages.push(h);
  messages.push({ role: "user", content: clean.slice(0, 2000) });

  const dsResp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: 1500, temperature: 0.7, stream: true }),
  });
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

  const reader = dsResp.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
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
          if (content) { fullText += content; res.write(`data: ${JSON.stringify({ text: fullText })}\n\n`); }
        } catch { /* skip malformed chunks */ }
      }
    }
  } finally { reader.releaseLock(); }

  res.write(`data: ${JSON.stringify({ done: true, finalText: fullText })}\n\n`);
  res.end();
  if (fullText) remember(uid, "cto", clean, fullText);
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
      clearMemory(uid, m);
      res.json({ reply: "✅ Riwayat percakapan sudah di-reset. Silakan tanya lagi." });
      return;
    }

    switch (m) {

      // ── CHAT ──
      case "chat": {
        const reply = await callDeepSeek(CHAT_SYSTEM, clean, uid, m);
        res.json({ reply: reply || "Chat Agent sedang sibuk, coba lagi ya bos." });
        return;
      }

      // ── CTO ──
      case "cto": {
        // Approval → generate kode langsung di backend
        if (generateNow) {
          const reply = await generateAndCommit(clean, uid);
          res.json({ reply });
          remember(uid, m, clean, reply);
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

        // Baca file GitHub
        if (/baca\s+(file\s+)?\S+\.[a-z]+/i.test(lower) || /lihat\s+(file\s+)?\S+/i.test(lower)) {
          const fileMatch = lower.match(/(?:baca|lihat|read)\s+(?:file\s+)?(\S+\.\w+)/i);
          if (fileMatch) {
            const result = await fetchGitHubFile(fileMatch[1], "main");
            if (result.content) {
              res.json({ reply: `\`\`\`\n${result.content.slice(0, 3000)}\n\`\`\`` + (result.content.length > 3000 ? `\n\n...dipotong` : "") });
              return;
            }
            if (result.status === 0) {
              res.json({ reply: "❌ GitHub PAT belum di-set. Tambahkan GITHUB_PAT=ghp_... di .env lalu restart PM2." });
            } else if (result.status === 404) {
              res.json({ reply: `❌ File "${fileMatch[1]}" tidak ditemukan. Cek nama file & branch.` });
            } else {
              res.json({ reply: `❌ GitHub error ${result.status}. Cek token valid & koneksi internet VPS.` });
            }
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

        // Auto-fetch relevant files for BANG + specialists
        let bangContext = clean;
        // Only auto-fetch if not already handled by explicit "baca" command
        if (!/baca\s+|lihat\s+|read\s+/i.test(clean)) {
          const fetchedPairs: string[] = [];
          // Detect file mentions (.tsx, .ts, .json)
          const fileRefs = clean.match(/(\w+\.[a-z]{2,4})/gi);
          if (fileRefs) {
            for (const ref of fileRefs.slice(0, 3)) {
              const possiblePaths = [
                `artifacts/pos-app/src/components/${ref}`,
                `artifacts/pos-app/src/${ref}`,
                `artifacts/api-server/src/routes/${ref}`,
                `artifacts/api-server/src/${ref}`,
                `artifacts/api-server/src/middlewares/${ref}`,
                ref,
              ];
              for (const p of possiblePaths) {
                const result = await fetchGitHubFile(p, "main");
                if (result.content) {
                  fetchedPairs.push(`\n\n[FILE: ${p}]:\n\`\`\`\n${result.content.slice(0, 2500)}\n\`\`\``);
                  break; // found this file, try next ref
                }
              }
            }
          }
          // If no file refs, try keyword-based routing
          if (fetchedPairs.length === 0) {
            const keywordFiles: [string, string][] = [];
            const kw = clean.toLowerCase();
            if (/upload|storage|multer|file|photo/i.test(kw)) {
              keywordFiles.push(["artifacts/api-server/src/routes/storage.ts", "storage"]);
            }
            if (/produk|product|menu|harga/i.test(kw)) {
              keywordFiles.push(["artifacts/api-server/src/routes/products.ts", "products"]);
            }
            if (/tutup\s*shift|shift|audit/i.test(kw)) {
              keywordFiles.push(["artifacts/api-server/src/routes/shiftAudits.ts", "shiftAudits"]);
            }
            if (/login|auth|session|csrf/i.test(kw)) {
              keywordFiles.push(["artifacts/api-server/src/routes/auth.ts", "auth"]);
              keywordFiles.push(["artifacts/api-server/src/middlewares/requireAuth.ts", "middleware"]);
            }
            if (/css|tailwind|style|design|ui/i.test(kw)) {
              keywordFiles.push(["artifacts/pos-app/src/index.css", "css"]);
            }
            for (const [p] of keywordFiles.slice(0, 5)) {
              const result = await fetchGitHubFile(p, "main");
              if (result.content) {
                fetchedPairs.push(`\n\n[FILE: ${p}]:\n\`\`\`\n${result.content.slice(0, 2500)}\n\`\`\``);
              }
            }
          }
          if (fetchedPairs.length > 0) {
            bangContext = clean + "\n" + fetchedPairs.join("");
          }
        }

        // Dynamic Specialist → BANG streaming
        await streamBANGResponse(res, uid, bangContext);
        return;
      }

      // ── VPS (COO JSON translator like Bisnis) ──
      case "vps": {
        // Safety: never allow deploy/restart via chat
        const lower = clean.toLowerCase();
        if (/deploy|git pull/i.test(lower)) {
          res.json({ reply: "Deploy jangan lewat sini ya bos. SSH manual aja:\n```\ngit pull && pnpm build && pm2 restart\n```" });
          return;
        }
        if (/restart/i.test(lower)) {
          res.json({ reply: "Restart jangan lewat sini ya bos. SSH manual:\n```\npm2 restart pos-api\n```" });
          return;
        }

        const prompt = `${COO_SYSTEM}\n\nOwner (VPS): ${clean}`;
        const raw = await callDeepSeek(prompt, clean, uid, "vps", 400);
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

export default router;
