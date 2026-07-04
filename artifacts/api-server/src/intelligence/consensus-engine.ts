// ECP-045 Sprint 4: Consensus Engine
// Resolves conflicts between executives. Weighted by reputation.
// Unanimous = strong decision. Contested = CEO breaks tie.

import type { ExecutiveRole, ConsensusOpinion, ConsensusResult, ConsensusVote } from "./intelligence-types";
import { executiveReputationTracker } from "./executive-reputation";

export class ConsensusEngine {
  private results: Map<string, ConsensusResult> = new Map();

  /** Resolve a question with multiple executive opinions */
  resolve(
    question: string,
    opinions: ConsensusOpinion[],
  ): ConsensusResult {
    // Weight votes by reputation
    let weightedYes = 0;
    let weightedNo = 0;
    let weightedAbstain = 0;
    const dissenters: ExecutiveRole[] = [];

    for (const op of opinions) {
      const weight = op.reputation || 50;
      if (op.vote === "YES") weightedYes += weight;
      else if (op.vote === "NO") { weightedNo += weight; dissenters.push(op.executive); }
      else if (op.vote === "ABSTAIN") weightedAbstain += weight;
      // DEFER = effectively ABSTAIN
    }

    const totalWeight = weightedYes + weightedNo + weightedAbstain;
    const decision: ConsensusVote = weightedYes > weightedNo ? "YES" : weightedNo > weightedYes ? "NO" : "ABSTAIN";
    const weightedConfidence = totalWeight > 0
      ? Math.round((Math.max(weightedYes, weightedNo) / totalWeight) * 100)
      : 0;

    // Resolution text
    let resolution = "";
    if (dissenters.length === 0) {
      resolution = `Konsensus penuh — ${opinions.length} executive setuju.`;
    } else if (weightedConfidence >= 80) {
      resolution = `Mayoritas kuat (${weightedConfidence}%) — ${dissenters.length} dissenter: ${dissenters.join(", ")}.`;
    } else if (weightedConfidence >= 60) {
      resolution = `Mayoritas tipis (${weightedConfidence}%) — perlu review CEO. Dissenters: ${dissenters.join(", ")}.`;
    } else {
      resolution = `Tidak ada konsensus — CEO harus memutuskan. Split: YES=${weightedYes}, NO=${weightedNo}.`;
    }

    const result: ConsensusResult = {
      question,
      opinions,
      decision,
      weightedConfidence,
      dissenters,
      resolution,
      resolvedAt: new Date().toISOString(),
    };

    this.results.set(question, result);
    return result;
  }

  /** Quick consensus: ask executives a yes/no question */
  quickConsensus(
    question: string,
    participants: ExecutiveRole[],
    getOpinion: (exec: ExecutiveRole) => { vote: ConsensusVote; recommendation: string; reasoning: string; confidence: number },
  ): ConsensusResult {
    const opinions: ConsensusOpinion[] = participants.map(exec => {
      const op = getOpinion(exec);
      const rep = executiveReputationTracker.get(exec);
      return {
        executive: exec,
        vote: op.vote,
        recommendation: op.recommendation,
        reasoning: op.reasoning,
        confidence: op.confidence,
        reputation: rep.confidence,
      };
    });
    return this.resolve(question, opinions);
  }

  /** Get result by question */
  getResult(question: string): ConsensusResult | null {
    return this.results.get(question) || null;
  }

  /** Stats */
  stats() {
    const all = [...this.results.values()];
    return {
      totalDecisions: all.length,
      unanimousDecisions: all.filter(r => r.dissenters.length === 0).length,
      contestedDecisions: all.filter(r => r.dissenters.length > 0).length,
    };
  }
}

export const consensusEngine = new ConsensusEngine();
