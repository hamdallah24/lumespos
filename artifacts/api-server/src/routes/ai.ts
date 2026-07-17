// ECP-047: AI Gateway — transport layer only. Routes call ApplicationRuntimeFacade.
// No orchestration. No runtime dispatch. No executive instantiation.
import { Router } from "express";
import { requireRole, requireAuth } from "../middlewares/requireAuth";
import { mergeDeploy, checkRateLimit, getChecklistItems, upsertChecklistItem, clearChecklistItems, saveSharedContext, getSharedContext, getOrCreateConversation, remember, clearMemory } from "./ai-helpers";
import { applicationRuntime } from "../ai/runtime/application-runtime-adapter";
import { computeHealthScore } from "../ai/runtime/health-policy";
import { registryStatus } from "../ai/runtime/registry";
import { emitToolEvent, emitStateEvent } from "../ai/runtime/execution-stream";
import { replayExecution } from "../ai/runtime/replay-engine";

const router = Router();

function emitStatus(res: any, message: string, source?: string) {
  res.write(`data: ${JSON.stringify({ type: "status", message, source })}\n\n`);
}

// ── ROUTER ──
router.post("/ai/chat", requireRole("owner"), async (req, res) => {
  try {
    const { message, mode, action, proposalId, targetRuntime } = req.body as { message?: string; mode?: string; action?: string; proposalId?: string; targetRuntime?: string };
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const user = req.user!;
    const rawClean = message.trim();
    const defaultBranchId = user.branchId || 1;
    const m = mode || "bisnis";
    const uid = user.id;

    // ── Parse @mention, targetRuntime, or multi-mention ──
    const mentionMatches = [...rawClean.matchAll(/@(CEO|CTO|CFO|COO|CMO|CHRO|CAIO)\b/gi)];
    const allMentions = mentionMatches.map(m => m[1].toUpperCase());
    const uniqueMentions = [...new Set(allMentions)];
    const resolvedTarget = targetRuntime || (uniqueMentions.length === 1 ? uniqueMentions[0] : null);
    const isMultiMention = uniqueMentions.length >= 2 && !targetRuntime;
    const clean = mentionMatches.length > 0
      ? rawClean.replace(/@(CEO|CTO|CFO|COO|CMO|CHRO|CAIO)\b/gi, '').trim()
      : rawClean;

    // Rate limit
    const maxReqs = m === "cto" ? 30 : (m === "vps" ? 30 : 20);
    const rl = await checkRateLimit(uid, m, maxReqs);
    if (!rl.ok) {
      res.status(429).json({ error: `Terlalu banyak permintaan. Coba lagi ${rl.retryAfter} detik lagi.` });
      return;
    }

    // SSE = streaming for all modes except "bisnis"
    const isSSE = m !== "bisnis";
    if (isSSE) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
    }

    // Helper: send result back via SSE or JSON
    async function sendResult(result: { success: boolean; text: string; runtime: string }, isFromCEO: boolean) {
      if (result.success && result.text) {
        if (isSSE) {
          // CEO-specific: mission creation subscription
          if (isFromCEO) {
            const dbMatch = result.text.match(/DB#(\d+)/);
            if (dbMatch) {
              const missionId = parseInt(dbMatch[1]);
              res.write(`data: ${JSON.stringify({ type: "meta", sender: "CEO" })}\n\n`);
              for (let i = 0; i < result.text.length; i += 5) {
                res.write(`data: ${JSON.stringify({ type: "token", token: result.text.slice(i, i + 5) })}\n\n`);
              }
              emitStatus(res, "⏳ Menunggu hasil CTO...");
              const { aiMissionService } = await import("../services/ai-mission-service");
              let missionDone = false;
              const unsub = aiMissionService.subscribe(missionId, (ev) => {
                if (ev.type === "completed" && !missionDone) {
                  missionDone = true; unsub();
                  const data = ev.data as any;
                  const fullResult = data.result || "";
                  emitStatus(res, "✅ Misi selesai — hasil CTO:", "CTO");
                  res.write(`data: ${JSON.stringify({ type: "meta", sender: "CTO" })}\n\n`);
                  for (let i = 0; i < Math.min(fullResult.length, 4000); i += 5) {
                    res.write(`data: ${JSON.stringify({ type: "token", token: fullResult.slice(i, i + 5) })}\n\n`);
                  }
                  res.write(`data: ${JSON.stringify({ type: "done", finalText: `✅ **Misi #${missionId} Selesai**\n\n${fullResult.slice(0, 4000)}`, sender: "CTO" })}\n\n`);
                  try { res.end(); } catch {}
                }
              });
              setTimeout(() => { if (!missionDone) { unsub(); try { res.end(); } catch {} } }, 600000).unref();
              return true; // handled
            }
          }
          await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5, runtime: result.runtime });
        } else {
          res.json({ reply: result.text });
        }
        return false;
      }
      if (result.text) {
        if (isSSE) { await replayExecution({ events: [], responseText: result.text, res, delayMs: 15, chunkSize: 5, runtime: result.runtime }); }
        else { res.json({ reply: result.text }); }
      } else {
        if (isSSE) { await replayExecution({ events: [], responseText: "Runtime tidak bisa menjawab.", res, delayMs: 15, chunkSize: 5, runtime: result.runtime }); }
        else { res.json({ reply: "Runtime tidak bisa menjawab." }); }
      }
      return false;
    }

    try {
      // ── MULTI-MENTION PATH ──
      if (isMultiMention) {
        const validTargets = uniqueMentions.filter(t => applicationRuntime.getExecutive(t));
        if (validTargets.length === 0) {
          const fallback = await applicationRuntime.executeMessage({
            message: clean, userId: uid, mode: m, branchId: defaultBranchId,
            onExecutionEvent: (snapshot: any) => { if (isSSE) res.write(`data: ${JSON.stringify({ type: "execution_update", ...snapshot })}\n\n`); },
            onTool: (ev: any) => { if (isSSE) emitToolEvent(res, "CEO", "ToolExecutor", ev.status, ev.name, ev.durationMs); },
            onState: (state: string) => { if (isSSE) emitStateEvent(res, "CEO", state); },
            onProgress: (msg: string) => { if (isSSE) emitStatus(res, msg); },
          });
          await sendResult(fallback, true);
          if (fallback.text?.length > 20) await saveSharedContext(uid, m, fallback.text.slice(0, 500));
        } else {
          const results = await applicationRuntime.executeForTargets(validTargets, {
            message: clean, userId: uid, mode: m, branchId: defaultBranchId,
          });
          if (isSSE) {
            for (const target of validTargets) {
              const r = results.get(target);
              const txt = r?.text || `_${target}: Gagal memproses_`;
              res.write(`data: ${JSON.stringify({ type: "meta", sender: target })}\n\n`);
              res.write(`data: ${JSON.stringify({ type: "done", finalText: txt, sender: target })}\n\n`);
            }
            try { res.end(); } catch {}
          } else {
            const parts = validTargets.map(t => {
              const r = results.get(t);
              if (r?.success && r.text) return `> **${t}** — ${r.text}`;
              return `> **${t}** — _Gagal memproses_`;
            });
            res.json({ reply: parts.join("\n\n---\n\n") });
          }
          await remember(uid, m, rawClean, validTargets.map(t => {
            const r = results.get(t);
            return r?.text ? `[${t}] ${r.text}` : `[${t}] Error`;
          }).join("\n"));
        }
      } else {
        let result = { success: false, text: "", runtime: "" };
        let isFromCEO = false;

        if (resolvedTarget) {
          result = await applicationRuntime.executeMessage({
            message: clean, userId: uid, mode: m, branchId: defaultBranchId,
            target: resolvedTarget,
            onProgress: (msg: string) => { if (isSSE) emitStatus(res, msg); },
            onTool: (ev: any) => { if (isSSE) emitToolEvent(res, resolvedTarget, "ToolExecutor", ev.status, ev.name, ev.durationMs); },
            onState: (state: string) => { if (isSSE) emitStateEvent(res, resolvedTarget, state); },
            onExecutionEvent: (snapshot: any) => { if (isSSE) res.write(`data: ${JSON.stringify({ type: "execution_update", ...snapshot })}\n\n`); },
          });
          isFromCEO = resolvedTarget === "CEO";
        } else {
          result = await applicationRuntime.executeMessage({
            message: clean, userId: uid, mode: m, branchId: defaultBranchId,
            onExecutionEvent: (snapshot: any) => { if (isSSE) res.write(`data: ${JSON.stringify({ type: "execution_update", ...snapshot })}\n\n`); },
            onTool: (ev: any) => { if (isSSE) emitToolEvent(res, "CEO", "ToolExecutor", ev.status, ev.name, ev.durationMs); },
            onState: (state: string) => { if (isSSE) emitStateEvent(res, "CEO", state); },
            onProgress: (msg: string) => { if (isSSE) emitStatus(res, msg); },
          });
          isFromCEO = true;
        }

        const missionHandled = await sendResult(result, isFromCEO);
        if (!missionHandled) {
          await remember(uid, m, rawClean, `{SENDER:${result.runtime}}${result.text}`);
          if (result.text?.length > 20) await saveSharedContext(uid, m, result.text.slice(0, 500));
        }
      }
    } catch (e: any) {
      console.error("[ai] Execution error:", e);
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
router.get("/ai/agents", requireAuth, async (_req, res) => {
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

// ── ERROR LOGS (for CTO debugging) — also saved to /tmp/pos-error.log for CTO readFile access
router.get("/ai/logs", requireRole("owner"), async (_req, res) => {
  const { execSync } = await import("child_process");
  const { writeFileSync } = await import("fs");
  try {
    const raw = execSync("pm2 logs pos-api --lines 80 --nostream 2>&1", { timeout: 5000 }).toString();
    const lines = raw.split("\n").filter(l =>
      /error|fail|warn|exception|timeout|CRITICAL|violation|reject|denied|EROR/i.test(l)
    ).slice(-40);
    const output = { logs: lines, total: lines.length, timestamp: new Date().toISOString() };
    // Save raw logs to temp file for CTO readFile access
    writeFileSync("/tmp/pos-error.log", raw, "utf-8");
    res.json(output);
  } catch (e: any) {
    const errMsg = `Failed to fetch logs: ${e.message}`;
    writeFileSync("/tmp/pos-error.log", errMsg, "utf-8");
    res.json({ logs: [errMsg], total: 1, timestamp: new Date().toISOString() });
  }
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

// SSE global: semua mission events (auto-notifikasi saat mission selesai)
router.get("/ai/mission/events", requireAuth, async (req, res) => {
  const { aiMissionService } = await import("../services/ai-mission-service");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  let aborted = false;
  req.on("close", () => { aborted = true; });
  const unsub = aiMissionService.subscribeAll((ev) => {
    if (aborted) { unsub(); return; }
    res.write(`data: ${JSON.stringify({ type: ev.type, missionId: ev.missionId, data: ev.data })}\n\n`);
  });
});

// Misi aktif milik user
router.get("/ai/missions/active", requireAuth, async (req, res) => {
  const { aiMissionService } = await import("../services/ai-mission-service");
  const missions = await aiMissionService.listActive(req.user!.id);
  res.json({ missions });
});

// SSE stream untuk misi background — replay snapshot + live update
router.get("/ai/mission/:id/stream", requireAuth, async (req, res) => {
  const { aiMissionService } = await import("../services/ai-mission-service");
  const missionId = parseInt(req.params.id);
  if (isNaN(missionId)) { res.status(400).json({ error: "Invalid mission ID" }); return; }

  const mission = await aiMissionService.getById(missionId);
  if (!mission) { res.status(404).json({ error: "Mission not found" }); return; }
  if (mission.userId !== req.user!.id) { res.status(403).json({ error: "Forbidden" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let aborted = false;
  req.on("close", () => { aborted = true; });

  // Replay snapshot history
  const snapshots = await aiMissionService.getSnapshots(missionId);
  for (const s of snapshots) {
    if (aborted) return;
    res.write(`data: ${JSON.stringify({ type: "snapshot", ...s })}\n\n`);
  }

  // Kirim status terakhir
  res.write(`data: ${JSON.stringify({ type: "mission", id: mission.id, status: mission.status, progress: mission.progress, strategy: mission.strategy, result: mission.result, error: mission.error })}\n\n`);

  // Kalau sudah selesai, stop
  if (mission.status === "completed" || mission.status === "failed" || mission.status === "cancelled") {
    res.end(); return;
  }

  // Live subscribe
  const unsub = aiMissionService.subscribe(missionId, (ev) => {
    if (aborted) { unsub(); return; }
    res.write(`data: ${JSON.stringify({ type: ev.type, ...ev.data })}\n\n`);
    if (ev.type === "completed" || ev.type === "error") { unsub(); res.end(); }
  });
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
  const proposalId = (result.data as any)?.proposal?.id;
  if (!proposalId) { res.status(400).json({ error: "No proposal created" }); return; }
  const activation = await missionAuthority.activate(proposalId, "CEO", {
    missionType: "analysis",
    userId: req.user!.id,
    userMessage: objective || title,
  });
  if (!activation.success) { res.status(400).json({ error: activation.error || "Activation failed", authority: result.data }); return; }
  res.json({ mission: (activation.data as any)?.mission, authority: result.data });
});

// Auth required for org data
router.get("/ai/org-public", requireAuth, async (_req, res) => {
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
