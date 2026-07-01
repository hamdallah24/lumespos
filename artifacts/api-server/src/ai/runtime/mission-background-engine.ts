// Phase II Wave 4: Mission Engine — background mission processor
// Polls active missions, advances state, routes to Runtimes.
// Auto-starts on server boot.

import { missionRuntime } from "./mission-engine";
import { organizationEngine } from "./organization-engine";

interface EngineConfig {
  intervalMs: number;     // How often to poll
  maxConcurrent: number;  // Max missions processed per tick
}

const DEFAULT_CONFIG: EngineConfig = {
  intervalMs: 30000,  // 30 seconds
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

  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
  }

  /** Start the engine */
  start(): void {
    if (this.running) return;
    this.running = true;

    console.log(`[MissionEngine] Starting — polling every ${this.config.intervalMs / 1000}s, max ${this.config.maxConcurrent}/tick`);

    // Initial tick
    this.tick();

    // Periodic ticks
    this.ticker = setInterval(() => this.tick(), this.config.intervalMs);
  }

  /** Stop the engine */
  stop(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.running = false;
    console.log("[MissionEngine] Stopped");
  }

  /** Process one tick — advance active missions */
  private tick(): void {
    const active = missionRuntime.active();
    if (active.length === 0) return;

    const toProcess = active.slice(0, this.config.maxConcurrent);
    let delegated = 0, completed = 0, failed = 0;

    for (const mission of toProcess) {
      try {
        const result = this.processMission(mission.id);
        if (result === "delegated") delegated++;
        if (result === "completed") completed++;
        if (result === "failed") failed++;
      } catch (e: any) {
        console.error(`[MissionEngine] Error processing ${mission.id}:`, e.message);
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

  /** Process a single mission through its lifecycle */
  private processMission(missionId: string): "delegated" | "completed" | "failed" | "skipped" {
    const mission = missionRuntime.get(missionId);
    if (!mission) return "skipped";

    switch (mission.status) {
      case "CREATED":
      case "PLANNING":
        // Auto-delegate to organization
        const result = missionRuntime.delegateToOrg(missionId);
        return result ? "delegated" : "failed";

      case "DELEGATED":
      case "RUNNING": {
        // Check if all work packages are complete
        const allDone = mission.workPackages.every(wp => wp.status === "completed");
        if (allDone) {
          missionRuntime.transition(missionId, "REVIEW");
          // Auto-approve if confidence is high
          missionRuntime.approve(missionId);
          return "completed";
        }

        // Try to auto-complete pending work packages
        for (const pkg of mission.workPackages) {
          if (pkg.status === "assigned" || pkg.status === "pending") {
            // Delegate to the assigned runtime
            const runtime = organizationEngine.find(pkg.assignedTo || mission.owner);
            if (runtime && organizationEngine.canAccept(runtime.id)) {
              const result = missionRuntime.completePackage(
                missionId,
                pkg.id,
                `[Auto] ${pkg.title} completed by ${runtime.runtime}`,
                `Processed by Mission Engine at ${new Date().toISOString()}`,
              );
              if (result) {
                console.log(`[MissionEngine] ${pkg.id}: auto-completed by ${runtime.runtime}`);
              }
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
