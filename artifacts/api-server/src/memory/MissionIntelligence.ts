// ADR-010 Phase 4: Mission Intelligence
// Evidence Negotiation + Knowledge Projection + Mission Lifetime.
// RFC-012 Phase 8: MissionDecision — driver reads decision, not governor directly.

import type { BudgetManager } from "./BudgetManager";

export type MissionDecision = "CONTINUE" | "NEGOTIATE" | "CONCLUDE" | "ABORT" | "ESCALATE";

export type MissionPhase =
  | "PLANNING"
  | "EXPLORATION"
  | "INVESTIGATION"
  | "ANALYSIS"
  | "DECISION"
  | "VERIFICATION"
  | "CONCLUSION"
  | "ARCHIVED";

export interface MissionIntelligenceState {
  phase: MissionPhase;
  evidenceQuality: number;
  confidence: number;
  cycles: number;
  budgetUsed: number;
  budgetTotal: number;
  strategy: string;
}

const DOMAIN_KNOWLEDGE: Record<string, string[]> = {
  architecture: ["architecture", "adr", "governance", "runtime"],
  devops:       ["devops", "vps", "pm2", "nginx", "deploy"],
  codebase:     ["codebase", "refactoring", "architecture"],
  inventory:    ["inventory", "pos", "products", "stock"],
  business:     ["business", "strategy", "marketing"],
  finance:      ["finance", "budget", "accounting"],
  general:      ["foundation", "architecture"],
};

export interface NegotiationResult {
  extended: boolean;
  addedTokens: number;
  reason: string;
}

export class MissionIntelligence {

  /** Evidence Negotiation: evaluate whether to extend budget */
  negotiate(
    state: MissionIntelligenceState,
    budgetMgr?: BudgetManager,
  ): NegotiationResult {
    const { evidenceQuality, confidence, cycles, budgetUsed, budgetTotal } = state;

    // Case 1: Evidence close to threshold — extend budget
    if (evidenceQuality >= 0.30 && evidenceQuality < 0.40 && confidence >= 30) {
      const needed = Math.ceil(budgetTotal * 0.15); // 15% of original budget
      if (budgetMgr) {
        const result = budgetMgr.requestExtension(needed, "Evidence approaching threshold");
        return {
          extended: result.approved,
          addedTokens: result.added,
          reason: `Evidence at ${Math.round(evidenceQuality * 100)}%, extending to reach 40% threshold`,
        };
      }
      return { extended: false, addedTokens: 0, reason: "No budget manager available" };
    }

    // Case 2: High confidence but budget running out — extend
    if (confidence >= 60 && budgetUsed / budgetTotal > 0.8) {
      const needed = Math.ceil(budgetTotal * 0.1);
      if (budgetMgr) {
        const result = budgetMgr.requestExtension(needed, "High confidence, nearly complete");
        return {
          extended: result.approved,
          addedTokens: result.added,
          reason: `High confidence (${confidence}%), worth extending`,
        };
      }
    }

    // Case 3: Enough cycles completed with good evidence — don't extend
    if (cycles >= 4 && evidenceQuality >= 0.35) {
      return { extended: false, addedTokens: 0, reason: "Sufficient cycles with adequate evidence" };
    }

    return { extended: false, addedTokens: 0, reason: "Threshold not met for extension" };
  }

  /** Knowledge Projection: filter Foundation knowledge to relevant domain only */
  projectKnowledge(domain: string, currentPhase: MissionPhase): string[] {
    const normalized = domain?.toLowerCase() || "general";
    const domains = DOMAIN_KNOWLEDGE[normalized] || DOMAIN_KNOWLEDGE.general;

    // Early phases: broader knowledge. Later phases: focused.
    if (currentPhase === "EXPLORATION" || currentPhase === "INVESTIGATE" as any) {
      return domains;
    }
    // Analysis/Decision: narrow to most relevant
    if (currentPhase === "ANALYSIS" || currentPhase === "DECISION") {
      return domains.slice(0, 2);
    }
    // Verification/Conclusion: minimal context
    return domains.slice(0, 1);
  }

  /** Determine mission phase from execution state */
  determinePhase(strategy: string, cycles: number, evidenceQuality: number): MissionPhase {
    if (cycles === 0) return "PLANNING";
    if (strategy === "EXPLORE") return "EXPLORATION";
    if (strategy === "INVESTIGATE") return "INVESTIGATION";
    if (strategy === "ANALYZE") return "ANALYSIS";
    if (strategy === "CONCLUDE") return "CONCLUSION";
    if (evidenceQuality >= 0.40) return "VERIFICATION";
    return "INVESTIGATION";
  }

  /** Should the mission conclude based on mission value, not just budget? */
  shouldConclude(state: MissionIntelligenceState): boolean {
    // Conclude if evidence + confidence are sufficient
    if (state.evidenceQuality >= 0.40 && state.confidence >= 50) return true;
    // Don't conclude if still exploring with low cycles
    if (state.cycles <= 2 && state.evidenceQuality < 0.30) return false;
    // Conclude if strategy is explicit
    if (state.strategy === "CONCLUDE") return true;
    return false;
  }

  /**
   * RFC-012 Phase 8: Evaluate metrics and return MissionDecision.
   * Driver reads this decision instead of calling governor.shouldContinue() directly.
   */
  evaluate(metrics: {
    evidenceQuality: number;
    confidence: number;
    cyclesExecuted: number;
    strategy: string;
    budgetExhausted: boolean;
  }): { decision: MissionDecision; reason: string } {
    if (metrics.evidenceQuality >= 0.40 && metrics.confidence >= 50) {
      return { decision: "CONCLUDE", reason: "Evidence threshold met" };
    }
    if (metrics.cyclesExecuted >= 3 && metrics.evidenceQuality >= 0.25
        && (metrics.strategy === "EXPLORE" || metrics.strategy === "INVESTIGATE")) {
      return { decision: "CONCLUDE", reason: "Force text — model stuck in explore/investigate loop" };
    }
    if (metrics.budgetExhausted && metrics.evidenceQuality >= 0.30) {
      return { decision: "NEGOTIATE", reason: "Budget low but evidence close" };
    }
    if (metrics.budgetExhausted && metrics.evidenceQuality < 0.20 && metrics.cyclesExecuted >= 3) {
      return { decision: "ABORT", reason: "Budget exhausted without evidence" };
    }
    return { decision: "CONTINUE", reason: "Normal execution" };
  }
}

export const missionIntelligence = new MissionIntelligence();
