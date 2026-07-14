import type { CouncilSession, CouncilPosition } from "../core";

export interface DebateRound {
  round: number;
  topic: string;
  arguments: { executiveId: string; role: string; argument: string }[];
  summary: string;
}

export const DebateFacilitator = {
  generateTopic(session: CouncilSession): string {
    const positions = session.positions;
    if (positions.length === 0) return `Discuss: ${session.title}`;

    const approves = positions.filter(p => p.position === "approve");
    const rejects = positions.filter(p => p.position === "reject");

    if (approves.length > 0 && rejects.length > 0) {
      return `Address concerns: ${rejects.map(r => r.reasoning).join("; ")}`;
    }
    return `Review proposal: ${session.description.slice(0, 100)}`;
  },

  summarizeRound(round: DebateRound): string {
    const approveArgs = round.arguments.filter(a => a.argument.toLowerCase().includes("support") || a.argument.toLowerCase().includes("agree"));
    const opposeArgs = round.arguments.filter(a => !approveArgs.includes(a));

    let summary = `Round ${round.round}: ${round.topic}\n`;
    if (approveArgs.length > 0) {
      summary += `Supporting: ${approveArgs.map(a => `${a.role}`).join(", ")}\n`;
    }
    if (opposeArgs.length > 0) {
      summary += `Opposing: ${opposeArgs.map(a => `${a.role}`).join(", ")}\n`;
    }
    summary += round.summary;
    return summary;
  },

  nextRound(currentRound: number): DebateRound {
    return {
      round: currentRound + 1,
      topic: "",
      arguments: [],
      summary: "",
    };
  },
};
