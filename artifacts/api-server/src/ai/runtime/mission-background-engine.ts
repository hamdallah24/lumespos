// Phase II Wave 4: Mission Engine — background mission processor
// Polls active missions, advances state, routes to Runtimes.
// Auto-starts on server boot.
// Extended: executes CTO program for analysis/implementation missions.

import { missionRuntime } from "./mission-engine";
import { organizationEngine } from "./organization-engine";
import { ctoProgram } from "../programs/cto-runtime";
import { aiMissionService } from "../../services/ai-mission-service";

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
        console.error(`[MissionEngine] Error processing ${mission.id}:`, e.message);
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
    // Hanya transisi ke RUNNING kalo belum RUNNING — cegah invalid transition
    if (mission.status !== "RUNNING") {
      missionRuntime.transition(mission.id, "RUNNING");
    }

    try {
      const { remember } = await import("../../services/ai-memory-service");
      const result = await ctoProgram.execute({
        message: mission.userMessage || mission.title,
        userId: mission.userId,
        onProgress: (msg) => { /* bisa ditambahkan snapshot */ },
        onExecutionEvent: async (snapshot: any) => {
          // Save snapshot & progress ke DB via aiMissionService
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
      if (!result.success) {
        errMsg = "CTO gagal menjalankan analisis";
      } else if (result.toolsUsed === 0) {
        errMsg = "CTO tidak menggunakan tools — output tanpa data dari file";
      } else if (result.filesRead.length === 0) {
        errMsg = "CTO tidak membaca file apapun";
      } else {
        const quality = isQualityOutput(result.text);
        if (!quality.ok) {
          errMsg = quality.reason;
        }
      }

      if (errMsg) {
        missionRuntime.transition(mission.id, "FAILED");
        if (mission.dbMissionId) {
          aiMissionService.notifyCompleted(mission.dbMissionId, "", `❌ ${errMsg}`);
          await remember(mission.userId, "ceo", mission.userMessage,
            `❌ **Misi #${mission.dbMissionId || mission.id} Gagal**: ${errMsg}. Coba perjelas file atau folder targetnya.`);
        }
        return "failed";
      }

      // ── REVIEW LULUS → approve ──
      missionRuntime.transition(mission.id, "REVIEW");
      missionRuntime.approve(mission.id);
      if (mission.dbMissionId) {
        await aiMissionService.saveSnapshot(mission.dbMissionId, 0, { progress: 100 });
        aiMissionService.notifyCompleted(mission.dbMissionId, result.text, result.text.slice(0, 200));
      }
      await remember(mission.userId, "ceo", mission.userMessage,
        `✅ **Misi #${mission.dbMissionId || mission.id} Selesai**\n\n**Tools:** ${result.toolsUsed} tool calls, ${result.filesRead.length} file dibaca\n\n${result.text.slice(0, 400)}`);
      return "completed";
    } catch (e: any) {
      missionRuntime.transition(mission.id, "FAILED");
      if (mission.dbMissionId) {
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
