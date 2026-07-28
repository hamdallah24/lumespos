import type {
  RuntimeContext,
  RuntimeTrace,
  Evidence,
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
  ModuleStatusValue,
} from './types';
import { parseTimeOrThrow } from '../business-os/temporal/TimeParser';
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

// ===== Structural defaults for failed stages (executives must check moduleStatus) =====
const FAILED_UNDERSTANDING: UnderstandingResult = {
  goal: "unavailable", intent: "unavailable", subIntent: "unavailable",
  domain: { primary: "general", secondary: [] },
  entities: [],
  reasoning: { intentRationale: "Module failed", domainRationale: "Module failed", entityRationale: "Module failed", alternativesConsidered: [] },
  thinkingMode: "balanced", urgency: "low",
  risk: { level: "low", factors: ["Module unavailable"], requiresApproval: false },
  confidence: 0, needClarification: false,
};

const FAILED_PLAN: RetrievalPlan = {
  tasks: [],
  executionGraph: { steps: [], parallel: [], estimatedCost: "low", estimatedDuration: "0ms", riskNotes: ["Planning failed"] },
  toolNeeds: [],
};

const FAILED_GROUNDING: GroundingResult = {
  operationalData: [], memoryEntries: [], knowledgeBlocks: [],
  metadataNodes: [], fileContents: [], errors: [], executionTimeMs: 0,
};

const FAILED_VERIFICATION: VerificationResult = {
  state: "unverified", checks: [], verificationConfidence: 0,
  contradictions: [], warnings: [], recovery: [], confidenceAdjustment: 0,
};

const FAILED_CONFIDENCE: OverallConfidence = {
  reasoning: 0, grounding: 0, verification: 0, overall: 0,
  provenance: {
    intentConfidence: 0, entityConfidence: 0, groundingCompleteness: 0,
    verificationStatus: "unverified", planningConfidence: 0, toolResolutionConfidence: 0,
  },
  weakAreas: ["assembly-degraded"], safeToExecute: false,
};

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
    const moduleStatus: Record<string, ModuleStatusValue> = {};
    const degradedModules: string[] = [];
    const degradedReasons: Record<string, string> = {};
    const timeCtx = parseTimeOrThrow(input.message);

    // ---- STAGE: Understanding ----
    let understanding: UnderstandingResult;
    try {
      const awarenessBrief = await this.awarenessEngine.collectBrief().catch(() => undefined);
      understanding = await tracer.traceStage('understand', this.provider.constructor?.name || 'ReasoningProvider',
        () => this.understand(input, awarenessBrief), 0, undefined);
      moduleStatus.understanding = "ready";
    } catch (e: unknown) {
      const err = e as Error;
      moduleStatus.understanding = "failed";
      degradedModules.push("understanding");
      degradedReasons.understanding = `${err.message}\n${err.stack}`;
      console.error(`[RIC:Module] understanding failed: ${err.message}`, err.stack);
      understanding = FAILED_UNDERSTANDING;
    }

    // ---- STAGE: Planning ----
    let plan: RetrievalPlan;
    try {
      plan = await tracer.traceStage('plan', this.provider.constructor?.name || 'ReasoningProvider',
        () => this.createRetrievalPlan(understanding, input), understanding.confidence, undefined);
      moduleStatus.planning = "ready";
    } catch (e: unknown) {
      const err = e as Error;
      moduleStatus.planning = "failed";
      degradedModules.push("planning");
      degradedReasons.planning = `${err.message}\n${err.stack}`;
      console.error(`[RIC:Module] planning failed: ${err.message}`, err.stack);
      plan = FAILED_PLAN;
    }

    // ---- STAGE: Grounding ----
    let grounding: GroundingResult;
    try {
      if (moduleStatus.understanding === "ready") {
        try {
          const brief = await this.awarenessEngine.collectBrief().catch(() => undefined);
          if (brief) {
            this.groundingLayer.setAdaptiveTimeout(brief.systemSituation.health);
          }
        } catch { /* non-critical */ }
      }
      grounding = await tracer.traceStage('ground', 'GroundingLayer',
        () => this.groupAndRetrieve(plan), 0.9, undefined);
      tracer.addEvidence(this.groundingLayer.getEvidence());
      moduleStatus.grounding = "ready";
    } catch (e: unknown) {
      const err = e as Error;
      moduleStatus.grounding = "failed";
      degradedModules.push("grounding");
      degradedReasons.grounding = `${err.message}\n${err.stack}`;
      console.error(`[RIC:Module] grounding failed: ${err.message}`, err.stack);
      grounding = FAILED_GROUNDING;
    }

    // ---- STAGE: ERP Context ----
    let erpContexts: Record<string, any> | null = null;
    let operationalState: any = null;
    try {
      if (input.tenantContext?.branchId || input.userRole !== 'system') {
        const domains = this.contextRegistry.getAllDomains();
        const erpRaw = await this.erpGroundingProvider.readAll(
          domains,
          Number(input.tenantContext?.branchId) || undefined,
          timeCtx,
        );
        erpContexts = await this.contextRegistry.buildAll(erpRaw, {
          branchId: Number(input.tenantContext?.branchId) || undefined,
          userId: Number(input.tenantContext?.userId) || undefined,
        });
        operationalState = {
          ...(erpContexts as any),
          timestamp: Date.now(),
        };
      }
      moduleStatus.erp = "ready";
    } catch (e: unknown) {
      const err = e as Error;
      moduleStatus.erp = "failed";
      degradedModules.push("erp");
      degradedReasons.erp = `${err.message}\n${err.stack}`;
      console.error(`[RIC:Module] ERP context build failed: ${err.message}`, err.stack);
      erpContexts = null;
      operationalState = null;
    }

    // ---- STAGE: Verification ----
    let verification: VerificationResult;
    try {
      verification = await tracer.traceStage('verify', 'VerificationEngine',
        () => this.verify(understanding, plan, grounding, input), 0, undefined);
      moduleStatus.verification = "ready";
    } catch (e: unknown) {
      const err = e as Error;
      moduleStatus.verification = "failed";
      degradedModules.push("verification");
      degradedReasons.verification = `${err.message}\n${err.stack}`;
      console.error(`[RIC:Module] verification failed: ${err.message}`, err.stack);
      verification = FAILED_VERIFICATION;
    }

    // ---- Confidence + Replan Loop ----
    let confidence: OverallConfidence;
    try {
      confidence = this.confidenceAggregator.aggregate(understanding, grounding, verification, plan);
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`[RIC:Module] confidence aggregation failed: ${err.message}`, err.stack);
      confidence = FAILED_CONFIDENCE;
    }

    const REFINEMENT_THRESHOLD = 0.75;
    const MAX_REPLAN_ITERATIONS = 2;
    let replanCount = 0;
    const refinementHistory: RefinementEntry[] = [];

    while (
      moduleStatus.understanding === "ready" &&
      moduleStatus.planning === "ready" &&
      moduleStatus.grounding === "ready" &&
      confidence.overall < REFINEMENT_THRESHOLD &&
      replanCount < MAX_REPLAN_ITERATIONS
    ) {
      replanCount++;
      const beforeConfidence = confidence.overall;
      const beforeTaskCount = plan.tasks.length;
      const beforeFailedChecks = verification.checks.filter(c => c.state !== 'verified').map(c => c.check);
      const oldPlan = plan;

      try {
        plan = await this.retrievalPlanner.replan(plan, verification, grounding, understanding);
      } catch (e: unknown) {
        const err = e as Error;
        console.error(`[RIC:Module] replan failed: ${err.message}`, err.stack);
        break;
      }

      try {
        grounding = await tracer.traceStage('ground-replan', 'GroundingLayer',
          () => this.groupAndRetrieve(plan), 0.9, undefined);
      } catch { /* use existing grounding */ }

      try {
        verification = await tracer.traceStage('verify-replan', 'VerificationEngine',
          () => this.verify(understanding, plan, grounding, input), 0, undefined);
      } catch { /* use existing verification */ }

      try {
        confidence = this.confidenceAggregator.aggregate(understanding, grounding, verification, plan);
      } catch { /* use existing confidence */ }

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

      if (confidence.overall >= REFINEMENT_THRESHOLD) break;
    }

    // ---- Learning: store successful plans ----
    if (confidence.overall >= 0.8 && plan.tasks.length > 0) {
      try {
        this.pastPlanMemory.store(plan, understanding, confidence.overall);
      } catch { /* non-critical */ }
    }

    // ---- Trace, Evidence, Budget ----
    let trace: RuntimeTrace;
    let evidence: Evidence[];
    let budget: RuntimeBudget;
    try {
      trace = tracer.getTrace();
      evidence = tracer.getEvidence();
      budget = tracer.getBudget({ understand: 2000, plan: 3000, ground: 2000, verify: 500, assemble: 300 });
    } catch {
      trace = { stages: [], totalDurationMs: 0 };
      evidence = [];
      budget = { limits: {}, exceeded: false, exceededStages: [] };
    }

    const isDegraded = degradedModules.length > 0 || budget.exceeded;
    const degradedReason = this.buildDegradedReason(budget, replanCount, degradedModules, degradedReasons);
    const assemblyStatus = degradedModules.length === 0 && !budget.exceeded ? "full"
      : (degradedModules.length <= 3 ? "partial" : "minimal");

    // ---- Build Context ----
    let awarenessBrief: any = undefined;
    try {
      const brief = await this.awarenessEngine.collectBrief().catch(() => undefined);
      if (brief) {
        awarenessBrief = {
          summary: brief.summary,
          overallHealth: brief.overallHealth,
          overallConfidence: brief.overallConfidence,
          awarenessScore: brief.awarenessScore,
          nextAttention: brief.nextAttention,
          businessSituation: {
            summary: brief.businessSituation.summary,
            riskLevel: brief.businessSituation.riskLevel,
            trend: brief.businessSituation.trend,
            focus: brief.businessSituation.focus,
          },
          systemSituation: {
            summary: brief.systemSituation.summary,
            health: brief.systemSituation.health,
            degradedServices: brief.systemSituation.degradedServices,
            runtimeState: brief.systemSituation.runtimeState,
          },
          criticalSignalCount: brief.criticalSignals.length,
          warningCount: brief.warnings.length,
        };
      }
    } catch { /* non-critical */ }

    const context = this.contextBuilder.build(
      understanding,
      plan,
      grounding,
      verification,
      confidence,
      version,
      contractId,
      createdAt,
      isDegraded,
      degradedReason,
      trace,
      evidence,
      budget,
      awarenessBrief,
      refinementHistory,
      erpContexts ?? undefined,
      operationalState ?? undefined,
      moduleStatus,
      degradedModules,
      degradedReasons,
      assemblyStatus,
      timeCtx,
    );

    // ---- Metrics + Reflection + Evidence Store ----
    try {
      this.metricsStore.recordRequest(
        understanding.domain.primary,
        confidence.overall,
        confidence.verification,
        isDegraded,
        replanCount,
      );
    } catch { /* non-critical */ }

    try {
      const reflection = this.reflectionEngine.reflect(
        confidence.overall,
        verification,
        refinementHistory,
        isDegraded,
        this.metricsStore,
        trace.stages,
      );
      try { this.evidenceStore.record(reflection); } catch { /* non-critical */ }
    } catch { /* non-critical */ }

    // ---- Freeze Contract ----
    let frozen: RuntimeContext;
    try {
      frozen = freezeContract(context);
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`[RIC:Contract] freezeContract failed: ${err.message}`, err.stack);
      frozen = context;
    }

    try { this.diagnostics.recordContract(frozen); } catch { /* non-critical */ }
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

  private buildDegradedReason(
    budget: RuntimeBudget,
    replanCount: number,
    degradedModules: string[],
    degradedReasons: Record<string, string>,
  ): string | undefined {
    const reasons: string[] = [];
    if (budget.exceeded) reasons.push(`Budget exceeded: ${budget.exceededStages.join(', ')}`);
    if (replanCount > 0) reasons.push(`Replanned (${replanCount} iteration${replanCount > 1 ? 's' : ''})`);
    for (const mod of degradedModules) {
      const r = degradedReasons[mod];
      reasons.push(`${mod}: ${r ? r.split('\n')[0] : 'unknown error'}`);
    }
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
    return false;
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
