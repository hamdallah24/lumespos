import { councilSessionManager, type CouncilSession, type CouncilPosition } from "./CouncilSession";

export const PositionCollector = {
  collect(session: CouncilSession): CouncilPosition[] {
    return session.positions;
  },

  getByExecutive(sessionId: string, executiveId: string): CouncilPosition | undefined {
    const session = councilSessionManager.get(sessionId);
    if (!session) return undefined;
    return session.positions.find(p => p.executiveId === executiveId);
  },

  submitPosition(sessionId: string, position: CouncilPosition): boolean {
    return councilSessionManager.submitPosition(sessionId, position);
  },

  countByPosition(session: CouncilSession): Record<string, number> {
    const counts: Record<string, number> = { approve: 0, reject: 0, abstain: 0, modify: 0 };
    for (const p of session.positions) {
      counts[p.position]++;
    }
    return counts;
  },
};
