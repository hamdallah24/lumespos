// ECP-018: AI Gateway — transport layer only
// No Runtime logic. No business logic. No prompt construction.
import { Router } from "express";
import { requireRole, requireAuth } from "../middlewares/requireAuth";
import { READ_TOOLS, DEVOPS_TOOLS, mergeDeploy, checkRateLimit, getChecklistItems, upsertChecklistItem, clearChecklistItems, saveSharedContext, getSharedContext, getOrCreateConversation, remember, clearMemory } from "./ai-helpers";
import { executeOperation } from "./ai-business";
import { runMigration } from "./migrate";
import { computeHealthScore, lastScore } from "../ai/runtime/health-policy";
import { registryStatus } from "../ai/runtime/registry";
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
        const { chatRuntime } = await import("../programs/chat-runtime");
        const result = await chatRuntime.execute({ message: clean, userId: uid });
        res.json({ reply: result.text || "Chat sedang sibuk, coba lagi ya bos." });
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
          emitStatus(res, "💼 CEO Runtime menganalisis...");

          const { ceoRuntime } = await import("../ai/programs/ceo-runtime");
          const result = await ceoRuntime.execute({
            message: clean,
            userId: uid,
            onProgress: (msg) => emitStatus(res, msg),
            onTool: (ev) => emitToolEvent(res, "CEO", "ToolExecutor", ev.status, ev.name, ev.durationMs),
            onState: (state) => emitStateEvent(res, "CEO", state),
          });

          if (result.success && result.text) {
            await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5 });
            await remember(uid, "ceo", clean, result.text);
            await saveSharedContext(uid, "ceo", result.text.slice(0, 500));
          } else if (result.text) {
            await fakeStream(result.text, res);
          } else {
            await fakeStream("Maaf, CEO Runtime tidak bisa memberi jawaban sekarang. Coba lagi.", res);
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

        // ECP-018: Dispatch to CTO Runtime (not inline)
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        try {
          const { ctoProgram } = await import("../ai/programs/cto-runtime");
          emitStatus(res, "⚙️ CTO Runtime menganalisis...");
          emitStateEvent(res, "CTO", "REASONING");

          const result = await ctoProgram.execute({
            message: clean, userId: uid,
            onProgress: (msg: string) => emitStatus(res, msg),
            onTool: (ev: { name: string; status: string; durationMs?: number }) => 
              emitToolEvent(res, "CTO", "ToolExecutor", ev.status as "started" | "completed", ev.name, ev.durationMs),
          });

          if (result.success && result.text) {
            await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5 });
            await remember(uid, "cto", clean, result.text);
            await saveSharedContext(uid, "cto", result.text.slice(0, 500));
          } else if (result.text) {
            await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5 });
          } else {
            await fakeStream("Maaf, CTO tidak bisa memberi jawaban sekarang. Coba lagi.", res);
          }
        } catch (e: any) {
          console.error("[ai] CTO error:", e);
          await fakeStream(`Error: ${e.message?.slice(0, 200) || "unknown"}`, res);
        }
        return;
      }

      // ── BISNIS (COO Runtime dispatch) ──
      case "bisnis":
      default: {
        try {
          const { cooRuntime } = await import("../programs/coo-runtime");
          const result = await cooRuntime.execute({ message: clean, userId: uid, branchId: defaultBranchId });
          let reply = result.text;
          if (!reply || reply.startsWith("ERROR:")) { reply = "COO sedang sibuk. Coba lagi, bos."; }
          res.json({ reply });
          if (reply && reply.length > 20) await saveSharedContext(uid, "bisnis", reply.slice(0, 500));
        } catch {
          res.json({ reply: "COO sedang sibuk. Coba lagi, bos." });
        }
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
