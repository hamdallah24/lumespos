import { councilSessionManager, CouncilOrchestrator, ConsensusDetector, EscalationEngine } from "../core";
import type { CouncilSession, CouncilPosition } from "../core";
import { ArgumentAnalyzer, CompromiseFinder, DebateFacilitator } from "../ai-debate";
import type { ExecutiveBrief } from "../../executive-runtime/core";

export const CouncilProvider = {
  createSession(brief: ExecutiveBrief, executives: { id: string; role: string }[]): CouncilSession {
    return CouncilOrchestrator.initiateFromBrief(brief, executives);
  },

  submitPosition(sessionId: string, position: CouncilPosition): boolean {
    return councilSessionManager.submitPosition(sessionId, position);
  },

  analyzeConsensus(sessionId: string) {
    const session = councilSessionManager.get(sessionId);
    if (!session) return null;
    return ConsensusDetector.analyze(session);
  },

  resolve(sessionId: string) {
    return CouncilOrchestrator.resolveOrEscalate(sessionId);
  },

  getSession(sessionId: string): CouncilSession | undefined {
    return councilSessionManager.get(sessionId);
  },

  getActiveSessions(): CouncilSession[] {
    return councilSessionManager.getActive();
  },

  getAllSessions(): CouncilSession[] {
    return councilSessionManager.getAll();
  },

  summarizePositions(sessionId: string): string {
    const session = councilSessionManager.get(sessionId);
    if (!session) return "Session not found";
    return ArgumentAnalyzer.summarizePositions(session.positions);
  },

  findCompromises(sessionId: string) {
    const session = councilSessionManager.get(sessionId);
    if (!session) return [];
    return CompromiseFinder.generate(session.positions);
  },

  escalate(sessionId: string) {
    const session = councilSessionManager.get(sessionId);
    if (!session) return null;
    return EscalationEngine.escalate(session);
  },
};
