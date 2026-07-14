import type { CouncilSession } from "../core/CouncilSession";
import type { LearningOutcome, CouncilPattern, ExecutiveAlignment, CouncilLearningStats, CouncilOutcomeRecord } from "./CouncilLearningTypes";
import { CouncilLearningEngine } from "./CouncilLearningEngine";
import { getCouncilOutcomes } from "./CouncilOutcomeTracker";

export const CouncilLearningProvider = {
  recordOutcome(session: CouncilSession, outcome: LearningOutcome, notes?: string): CouncilOutcomeRecord {
    return CouncilLearningEngine.recordOutcome(session, outcome, notes);
  },

  analyze(sessions: CouncilSession[]): CouncilPattern[] {
    return CouncilLearningEngine.analyze(sessions);
  },

  getAlignments(sessions: CouncilSession[]): ExecutiveAlignment[] {
    return CouncilLearningEngine.getAlignments(sessions);
  },

  getOutcomes(): CouncilOutcomeRecord[] {
    return getCouncilOutcomes();
  },

  getStats(): CouncilLearningStats {
    return CouncilLearningEngine.getStats();
  },
};
