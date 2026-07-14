import type { CouncilSession } from "../core/CouncilSession";
import type { CouncilOutcomeRecord, LearningOutcome } from "./CouncilLearningTypes";
import { recordCouncilOutcome, getCouncilOutcomes, getCouncilOutcomeStats } from "./CouncilOutcomeTracker";
import { detectCouncilPatterns, detectExecutiveAlignments } from "./CouncilPatternDetector";
import type { CouncilPattern, ExecutiveAlignment, CouncilLearningStats } from "./CouncilLearningTypes";

let sessionsSnapshot: CouncilSession[] = [];

export const CouncilLearningEngine = {
  recordOutcome(
    session: CouncilSession,
    outcome: LearningOutcome,
    notes?: string,
  ): CouncilOutcomeRecord {
    const durationMs = session.resolvedAt
      ? new Date(session.resolvedAt).getTime() - new Date(session.createdAt).getTime()
      : 0;

    return recordCouncilOutcome({
      sessionId: session.id,
      sessionTitle: session.title,
      outcome,
      resolution: session.resolution || "",
      executiveCount: session.positions.length,
      approvalCount: session.positions.filter(p => p.position === "approve").length,
      rejectionCount: session.positions.filter(p => p.position === "reject").length,
      abstainCount: session.positions.filter(p => p.position === "abstain").length,
      durationMs,
      notes,
    });
  },

  analyze(sessions: CouncilSession[]): CouncilPattern[] {
    sessionsSnapshot = sessions;
    return detectCouncilPatterns(sessions);
  },

  getAlignments(sessions: CouncilSession[]): ExecutiveAlignment[] {
    return detectExecutiveAlignments(sessions);
  },

  getStats(): CouncilLearningStats {
    const outcomes = getCouncilOutcomes();
    const patterns = sessionsSnapshot.length > 0
      ? detectCouncilPatterns(sessionsSnapshot)
      : [];

    const stats = getCouncilOutcomeStats();
    const totalSessions = sessionsSnapshot.length;
    const escalated = sessionsSnapshot.filter(s => s.status === "escalated").length;

    return {
      totalSessions,
      trackedOutcomes: outcomes.length,
      patternsDetected: patterns.length,
      averageDurationMs: stats.averageDurationMs,
      resolutionRate: totalSessions > 0
        ? Math.round((sessionsSnapshot.filter(s => s.status === "resolved").length / totalSessions) * 100)
        : 0,
      escalationRate: totalSessions > 0
        ? Math.round((escalated / totalSessions) * 100)
        : 0,
      topAlignments: sessionsSnapshot.length > 0
        ? detectExecutiveAlignments(sessionsSnapshot).slice(0, 3)
        : [],
    };
  },
};
