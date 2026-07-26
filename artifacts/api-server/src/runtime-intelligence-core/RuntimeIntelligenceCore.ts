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
import { ContextRegistry } from '../ric/context-builders/ContextRegistry';
import { InventoryContextBuilder } from '../ric/context-builders/inventory/InventoryContextBuilder';
import { FinanceContextBuilder } from '../ric/context-builders/finance/FinanceContextBuilder';
import { SalesContextBuilder } from '../ric/context-builders/sales/SalesContextBuilder';
import { HRContextBuilder } from '../ric/context-builders/hr/HRContextBuilder';
import { PurchasingContextBuilder } from '../ric/context-builders/purchasing/PurchasingContextBuilder';
import { ProductionContextBuilder } from '../ric/context-builders/production/ProductionContextBuilder';
import { getERPGroundingProvider } from '../ric/ERPGroundingProvider';
import { UnderstandingEngine } from './understanding';
import { RetrievalPlanner, PastPlanMemory } from './planning';
import { GroundingLayer } from './grounding';
import { VerificationEngine } from './verification';
import { RuntimeContextBuilder } from './builder';
import { ConfidenceAggregator } from './confidence';
import { freezeContract } from './contract';
import { PipelineTracer } from './RuntimeTrace';
import { RuntimeDiagnosticsAPI } from './diagnostics';
import { RepositoryMetadataGenerator } from './registry';
import { UnifiedAwarenessEngine } from './awareness';
import { MetricsStore, ReflectionEngine, EvidenceStore } from './learning';

export class RuntimeIntelligenceCore {
  private capabilityGraph: CapabilityGraph;
  private provider: ReasoningProvider;
  private awarenessEngine: UnifiedAwarenessEngine;
  private understandingEngine: UnderstandingEngine;
  private retrievalPlanner: RetrievalPlanner;
  private pastPlanMemory: PastPlanMemory;
  private groundingLayer: GroundingLayer;
  private verificationEngine: VerificationEngine;
  private contextBuilder: RuntimeContextBuilder;
  private confidenceAggregator: ConfidenceAggregator;
  private repoMetadataGenerator: RepositoryMetadataGenerator;
  private repoMetadata: RepositoryMetadata[] = [];
  private tools: ToolDescriptor[] = [];
  private degraded: boolean = false;
  private diagnostics: RuntimeDiagnosticsAPI;
  private metricsStore: MetricsStore;
  private reflectionEngine: ReflectionEngine;
  private evidenceStore: EvidenceStore;
  private contextRegistry: ContextRegistry;
  private erpGroundingProvider: ReturnType<typeof getERPGroundingProvider>;

  constructor(
    capabilityGraph: CapabilityGraph,
    provider: ReasoningProvider,
    rootDir: string,
  ) {
    this.capabilityGraph = capabilityGraph;
    this.provider = provider;
    this.awarenessEngine = new UnifiedAwarenessEngine();
    this.understandingEngine = new UnderstandingEngine(provider);
    this.pastPlanMemory = new PastPlanMemory(50);
    this.retrievalPlanner = new RetrievalPlanner(provider, this.pastPlanMemory);
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
    this.metricsStore = new MetricsStore();
    this.reflectionEngine = new ReflectionEngine();
    this.evidenceStore = new EvidenceStore();
    this.erpGroundingProvider = getERPGroundingProvider();
    this.contextRegistry = new ContextRegistry();
    this.registerContextBuilders();
    this.registerObservatory();
  }

  private registerContextBuilders(): void {
    this.contextRegistry.register(new InventoryContextBuilder());
    this.contextRegistry.register(new FinanceContextBuilder());
    this.contextRegistry.register(new SalesContextBuilder());
    this.contextRegistry.register(new HRContextBuilder());
    this.contextRegistry.register(new PurchasingContextBuilder());
    this.contextRegistry.register(new ProductionContextBuilder());
  }

  private registerObservatory(): void {
    try {
      const { getAiObservatory } = require('../ai/observatory/AiObservatory');
      const obs = getAiObservatory();
      obs.registerMetrics(this.metricsStore);
      obs.registerReflection(this.reflectionEngine);
      obs.registerEvidence(this.evidenceStore);
      obs.registerGrounding(this.groundingLayer);
      obs.setRicReady(true);
    } catch {
      // Observatory module optional — non-critical
    }
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

    const awarenessBrief = await this.awarenessEngine.collectBrief().catch(() => undefined);

    const understanding = await tracer.traceStage('understand', this.provider.constructor?.name || 'ReasoningProvider',
      () => this.understand(input, awarenessBrief), 0, undefined);

    let plan = await tracer.traceStage('plan', this.provider.constructor?.name || 'ReasoningProvider',
      () => this.createRetrievalPlan(understanding, input), understanding.confidence, undefined);

    if (awarenessBrief) {
      this.groundingLayer.setAdaptiveTimeout(awarenessBrief.systemSituation.health);
    }

    let grounding = await tracer.traceStage('ground', 'GroundingLayer',
      () => this.groupAndRetrieve(plan), 0.9, undefined);

    tracer.addEvidence(this.groundingLayer.getEvidence());

    let erpRaw: Record<string, any> | null = null;
    let erpContexts: Record<string, any> | null = null;
    let operationalState: any = null;

    if (input.tenantContext?.branchId || input.userRole !== 'system') {
      try {
        const domains = this.contextRegistry.getAllDomains();
        erpRaw = await this.erpGroundingProvider.readAll(
          domains,
          Number(input.tenantContext?.branchId) || undefined,
        );
        erpContexts = await this.contextRegistry.buildAll(erpRaw, {
          branchId: Number(input.tenantContext?.branchId) || undefined,
          userId: Number(input.tenantContext?.userId) || undefined,
        });
        operationalState = {
          ...(erpContexts as any),
          timestamp: Date.now(),
        };
      } catch (e: any) {
        console.error(`[RIC:ERP] context build failed: ${e.message}`);
      }
    }

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

    if (confidence.overall >= 0.8) {
      this.pastPlanMemory.store(plan, understanding, confidence.overall);
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
      erpContexts ?? undefined,
      operationalState ?? undefined,
    );

    this.metricsStore.recordRequest(
      understanding.domain.primary,
      confidence.overall,
      confidence.verification,
      this.degraded,
      replanCount,
    );

    const reflection = this.reflectionEngine.reflect(
      confidence.overall,
      verification,
      refinementHistory,
      this.degraded,
      this.metricsStore,
      trace.stages,
    );

    const evidenceEntries = this.evidenceStore.record(reflection);

    const frozen = freezeContract(context);
    this.diagnostics.recordContract(frozen);
    return frozen;
  }

  private async understand(input: ReasonerInput, brief?: import('./awareness/AwarenessTypes').AwarenessBrief): Promise<UnderstandingResult> {
    const { result } = await this.understandingEngine.analyze(input, brief);
    return result;
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

  public getMetrics(): MetricsStore {
    return this.metricsStore;
  }

  public getReflections(): ReflectionEngine {
    return this.reflectionEngine;
  }

  public getEvidence(): EvidenceStore {
    return this.evidenceStore;
  }
}
