// Phase II Wave 4: Mission Engine — background mission processor
// Polls active missions, advances state, routes to Runtimes.
// Auto-starts on server boot.
// Extended: executes CTO program for analysis/implementation missions.

import { missionRuntime } from "./mission-engine";
import { organizationEngine } from "./organization-engine";
import { getRuntimeGateway } from "./RuntimeGateway";
import { aiMissionService } from "../../services/ai-mission-service";
import { db, missionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { knowledgeBackbone } from "../../knowledge/KnowledgeBackbone";

/** Cek apakah output CTO layak — tolak yg cuma error/empty/meta */
function isQualityOutput(text: string): { ok: boolean; reason: string } {
  if (!text || text.length < 300) return { ok: false, reason: "Output terlalu pendek (<300 chars)" };
  const lower = text.toLowerCase();
  const notFound = ["tidak ditemukan", "not found", "0 hasil", "tidak ada file", "no files found"];
  if (notFound.some(p => lower.includes(p)) && !/[`'\"][\w./]+[`'\"]/.test(text)) {
    return { ok: false, reason: "Output cuma berisi 'file tidak ditemukan' tanpa analisis" };
  }
  // Tolak output yg cuma meta — ngomongin proses bukan konten
  const metaLines = text.split("\n").filter(l => /saya telah|berdasarkan hasil|setelah membaca|saya menggunakan|saya mencari/i.test(l));
  if (metaLines.length > text.split("\n").length * 0.5) {
    return { ok: false, reason: "Output didominasi deskripsi proses, bukan analisis" };
  }
  return { ok: true, reason: "" };
}

interface EngineConfig {
  intervalMs: number;     // How often to poll
  maxConcurrent: number;  // Max missions processed per tick
}

const DEFAULT_CONFIG: EngineConfig = {
  intervalMs: 5000,   // 5 detik — responsif
  maxConcurrent: 3,
};

const _stats = {
  totalProcessed: 0,
  totalCompleted: 0,
  totalFailed: 0,
  totalDelegated: 0,
  lastTick: "",
};

class MissionEngine {
  private config: EngineConfig;
  private ticker: NodeJS.Timeout | null = null;
  private running = false;
  private processing = new Set<string>();

  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
  }

  /** Start the engine */
  start(): void {
    if (this.running) return;
    this.running = true;

    console.log(`[MissionEngine] Starting — polling every ${this.config.intervalMs / 1000}s, max ${this.config.maxConcurrent}/tick`);

    // Initial tick (async)
    this.tick().catch(e => console.error("[MissionEngine] Initial tick error:", e));

    // Periodic ticks
    this.ticker = setInterval(() => this.tick().catch(e => console.error("[MissionEngine] Tick error:", e)), this.config.intervalMs);
  }

  /** Stop the engine */
  stop(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.running = false;
    console.log("[MissionEngine] Stopped");
  }

  /** Process one tick — advance active missions */
  private async tick(): Promise<void> {
    const active = missionRuntime.active();
    if (active.length === 0) return;

    const toProcess = active.slice(0, this.config.maxConcurrent);
    let delegated = 0, completed = 0, failed = 0;

    for (const mission of toProcess) {
      if (this.processing.has(mission.id)) continue; // Skip — sedang diproses
      this.processing.add(mission.id);
      try {
        const result = await this.processMission(mission.id);
        if (result === "delegated") delegated++;
        if (result === "completed") completed++;
        if (result === "failed") failed++;
      } catch (e: any) {
        console.error(`[MissionEngine] Error processing ${mission.id}:`, e.message, e.stack?.split("\n")[1] || "");
      } finally {
        this.processing.delete(mission.id);
      }
    }

    _stats.totalProcessed += toProcess.length;
    _stats.totalDelegated += delegated;
    _stats.totalCompleted += completed;
    _stats.totalFailed += failed;
    _stats.lastTick = new Date().toISOString();

    if (delegated > 0 || completed > 0) {
      console.log(`[MissionEngine] Tick: ${toProcess.length} processed — ${delegated} delegated, ${completed} completed, ${failed} failed`);
    }
  }

  /** Trigger tick immediately — panggil setelah mission dibuat */
  triggerTick(): void {
    this.tick().catch(e => console.error("[MissionEngine] Trigger tick error:", e));
  }

  /** Execute CTO program for analysis/implementation missions */
  private async executeCTOMission(mission: any): Promise<"completed" | "failed"> {
    if (!mission.userId) return "failed";
    console.log(`[PIPELINE:BGE] executeCTOMission start — id=${mission.id} dbId=${mission.dbMissionId} type=${mission.missionType} ckoTargets=${mission.ckoTargets?.targetFiles?.length ?? 0} files`);
    // Hanya transisi ke RUNNING kalo belum RUNNING — cegah invalid transition
    if (mission.status !== "RUNNING") {
      missionRuntime.transition(mission.id, "RUNNING");
    }

    try {
      const { remember } = await import("../../services/ai-memory-service");
      // Sync DB ke RUNNING
      if (mission.dbMissionId) {
        await aiMissionService.transition(mission.dbMissionId, "RUNNING");
      }
      // Pass CKO targets to CTO via enriched message
      const enrichedMessage = (mission.ckoTargets?.targetFiles?.length ?? 0) > 0
        ? `${mission.userMessage || mission.title}\n\n📌 TARGET ANALISIS DARI CKO: ${mission.ckoTargets.targetFiles.join(", ")}\n${mission.ckoTargets.businessContext || ""}`
        : (mission.userMessage || mission.title);
      const result = await getRuntimeGateway().assemble({
        target: "CTO",
        message: enrichedMessage,
        userId: mission.userId,
        onProgress: (msg) => { /* bisa ditambahkan snapshot */ },
        onExecutionEvent: async (snapshot: any) => {
          if (mission.dbMissionId && snapshot?.progress?.overall !== undefined) {
            await aiMissionService.saveSnapshot(mission.dbMissionId, snapshot.metrics?.cyclesExecuted || 0, {
              strategy: snapshot.strategy, stage: snapshot.stage, progress: snapshot.progress.overall,
              currentGoal: snapshot.currentGoal?.label, metrics: snapshot.metrics,
            });
          }
        },
      });

      // ── REAL REVIEW: verifikasi tool usage + output quality ──
      let errMsg = "";
      if ((result.text || "").trim().length < 300) {
        const short = (result.text || "").trim();
        if (!short) errMsg = "CTO gagal menjalankan analisis (output kosong)";
        else errMsg = `CTO output terlalu pendek (${short.length} chars)`;
      } else if (result.toolsUsed === 0) {
        errMsg = "CTO tidak menggunakan tools — output tanpa data dari file";
      } else if (!result.filesRead || result.filesRead.length === 0) {
        errMsg = "CTO tidak membaca file apapun";
      } else {
        const quality = isQualityOutput(result.text);
        if (!quality.ok) {
          errMsg = quality.reason;
        }
      }

      // QA: log detail hasil CTO untuk root cause analysis
      console.log(`[QA-CTO] mission=${mission.id} success=${result.success} toolsUsed=${result.toolsUsed} filesRead=${result.filesRead?.length} textLen=${(result.text||"").length} dbId=${mission.dbMissionId} errMsg="${errMsg}"`);
      console.log(`[QA-CTO] textPreview: ${(result.text||"").slice(0, 200)}`);

      if (errMsg) {
        missionRuntime.transition(mission.id, "FAILED");
        if (mission.dbMissionId) {
          await db.update(missionsTable).set({ status: "FAILED", result: `REJECT: ${errMsg}`, updatedAt: new Date(), completedAt: new Date() }).where(eq(missionsTable.id, mission.dbMissionId));
          aiMissionService.notifyCompleted(mission.dbMissionId, "", `❌ ${errMsg}`);
          await remember(mission.userId, "ceo", mission.userMessage,
            `❌ **Misi #${mission.dbMissionId || mission.id} Gagal**: ${errMsg}. Coba perjelas file atau folder targetnya.`);
        }
        return "failed";
      }

      // ── CEO REVIEW: forward CTO output with executive memory context ──
      console.log(`[PIPELINE:BGE] CEO review — forwarding CTO result for mission=${mission.id}`);
      try {
        // Save current CTO result into CEO's executive memory for historical context
        const findings = (result.text || "").split("\n").filter(l => l.startsWith("##") || l.startsWith("-")).slice(0, 10);
        knowledgeBackbone.updateMemory("CEO", {
          objective: mission.objective || "analysis",
          currentFindings: findings.length > 0 ? findings : [(result.text || "").slice(0, 200)],
          completedTasks: [`Mission #${mission.dbMissionId}: ${(result.text || "").length} chars CTO output`],
          confidence: Math.min(Math.floor((result.text || "").length / 100), 95),
        });

        // Build memory prompt so CEO knows past decisions & findings
        const ceoMemory = knowledgeBackbone.summarizeMemory("CEO");

        let ceoPrompt = result.text || "";
        ceoPrompt = ceoPrompt.replace(/##\s*CYCLE\s+\d+\s*[-–—]\s*\w+/gi, "").trim();
        ceoPrompt = ceoPrompt.slice(0, 2500);

        const memoryContext = ceoMemory ? `\n\n## Konteks Eksekusi Sebelumnya\n${ceoMemory}` : "";
        const ceoFeedback = await getRuntimeGateway().assemble({
          target: "CEO",
          message: `[CEO APPROVAL] CTO telah selesai menganalisis. Berikut hasilnya:\n\n${ceoPrompt}${memoryContext}\n\nSetujui hasil ini untuk dikirim ke Founder? Balas dengan SETUJUI jika kualitas memadai.`,
          userId: mission.userId || 1,
          onProgress: () => {},
        });
        const lower = ceoFeedback.text.toLowerCase();
        const approved = lower.includes("setujui") || lower.includes("approve") || lower.includes("setuju") || lower.includes("approved") || lower.includes("ya");
        console.log(`[PIPELINE:BGE] CEO review result — approved=${approved}`);
        // Save approval decision to executive memory
        const prevCompleted = knowledgeBackbone.getMemory("CEO").completedTasks;
        knowledgeBackbone.updateMemory("CEO", {
          completedTasks: [
            ...prevCompleted,
            `Mission #${mission.dbMissionId || mission.id}: ${approved ? "APPROVED" : "REJECTED"} — ${(result.text || "").length} chars`,
          ],
        });
        if (!approved) {
          missionRuntime.transition(mission.id, "FAILED");
          if (mission.dbMissionId) {
            await db.update(missionsTable).set({ status: "FAILED", result: "REJECT: CEO menolak hasil analisis CTO", updatedAt: new Date(), completedAt: new Date() }).where(eq(missionsTable.id, mission.dbMissionId));
            aiMissionService.notifyCompleted(mission.dbMissionId, "", "❌ CEO menolak hasil analisis CTO");
            await remember(mission.userId, "ceo", mission.userMessage,
              `❌ **Misi #${mission.dbMissionId || mission.id} Ditolak CEO**: Hasil analisis CTO tidak memenuhi standar.`);
          }
          return "failed";
        }
      } catch (e: any) {
        console.log(`[PIPELINE:BGE] CEO review error — falling through: ${e.message}`);
        // Fall through — approve anyway if CEO review fails
      }

      // ── REVIEW LULUS → approve ──
      missionRuntime.transition(mission.id, "REVIEW");
      missionRuntime.approve(mission.id);
      const fullText = result.text.slice(0, 12000);
      const preview = result.text.slice(0, 500);

      // CEO: generate simple-language summary for founder
      let ceoSummary = "";
      try {
        const ceoExplain = await getRuntimeGateway().assemble({
          target: "CEO",
          message: `[CEO EXPLAIN] CTO baru saja selesai menganalisis. Berikut hasil analisis teknisnya:\n\n${result.text.slice(0, 3000)}\n\nTugasmu: jelaskan hasil ini ke Founder (pemilik toko) dalam BAHASA INDONESIA SEDERHANA. Founder bukan programmer. Jelaskan:\n1. Apa yang ditemukan? (dengan analogi sederhana)\n2. Apa dampaknya ke bisnis?\n3. Apa rekomendasi selanjutnya?\n\nGunakan bahasa sehari-hari, hindari istilah teknis. Maksimal 3 paragraf.`,
          userId: mission.userId || 1,
          onProgress: () => {},
        });
        if (ceoExplain.success && ceoExplain.text) {
          ceoSummary = ceoExplain.text.slice(0, 2000);
        }
      } catch {
        // Fallback — tetap pakai teks CTO
      }

      const founderMessage = ceoSummary
        ? `✅ **Misi #${mission.dbMissionId || mission.id} Selesai**\n\n${ceoSummary}`
        : `✅ **Misi #${mission.dbMissionId || mission.id} Selesai**\n\n**Tools:** ${result.toolsUsed} tool calls, ${(result.filesRead || []).length} file dibaca\n\n${fullText}`;

      if (mission.dbMissionId) {
        await db.update(missionsTable).set({ status: "COMPLETED", updatedAt: new Date(), completedAt: new Date(), result: result.text.slice(0, 4000) }).where(eq(missionsTable.id, mission.dbMissionId));
        await aiMissionService.saveSnapshot(mission.dbMissionId, 0, { progress: 100 });
        aiMissionService.notifyCompleted(mission.dbMissionId, result.text, ceoSummary || preview);
      }
      await remember(mission.userId, "ceo", mission.userMessage, founderMessage);
      console.log(`[PIPELINE:BGE] executeCTOMission end — mission=${mission.id} completed`);
      return "completed";
    } catch (e: any) {
      console.error(`[PIPELINE:BGE] executeCTOMission error — mission=${mission.id} dbId=${mission.dbMissionId} err="${e.message}"`);
      missionRuntime.transition(mission.id, "FAILED");
      if (mission.dbMissionId) {
        await db.update(missionsTable).set({ status: "FAILED", result: `ERROR: ${e.message}`, updatedAt: new Date(), completedAt: new Date() }).where(eq(missionsTable.id, mission.dbMissionId));
        aiMissionService.notifyCompleted(mission.dbMissionId, "", `❌ Error: ${e.message}`);
        const { remember } = await import("../../services/ai-memory-service");
        await remember(mission.userId, "ceo", mission.userMessage,
          `❌ **Misi #${mission.dbMissionId || mission.id} Error**: ${e.message}`);
      }
      return "failed";
    }
  }

  /** Process a single mission through its lifecycle */
  private async processMission(missionId: string): Promise<"delegated" | "completed" | "failed" | "skipped"> {
    const mission = missionRuntime.get(missionId);
    if (!mission) return "skipped";

    switch (mission.status) {
      case "CREATED":
      case "PLANNING":
        const result = missionRuntime.delegateToOrg(missionId);
        return result ? "delegated" : "failed";

      case "DELEGATED":
      case "RUNNING": {
        console.log(`[MissionEngine] Processing ${mission.id}: type=${mission.missionType}, status=${mission.status}, userId=${mission.userId}, dbId=${mission.dbMissionId}`);
        // ── CTO Execution Mission ──
        if (mission.missionType === "analysis" || mission.missionType === "implementation") {
          return await this.executeCTOMission(mission);
        }

        // ── Legacy: auto-complete work packages ──
        const allDone = mission.workPackages.every(wp => wp.status === "completed");
        if (allDone) {
          missionRuntime.transition(missionId, "REVIEW");
          missionRuntime.approve(missionId);
          return "completed";
        }
        for (const pkg of mission.workPackages) {
          if (pkg.status === "assigned" || pkg.status === "pending") {
            const runtime = organizationEngine.find(pkg.assignedTo || mission.owner);
            if (runtime && organizationEngine.canAccept(runtime.id)) {
              missionRuntime.completePackage(missionId, pkg.id,
                `[Auto] ${pkg.title} completed by ${runtime.runtime}`,
                `Processed by Mission Engine at ${new Date().toISOString()}`);
            }
          }
        }
        return "delegated";
      }

      case "REVIEW":
        // Auto-approve after review
        missionRuntime.approve(missionId);
        return "completed";

      case "WAITING":
      case "BLOCKED":
        // Don't process — waiting for input
        return "skipped";

      case "FAILED":
      case "CANCELLED":
        // Archive failed/cancelled missions
        missionRuntime.transition(missionId, "ARCHIVED");
        return "completed";

      default:
        return "skipped";
    }
  }

  /** Get engine statistics */
  stats(): typeof _stats {
    return { ..._stats };
  }

  /** Check if engine is running */
  isRunning(): boolean {
    return this.running;
  }
}

// Singleton
const missionEngine = new MissionEngine();

export { missionEngine };
export type { EngineConfig };

// Component metadata
export const missionBackgroundEngine = {
  name: "MissionBackgroundEngine",
  version: "1.0.0",
  capabilities: ["background-processing", "mission-auto-advance", "periodic-polling"],
  dependencies: ["MissionRuntime", "OrganizationRuntime"],

  health: () => {
    const s = missionEngine.stats();
    return {
      status: missionEngine.isRunning() ? ("healthy" as const) : ("degraded" as const),
      uptime: 0, dependencies: [], version: "1.0.0",
      custom: s,
    };
  },

  start: () => missionEngine.start(),
  stop: () => missionEngine.stop(),
  stats: () => missionEngine.stats(),
};
