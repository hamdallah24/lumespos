// ECP-045 Sprint 6: Organization Intelligence
// Orchestrates ALL collective intelligence: memory, fusion, reputation,
// consensus, decisions, cross-learning. Single entry point.

import type { ExecutiveRole, ConsensusVote, OrgIntelligenceReport } from "./intelligence-types";
import type { ConsensusOpinion } from "./intelligence-types";
import { organizationalMemory } from "./organizational-memory";
import { knowledgeFusion } from "./knowledge-fusion";
import { executiveReputationTracker } from "./executive-reputation";
import { consensusEngine } from "./consensus-engine";
import { decisionHistoryStore } from "./decision-history";
import { crossExecutiveLearning } from "./cross-executive-learning";

export class OrganizationIntelligence {

  /** Full organizational intelligence cycle after learning */
  onLearningComplete(
    executive: ExecutiveRole,
    missionId: string,
    outcome: "SUCCESS" | "FAILURE" | "PARTIAL",
    domain: string,
    lessons: string[],
  ): void {
    // 1. Update reputation
    executiveReputationTracker.recordOutcome(executive, missionId, outcome, domain);

    // 2. Propose organizational knowledge
    for (const lesson of lessons) {
      if (lesson.length >= 10) {
        organizationalMemory.propose(
          lesson,
          outcome === "SUCCESS" ? "BEST_PRACTICE" : "LESSON",
          domain,
          executive,
        );
      }
    }

    // 3. Cross-pollinate
    if (outcome === "SUCCESS" && domain) {
      knowledgeFusion.fuse([executive], domain);
    }
  }

  /** Make an organizational decision */
  decide(
    question: string,
    participants: ExecutiveRole[],
    getOpinion: (exec: ExecutiveRole) => {
      vote: ConsensusVote; recommendation: string; reasoning: string; confidence: number;
    },
  ): string {
    const result = consensusEngine.quickConsensus(question, participants, getOpinion);

    // Record decision
    const alternatives = result.opinions.map(o => o.recommendation);
    decisionHistoryStore.record(
      question, // use question as missionId for simple decisions
      question,
      participants,
      alternatives,
      result.decision,
    );

    return result.resolution;
  }

  /** Transfer knowledge from top performer */
  shareBestPractices(domain: string): void {
    crossExecutiveLearning.learnFromBest(domain);
  }

  /** Generate organization intelligence report */
  report(): OrgIntelligenceReport {
    const memStats = organizationalMemory.stats();
    const rank = executiveReputationTracker.ranking();
    const conStats = consensusEngine.stats();

    return {
      generatedAt: new Date().toISOString(),
      memoryStats: {
        totalValidated: memStats.validated,
        byDomain: memStats.byDomain,
        byType: memStats.byType,
      },
      reputationRankings: rank,
      consensusStats: conStats,
      learningHealth: {
        crossTransfers: rank.length * 2,
        knowledgeGrowth: memStats.validated,
        avgConfidence: memStats.avgConfidence,
      },
    };
  }

  /** Full stats */
  stats() {
    return {
      memory: organizationalMemory.stats(),
      reputation: executiveReputationTracker.ranking().map(r => ({
        executive: r.executive,
        confidence: r.confidence,
        successRate: r.successRate,
        experience: r.experience,
        specialties: r.specialties,
      })),
      consensus: consensusEngine.stats(),
      decisions: decisionHistoryStore.stats(),
    };
  }
}

export const organizationIntelligence = new OrganizationIntelligence();
