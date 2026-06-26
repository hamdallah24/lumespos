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
            const content = await fetchGitHubFile(fileMatch[1]);
            if (content) {
              res.json({ reply: `\`\`\`\n${content.slice(0, 3000)}\n\`\`\`` + (content.length > 3000 ? `\n\n...dipotong` : "") });
              return;
            }
            res.json({ reply: `File "${fileMatch[1]}" tidak ditemukan atau GITHUB_PAT belum diset.` });
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

        // Dynamic Specialist → BANG streaming
        await streamBANGResponse(res, uid, clean);
        return;
      }

      // ── VPS ──
      case "vps": {
        const lower = clean.toLowerCase();
        let cmd = "";

        if (/deploy|git pull/i.test(lower)) {
          res.json({ reply: "Deploy jangan lewat sini ya bos. SSH manual aja:\n```\ngit pull && pnpm build && pm2 restart\n```" });
          return;
        }
        if (/restart/i.test(lower)) {
          res.json({ reply: "Restart jangan lewat sini ya bos. SSH manual:\n```\npm2 restart pos-api\n```" });
          return;
        }
        if (/status|keadaan|info/i.test(lower)) cmd = "pm2 status && echo '---' && free -m && echo '---' && uptime";
        else if (/logs|log/i.test(lower)) cmd = "pm2 logs pos-api --lines 30 --nostream";
        else if (/health|sehat|alive/i.test(lower)) cmd = "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/health && echo ' (200=OK)'";
        else if (/ram|memori|memory/i.test(lower)) cmd = "free -m";
        else if (/disk|hardisk|storage/i.test(lower)) cmd = "df -h /";
        else if (/uptime/i.test(lower)) cmd = "uptime";

        if (cmd) {
          const result = await sshExec(cmd);
          if (!result) { res.json({ reply: "Gagal SSH ke VPS. Cek SSH_HOST, SSH_USER, SSH_PASSWORD di .env." }); return; }
          res.json({ reply: `\`\`\`\n${result.slice(0, 3000)}\n\`\`\`` });
          return;
        }
        res.json({ reply: "Command VPS ga dikenal. Coba: status, logs, health, ram, disk, uptime." });
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
