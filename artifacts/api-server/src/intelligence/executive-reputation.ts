// ECP-045 Sprint 3: Executive Reputation
// Tracks quality score per executive. Accuracy, success rate, specialties.
// Higher reputation = more weight in consensus decisions.

import type { ExecutiveRole, ExecutiveReputation, ReputationEntry } from "./intelligence-types";

export class ExecutiveReputationTracker {
  private reputations: Map<ExecutiveRole, ExecutiveReputation> = new Map();

  /** Initialize reputation for an executive */
  init(executive: ExecutiveRole): ExecutiveReputation {
    const rep: ExecutiveReputation = {
      executive,
      accuracy: 50,
      successRate: 50,
      confidence: 50,
      experience: 0,
      specialties: [],
      lastUpdated: new Date().toISOString(),
      history: [],
    };
    this.reputations.set(executive, rep);
    return rep;
  }

  /** Get reputation */
  get(executive: ExecutiveRole): ExecutiveReputation {
    return this.reputations.get(executive) || this.init(executive);
  }

  /** Record mission outcome and update reputation */
  recordOutcome(
    executive: ExecutiveRole,
    missionId: string,
    outcome: "SUCCESS" | "FAILURE" | "PARTIAL",
    domain: string,
  ): void {
    const rep = this.get(executive);
    rep.experience++;

    let impact = 0;
    if (outcome === "SUCCESS") impact = +2;
    else if (outcome === "PARTIAL") impact = 0;
    else impact = -3;

    const entry: ReputationEntry = {
      missionId,
      outcome,
      impact,
      timestamp: new Date().toISOString(),
    };
    rep.history.push(entry);

    // Update rolling averages
    const recent = rep.history.slice(-10);
    rep.successRate = Math.round(
      (recent.filter(h => h.outcome === "SUCCESS").length / recent.length) * 100
    );
    rep.accuracy = Math.min(100, Math.max(0,
      recent.reduce((s, h) => s + (h.outcome === "SUCCESS" ? 10 : h.outcome === "PARTIAL" ? 5 : 0), 0)
    ));
    rep.confidence = Math.round((rep.successRate * 0.6) + (rep.accuracy * 0.4));

    // Update specialties
    if (!rep.specialties.includes(domain) && rep.confidence >= 60) {
      rep.specialties.push(domain);
    }

    rep.lastUpdated = new Date().toISOString();
  }

  /** Add specialty domain */
  addSpecialty(executive: ExecutiveRole, domain: string): void {
    const rep = this.get(executive);
    if (!rep.specialties.includes(domain)) {
      rep.specialties.push(domain);
    }
  }

  /** Get reputation ranking */
  ranking(): ExecutiveReputation[] {
    return [...this.reputations.values()]
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Get top executive for a domain */
  bestForDomain(domain: string): ExecutiveRole | null {
    const ranked = this.ranking();
    const expert = ranked.find(r => r.specialties.includes(domain) && r.confidence >= 60);
    return expert?.executive || null;
  }

  /** Get all reputations */
  all(): ExecutiveReputation[] {
    return [...this.reputations.values()];
  }
}

export const executiveReputationTracker = new ExecutiveReputationTracker();
