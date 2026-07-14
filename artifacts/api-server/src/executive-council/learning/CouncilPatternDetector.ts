import type { CouncilSession } from "../core/CouncilSession";
import type { CouncilOutcomeRecord, CouncilPattern, ExecutiveAlignment } from "./CouncilLearningTypes";
import { getCouncilOutcomes } from "./CouncilOutcomeTracker";

let patternCounter = 0;

function nextPatternId(): string {
  patternCounter++;
  return `CP-${Date.now().toString(36)}-${patternCounter}`;
}

export function detectCouncilPatterns(sessions: CouncilSession[]): CouncilPattern[] {
  const patterns: CouncilPattern[] = [];
  const outcomes = getCouncilOutcomes();

  if (sessions.length < 2) return patterns;

  detectEscalationTrend(sessions, patterns);
  detectResolutionStyle(sessions, patterns);
  detectAlignmentPatterns(sessions, outcomes, patterns);
  detectEffectivenessPatterns(outcomes, patterns);

  return patterns;
}

export function detectExecutiveAlignments(sessions: CouncilSession[]): ExecutiveAlignment[] {
  const alignments: ExecutiveAlignment[] = [];
  const executivePairs = new Map<string, { match: number; total: number; positions: string[] }>();

  for (const session of sessions) {
    const positions = session.positions;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const key = [positions[i].executiveId, positions[j].executiveId].sort().join("::");
        const pair = executivePairs.get(key) || { match: 0, total: 0, positions: [] };
        pair.total++;
        if (positions[i].position === positions[j].position) {
          pair.match++;
          pair.positions.push(positions[i].position);
        }
        executivePairs.set(key, pair);
      }
    }
  }

  for (const [key, data] of executivePairs) {
    const [executiveA, executiveB] = key.split("::");
    alignments.push({
      executiveA,
      executiveB,
      alignmentRate: data.total > 0 ? Math.round((data.match / data.total) * 100) : 0,
      sessionCount: data.total,
      commonPositions: [...new Set(data.positions)],
    });
  }

  return alignments.sort((a, b) => b.alignmentRate - a.alignmentRate);
}

function detectEscalationTrend(sessions: CouncilSession[], patterns: CouncilPattern[]): void {
  const escalated = sessions.filter(s => s.status === "escalated");
  if (escalated.length >= 2) {
    patterns.push({
      id: nextPatternId(),
      type: "escalation_trend",
      label: `Council escalation trend — ${escalated.length} sessions escalated`,
      description: `${escalated.length} out of ${sessions.length} council sessions required escalation`,
      sessionIds: escalated.map(s => s.id),
      triggerCount: escalated.length,
      confidence: Math.min(90, escalated.length * 25),
      detectedAt: new Date().toISOString(),
    });
  }
}

function detectResolutionStyle(sessions: CouncilSession[], patterns: CouncilPattern[]): void {
  const resolved = sessions.filter(s => s.status === "resolved");
  if (resolved.length < 2) return;

  const withConsensus = resolved.filter(s => {
    const positions = s.positions;
    if (positions.length === 0) return false;
    const approves = positions.filter(p => p.position === "approve").length;
    return approves > positions.length / 2;
  });

  if (withConsensus.length >= 2) {
    patterns.push({
      id: nextPatternId(),
      type: "resolution_style",
      label: "Council favors consensus-based resolution",
      description: `${withConsensus.length} out of ${resolved.length} resolved sessions had majority approval`,
      sessionIds: withConsensus.map(s => s.id),
      triggerCount: withConsensus.length,
      confidence: Math.min(85, withConsensus.length * 20),
      detectedAt: new Date().toISOString(),
    });
  }
}

function detectAlignmentPatterns(
  sessions: CouncilSession[],
  outcomes: CouncilOutcomeRecord[],
  patterns: CouncilPattern[],
): void {
  const alignments = detectExecutiveAlignments(sessions);
  const highAlignment = alignments.filter(a => a.alignmentRate >= 75);
  for (const al of highAlignment.slice(0, 3)) {
    const outcomeIds = outcomes
      .filter(o => o.sessionId && sessions.some(s => s.id === o.sessionId))
      .map(o => o.sessionId);
    patterns.push({
      id: nextPatternId(),
      type: "alignment",
      label: `Strong alignment: ${al.executiveA} ↔ ${al.executiveB} (${al.alignmentRate}%)`,
      description: `Executives align on ${al.commonPositions.join(", ")} positions across ${al.sessionCount} sessions`,
      sessionIds: outcomeIds,
      triggerCount: al.sessionCount,
      confidence: al.alignmentRate,
      detectedAt: new Date().toISOString(),
    });
  }
}

function detectEffectivenessPatterns(outcomes: CouncilOutcomeRecord[], patterns: CouncilPattern[]): void {
  const successful = outcomes.filter(o => o.outcome === "success");
  if (successful.length >= 2) {
    patterns.push({
      id: nextPatternId(),
      type: "effectiveness",
      label: `Council decisions effective — ${successful.length} successful outcomes`,
      description: `${successful.length} out of ${outcomes.length} tracked council decisions led to successful outcomes`,
      sessionIds: successful.map(s => s.sessionId),
      triggerCount: successful.length,
      confidence: Math.min(90, Math.round((successful.length / outcomes.length) * 100)),
      detectedAt: new Date().toISOString(),
    });
  }
}
