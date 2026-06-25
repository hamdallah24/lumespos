// ─────────────────────────────────────────────────────────────
// AI ROUTER — Smart Backend: Bisnis / Chat / CTO / VPS
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { callDeepSeek, fetchGitHubFile, fetchGitHubDir, sshExec, getHistory, remember, clearMemory } from "./ai-helpers";
import { analyzeIntent, executeOperation } from "./ai-business";
import { BANG_ORCHESTRATOR, CHAT_SYSTEM, COO_SYSTEM } from "./ai-prompts";
import { generateAndCommit } from "./ai-codegen";

const router = Router();

// Track pending COO actions (for guardline execution)
const pendingActions = new Map<number, { action: string; params: Record<string, any> }>();

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

      // ── BISNIS ──
      case "bisnis":
      default: {
        const analysis = await analyzeIntent(clean, defaultBranchId);

        // 1. Pending number confirm (add_stock price)
        const pending = pendingActions.get(uid);
        if (/^\d+$/.test(clean.trim()) && pending?.action === "add_stock") {
          pendingActions.delete(uid);
          await executeOperation("add_stock", { ...pending.params, price: parseFloat(clean.trim()) }, defaultBranchId);
          const reply = await callDeepSeek(`${COO_SYSTEM}\n\n[EXECUTED] tambah stok ${pending.params.name} +${pending.params.qty} Rp ${parseFloat(clean.trim()).toLocaleString("id-ID")}. Konfirmasi singkat.`, clean, uid, "bisnis");
          res.json({ reply: reply || `✅ ${pending.params.name} +${pending.params.qty} berhasil, bos.` });
          return;
        }

        // 2. Pending confirm/cancel
        if (/^(?:ya|y|yes|ok|oke|setuju|lanjut|gas)\b/i.test(clean.trim()) && pending) {
          pendingActions.delete(uid);
          await executeOperation(pending.action, pending.params, defaultBranchId);
          res.json({ reply: `✅ Operasi ${pending.action} berhasil dieksekusi, bos.` });
          return;
        }
        if (/^(?:tidak|batal|n|no|cancel|ga|gak)\b/i.test(clean.trim()) && pending) {
          pendingActions.delete(uid);
          res.json({ reply: "Ok, dibatalkan bos. Ada yg lain?" });
          return;
        }

        // 3. Auto-execute (no confirmation needed)
        const autoActions = ["reduce_stock", "correct_stock", "loss_correction", "add_ingredient",
          "add_product", "add_product_with_variants", "update_price", "update_variant_price",
          "deactivate_product", "add_expense", "add_recipe", "remove_recipe", "produce"];
        if (autoActions.includes(analysis.intent) && analysis.params) {
          const result = await executeOperation(analysis.intent, analysis.params, defaultBranchId);
          if (result === "ok") {
            const reply = await callDeepSeek(`${COO_SYSTEM}\n\n[SUDAH DIEKSEKUSI: ${analysis.intent}] Beri konfirmasi singkat ke user.`, clean, uid, "bisnis");
            res.json({ reply: reply || `✅ Operasi ${analysis.intent} berhasil, bos.` });
          } else {
            res.json({ reply: `❌ Gagal: ${result}` });
          }
          return;
        }

        // 4. Pending add_stock (needs price confirmation from COO)
        if (analysis.intent === "add_stock" && analysis.params) {
          pendingActions.set(uid, { action: "add_stock", params: analysis.params });
        }

        // 5. COO response
        const ctxStr = analysis.context ? JSON.stringify(analysis.context).slice(0, 2500) : "";
        const paramsStr = analysis.params ? JSON.stringify(analysis.params).slice(0, 1500) : "";
        const prompt = `${COO_SYSTEM}\n\n[DATA - ${analysis.intent}]:\n${ctxStr}\n${paramsStr ? `\n[PARAMS]:\n${paramsStr}` : ""}`;
        const reply = await callDeepSeek(prompt, clean, uid, "bisnis");
        res.json({ reply: reply || "COO sedang sibuk. Coba lagi, bos." });
        return;
      }
    }
  } catch (err) {
    console.error("[ai] Route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
