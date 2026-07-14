import type { CouncilPosition } from "../core";

export interface CompromiseOption {
  title: string;
  description: string;
  estimatedSatisfaction: number;
}

export const CompromiseFinder = {
  generate(positions: CouncilPosition[]): CompromiseOption[] {
    const options: CompromiseOption[] = [];
    const rejects = positions.filter(p => p.position === "reject");

    if (rejects.length === 0) {
      return [{ title: "Full Approval", description: "All executives approve — proceed as proposed", estimatedSatisfaction: 100 }];
    }

    const costConcerns = rejects.filter(p => p.reasoning.toLowerCase().includes("cost") || p.reasoning.toLowerCase().includes("budget"));
    if (costConcerns.length > 0) {
      options.push({
        title: "Phased Implementation",
        description: "Implement in stages with budget review at each phase",
        estimatedSatisfaction: 75,
      });
    }

    const riskConcerns = rejects.filter(p => p.reasoning.toLowerCase().includes("risk") || p.reasoning.toLowerCase().includes("safety"));
    if (riskConcerns.length > 0) {
      options.push({
        title: "Pilot Program",
        description: "Run a limited pilot before full rollout",
        estimatedSatisfaction: 80,
      });
    }

    const timeConcerns = rejects.filter(p => p.reasoning.toLowerCase().includes("time") || p.reasoning.toLowerCase().includes("schedule"));
    if (timeConcerns.length > 0) {
      options.push({
        title: "Extended Timeline",
        description: "Extend the timeline to address scheduling concerns",
        estimatedSatisfaction: 70,
      });
    }

    if (options.length === 0) {
      options.push({
        title: "Revised Proposal",
        description: "Revise proposal addressing all concerns and resubmit",
        estimatedSatisfaction: 60,
      });
    }

    return options;
  },
};
