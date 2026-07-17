import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { ReasoningProvider, RuntimeContext } from '../src/runtime-intelligence-core/types';
import { RICAdapter } from '../src/runtime-intelligence-core/RICAdapter';
import { RuntimeIntelligenceCore } from '../src/runtime-intelligence-core/RuntimeIntelligenceCore';

// ── MOCK AiObservatory ──
vi.mock('../src/ai/observatory/AiObservatory', () => ({
  getAiObservatory: () => ({
    registerMetrics: vi.fn(),
    registerReflection: vi.fn(),
    registerEvidence: vi.fn(),
    registerGrounding: vi.fn(),
    setRicReady: vi.fn(),
    incrementRequestCount: vi.fn(),
    snapshot: vi.fn().mockReturnValue({}),
  }),
}));

// ── MOCK LLM PROVIDER ──
const mockReason = vi.fn().mockResolvedValue({
  data: {
    intent: 'inquiry', subIntent: 'financial_report', goal: 'get financial data',
    domain: { primary: 'finance', secondary: ['operations'] },
    entities: [{ type: 'amount', name: 'revenue', confidence: 0.9 }],
    reasoning: { intentRationale: 'user asks about finance', domainRationale: 'finance domain', entityRationale: 'revenue mentioned', alternativesConsidered: [] },
    thinkingMode: 'balanced', urgency: 'low',
    risk: { level: 'low', factors: [], requiresApproval: false },
    confidence: 0.88, needClarification: false,
  },
});

const planMock = vi.fn().mockResolvedValue({
  data: {
    tasks: [
      { id: 't1', requiredCapability: 'BUSINESS_METRICS', priority: 'high', dependency: [], reason: 'Get revenue data', request: { description: 'revenue and expenses' }, timeout: 3000, estimatedLatency: 500, estimatedCost: { latency: 500, tokens: 200, apiCalls: 1 }, cachePolicy: 'allow', failurePolicy: 'ignore', required: true },
      { id: 't2', requiredCapability: 'KNOWLEDGE_BLOCK', priority: 'medium', dependency: [], reason: 'Get financial knowledge', request: { description: 'financial ratios' }, timeout: 2000, estimatedLatency: 300, estimatedCost: { latency: 300, tokens: 150, apiCalls: 1 }, cachePolicy: 'allow', failurePolicy: 'ignore', required: false },
    ],
    toolNeeds: [{ capability: 'BUSINESS_METRICS', priority: 'required' }],
    executionGraph: { steps: [{ id: 's1', type: 'retrieve', capability: 'BUSINESS_METRICS', description: 'Get metrics' }, { id: 's2', type: 'retrieve', capability: 'KNOWLEDGE_BLOCK', description: 'Get knowledge' }], parallel: ['s1'], estimatedCost: 'low', estimatedDuration: '2s', riskNotes: [] },
  },
});

function makeMockProvider(): ReasoningProvider {
  let callCount = 0;
  return {
    reason: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return mockReason();  // understanding
      return planMock();                           // planning
    }),
    health: vi.fn().mockResolvedValue({ ok: true, latency: 0 }),
    constructor: { name: 'TestProvider' },
  } as unknown as ReasoningProvider;
}

describe('E2E: RuntimeGateway Pipeline', () => {
  let core: RuntimeIntelligenceCore;
  let adapter: RICAdapter;
  let runtimeContext: RuntimeContext | null;

  beforeAll(async () => {
    const provider = makeMockProvider();
    const capGraph = {
      getCapability: vi.fn(),
      getAllCapabilities: vi.fn().mockReturnValue([]),
      findCapabilitiesByExecutive: vi.fn(),
      registerFromExecutives: vi.fn(),
    } as any;

    adapter = new RICAdapter();
    (adapter as any).core = new RuntimeIntelligenceCore(capGraph, provider, '/tmp');
    (adapter as any).core.initialize = vi.fn().mockResolvedValue(undefined);
    (adapter as any).initialized = true;

    runtimeContext = await adapter.assemble({
      message: 'Apa laporan keuangan terbaru?',
      userId: 1,
      branchId: 1,
    });
  });

  it('should build RuntimeContext with metadata', () => {
    expect(runtimeContext).toBeDefined();
    expect(runtimeContext!.metadata.version).toBe('1.0');
    expect(runtimeContext!.metadata.contractId).toBeTruthy();
    expect(runtimeContext!.metadata.createdAt).toBeGreaterThan(0);
  });

  it('should understand finance domain', () => {
    expect(runtimeContext!.intelligence.domain.primary).toBe('finance');
    expect(runtimeContext!.intelligence.intent).toBe('inquiry');
    expect(runtimeContext!.intelligence.entities.length).toBeGreaterThanOrEqual(0);
  });

  it('should plan tasks with capabilities', () => {
    expect(runtimeContext!.planning.executionPlan.length).toBeGreaterThanOrEqual(0);
    const caps = runtimeContext!.planning.suggestedTools.map(t => t.capability);
    expect(caps).toContain('BUSINESS_METRICS');
  });

  it('should have verification results', () => {
    expect(runtimeContext!.verification.results).toBeDefined();
    expect(runtimeContext!.verification.results.checks).toBeDefined();
  });

  it('should have runtime confidence', () => {
    expect(runtimeContext!.runtime.confidence.overall).toBeGreaterThanOrEqual(0);
    expect(runtimeContext!.runtime.confidence.reasoning).toBeGreaterThanOrEqual(0);
  });

  it('should have degraded flag set', () => {
    expect(typeof runtimeContext!.metadata.degraded).toBe('boolean');
  });

  it('should have planning strategy', () => {
    expect(runtimeContext!.planning.recommendedStrategy).toBeTruthy();
    expect(runtimeContext!.planning.expectedOutput).toBeTruthy();
  });

  it('should have valid trace', () => {
    expect(runtimeContext!.runtime.trace.stages.length).toBeGreaterThanOrEqual(4);
    const stageNames = runtimeContext!.runtime.trace.stages.map(s => s.name);
    expect(stageNames).toContain('understand');
    expect(stageNames).toContain('plan');
    expect(stageNames).toContain('ground');
    expect(stageNames).toContain('verify');
  });

  it('should export ExecutiveContext', () => {
    const execCtx = adapter.getExecutiveContext();
    expect(execCtx).not.toBeNull();
    expect(execCtx!.intent.intent).toBe('inquiry');
    expect(execCtx!.domain.primaryDomain).toBe('finance');
  });
});

describe('E2E: Error Handling', () => {
  it('should handle empty input gracefully', async () => {
    const provider = makeMockProvider();
    const capGraph = { getCapability: vi.fn(), getAllCapabilities: vi.fn().mockReturnValue([]), findCapabilitiesByExecutive: vi.fn(), registerFromExecutives: vi.fn() } as any;
    const localAdapter = new RICAdapter();
    (localAdapter as any).core = new RuntimeIntelligenceCore(capGraph, provider, '/tmp');
    (localAdapter as any).core.initialize = vi.fn().mockResolvedValue(undefined);
    (localAdapter as any).initialized = true;

    await expect(localAdapter.assemble({
      message: '',
      userId: 0,
    })).resolves.toBeDefined();
  });

  it('should throw without initialization', async () => {
    const uninitAdapter = new RICAdapter();
    await expect(uninitAdapter.assemble({
      message: 'test',
      userId: 1,
    })).rejects.toThrow('RIC not initialized');
  });
});
