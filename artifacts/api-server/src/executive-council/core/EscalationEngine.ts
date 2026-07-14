import type { CouncilSession } from "./CouncilSession";

export const EscalationEngine = {
  determineEscalation(session: CouncilSession): string {
    const deadline = new Date(session.deadline);
    const isOverdue = new Date() > deadline;

    if (isOverdue) {
      return "Founder (overdue — automatic escalation)";
    }

    const rejectCount = session.positions.filter(p => p.position === "reject").length;
    const total = session.positions.length;

    if (total >= 3 && rejectCount > total / 2) {
      return "Founder (majority reject — escalation)";
    }

    return "Founder (no consensus reached)";
  },

  escalate(session: CouncilSession): { escalatedTo: string; reason: string } {
    const escalatedTo = this.determineEscalation(session);
    return {
      escalatedTo,
      reason: `Council session ${session.id} escalated after ${session.positions.length} positions submitted without consensus`,
    };
  },
};
