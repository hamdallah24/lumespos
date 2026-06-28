// ─────────────────────────────────────────────────────────────
// AI ROUTER — Smart Backend: Bisnis / Chat / CTO / VPS
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { requireRole } from "../middlewares/requireAuth";
import { callDeepSeek, callDeepSeekWithTools, executeToolCall, fetchGitHubFile, readLocalFile, listLocalDir, searchLocalContent, sshExec, getHistory, remember, clearMemory, searchRepoFiles, LOCAL_TOOLS, EXPLORE_TOOLS, ToolDef, mergeDeploy, getDependencies, checkRateLimit, getChecklistItems, upsertChecklistItem, clearChecklistItems, saveSharedContext, getSharedContext, getOrCreateConversation } from "./ai-helpers";
import { executeOperation } from "./ai-business";
import { BANG_ORCHESTRATOR, CHAT_SYSTEM, COO_SYSTEM } from "./ai-prompts";
import { generateAndCommit } from "./ai-codegen";
import { runMigration } from "./migrate";
import { db, ingredientsTable, semiFinishedTable, productsTable, usersTable, shiftAuditsTable, currentInventoryTable, orderItemsTable, ordersTable, branchesTable } from "@workspace/db";
import { eq, and, gte, sum, desc, sql } from "drizzle-orm";

const router = Router();

// ── CTO STREAMING HELPER (dengan tool support) ──
async function streamBANGResponse(req: any, res: any, uid: number, clean: string) {
  const key = process.env.DEEPSEEK_API_KEY;
  const base = process.env.DEEPSEEK_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!key || !base) { res.json({ reply: "BANG sedang sibuk (API key belum diset)." }); return; }

  const history = await getHistory(uid, "cto");
  const messages: any[] = [{ role: "system", content: BANG_ORCHESTRATOR.slice(0, 4000) }];
  for (const h of history) messages.push(h);
  messages.push({ role: "user", content: clean.slice(0, 5000) });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let aborted = false;
  req.on("close", () => { aborted = true; });

  const sse = (data: any) => { if (!aborted) res.write(`data: ${JSON.stringify(data)}\n\n`); };

  // Streaming call with tools
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 60000);

  const toolsPayload = EXPLORE_TOOLS.map(t => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }));

  try {
    const resp = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: 3000, temperature: 0.7, stream: true, tools: toolsPayload }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      console.error(`[ai] BANG stream HTTP ${resp.status}: ${err.slice(0, 300)}`);
      sse({ delta: "Maaf, BANG sedang sibuk. Coba lagi." }); sse({ done: true, finalText: "" });
      return;
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "", fullText = "", fullToolCalls: any[] = [];
    let toolCallsDetected = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done || aborted || toolCallsDetected) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        if (payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload);
          const delta = chunk.choices?.[0]?.delta;
          const finish = chunk.choices?.[0]?.finish_reason;
          if (delta?.content) {
            fullText += delta.content;
            sse({ delta: delta.content });
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!fullToolCalls[idx]) fullToolCalls[idx] = { id: "", name: "", args: "" };
              if (tc.id) fullToolCalls[idx].id = tc.id;
              if (tc.function?.name) fullToolCalls[idx].name = tc.function.name;
              if (tc.function?.arguments) fullToolCalls[idx].args += tc.function.arguments;
            }
          }
          if (finish === "tool_calls" && fullToolCalls.length > 0) {
            toolCallsDetected = true;
          }
        } catch { /* skip */ }
      }
    }
    reader.releaseLock();
    clearTimeout(tid);

    // ── REACT LOOP: tool → think → tool → think → final ──
    let allToolCalls = fullToolCalls;
    let followUpMessages = [...messages];
    let maxRounds = 10;
    let roundNum = 0;
    const totalRoundsEstimate = 10;

    while (allToolCalls.length > 0 && maxRounds-- > 0) {
      roundNum++;
      // Kirim progress tool ke user dengan counter
      const cmdList = allToolCalls.map((tc: any) => {
        let brief = tc.name;
        try { const a = JSON.parse(tc.args || "{}"); const v = Object.values(a)[0]; if (v) brief += `(${String(v).slice(0, 60)})`; } catch {}
        return brief;
      }).join(", ");
      sse({ delta: `\n\n🔧 Round ${roundNum}/${totalRoundsEstimate}: ${cmdList}\n` });

      // Execute tools (parallel, each with 30s internal timeout via tool itself)
      const toolResults: any[] = await Promise.all(allToolCalls.map(async (tc: any) => {
        let args: Record<string, any> = {};
        try { args = JSON.parse(tc.args); } catch { args = {}; }
        try {
          const result = await executeToolCall(tc.name, args);
          return { role: "tool", tool_call_id: tc.id, content: (result || "(no output)").slice(0, 5000) };
        } catch (toolErr: any) {
          return { role: "tool", tool_call_id: tc.id, content: `Error: ${toolErr.message || "tool execution failed"}` };
        }
      }));
      const toolMsg = { role: "assistant", content: null, tool_calls: allToolCalls.map((tc: any) => ({
        id: tc.id, type: "function", function: { name: tc.name, arguments: tc.args }
      })) };
      followUpMessages = [...followUpMessages, toolMsg, ...toolResults];

      // Streaming follow-up — AI mikir + mungkin minta tool lagi
      const c2 = new AbortController();
      const t2 = setTimeout(() => c2.abort(), 35000);
      try {
        const resp2 = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: followUpMessages, max_tokens: 3000, temperature: 0.7, stream: true, tools: toolsPayload }),
          signal: c2.signal,
        });
        clearTimeout(t2);
        if (!resp2.ok) {
          sse({ delta: `\n⚠️ AI engine HTTP ${resp2.status} — mencoba lanjut tanpa tools...\n` });
          break;
        }

        const r2 = resp2.body!.getReader();
        const d2 = new TextDecoder();
        let b2 = "", nextToolCalls: any[] = [];
        while (true) {
          if (aborted) break;
          const { done, value } = await r2.read();
          if (done) break;
          b2 += d2.decode(value, { stream: true });
          const lines = b2.split("\n");
          b2 = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const p = line.slice(6);
            if (p === "[DONE]") continue;
            try {
              const c = JSON.parse(p);
              const d = c.choices?.[0]?.delta;
              const f = c.choices?.[0]?.finish_reason;
              if (d?.content) {
                fullText += d.content;
                sse({ delta: d.content });
              }
              if (d?.tool_calls) {
                for (const tc of d.tool_calls) {
                  const idx = tc.index ?? nextToolCalls.length;
                  if (!nextToolCalls[idx]) nextToolCalls[idx] = { id: "", name: "", args: "" };
                  if (tc.id) nextToolCalls[idx].id = tc.id;
                  if (tc.function?.name) nextToolCalls[idx].name = tc.function.name;
                  if (tc.function?.arguments) nextToolCalls[idx].args = (nextToolCalls[idx].args || "") + tc.function.arguments;
                }
              }
              if (f === "tool_calls") { break; }
            } catch { /* skip */ }
          }
          if (nextToolCalls.length > 0) break;
        }
        try { r2.releaseLock(); } catch {}
        allToolCalls = nextToolCalls;
      } catch (err: any) {
        clearTimeout(t2);
        if (err.name === "AbortError") {
          sse({ delta: `\n⏱️ Timeout 35s — AI engine terlalu lama merespon. Melanjutkan...\n` });
        } else {
          sse({ delta: `\n⚠️ Error koneksi: ${err.message?.slice(0, 80) || "unknown"}. Melanjutkan...\n` });
        }
        break;
      }
    }

    // Jika loop habis tapi AI kehabisan putaran & belum final, paksa kesimpulan tanpa tools
    if (!aborted && allToolCalls.length > 0) {
      try {
        const c3 = new AbortController();
        setTimeout(() => c3.abort(), 30000);
        const resp3 = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: followUpMessages, max_tokens: 2000, temperature: 0.7 }),
          signal: c3.signal,
        });
        if (resp3.ok) {
          const json3 = await resp3.json();
          const finalContent = (json3 as any).choices?.[0]?.message?.content;
          if (finalContent) {
            fullText += "\n\n" + finalContent;
            sse({ delta: finalContent });
          }
        }
      } catch {}
    }

    if (!aborted) {
      sse({ done: true, finalText: fullText });
      res.end();
      if (fullText) {
        await remember(uid, "cto", clean, fullText);
        await saveSharedContext(uid, "cto", fullText.slice(0, 500));
      }
    }
  } catch (e: any) {
    console.error("[ai] BANG stream error:", e);
    if (!aborted) { sse({ delta: "Maaf, terjadi kesalahan." }); sse({ done: true, finalText: "" }); res.end(); }
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
    const maxReqs = m === "cto" ? (generateNow ? 2 : 30) : (m === "vps" ? 30 : 20);
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

          try {
            // Step 1: Cari konteks dari BANG + file repo
          const history = await getHistory(uid, "cto");
          const lastAssistant = [...history].reverse().find(h => h.role === "assistant");
          let codegenInput = clean;

          if (lastAssistant && lastAssistant.content.trim()) {
            codegenInput += `\n\n--- ANALISIS BANG SEBELUMNYA ---\n${lastAssistant.content.slice(0, 4000)}`;
            sse("search", "📄 Menemukan analisis BANG sebelumnya, melanjutkan generate...");
          } else {
            sse("search", "⚠️ Riwayat analisis BANG tidak ditemukan — generate berdasarkan permintaan langsung.");
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

          // SSH pull ke VPS setelah commit sukses
          const isSuccess = /✅|committed|sukses|berhasil/i.test(reply);
          let finalReply = reply;
          if (!aborted && isSuccess) {
            sse("pull", "🔄 Menarik kode ke VPS...");
            try {
              const pullResult = await sshExec("cd ~/lumespos && git pull origin Staging");
              sse("pull", pullResult.includes("Already up to date") || pullResult.includes("Updating")
                ? `✅ VPS sudah sinkron dengan Staging.\n${pullResult.slice(0, 200)}`
                : `⚠️ Hasil pull VPS:\n${pullResult.slice(0, 200)}`);
            } catch {
              sse("pull", "⚠️ Gagal SSH pull ke VPS. Lakukan manual: cd ~/lumespos && git pull origin Staging");
            }
            finalReply += `\n\n📋 **Langkah selanjutnya:**\n1. Merge Staging → main: \`git checkout main && git merge Staging && git push origin main\`\n2. Restart VPS: \`cd ~/lumespos && git pull origin main && pnpm --filter ./artifacts/api-server run build && pm2 restart pos-api\`\nAtau bilang "merge" biar saya eksekusi via tool.`;
          }

          // Final response
          if (!aborted) {
            res.write(`data: ${JSON.stringify({ step: "final", detail: finalReply })}\n\n`);
            res.end();
            await remember(uid, m, clean, finalReply);
          }
          return;
        } catch (e: any) {
          console.error("[ai] generateNow error:", e);
          if (!aborted) {
            sse("final", `❌ Gagal generate kode: ${(e?.message || String(e)).slice(0, 200)}`);
            res.end();
          }
          return;
        }
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

        // Auto-fetch relevant files for BANG + specialists
        let bangContext = clean;
        const fetchedPairs: string[] = [];
        const fetchedPaths: string[] = [];
        let manifestBlock = "";
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
        bangContext = clean + manifestBlock;

        // ── Pre-call: BANG explore repo with tools (separate memory) ──
        const sharedCtx = await getSharedContext(uid);
        const exploreCtx = clean + manifestBlock + (sharedCtx ? `\n\n--- KONTEKS DARI AGENT LAIN ---\n${sharedCtx}` : "") + "\n\n⚠️ Fase eksplorasi: Kamu punya alat untuk BACA file (listDirectory, readFile, searchContent, getDependencies, fetchGitHubFile), EKSEKUSI command (execCommand), dan SSH ke VPS (sshExec). Gunakan alat yg relevan. JANGAN tulis/edit file. LAPORKAN hasil eksplorasi + jalankan perintah yg diminta user.";
        const preResult = await callDeepSeekWithTools(
          BANG_ORCHESTRATOR, exploreCtx, uid, "cto_tools", EXPLORE_TOOLS, 2000
        );
        if (preResult && preResult.startsWith("ERROR:")) {
          bangContext += `\n\n⚠️ Eksplorasi file gagal: ${preResult.slice(6)}. BANG hanya punya file dari manifest.`;
        } else if (preResult) {
          bangContext += `\n\n--- HASIL EKSPLORASI ---\n${preResult}`;
        } else {
          bangContext += `\n\n⚠️ Eksplorasi file tidak menghasilkan data. BANG hanya punya file dari manifest.`;
        }

        // ── Main: streaming response (no tools, full format) ──
        await streamBANGResponse(req, res, uid, bangContext);
        return;
      }

      // ── BISNIS (COO JSON action — response_format json_object) ──
      case "bisnis":
      default: {
        const prompt = `${COO_SYSTEM}\n\nOwner: ${clean}`;
        const raw = await callDeepSeek(prompt, clean, uid, "bisnis", 800, true);
        if (raw.startsWith("ERROR:")) { res.json({ reply: raw }); return; }
        if (!raw) { res.json({ reply: "COO sedang sibuk. Coba lagi, bos." }); return; }

        let reply = raw;
        try {
          const action = JSON.parse(raw);
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
              // Resolve component names in bulk recipe
              if (act.params?.components && Array.isArray(act.params.components)) {
                const [ings, semis] = await Promise.all([
                  db.select().from(ingredientsTable).where(eq(ingredientsTable.branchId, defaultBranchId)),
                  db.select().from(semiFinishedTable).where(eq(semiFinishedTable.branchId, defaultBranchId)),
                ]);
                for (const comp of act.params.components) {
                  const cName = (comp.componentName || comp.ingredientName || "").toLowerCase();
                  if (!cName) continue;
                  const found = ings.find(i => i.name.toLowerCase().includes(cName))
                    || semis.find(s => s.name.toLowerCase().includes(cName));
                  if (found) {
                    comp.componentId = (found as any).id;
                    comp.componentType = (found as any).unit ? "ingredient" : "semi_finished";
                  }
                }
              }
              // ── New COO actions ──
              if (act.action === "change_role") {
                const { email, role } = act.params || {};
                if (email && ["owner", "manager", "cashier"].includes(role)) {
                  try {
                    await db.update(usersTable).set({ role }).where(eq(usersTable.email, email));
                    act._result = `✅ Role ${email} diubah menjadi ${role}.`;
                  } catch {
                    act._result = `❌ User dengan email ${email} tidak ditemukan.`;
                  }
                } else {
                  act._result = "❌ Parameter email dan role (owner/manager/cashier) wajib diisi.";
                }
                continue;
              }
              if (act.action === "add_variant") {
                const { productName, variantName, price } = act.params || {};
                if (!productName || !variantName || !price) {
                  act._result = "❌ Parameter productName, variantName, dan price wajib diisi.";
                  continue;
                }
                const prods = await db.select().from(productsTable).where(and(eq(productsTable.branchId, defaultBranchId), eq(productsTable.isActive, true)));
                const foundProd = prods.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
                if (!foundProd) {
                  act._result = `❌ Produk "${productName}" tidak ditemukan.`;
                  continue;
                }
                act.params.productId = foundProd.id;
                await executeOperation("add_variant", act.params, defaultBranchId);
                act._result = `✅ Varian "${variantName}" Rp ${Number(price).toLocaleString("id-ID")} ditambahkan ke ${foundProd.name}.`;
                continue;
              }
              if (act.action === "migrate_branch") {
                const { sourceBranchName, targetBranchName, includeIngredients, includeSemiFinished, includeProducts, overwrite } = act.params || {};
                if (!sourceBranchName || !targetBranchName) {
                  act._result = "❌ Parameter sourceBranchName dan targetBranchName wajib diisi.";
                  continue;
                }
                const allBranches = await db.select().from(branchesTable);
                const srcBranch = allBranches.find(b => b.name.toLowerCase().includes(sourceBranchName.toLowerCase()));
                const tgtBranch = allBranches.find(b => b.name.toLowerCase().includes(targetBranchName.toLowerCase()));
                if (!srcBranch) { act._result = `❌ Cabang sumber "${sourceBranchName}" tidak ditemukan.`; continue; }
                if (!tgtBranch) { act._result = `❌ Cabang target "${targetBranchName}" tidak ditemukan.`; continue; }
                if (srcBranch.id === tgtBranch.id) { act._result = "❌ Sumber dan target harus berbeda."; continue; }
                const stats = await db.transaction((tx) =>
                  runMigration(tx, srcBranch.id, tgtBranch.id, includeIngredients !== false, includeSemiFinished !== false, includeProducts !== false, overwrite === true)
                );
                const parts: string[] = [];
                if (stats.ingredients) parts.push(`${stats.ingredients} bahan baku`);
                if (stats.semiFinished) parts.push(`${stats.semiFinished} setengah jadi`);
                if (stats.products) parts.push(`${stats.products} produk`);
                if (stats.variants) parts.push(`${stats.variants} varian`);
                if (stats.recipes) parts.push(`${stats.recipes} resep`);
                if (stats.inventory) parts.push(`stok diperbarui`);
                act._result = `✅ Migrasi dari "${srcBranch.name}" → "${tgtBranch.name}" berhasil!\n${parts.join(", ")}.`;
                continue;
              }
              if (act.action === "get_sales_summary") {
                const period = (act.params?.period || "today") as string;
                let dateFilter: Date;
                const now = new Date();
                if (period === "today") dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                else if (period === "yesterday") dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                else if (period === "week") dateFilter = new Date(now.getTime() - 7 * 86400000);
                else dateFilter = new Date(now.getTime() - 30 * 86400000);
                const [sales] = await db.select({
                  total: sum(ordersTable.total),
                  count: sql<number>`count(*)::int`,
                }).from(ordersTable)
                  .where(and(
                    eq(ordersTable.branchId, defaultBranchId),
                    gte(ordersTable.createdAt, dateFilter),
                  ));
                const total = sales?.total ? parseFloat(sales.total as string) : 0;
                const count = sales?.count || 0;
                act._result = `📊 Penjualan (${period}): Rp ${total.toLocaleString("id-ID")} dari ${count} order.`;
                continue;
              }
              if (act.action === "get_top_products") {
                const period = (act.params?.period || "today") as string;
                const limitN = (act.params?.limit || 5) as number;
                let dateFilter: Date;
                const now = new Date();
                if (period === "today") dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                else if (period === "week") dateFilter = new Date(now.getTime() - 7 * 86400000);
                else dateFilter = new Date(now.getTime() - 30 * 86400000);
                const rows = await db.select({
                  name: productsTable.name,
                  qty: sql<number>`sum(${orderItemsTable.quantity})::int`,
                  total: sql<string>`sum(${orderItemsTable.subtotal})`,
                }).from(orderItemsTable)
                  .innerJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
                  .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
                  .where(and(
                    eq(ordersTable.branchId, defaultBranchId),
                    gte(ordersTable.createdAt, dateFilter),
                  ))
                  .groupBy(productsTable.id, productsTable.name)
                  .orderBy(sql`sum(${orderItemsTable.quantity}) desc`)
                  .limit(limitN);
                if (rows.length === 0) {
                  act._result = `📊 Top produk (${period}): Belum ada data.`;
                } else {
                  act._result = `📊 Top ${limitN} produk (${period}):\n` + rows.map((r, i) =>
                    `${i + 1}. ${r.name} — ${r.qty} pcs (Rp ${parseFloat(r.total || "0").toLocaleString("id-ID")})`
                  ).join("\n");
                }
                continue;
              }
              if (act.action === "get_shift_audit") {
                const rows = await db.select({
                  id: shiftAuditsTable.id,
                  shiftDate: shiftAuditsTable.createdAt,
                  openingBalance: shiftAuditsTable.openingBalance,
                  closingBalance: shiftAuditsTable.closingBalance,
                  expectedBalance: shiftAuditsTable.expectedBalance,
                  endingCupCount: shiftAuditsTable.endingCupCount,
                  status: shiftAuditsTable.status,
                }).from(shiftAuditsTable)
                  .where(eq(shiftAuditsTable.branchId, defaultBranchId))
                  .orderBy(desc(shiftAuditsTable.createdAt))
                  .limit(1);
                if (rows.length === 0) {
                  act._result = "📋 Belum ada shift audit.";
                } else {
                  const r = rows[0];
                  let cupText = r.endingCupCount ? String(parseFloat(r.endingCupCount)) : "—";
                  act._result = `📋 Shift terakhir:\nTanggal: ${r.shiftDate ? new Date(r.shiftDate).toLocaleDateString("id-ID") : "-"}\nSaldo awal: Rp ${parseFloat(r.openingBalance || "0").toLocaleString("id-ID")}\nSaldo akhir: Rp ${parseFloat(r.closingBalance || "0").toLocaleString("id-ID")}\nCup tersisa: ${cupText}\nStatus: ${r.status}`;
                }
                continue;
              }
              if (act.action === "get_inventory_status") {
                const items = await db.select({
                  name: semiFinishedTable.name,
                  stock: currentInventoryTable.currentStock,
                }).from(currentInventoryTable)
                  .innerJoin(semiFinishedTable, and(
                    eq(currentInventoryTable.itemId, semiFinishedTable.id),
                    eq(currentInventoryTable.itemType, "semi_finished"),
                  ))
                  .where(eq(currentInventoryTable.branchId, defaultBranchId))
                  .orderBy(desc(currentInventoryTable.currentStock))
                  .limit(10);
                if (items.length === 0) {
                  act._result = "📦 Belum ada data stok.";
                } else {
                  act._result = "📦 Stok terkini (top 10):\n" + items.map(i =>
                    `${i.name}: ${parseFloat(i.stock as string).toFixed(1)}`
                  ).join("\n");
                }
                continue;
              }
              if (act.action && act.action !== "general" && act.params) {
                await executeOperation(act.action, act.params, defaultBranchId);
              }
            }
            // Collect hasil eksekusi
            const results: string[] = [];
            for (const act of actions) {
              if (act._result) results.push(act._result);
            }
            reply = results.length > 0 ? results.join("\n\n") : (action.response || raw);
          } catch { reply = raw; }

        res.json({ reply: reply || raw });
        if (reply && reply.length > 20) await saveSharedContext(uid, "bisnis", reply.slice(0, 500));
        return;
      }
    }
  } catch (err) {
    console.error("[ai] Route error:", err);
    if (res.headersSent) {
      try { res.end(); } catch {}
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
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

// ── CHECKLIST API ──
router.get("/ai/checklist", requireRole("owner"), async (req, res) => {
  try {
    const convId = await getOrCreateConversation(req.user!.id, req.query.mode as string || "cto");
    const items = await getChecklistItems(convId);
    res.json({ items });
  } catch { res.json({ items: [] }); }
});

router.post("/ai/checklist/toggle", requireRole("owner"), async (req, res) => {
  try {
    const { itemKey, checked, text, mode } = req.body as { itemKey: string; checked: boolean; text?: string; mode?: string };
    const convId = await getOrCreateConversation(req.user!.id, mode || "cto");
    await upsertChecklistItem(convId, itemKey, text || itemKey, checked);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Gagal update checklist." }); }
});

// ── SHARED CONTEXT API (agent sync) ──
router.get("/ai/shared-context", requireRole("owner"), async (req, res) => {
  const ctx = await getSharedContext(req.user!.id, 10);
  res.json({ context: ctx });
});

export default router;
