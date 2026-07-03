// ECP-033: Escalation Engine — founder approval required
// Frozen. When consensus < threshold, escalate to Founder.

import type { CouncilSession, ConsensusResult } from "./types";
import { getCouncilPolicy } from "./council-policy";

type DecisionTrigger = import("./types").DecisionTrigger;

class EscalationEngine {
  shouldEscalate(session: CouncilSession, trigger: DecisionTrigger): boolean {
    const policy = getCouncilPolicy(trigger);

    // Always escalate if any opinion is REJECT
    const hasReject = session.opinions.some(o => o.recommendation === "REJECT");
    if (hasReject) return true;

    // Escalate if consensus below policy threshold
    if (session.consensus && session.consensus.consensusScore < policy.escalationThreshold) {
      return true;
    }

    // Always escalate foundation + security changes if not unanimous
    if (["foundation_change", "security_change"].includes(trigger)) {
      const unanimous = session.opinions.every(o => o.recommendation === "APPROVE");
      return !unanimous;
    }

    return false;
  }

  formatEscalation(session: CouncilSession): string {
    const summary = session.opinions.map(o =>
      `${o.runtime}: ${o.recommendation} (${o.confidence}%)`
    ).join(", ");

    return [
      `# Council Escalation — ${session.id}`,
      `Question: ${session.question}`,
      `Opinions: ${summary}`,
      `Consensus: ${session.consensus?.consensusScore || 0}%`,
      `Status: Requires Founder Decision`,
    ].join("\n");
  }
}

export const escalationEngine = new EscalationEngine();
