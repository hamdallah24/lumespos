import type {
  RuntimeContext,
  RuntimeTrace,
  RuntimeBudget,
  Evidence,
  UnderstandingResult,
  RetrievalPlan,
  GroundingResult,
  VerificationResult,
  OverallConfidence,
  ToolSuggestion,
  RefinementEntry,
} from '../types';
import { isRepositoryCapability, isMemoryCapability } from '../grounding/CapabilityRouter';

interface AwarenessInput {
  summary: string;
  overallHealth: string;
  overallConfidence: number;
  awarenessScore: number;
  nextAttention: string;
  businessSituation: { summary: string; riskLevel: string; trend: string; focus: string };
  systemSituation: { summary: string; health: string; degradedServices: string[]; runtimeState: string };
  criticalSignalCount: number;
  warningCount: number;
}

export class RuntimeContextBuilder {
  build(
    understanding: UnderstandingResult,
    planning: RetrievalPlan,
    grounding: GroundingResult,
    verification: VerificationResult,
    confidence: OverallConfidence,
    version: string,
    contractId: string,
    createdAt: number,
    degraded: boolean,
    degradedReason: string | undefined,
    trace: RuntimeTrace,
    evidence: Evidence[],
    budget: RuntimeBudget,
    awareness?: AwarenessInput,
    refinementHistory?: RefinementEntry[],
  ): RuntimeContext {
    return {
      version,
      contractId,
      createdAt,
      degraded,
      degradedReason,
      intelligence: {
        goal: understanding.goal,
        intent: understanding.intent,
        subIntent: understanding.subIntent,
        domain: understanding.domain,
        entities: understanding.entities,
        reasoning: understanding.reasoning,
        thinkingMode: understanding.thinkingMode,
        urgency: understanding.urgency,
        risk: understanding.risk,
      },
      planning: {
        executionPlan: planning.executionGraph.steps,
        suggestedTools: planning.toolNeeds.map((t): ToolSuggestion => ({
          toolId: t.capability,
          toolName: t.capability,
          capability: t.capability,
          confidence: t.priority === 'required' ? 0.95 : 0.7,
        })),
        recommendedStrategy: this.buildStrategy(understanding, planning),
        expectedOutput: this.buildExpectedOutput(understanding, planning),
      },
      grounding: {
        operational: grounding.operationalData,
        memory: {
          type: 'working',
          entries: grounding.memoryEntries,
          retrievalTime: Date.now(),
        },
        knowledge: grounding.knowledgeBlocks,
        repository: grounding.fileContents,
        metadata: grounding.metadataNodes,
        requiredTruth: planning.tasks,
        retrievedTruth: [],
        missingTruth: grounding.errors.map(e => e.message),
      },
      awareness: awareness ? {
        summary: awareness.summary,
        overallHealth: awareness.overallHealth,
        overallConfidence: awareness.overallConfidence,
        awarenessScore: awareness.awarenessScore,
        nextAttention: awareness.nextAttention,
        businessSituation: awareness.businessSituation,
        systemSituation: awareness.systemSituation,
        criticalSignalCount: awareness.criticalSignalCount,
        warningCount: awareness.warningCount,
      } : undefined,

      refinementHistory: refinementHistory && refinementHistory.length > 0 ? refinementHistory : undefined,

      verification: {
        results: verification,
        explainability: {
          whyDomain: `Domain "${understanding.domain.primary}" selected because: ${understanding.reasoning.domainRationale}`,
          whyTool: planning.toolNeeds.length > 0
            ? `Tools needed: ${planning.toolNeeds.map(t => t.capability).join(', ')}`
            : 'No specific tools required',
          whyRepository: planning.tasks.filter(t => isRepositoryCapability(t.requiredCapability)).length > 0
            ? `Repository tasks: ${planning.tasks.filter(t => isRepositoryCapability(t.requiredCapability)).map(t => `${t.reason} [${t.requiredCapability}]`).join(', ')}`
            : 'No repository files required',
          whyMemory: planning.tasks.filter(t => isMemoryCapability(t.requiredCapability)).length > 0
            ? `Memory tasks: ${planning.tasks.filter(t => isMemoryCapability(t.requiredCapability)).map(t => `${t.reason} [${t.requiredCapability}]`).join(', ')}`
            : 'No memory retrieval required',
          whyConfidence: `Reasoning: ${confidence.reasoning.toFixed(2)}, Grounding: ${confidence.grounding.toFixed(2)}, Verification: ${confidence.verification.toFixed(2)}, Adjustment: ${verification.confidenceAdjustment.toFixed(2)}, Overall: ${confidence.overall.toFixed(2)}${verification.warnings.length > 0 ? `, Warnings: ${verification.warnings.length}` : ''}${verification.recovery.length > 0 ? `, Recovery: ${verification.recovery.length} suggestions` : ''}`,
          whyPlanning: `${planning.executionGraph.steps.length} execution steps planned (${planning.executionGraph.estimatedCost} cost)`,
        },
      },
      runtime: {
        trace,
        evidence,
        budget,
        confidence,
        reasoningTrace: [],
      },
    };
  }

  private buildStrategy(understanding: UnderstandingResult, planning: RetrievalPlan): string {
    const mode = understanding.thinkingMode;
    const domain = understanding.domain.primary;
    const stepCount = planning.executionGraph.steps.length;
    return `${mode} execution across ${domain} domain with ${stepCount} steps`;
  }

  private buildExpectedOutput(understanding: UnderstandingResult, _planning: RetrievalPlan): string {
    return `Result for ${understanding.intent}:${understanding.subIntent} in ${understanding.domain.primary}`;
  }
}
