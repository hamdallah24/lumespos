import type { ExecutiveBrief } from "../../executive-runtime/core";
import { councilSessionManager, type CouncilSession, type CouncilPosition } from "./CouncilSession";
import { ConsensusDetector } from "./ConsensusDetector";
import { PositionCollector } from "./PositionCollector";
import { EscalationEngine } from "./EscalationEngine";
import { ObserverEngine } from "../../eios-runtime/public/ObserverEngine";
import { parseComponentId } from "../../eios-runtime/contracts/ComponentId";
import { CouncilLearningProvider } from "../learning/CouncilLearningProvider";

const NS = "eios.core";

function emitCouncilResolved(session: CouncilSession): void {
  try {
    ObserverEngine.dispatch({
      id: `council-resolved-${session.id}-${Date.now()}`,
      correlationId: session.id,
      type: parseComponentId(`${NS}:event:council.resolved@1.0.0`),
      payload: { session },
      timestamp: new Date().toISOString(),
      version: { major: 1, minor: 0, patch: 0 },
    });
  } catch { /* non-blocking event emission */ }
}

function enrichWithPastLearning(summary: string): string {
  try {
    const stats = CouncilLearningProvider.getStats();
    const outcomes = CouncilLearningProvider.getOutcomes();
    const pastResolved = outcomes.filter(o => o.outcome === "success" || o.outcome === "partial");
    const pastFailed = outcomes.filter(o => o.outcome === "failure");
    const snippets: string[] = [summary];
    if (stats.patternsDetected > 0) {
      snippets.push(`Past council patterns detected: ${stats.patternsDetected}`);
    }
    if (pastResolved.length > 0) {
      snippets.push(`Previously resolved outcomes: ${pastResolved.length} (${stats.resolutionRate}% resolution rate)`);
    }
    if (pastFailed.length > 0) {
      snippets.push(`Previous escalations: ${stats.escalationRate}% of sessions`);
    }
    return snippets.join(" | ");
  } catch {
    return summary;
  }
}

export const CouncilOrchestrator = {
  initiateFromBrief(brief: ExecutiveBrief, executives: { id: string; role: string }[]): CouncilSession {
    const enrichedSummary = enrichWithPastLearning(brief.summary);
    const session = councilSessionManager.create(
      `Council: ${brief.title}`,
      enrichedSummary,
      new Date(Date.now() + 3600000),
    );

    councilSessionManager.updateStatus(session.id, "in_progress");
    return session;
  },

  async collectPositions(sessionId: string): Promise<CouncilPosition[]> {
    const session = councilSessionManager.get(sessionId);
    if (!session) return [];
    return PositionCollector.collect(session);
  },

  analyzeConsensus(sessionId: string): { hasConsensus: boolean; consensusLevel: string; summary: string } {
    const session = councilSessionManager.get(sessionId);
    if (!session) return { hasConsensus: false, consensusLevel: "none", summary: "Session not found" };
    return ConsensusDetector.analyze(session);
  },

  resolveOrEscalate(sessionId: string): { action: "resolved" | "escalated"; resolution?: string } {
    const session = councilSessionManager.get(sessionId);
    if (!session) return { action: "escalated", resolution: "Session not found" };

    const consensus = ConsensusDetector.analyze(session);

    if (consensus.hasConsensus) {
      councilSessionManager.updateStatus(sessionId, "resolved");
      const resolution = `Council reached ${consensus.consensusLevel} consensus: ${consensus.summary}`;
      emitCouncilResolved({ ...session, status: "resolved", resolution });
      return { action: "resolved", resolution };
    }

    const escalateTo = EscalationEngine.determineEscalation(session);
    councilSessionManager.updateStatus(sessionId, "escalated");
    emitCouncilResolved({ ...session, status: "escalated", resolution: `Escalated to ${escalateTo}` });
    return { action: "escalated", resolution: `Escalated to ${escalateTo}` };
  },
};
