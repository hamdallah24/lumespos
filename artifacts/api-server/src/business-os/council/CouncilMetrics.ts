import type { CouncilSession, CouncilMetricsData } from "./types";
import * as CouncilHistory from "./CouncilHistory";

export function computeMetrics(): CouncilMetricsData {
  const sessions = CouncilHistory.getAllSessions();
  const total = sessions.length;
  if (total === 0) {
    return { totalSessions: 0, totalDecisions: 0, avgConfidence: 0, avgDurationMs: 0, consensusRate: 0, votingRate: 0, dissentRate: 0, decisionsExecuted: 0, decisionsPending: 0, topAgendaTopics: [], updatedAt: new Date().toISOString() };
  }

  const finished = sessions.filter(s => s.status === "FINISHED");
  const allDecisions = sessions.flatMap(s => s.decisions);
  const confidences = allDecisions.map(d => d.confidence);
  const avgConf = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
  const durations = finished.map(s => s.durationMs || 0).filter(d => d > 0);
  const avgDur = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  const withConsensus = sessions.filter(s => s.status === "FINISHED" && s.agenda.every(a => a.status === "resolved"));
  const withVoting = sessions.filter(s => s.votes.length > 0);

  const topicCount = new Map<string, number>();
  for (const s of sessions) {
    for (const a of s.agenda) {
      topicCount.set(a.title, (topicCount.get(a.title) || 0) + 1);
    }
  }
  const topTopics = Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));

  return {
    totalSessions: total,
    totalDecisions: allDecisions.length,
    avgConfidence: Math.round(avgConf * 100) / 100,
    avgDurationMs: Math.round(avgDur),
    consensusRate: finished.length > 0 ? Math.round((withConsensus.length / finished.length) * 100) : 0,
    votingRate: finished.length > 0 ? Math.round((withVoting.length / finished.length) * 100) : 0,
    dissentRate: allDecisions.length > 0 ? Math.round((allDecisions.filter(d => d.dissenting.length > 0).length / allDecisions.length) * 100) : 0,
    decisionsExecuted: allDecisions.filter(d => d.executionPlan && d.executionPlan.length > 0).length,
    decisionsPending: allDecisions.filter(d => !d.executionPlan || d.executionPlan.length === 0).length,
    topAgendaTopics: topTopics,
    updatedAt: new Date().toISOString(),
  };
}
