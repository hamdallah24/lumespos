// ECP-031: AI Gateway — transport layer + Orchestrator dispatch
// No Runtime logic. All dispatch through RuntimeOrchestrator.
import { Router } from "express";
import { requireRole, requireAuth } from "../middlewares/requireAuth";
import { READ_TOOLS, DEVOPS_TOOLS, mergeDeploy, checkRateLimit, getChecklistItems, upsertChecklistItem, clearChecklistItems, saveSharedContext, getSharedContext, getOrCreateConversation, remember, clearMemory } from "./ai-helpers";
import { orchestrator } from "../ai/runtime/orchestrator";
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

// ECP-036: Emergency fallback — Kernel handles normal bootstrap in index.ts
(async () => {
  const { organizationKernel } = await import("../kernel");
  if (!organizationKernel.isReady()) {
    console.warn("[Gateway] Kernel not ready — emergency bootstrap");
    const { ceoRuntime } = await import("../ai/programs/ceo-runtime");
    orchestrator.register({
      name: "CEO", version: "1.0.0",
      capabilities: ["strategy", "delegation"],
      identity: { id: "ceo-v1", role: "CEO", authority: "full" },
      health: () => ({ status: "degraded", uptime: 0, version: "1.0.0" }),
      canHandle: () => true,
      execute: async (ctx) => {
        const result = await (ceoRuntime as any).execute({ message: ctx.message, userId: ctx.userId });
        return { success: result.success, text: result.text, runtime: "CEO", pipeline: [], metrics: { runtime: "CEO", tokensUsed: 0, toolsCalled: 0, durationMs: 0, delegated: false, verificationPassed: result.success, knowledgeWritten: false } };
      },
    });
    console.log("[Gateway] Emergency bootstrap: CEO only. Consultant, Council, Learning OFFLINE.");
  }
})();

function emitStatus(res: any, message: string) {
  res.write(`data: ${JSON.stringify({ type: "status", message })}\n\n`);
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

    // ECP-038: COO (bisnis) = JSON. All others = SSE through CEO orchestrator.
    const isSSE = m !== "bisnis";
    if (isSSE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
    }
    try {
      const result = await orchestrator.execute({
        message: clean, userId: uid, mode: m, branchId: defaultBranchId,
        onExecutionEvent: (snapshot: any) => {
          if (isSSE) res.write(`data: ${JSON.stringify({ type: "execution_update", ...snapshot })}\n\n`);
        },
        onTool: (ev: any) => {
          if (isSSE) emitToolEvent(res, "CEO", "ToolExecutor", ev.status, ev.name, ev.durationMs);
        },
        onState: (state: string) => {
          if (isSSE) emitStateEvent(res, "CEO", state);
        },
        onProgress: (msg: string) => {
          if (isSSE) emitStatus(res, msg);
        },
      });
      if (result.success && result.text) {
        // ECP-037 P3: events:[] — pipeline events streamed LIVE via onExecutionEvent SSE
        if (isSSE) { await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5 }); }
        else { res.json({ reply: result.text }); }
        await remember(uid, m, clean, result.text);
        if (result.text.length > 20) await saveSharedContext(uid, m, result.text.slice(0, 500));
      } else if (result.text) {
        if (isSSE) { await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5 }); } else { res.json({ reply: result.text }); }
      } else {
        if (isSSE) { await replayExecution({ events: [], responseText: "Runtime tidak bisa menjawab.", res, delayMs: 15, chunkSize: 5 }); }
        else { res.json({ reply: "Runtime tidak bisa menjawab." }); }
      }
    } catch (e: any) {
      console.error("[ai] Orchestrator error:", e);
      if (isSSE) { await replayExecution({ events: [], responseText: `Error: ${e.message?.slice(0, 200) || "unknown"}`, res, delayMs: 15, chunkSize: 5 }); }
      else { if (!res.headersSent) res.status(500).json({ error: "Internal server error" }); }
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
  // ECP-037 P1: Route through Mission Authority — no direct missionEngineComponent calls
  const { missionAuthority } = await import("../ai/runtime/mission-authority");
  const result = missionAuthority.submit({
    title, description: objective || title, type: "strategic",
    proposedBy: "Founder", strategicObjective: "general",
    dependencies: [], estimatedTokens: 5000, estimatedDuration: "1 sprint",
    requiredCapabilities: [],
  });
  if (!result.success) {
    res.status(400).json({ error: result.error || "Mission creation failed" });
    return;
  }
  // Auto-activate: Authority validates → activates via Mission Engine
  const activation = await missionAuthority.activate((result.data as any)?.proposal?.id, "CEO");
  res.json({ mission: (activation.data as any)?.mission, authority: result.data });
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
