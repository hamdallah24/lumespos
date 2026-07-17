import type {
  RuntimeContext,
  ReasonerInput,
  RepositoryMetadata,
  ToolDescriptor,
  UnderstandingResult,
  RetrievalPlan,
  GroundingResult,
  VerificationResult,
  CapabilityGraph,
  ReasoningProvider,
  RuntimeBudget,
  RefinementEntry,
  OverallConfidence,
} from './types';
import { UnderstandingEngine } from './understanding';
import { RetrievalPlanner } from './planning';
import { GroundingLayer } from './grounding';
import { VerificationEngine } from './verification';
import { RuntimeContextBuilder } from './builder';
import { ConfidenceAggregator } from './confidence';
import { freezeContract } from './contract';
import { PipelineTracer } from './RuntimeTrace';
import { RuntimeDiagnosticsAPI } from './diagnostics';
import { RepositoryMetadataGenerator } from './registry';
import { UnifiedAwarenessEngine } from './awareness';

export class RuntimeIntelligenceCore {
  private capabilityGraph: CapabilityGraph;
  private provider: ReasoningProvider;
  private awarenessEngine: UnifiedAwarenessEngine;
  private understandingEngine: UnderstandingEngine;
  private retrievalPlanner: RetrievalPlanner;
  private groundingLayer: GroundingLayer;
  private verificationEngine: VerificationEngine;
  private contextBuilder: RuntimeContextBuilder;
  private confidenceAggregator: ConfidenceAggregator;
  private repoMetadataGenerator: RepositoryMetadataGenerator;
  private repoMetadata: RepositoryMetadata[] = [];
  private tools: ToolDescriptor[] = [];
  private degraded: boolean = false;
  private diagnostics: RuntimeDiagnosticsAPI;

  constructor(
    capabilityGraph: CapabilityGraph,
    provider: ReasoningProvider,
    rootDir: string,
  ) {
    this.capabilityGraph = capabilityGraph;
    this.provider = provider;
    this.awarenessEngine = new UnifiedAwarenessEngine();
    this.understandingEngine = new UnderstandingEngine(provider, this.awarenessEngine);
    this.retrievalPlanner = new RetrievalPlanner(provider);
    this.groundingLayer = new GroundingLayer(rootDir);
    this.repoMetadataGenerator = new RepositoryMetadataGenerator(rootDir);
    this.verificationEngine = new VerificationEngine();
    this.contextBuilder = new RuntimeContextBuilder();
    this.confidenceAggregator = new ConfidenceAggregator();
    this.diagnostics = new RuntimeDiagnosticsAPI();
    this.diagnostics.initialize(
      provider,
      capabilityGraph,
      provider.constructor?.name || 'ReasoningProvider',
    );
  }

  async initialize(): Promise<void> {
    this.repoMetadata = await this.repoMetadataGenerator.generate();
  }

  setTools(tools: ToolDescriptor[]): void {
    this.tools = tools;
  }

  async assemble(input: ReasonerInput): Promise<RuntimeContext> {
    const contractId = crypto.randomUUID();
    const version = '1.0';
    const createdAt = Date.now();
    const tracer = new PipelineTracer();

    const { result: understanding, brief: awarenessBrief } = await tracer.traceStage('understand', this.provider.constructor?.name || 'ReasoningProvider',
      () => this.understand(input), 0, undefined);

    let plan = await tracer.traceStage('plan', this.provider.constructor?.name || 'ReasoningProvider',
      () => this.createRetrievalPlan(understanding, input), understanding.confidence, undefined);

    let grounding = await tracer.traceStage('ground', 'GroundingLayer',
      () => this.groupAndRetrieve(plan), 0.9, undefined);

    tracer.addEvidence(this.groundingLayer.getEvidence());

    let verification = await tracer.traceStage('verify', 'VerificationEngine',
      () => this.verify(understanding, plan, grounding, input), 0, undefined);

    let confidence = this.confidenceAggregator.aggregate(understanding, grounding, verification, plan);

    const CONFIDENCE_THRESHOLD = 0.75;
    const MAX_REPLAN_ITERATIONS = 2;
    let replanCount = 0;
    const refinementHistory: RefinementEntry[] = [];

    while (confidence.overall < CONFIDENCE_THRESHOLD && replanCount < MAX_REPLAN_ITERATIONS) {
      replanCount++;
      const beforeConfidence = confidence.overall;
      const beforeTaskCount = plan.tasks.length;
      const beforeFailedChecks = verification.checks.filter(c => c.state !== 'verified').map(c => c.check);
      const oldPlan = plan;

      plan = await this.retrievalPlanner.replan(plan, verification, grounding, understanding);

      grounding = await tracer.traceStage('ground-replan', 'GroundingLayer',
        () => this.groupAndRetrieve(plan), 0.9, undefined);

      verification = await tracer.traceStage('verify-replan', 'VerificationEngine',
        () => this.verify(understanding, plan, grounding, input), 0, undefined);

      confidence = this.confidenceAggregator.aggregate(understanding, grounding, verification, plan);

      const afterFailedChecks = verification.checks.filter(c => c.state !== 'verified').map(c => c.check);
      const changedCaps = plan.tasks
        .filter(t => !oldPlan.tasks.some(ot => ot.requiredCapability === t.requiredCapability))
        .map(t => t.requiredCapability);

      refinementHistory.push({
        iteration: replanCount,
        confidenceBefore: beforeConfidence,
        confidenceAfter: confidence.overall,
        taskCountBefore: beforeTaskCount,
        taskCountAfter: plan.tasks.length,
        changedCapabilities: [...new Set(changedCaps)],
        failedChecks: afterFailedChecks,
        resolvedChecks: beforeFailedChecks.filter(c => !afterFailedChecks.includes(c)),
        triggeredBy: this.findLowestConfidenceComponent(confidence),
      });

      if (confidence.overall >= CONFIDENCE_THRESHOLD) break;
    }

    if (confidence.overall < CONFIDENCE_THRESHOLD) {
      this.degraded = true;
    }

    const trace = tracer.getTrace();
    const evidence = tracer.getEvidence();
    const budget = tracer.getBudget({ understand: 2000, plan: 3000, ground: 2000, verify: 500, assemble: 300 });

    this.degraded = this.degraded || budget.exceeded;

    const context = this.contextBuilder.build(
      understanding,
      plan,
      grounding,
      verification,
      confidence,
      version,
      contractId,
      createdAt,
      this.degraded,
      this.buildDegradedReason(budget, replanCount),
      trace,
      evidence,
      budget,
      awarenessBrief ? {
        summary: awarenessBrief.summary,
        overallHealth: awarenessBrief.overallHealth,
        overallConfidence: awarenessBrief.overallConfidence,
        awarenessScore: awarenessBrief.awarenessScore,
        nextAttention: awarenessBrief.nextAttention,
        businessSituation: {
          summary: awarenessBrief.businessSituation.summary,
          riskLevel: awarenessBrief.businessSituation.riskLevel,
          trend: awarenessBrief.businessSituation.trend,
          focus: awarenessBrief.businessSituation.focus,
        },
        systemSituation: {
          summary: awarenessBrief.systemSituation.summary,
          health: awarenessBrief.systemSituation.health,
          degradedServices: awarenessBrief.systemSituation.degradedServices,
          runtimeState: awarenessBrief.systemSituation.runtimeState,
        },
        criticalSignalCount: awarenessBrief.criticalSignals.length,
        warningCount: awarenessBrief.warnings.length,
      } : undefined,
      refinementHistory,
    );

    const frozen = freezeContract(context);
    this.diagnostics.recordContract(frozen);
    return frozen;
  }

  private async understand(input: ReasonerInput): Promise<{ result: UnderstandingResult; brief?: import('./awareness/AwarenessTypes').AwarenessBrief }> {
    return this.understandingEngine.analyze(input);
  }

  private async createRetrievalPlan(
    understanding: UnderstandingResult,
    _input: ReasonerInput,
  ): Promise<RetrievalPlan> {
    return this.retrievalPlanner.plan(understanding, this.repoMetadata, this.tools);
  }

  private async groupAndRetrieve(plan: RetrievalPlan): Promise<GroundingResult> {
    return this.groundingLayer.execute(plan);
  }

  private async verify(
    understanding: UnderstandingResult,
    plan: RetrievalPlan,
    grounding: GroundingResult,
    _input: ReasonerInput,
  ): Promise<VerificationResult> {
    return this.verificationEngine.verify(understanding, plan, grounding, this.tools);
  }

  private buildDegradedReason(budget: RuntimeBudget, replanCount: number): string | undefined {
    const reasons: string[] = [];
    if (budget.exceeded) reasons.push(`Budget exceeded: ${budget.exceededStages.join(', ')}`);
    if (replanCount > 0) reasons.push(`Replanned (${replanCount} iteration${replanCount > 1 ? 's' : ''})`);
    if (this.degraded) reasons.push('Low confidence after replan');
    return reasons.length > 0 ? reasons.join('; ') : undefined;
  }

  private findLowestConfidenceComponent(conf: OverallConfidence): string {
    const entries: [string, number][] = [
      ['reasoning', conf.reasoning],
      ['grounding', conf.grounding],
      ['verification', conf.verification],
    ];
    entries.sort((a, b) => a[1] - b[1]);
    return entries[0][0];
  }

  public isDegraded(): boolean {
    return this.degraded;
  }

  public setDegraded(d: boolean): void {
    this.degraded = d;
  }

  public getCapabilityGraph(): CapabilityGraph {
    return this.capabilityGraph;
  }

  public getProvider(): ReasoningProvider {
    return this.provider;
  }

  public getDiagnostics(): RuntimeDiagnosticsAPI {
    return this.diagnostics;
  }
}
