import type { CouncilOpinion } from "./types";

export interface ConsensusResult {
  reached: boolean;
  mergedOpinion: string;
  mergedReasoning: string;
  confidence: number;
  dissentCount: number;
  dissenters: string[];
  dissentOpinions: CouncilOpinion[];
  unresolvedConflicts: string[];
}

export function computeConsensus(opinions: CouncilOpinion[]): ConsensusResult {
  if (opinions.length === 0) {
    return { reached: false, mergedOpinion: "", mergedReasoning: "", confidence: 0, dissentCount: 0, dissenters: [], dissentOpinions: [], unresolvedConflicts: [] };
  }

  const avgConfidence = opinions.reduce((sum, o) => sum + o.confidence, 0) / opinions.length;
  const lowConfidence = opinions.filter(o => o.confidence < 0.5);

  const allRisks = opinions.flatMap(o => o.risks);
  const uniqueRisks = [...new Set(allRisks)];

  const conflicting = findConflicts(opinions);
  const dissenters = opinions.filter(o => o.confidence < 0.4);

  const reached = conflicting.length === 0 && dissenters.length === 0 && avgConfidence >= 0.6;

  const mergedOpinion = mergeOpinions(opinions);
  const mergedReasoning = mergeReasoning(opinions);

  return {
    reached,
    mergedOpinion,
    mergedReasoning,
    confidence: avgConfidence,
    dissentCount: dissenters.length,
    dissenters: dissenters.map(o => o.executive),
    dissentOpinions: dissenters,
    unresolvedConflicts: conflicting,
  };
}

function findConflicts(opinions: CouncilOpinion[]): string[] {
  const conflicts: string[] = [];
  for (let i = 0; i < opinions.length; i++) {
    for (let j = i + 1; j < opinions.length; j++) {
      if (opinions[i].recommendation.toLowerCase() !== opinions[j].recommendation.toLowerCase()) {
        const pair = `${opinions[i].executive} vs ${opinions[j].executive}: ${opinions[i].recommendation.slice(0, 50)} vs ${opinions[j].recommendation.slice(0, 50)}`;
        if (!conflicts.includes(pair)) conflicts.push(pair);
      }
    }
  }
  return conflicts;
}

function mergeOpinions(opinions: CouncilOpinion[]): string {
  if (opinions.length === 1) return opinions[0].opinion;
  const highConf = opinions.filter(o => o.confidence >= 0.7);
  if (highConf.length > 0) {
    return highConf.sort((a, b) => b.confidence - a.confidence)[0].opinion;
  }
  return opinions.sort((a, b) => b.confidence - a.confidence)[0].opinion;
}

function mergeReasoning(opinions: CouncilOpinion[]): string {
  return opinions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map(o => `${o.executive}: ${o.reasoning.slice(0, 200)}`)
    .join("\n\n");
}
