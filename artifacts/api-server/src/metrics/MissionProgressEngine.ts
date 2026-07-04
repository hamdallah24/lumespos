// ADR-009 Phase 5: Mission Progress Engine
// Computes mission progress from MissionContract objectives.
// NOT cycle-based. Reads real objective completion states.

import type { MissionProgress } from "./MetricTypes";
import type { MissionContract } from "../mission/Mission";

export class MissionProgressEngine {

  compute(contract: MissionContract): MissionProgress {
    const objectives = contract.objectives;
    const completed = objectives.filter(o => o.status === "COMPLETED").length;
    const running = objectives.filter(o => o.status === "IN_PROGRESS").length;
    const blocked = objectives.filter(o => o.status === "BLOCKED").length;
    const failed = objectives.filter(o => o.status === "FAILED").length;
    const waiting = objectives.filter(o => o.status === "PENDING").length;
    const total = objectives.length;

    const progress = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

    const current = objectives.find(o =>
      o.status === "IN_PROGRESS" || o.status === "PENDING"
    );

    return {
      objectivesTotal: total,
      objectivesCompleted: completed,
      objectivesRunning: running,
      objectivesBlocked: blocked,
      objectivesFailed: failed,
      objectivesWaiting: waiting,
      progress,
      currentObjective: current?.description || "",
    };
  }
}

export const missionProgressEngine = new MissionProgressEngine();
