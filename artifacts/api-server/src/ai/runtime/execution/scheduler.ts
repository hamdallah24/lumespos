// ECP-019: Scheduler — candidates → best instance
// Frozen interface. Minimal implementation today (LEAST_LOADED).
// Evolves to full weighted scoring when Runtime Pool supports it.

import type { SchedulerCandidate } from "./execution-manifest";
import { schedulerWeights, schedulerConstraints } from "./execution-policy";

interface RejectionReason {
  candidate: string;
  reason: string;
}

interface SchedulerSelection {
  selected: SchedulerCandidate;
  rejections: RejectionReason[];
  reason: string;
}

class Scheduler {
  select(
    candidates: SchedulerCandidate[],
    _context?: { priority?: string; estimatedDuration?: number },
  ): SchedulerSelection {
    if (candidates.length === 0) {
      throw new Error("Scheduler received empty candidates list");
    }

    const rejections: RejectionReason[] = [];
    const eligible: SchedulerCandidate[] = [];

    for (const c of candidates) {
      if (c.load > schedulerConstraints.maxLoadBeforeSkip) {
        rejections.push({ candidate: c.runtime, reason: "LOAD_TOO_HIGH" });
        continue;
      }
      if (c.queueDepth >= schedulerConstraints.maxQueueDepth) {
        rejections.push({ candidate: c.runtime, reason: "QUEUE_FULL" });
        continue;
      }
      if (c.health === "Offline") {
        rejections.push({ candidate: c.runtime, reason: "OFFLINE" });
        continue;
      }
      eligible.push(c);
    }

    if (eligible.length === 0) {
      return { selected: candidates[0], rejections, reason: "NO_ELIGIBLE — default to first" };
    }

    // Weighted scoring: LEAST_LOADED
    const scored = eligible.map(c => ({
      candidate: c,
      score: (
        (100 - c.load) * schedulerWeights.currentLoad +
        c.capabilityScore * schedulerWeights.capabilityScore +
        (c.health === "Healthy" ? 100 : c.health === "Busy" ? 50 : 0) * schedulerWeights.health
      ),
    }));

    scored.sort((a, b) => b.score - a.score);
    return {
      selected: scored[0].candidate,
      rejections,
      reason: `LEAST_LOADED: score ${Math.round(scored[0].score)}`,
    };
  }
}

export const scheduler = new Scheduler();
