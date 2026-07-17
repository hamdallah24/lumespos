import type {
  UnderstandingResult,
  GroundingResult,
  VerificationResult,
  OverallConfidence,
  RetrievalPlan,
} from '../types';

export class ConfidenceAggregator {
  aggregate(
    understanding: UnderstandingResult,
    grounding: GroundingResult,
    verification: VerificationResult,
    plan: RetrievalPlan,
  ): OverallConfidence {
    const reasoning = understanding.confidence;

    const requestedCount = plan.tasks.length;

    const retrievedCount =
      grounding.operationalData.length +
      grounding.knowledgeBlocks.length +
      grounding.fileContents.length +
      grounding.memoryEntries.length;

    const groundingScore = requestedCount > 0 ? Math.min(retrievedCount / requestedCount, 1.0) : 1.0;

    const verificationScore = verification.confidenceAdjustment;

    const overall = reasoning * groundingScore * verificationScore;

    const scores = [
      { name: 'reasoning', value: reasoning },
      { name: 'grounding', value: groundingScore },
      { name: 'verification', value: verificationScore },
    ];
    const sorted = [...scores].sort((a, b) => a.value - b.value);
    const lowest = sorted[0];
    const weakAreas = lowest.value < 0.7 ? [lowest.name, ...sorted.filter(s => s.value < 0.7).map(s => s.name)] : [];

    const toolResolutionConfidence = plan.toolNeeds.length > 0
      ? plan.toolNeeds.filter(t => t.priority !== 'fallback').length / plan.toolNeeds.length
      : 1.0;

    return {
      reasoning,
      grounding: groundingScore,
      verification: verificationScore,
      overall,
      provenance: {
        intentConfidence: reasoning,
        entityConfidence: understanding.entities.length > 0
          ? understanding.entities.reduce((a, e) => a + e.confidence, 0) / understanding.entities.length
          : 1.0,
        groundingCompleteness: groundingScore,
        verificationStatus: verification.state,
        planningConfidence: reasoning * 0.9,
        toolResolutionConfidence,
      },
      weakAreas,
      safeToExecute: overall > 0.5,
    };
  }
}
