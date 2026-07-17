import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── TEST PROVIDER ──
function makeProvider(overrides?: Partial<{ reason: any; health: any }>) {
  return {
    reason: overrides?.reason ?? vi.fn().mockResolvedValue({
      data: {
        intent: 'inquiry', subIntent: 'test', goal: 'test',
        domain: { primary: 'general', secondary: [] }, entities: [],
        reasoning: { intentRationale: 'test', domainRationale: 'test', entityRationale: 'test', alternativesConsidered: [] },
        thinkingMode: 'balanced', urgency: 'low',
        risk: { level: 'low', factors: [], requiresApproval: false },
        confidence: 0.85, needClarification: false,
      },
    }),
    health: overrides?.health ?? vi.fn().mockResolvedValue({ ok: true, latency: 0 }),
    constructor: { name: 'TestProvider' },
  } as unknown as ReasoningProvider;
}

// ── MODULE IMPORTS (after mocks) ──
import { UnderstandingEngine } from '../src/runtime-intelligence-core/understanding/UnderstandingEngine';
import { RetrievalPlanner } from '../src/runtime-intelligence-core/planning/RetrievalPlanner';
import { PastPlanMemory } from '../src/runtime-intelligence-core/planning/PastPlanMemory';
import { RuntimeContextBuilder } from '../src/runtime-intelligence-core/builder/RuntimeContextBuilder';
import { mapToExecutive } from '../src/runtime-intelligence-core/ExecutiveContextAdapter';
import type { ReasoningProvider, ReasonerInput } from '../src/runtime-intelligence-core/types';

// ── HELPERS ──

function makeInput(overrides?: Partial<ReasonerInput>): ReasonerInput {
  return {
    message: 'Apa laporan keuangan terbaru?',
    conversationHistory: [],
    availableDomains: ['finance', 'operations', 'marketing'],
    availableTools: [],
    availableMemoryStores: ['working', 'decision', 'knowledge'],
    repositoryIndex: [],
    tenantContext: { tenantId: 'default', branchId: '1', userId: '1' },
    thinkingMode: 'balanced',
    ...overrides,
  };
}

// ── COGNITIVE TEST 1: Awareness → Understanding ──

describe('Cognitive: Awareness affects Understanding', () => {
  it('should include awareness context in the prompt', async () => {
    const reasonFn = vi.fn().mockResolvedValue({
      data: {
        intent: 'inquiry', subIntent: 'test', goal: 'test',
        domain: { primary: 'general', secondary: [] }, entities: [],
        reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] },
        thinkingMode: 'balanced', urgency: 'low',
        risk: { level: 'low', factors: [], requiresApproval: false },
        confidence: 0.85, needClarification: false,
      },
    });
    const engine = new UnderstandingEngine(makeProvider({ reason: reasonFn }));

    const brief = {
      summary: 'CRITICAL: Cash low — liquidity risk',
      overallHealth: 'CRITICAL' as any, overallConfidence: 0.9, awarenessScore: 25,
      nextAttention: 'Cash', businessSituation: { summary: '', riskLevel: 'high', trend: 'declining', focus: 'cash' },
      systemSituation: { summary: '', health: 'degraded', degradedServices: [], runtimeState: '' },
      criticalSignals: [], warnings: [], signals: [], graph: { nodes: [], edges: [] },
      timestamp: new Date().toISOString(),
    };

    await engine.analyze(makeInput(), brief);
    const promptArg = reasonFn.mock.calls[0][0];
    expect(promptArg).toContain('SITUATION AWARENESS');
    expect(promptArg).toContain('CRITICAL: Cash low');
  });

  it('should work without awareness', async () => {
    const reasonFn = vi.fn().mockResolvedValue({
      data: {
        intent: 'inquiry', subIntent: 'test', goal: 'test',
        domain: { primary: 'general', secondary: [] }, entities: [],
        reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] },
        thinkingMode: 'balanced', urgency: 'low',
        risk: { level: 'low', factors: [], requiresApproval: false },
        confidence: 0.85, needClarification: false,
      },
    });
    const engine = new UnderstandingEngine(makeProvider({ reason: reasonFn }));
    const { result } = await engine.analyze(makeInput());
    expect(result.intent).toBe('inquiry');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

// ── COGNITIVE TEST 2: Understanding → Planning ──

describe('Cognitive: Understanding determines Plan capabilities', () => {
  it('should plan finance tasks for finance domain', async () => {
    const planReason = vi.fn().mockResolvedValue({
      data: {
        tasks: [
          { id: 'task-1', requiredCapability: 'BUSINESS_METRICS', priority: 'high', dependency: [], reason: 'Get financial data', request: { description: 'revenue and expenses' }, timeout: 3000, estimatedLatency: 500, estimatedCost: { latency: 500, tokens: 200, apiCalls: 1 }, cachePolicy: 'allow', failurePolicy: 'ignore', required: true },
        ],
        toolNeeds: [{ capability: 'BUSINESS_METRICS', priority: 'required' }],
        executionGraph: { steps: [{ id: 'step-1', type: 'retrieve', capability: 'BUSINESS_METRICS', description: 'Get financial data' }], parallel: [], estimatedCost: 'low', estimatedDuration: '1s', riskNotes: [] },
      },
    });

    const planner = new RetrievalPlanner(makeProvider({ reason: planReason }), new PastPlanMemory(10));
    const plan = await planner.plan(
      { intent: 'inquiry', subIntent: 'financial_report', domain: { primary: 'finance', secondary: [] }, goal: '', entities: [], reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] }, thinkingMode: 'balanced', urgency: 'low', risk: { level: 'low', factors: [], requiresApproval: false }, confidence: 0.9, needClarification: false },
      [],
      [],
    );

    expect(plan.tasks.some(t => t.requiredCapability === 'BUSINESS_METRICS')).toBe(true);
  });

  it('should use past plan memory for similar intents', async () => {
    const memory = new PastPlanMemory(10);
    const pastPlan = {
      tasks: [{ id: 'past-1', requiredCapability: 'KNOWLEDGE_BLOCK', priority: 'medium', dependency: [], reason: 'Past knowledge', request: {}, timeout: 2000, estimatedLatency: 500, estimatedCost: { latency: 500, tokens: 200, apiCalls: 1 }, cachePolicy: 'allow', failurePolicy: 'ignore', required: false }],
      toolNeeds: [],
      executionGraph: { steps: [], parallel: [], estimatedCost: 'low', estimatedDuration: '', riskNotes: [] },
    };
    memory.store(pastPlan, { intent: 'inquiry', subIntent: 'research', domain: { primary: 'knowledge', secondary: [] }, goal: '', entities: [], reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] }, thinkingMode: 'balanced', urgency: 'low', risk: { level: 'low', factors: [], requiresApproval: false }, confidence: 0.85, needClarification: false }, 0.9);

    const similar = memory.findSimilar('inquiry', 'knowledge', 'research');
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].plan.tasks[0].requiredCapability).toBe('KNOWLEDGE_BLOCK');
  });
});

// ── COGNITIVE TEST 3: Context Building ──

describe('Cognitive: Context Builder produces valid RuntimeContext', () => {
  it('should build complete RuntimeContext with metadata', () => {
    const builder = new RuntimeContextBuilder();
    const mockUnderstanding = {
      goal: 'test', intent: 'inquiry', subIntent: 'test', domain: { primary: 'finance', secondary: [] },
      entities: [], reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] },
      thinkingMode: 'balanced', urgency: 'low', risk: { level: 'low', factors: [], requiresApproval: false },
      confidence: 0.9, needClarification: false,
    };
    const mockVerification = {
      checks: [{ check: 'domain_availability', state: 'verified', expected: 'finance', actual: 'finance', severity: 'info', confidence: 1.0 }],
      warnings: [], contradictions: [], recovery: [], confidenceAdjustment: 0, verificationConfidence: 0.9,
    };
    const mockConfidence = { reasoning: 0.9, grounding: 0.85, verification: 0.9, adjustment: 0, overall: 0.88, weakAreas: [], provenance: { intentConfidence: 0.9, domainConfidence: 0.9 } };

    const ctx = builder.build(
      mockUnderstanding,
      { tasks: [], toolNeeds: [], executionGraph: { steps: [], parallel: [], estimatedCost: 'low', estimatedDuration: '', riskNotes: [] } },
      { operationalData: [], memoryEntries: [], knowledgeBlocks: [], fileContents: [], metadataNodes: [], errors: [], executionTimeMs: 50 },
      mockVerification, mockConfidence, '1.0', 'test-contract', Date.now(), false, undefined,
      { stages: [], totalDurationMs: 50 }, [], { limits: {}, exceeded: false, exceededStages: [] },
    );

    expect(ctx.metadata.version).toBe('1.0');
    expect(ctx.metadata.contractId).toBe('test-contract');
    expect(ctx.intelligence.domain.primary).toBe('finance');
    expect(ctx.planning.executionPlan).toEqual([]);
  });
});

// ── COGNITIVE TEST 5: ExecutiveContext Mapping ──

describe('Cognitive: ExecutiveContext maps correctly', () => {
  it('should include awareness when available', () => {
    const ctx = {
      metadata: { version: '1.0', contractId: 'x', createdAt: 0, degraded: false },
      intelligence: { intent: 'inquiry', domain: { primary: 'finance' }, risk: { level: 'low', factors: [], requiresApproval: false }, goal: '', subIntent: '', entities: [], reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] }, thinkingMode: 'balanced', urgency: 'low', confidence: 0.85, needClarification: false },
      planning: { executionPlan: [], suggestedTools: [], recommendedStrategy: '', expectedOutput: '' },
      grounding: { operational: [], memory: { type: 'working', entries: [], retrievalTime: 0 }, knowledge: [], repository: [], metadata: [], requiredTruth: [], retrievedTruth: [], missingTruth: [] },
      verification: { results: { checks: [], warnings: [], contradictions: [], recovery: [], confidenceAdjustment: 0, verificationConfidence: 0.9 }, explainability: { whyDomain: '', whyTool: '', whyRepository: '', whyMemory: '', whyConfidence: '', whyPlanning: '' } },
      awareness: { summary: 'Cash low', overallHealth: 'WARNING', overallConfidence: 0.78, awarenessScore: 65, nextAttention: 'Cash', businessSituation: { summary: '', riskLevel: 'medium', trend: 'declining', focus: 'cash' }, systemSituation: { summary: '', health: 'degraded', degradedServices: ['checkout'], runtimeState: 'running' }, criticalSignalCount: 1, warningCount: 2 },
      runtime: { trace: { stages: [], totalDurationMs: 100 }, evidence: [], budget: { limits: {}, exceeded: false, exceededStages: [] }, confidence: { reasoning: 0.9, grounding: 0.85, verification: 0.9, adjustment: 0, overall: 0.88, weakAreas: [], provenance: { intentConfidence: 0.85, domainConfidence: 0.9 } }, reasoningTrace: [] },
    } as any;

    const execCtx = mapToExecutive(ctx);
    expect(execCtx.awareness).toBeDefined();
    expect(execCtx.awareness!.situation).toBe('Cash low');
    expect(execCtx.awareness!.health).toBe('WARNING');
    expect(execCtx.awareness!.businessRisk).toBe('medium');
  });

  it('should handle missing awareness gracefully', () => {
    const ctx = {
      metadata: { version: '1.0', contractId: 'x', createdAt: 0, degraded: false },
      intelligence: { intent: 'inquiry', domain: { primary: 'finance' }, risk: { level: 'low', factors: [], requiresApproval: false }, goal: '', subIntent: '', entities: [], reasoning: { intentRationale: '', domainRationale: '', entityRationale: '', alternativesConsidered: [] }, thinkingMode: 'balanced', urgency: 'low', confidence: 0.85, needClarification: false },
      planning: { executionPlan: [], suggestedTools: [], recommendedStrategy: '', expectedOutput: '' },
      grounding: { operational: [], memory: { type: 'working', entries: [], retrievalTime: 0 }, knowledge: [], repository: [], metadata: [], requiredTruth: [], retrievedTruth: [], missingTruth: [] },
      verification: { results: { checks: [], warnings: [], contradictions: [], recovery: [], confidenceAdjustment: 0, verificationConfidence: 0.9 }, explainability: { whyDomain: '', whyTool: '', whyRepository: '', whyMemory: '', whyConfidence: '', whyPlanning: '' } },
      runtime: { trace: { stages: [], totalDurationMs: 100 }, evidence: [], budget: { limits: {}, exceeded: false, exceededStages: [] }, confidence: { reasoning: 0.9, grounding: 0.85, verification: 0.9, adjustment: 0, overall: 0.88, weakAreas: [], provenance: { intentConfidence: 0.85, domainConfidence: 0.9 } }, reasoningTrace: [] },
    } as any;

    const execCtx = mapToExecutive(ctx);
    expect(execCtx.awareness).toBeUndefined();
  });
});
