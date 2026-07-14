import type { CouncilPosition } from "../core";

export const ArgumentAnalyzer = {
  findCommonGround(positions: CouncilPosition[]): string[] {
    const commonPoints: string[] = [];
    const allReasonings = positions.map(p => p.reasoning.toLowerCase());

    const patterns = ["inventory", "cost", "revenue", "risk", "safety", "quality", "efficiency"];
    for (const pattern of patterns) {
      const mentions = allReasonings.filter(r => r.includes(pattern));
      if (mentions.length >= 2) {
        commonPoints.push(`Multiple executives concerned about ${pattern}`);
      }
    }

    return commonPoints;
  },

  summarizePositions(positions: CouncilPosition[]): string {
    if (positions.length === 0) return "No positions submitted";

    const approve = positions.filter(p => p.position === "approve");
    const reject = positions.filter(p => p.position === "reject");
    const common = this.findCommonGround(positions);

    let summary = `${positions.length} positions submitted:\n`;
    summary += `- ${approve.length} approve, ${reject.length} reject\n`;
    if (common.length > 0) {
      summary += `Common concerns: ${common.join("; ")}`;
    }
    return summary;
  },
};
