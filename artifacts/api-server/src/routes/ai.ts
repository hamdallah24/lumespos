// ─────────────────────────────────────────────────────────────
// AI ROUTER — Smart Backend: Bisnis / Chat / CTO / VPS
// ─────────────────────────────────────────────────────────────
import { Router } from "express";
import { requireRole, requireAuth } from "../middlewares/requireAuth";
import { callDeepSeek, callDeepSeekWithTools, executeToolCall, fetchGitHubFile, readLocalFile, listLocalDir, searchLocalContent, sshExec, getHistory, remember, clearMemory, searchRepoFiles, READ_TOOLS, DEVOPS_TOOLS, ToolDef, mergeDeploy, getDependencies, checkRateLimit, getChecklistItems, upsertChecklistItem, clearChecklistItems, saveSharedContext, getSharedContext, getOrCreateConversation } from "./ai-helpers";
import { executeOperation } from "./ai-business";
import { BANG_ORCHESTRATOR, CHAT_SYSTEM, COO_SYSTEM } from "./ai-prompts";
import { runMigration } from "./migrate";
import { computeHealthScore, lastScore } from "../ai/runtime/health-policy";
import { registryStatus } from "../ai/runtime/registry";
import { understand } from "../ai/runtime/semantic-engine";
import { buildSpecV1 } from "../ai/runtime/execution-spec";
import { verify } from "../ai/runtime/verification-engine";
import { augmentWithMemory } from "../ai/runtime/semantic-memory";
import { emitToolEvent, emitStateEvent, emitRuntimeEvent } from "../ai/runtime/execution-stream";
import { replayExecution } from "../ai/runtime/replay-engine";
import { RuntimeImportance, RuntimeEventType } from "../ai/runtime/runtime-event";
import { db, ingredientsTable, semiFinishedTable, productsTable, usersTable, shiftAuditsTable, currentInventoryTable, orderItemsTable, ordersTable, branchesTable } from "@workspace/db";
import { eq, and, gte, sum, desc, sql } from "drizzle-orm";

const router = Router();

// Tool labels for status bar
const toolLabels: Record<string, string> = {
  searchContent:  "🔎 Mencari di codebase...",
  readFile:       "📄 Membaca file...",
  fetchGitHubFile:"📂 Mengambil dari GitHub...",
  fetchGitHubDir: "📁 List folder GitHub...",
  listDirectory:  "📁 Melihat struktur folder...",
  getDependencies:"🔗 Cek dependency...",
  execCommand:    "⚙️  Menjalankan perintah...",
  sshExec:        "🖥️  SSH ke VPS...",
};

function emitStatus(res: any, message: string) {
  res.write(`data: ${JSON.stringify({ type: "status", message })}\n\n`);
}

// Fake stream — typed events: status → delta → done
async function fakeStream(finalText: string, res: any) {
  const CHUNK_SIZE = 4;
  const DELAY_MS = 15;
  for (let i = 0; i < finalText.length; i += CHUNK_SIZE) {
    const chunk = finalText.slice(i, i + CHUNK_SIZE);
    res.write(`data: ${JSON.stringify({ type: "delta", delta: chunk })}\n\n`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  res.write(`data: ${JSON.stringify({ type: "done", finalText })}\n\n`);
  res.end();
}

// ── ROUTER ──
router.post("/ai/chat", requireRole("owner"), async (req, res) => {
  try {
    const { message, mode, action, proposalId } = req.body as { message?: string; mode?: string; action?: string; proposalId?: string };
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
    const maxReqs = m === "cto" ? 30 : (m === "vps" ? 30 : 20);
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

      // ── CEO ──
      case "ceo": {
        // Set SSE headers FIRST — nginx needs response within 60s
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        try {
          emitStatus(res, "💼 CEO menganalisis permintaan...");
          
          const augmentedMessage = augmentWithMemory(clean);
          const contract = await understand(augmentedMessage);
          const spec = buildSpecV1(contract);
          const verification = verify(spec);

          if (!verification.passed) {
            await fakeStream(`❌ ${verification.stopReason}`, res);
            return;
          }

          // Route to CTO via Organization Runtime
          const { organizationEngine } = await import("../ai/runtime/organization-engine");
          const delegation = organizationEngine.delegate(clean);
          emitStatus(res, delegation ? `➡️ Didelegasikan ke ${delegation.runtime}` : "⚙️ Memproses langsung...");
          if (delegation) emitRuntimeEvent(res, "CEO", RuntimeEventType.DELEGATED, { to: delegation.runtime, reason: delegation.reason });

          const finalText = await callDeepSeekWithTools(
            BANG_ORCHESTRATOR, clean, uid, "ceo", READ_TOOLS, 3000,
            (msg) => emitStatus(res, msg)
          );

          if (finalText && !finalText.startsWith("ERROR:")) {
            const ceoResponse = `## Executive Report\n\n${finalText}\n\n> — CEO Runtime · ${delegation ? `Didelegasikan ke ${delegation.runtime}` : "Direct"}`;
            emitStatus(res, "📋 Menyusun Executive Report...");
            await replayExecution({ events: [], responseText: ceoResponse, res, delayMs: 15, chunkSize: 5 });
            await remember(uid, "ceo", clean, ceoResponse);
            await saveSharedContext(uid, "ceo", ceoResponse.slice(0, 500));
          } else if (finalText.startsWith("ERROR:")) {
            await fakeStream(`Maaf, terjadi kesalahan: ${finalText.slice(6)}`, res);
          } else {
            await fakeStream("Maaf, CEO tidak bisa memberi jawaban sekarang. Coba lagi.", res);
          }
        } catch (e: any) {
          console.error("[ai] CEO error:", e);
          await fakeStream(`Error: ${e.message?.slice(0, 200) || "unknown"}`, res);
        }
        return;
      }

      // ── CTO ──
      case "cto": {
        // Phase 2: Proposal Execution — contract-driven, replaces generateNow
        if (action === "approve_proposal" && proposalId) {
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
            sse("start", "🔧 Menjalankan proposal melalui CTO Runtime...");
            const { executeApprovedProposal } = await import("../ai/programs/proposal-executor");
            const result = await executeApprovedProposal(proposalId, (msg) => {
              if (!aborted) res.write(`data: ${JSON.stringify({ type: "status", message: msg })}\n\n`);
            });

            if (!aborted) {
              if (result.success) {
                sse("final", `✅ Proposal ${proposalId} berhasil dijalankan.\n${result.text}`);
              } else {
                sse("final", `❌ Gagal menjalankan proposal: ${result.text}`);
              }
              res.end();
            }
          } catch (e: any) {
            console.error("[ai] Proposal execution error:", e);
            if (!aborted) {
              sse("final", `❌ Gagal: ${(e?.message || String(e)).slice(0, 200)}`);
              res.end();
            }
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

        // Sprint 10: Semantic Memory → Semantic Engine → ExecutionSpecV1 → Verification
        const augmentedMessage = augmentWithMemory(clean);
        const contract = await understand(augmentedMessage);
        const spec = buildSpecV1(contract);
        const verification = verify(spec);

        if (!verification.passed) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.flushHeaders();
          await fakeStream(`❌ ${verification.stopReason}`, res);
          return;
        }

        // Apply policy controls from spec
        if (!spec.runtimePolicy.manifest) bangContext = clean;
        const sharedCtx = spec.runtimePolicy.sharedContext ? await getSharedContext(uid) : "";
        const fullCtx = bangContext + (sharedCtx ? `\n\n--- KONTEKS DARI AGENT LAIN ---\n${sharedCtx}` : "");
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        try {
          const isDevOps = spec.requiredTools.some(t => t === "execCommand" || t === "sshExec");
          const toolSet = isDevOps ? DEVOPS_TOOLS
            : spec.intent === "greeting" ? [] : READ_TOOLS;

          emitStatus(res, spec.intent === "greeting" ? "💡 Memproses..."
            : isDevOps ? "🖥️ Mode DevOps..."
            : "⚙️ Menganalisis permintaan...");

          emitStateEvent(res, "CTO", "REASONING");
          const finalText = await callDeepSeekWithTools(
            BANG_ORCHESTRATOR, fullCtx, uid, "cto", toolSet, 3000,
            (msg) => emitStatus(res, msg),
            (ev) => emitToolEvent(res, "CTO", "ToolExecutor", ev.status, ev.name, ev.durationMs),
          );
          const isError = finalText.startsWith("ERROR:");
          // L4: Evidence — what reached fakeStream
          console.log(`[Telemetry L4] STREAMING | length:${finalText.length} | isError:${isError} | isEmpty:${!finalText} | preview:${finalText.slice(0, 120)}`);
          if (isError) {
            await fakeStream(`Maaf, terjadi kesalahan: ${finalText.slice(6)}`, res);
          } else if (finalText) {
            emitStatus(res, "✅ Menyusun jawaban...");
            // ECP-015 Phase 4: Execution Replay replaces fakeStream
            await replayExecution({ events: [], responseText: finalText, res, delayMs: 15, chunkSize: 5 });
            await remember(uid, "cto", clean, finalText);
            await saveSharedContext(uid, "cto", finalText.slice(0, 500));
          } else {
            await fakeStream("Maaf, BANG tidak bisa memberi jawaban sekarang. Coba lagi.", res);
          }
        } catch (e: any) {
          console.error("[ai] CTO error:", e);
          await fakeStream(`Error: Tool calling gagal — ${e.message?.slice(0, 200) || "unknown"}`, res);
        }
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

// ── HEALTH API (Sprint 4) ──
router.get("/ai/health", requireRole("owner"), async (_req, res) => {
  const score = await computeHealthScore();
  res.json({
    score: score.total,
    status: score.total >= 90 ? "healthy" : score.total >= 70 ? "degraded" : "unhealthy",
    components: score.components,
    registry: registryStatus(),
    timestamp: score.timestamp,
  });
});

// ── PRODUCTION READINESS (Sprint 10) ──
// Public: no-auth readiness check for monitoring
router.get("/ai/readiness-public", async (_req, res) => {
  const { runAll } = await import("../ai/runtime/production-readiness");
  const result = runAll();
  res.json({
    ready: result.ready,
    passed: result.passed,
    failed: result.failed,
    total: result.total,
    details: result.suites.map(s => ({
      suite: s.suite,
      passed: s.passed,
      failed: s.failed,
      failures: s.results.filter(r => !r.passed).map(r => ({ name: r.name, detail: r.detail })),
    })),
  });
});

// ── AGENT REGISTRY (Sprint 10.5) ──
// Returns registered agents with capabilities, health, dependencies
router.get("/ai/agents", async (_req, res) => {
  const { list, health } = await import("../ai/runtime/registry");
  const componentList = list();
  const healthData = health();

  const agents = componentList.map(c => ({
    name: c.name,
    version: c.version,
    health: healthData[c.name] || { status: "unknown" },
  }));

  res.json({ agents, total: agents.length });
});

// Owner-only: full test suite with component details
router.get("/ai/readiness", requireRole("owner"), async (_req, res) => {
  const { runAll } = await import("../ai/runtime/production-readiness");
  const result = runAll();
  res.json({
    ready: result.ready,
    status: result.ready ? "CTO Agent v1.0 — READY FOR PRODUCTION" : "NOT READY",
    suites: result.suites.map(s => ({
      name: s.suite,
      passed: s.passed,
      failed: s.failed,
      results: s.results.map(r => ({ name: r.name, passed: r.passed, detail: r.detail })),
    })),
    summary: { passed: result.passed, failed: result.failed, total: result.total },
  });
});

// Public: lightweight readiness check for monitoring (no auth required)
router.get("/ai/readiness-public", async (_req, res) => {
  const { runAll } = await import("../ai/runtime/production-readiness");
  const result = runAll();
  res.json({
    ready: result.ready,
    passed: result.passed,
    failed: result.failed,
    total: result.total,
    details: result.suites.map(s => ({
      suite: s.suite,
      passed: s.passed,
      failed: s.failed,
      failures: s.results.filter(r => !r.passed).map(r => ({ name: r.name, detail: r.detail })),
    })),
  });
});

// ── ENGINEERING OS CERTIFICATION (Sprint 16.5) ──
router.get("/ai/certify", requireRole("owner"), async (_req, res) => {
  const { engineeringCertification } = await import("../ai/runtime/engineering-certification");
  const cert = await engineeringCertification.run();
  res.json(cert);
});

// ── HISTORY API (Sprint B) ──
router.get("/ai/history", requireAuth, async (req, res) => {
  const mode = (req.query.mode as string) || "cto";
  const { getHistory } = await import("./ai-helpers");
  const history = await getHistory(req.user!.id, mode);
  res.json({ messages: history.map(h => ({ role: h.role, content: h.content })) });
});

// ── EXECUTIVE WORKSPACE API (Phase II Wave 3) ──
router.get("/ai/org", requireRole("owner"), async (_req, res) => {
  const { organizationEngine } = await import("../ai/runtime/organization-engine");
  const tree = organizationEngine.getTree();
  const health = organizationEngine.healthReport();
  res.json({ tree, health });
});

router.get("/ai/missions", requireRole("owner"), async (_req, res) => {
  const { missionEngineComponent } = await import("../ai/runtime/mission-engine");
  const active = missionEngineComponent.active();
  const report = missionEngineComponent.report();
  res.json({ active, report });
});

router.post("/ai/mission", requireRole("owner"), async (req, res) => {
  const { title, objective, domains, priority } = req.body as { title: string; objective: string; domains: string[]; priority?: string };
  if (!title || !domains) { res.status(400).json({ error: "title and domains required" }); return; }
  const { missionEngineComponent } = await import("../ai/runtime/mission-engine");
  const mission = missionEngineComponent.create(title, objective, domains, priority as any);
  const report = missionEngineComponent.delegate(mission.id);
  res.json({ mission: report?.mission, delegation: report?.orgDelegation });
});

// Public: no-auth for dashboard display
router.get("/ai/org-public", async (_req, res) => {
  const { organizationEngine } = await import("../ai/runtime/organization-engine");
  const tree = organizationEngine.getTree();
  const health = organizationEngine.healthReport();
  res.json({ tree: tree.map(n => ({ runtime: n.runtime, unit: n.unit, level: n.level, health: n.health, maturity: n.maturity })), health });
});

// ── SHARED CONTEXT API (agent sync) ──
router.get("/ai/shared-context", requireRole("owner"), async (req, res) => {
  const ctx = await getSharedContext(req.user!.id, 10);
  res.json({ context: ctx });
});

export default router;
