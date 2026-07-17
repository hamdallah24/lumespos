import type {
  UnderstandingResult,
  RetrievalPlan,
  RetrievalTask,
  RepositoryMetadata,
  ReasoningProvider,
  ToolDescriptor,
  VerificationResult,
  GroundingResult,
  CapabilityName,
} from '../types';
import { PLANNING_SYSTEM_PROMPT } from './prompts/planning-prompt';
import { REPLANNING_SYSTEM_PROMPT } from './prompts/replanning-prompt';
import { PastPlanMemory } from './PastPlanMemory';

const MAX_RETRIES = 2;

export class RetrievalPlanner {
  private provider: ReasoningProvider;
  private pastPlanMemory: PastPlanMemory;

  constructor(provider: ReasoningProvider, pastPlanMemory?: PastPlanMemory) {
    this.provider = provider;
    this.pastPlanMemory = pastPlanMemory ?? new PastPlanMemory();
  }

  getPastPlanMemory(): PastPlanMemory {
    return this.pastPlanMemory;
  }

  async plan(
    understanding: UnderstandingResult,
    metadata: RepositoryMetadata[],
    tools: ToolDescriptor[],
  ): Promise<RetrievalPlan> {
    const pastPlans = this.pastPlanMemory.findSimilar(
      understanding.intent, understanding.domain.primary, understanding.subIntent, 2,
    );

    const pastPlanSection = pastPlans.length > 0
      ? `\n\n## Similar Past Plans\n${pastPlans.map((p, i) =>
        `--- Past Plan ${i + 1} (confidence: ${p.confidenceAfter.toFixed(2)}, domain: ${p.domain}) ---\n` +
        JSON.stringify(p.plan, null, 2)
      ).join('\n')}`
      : '';

    const fullPrompt = `${PLANNING_SYSTEM_PROMPT}${pastPlanSection}\n\n## Understanding Result\n${JSON.stringify(understanding, null, 2)}\n\n## Repository Metadata\n${JSON.stringify(metadata, null, 2)}\n\n## Tool Catalog\n${JSON.stringify(tools, null, 2)}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.provider.reason<RetrievalPlan>(
          fullPrompt,
          {},
          { temperature: 0.1, thinkingMode: understanding.thinkingMode },
        );

        if (!result || !result.data) {
          throw new Error('Empty response from provider');
        }

        return this.validate(result.data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          continue;
        }
      }
    }

    const bestPlan = pastPlans.length > 0 ? pastPlans[0].plan : null;
    if (bestPlan) return bestPlan;
    return this.degradedPlan(lastError);
  }

  private buildContext(
    understanding: UnderstandingResult,
    metadata: RepositoryMetadata[],
    tools: ToolDescriptor[],
  ): string {
    const parts: string[] = [];

    parts.push(`Intent: ${understanding.intent} (${understanding.subIntent})`);
    parts.push(`Domain: ${understanding.domain.primary}${understanding.domain.secondary.length > 0 ? ' + ' + understanding.domain.secondary.join(', ') : ''}`);
    parts.push(`Thinking mode: ${understanding.thinkingMode}`);
    parts.push(`Urgency: ${understanding.urgency}`);

    const enabledTools = tools.filter(t => t.enabled);
    parts.push(`Available tools (${enabledTools.length}): ${enabledTools.slice(0, 10).map(t => `${t.name}[${t.capabilities.join(',')}]`).join(', ')}${enabledTools.length > 10 ? '...' : ''}`);

    const highImportance = metadata.filter(m => m.importance === 'high').slice(0, 15);
    parts.push(`Key repository files (${highImportance.length}): ${highImportance.map(m => m.path).join(', ')}`);

    return parts.join('\n');
  }

  private validate(data: Partial<RetrievalPlan>): RetrievalPlan {
    const tasks = Array.isArray(data.tasks) ? data.tasks.map(t => ({
      id: t.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      requiredCapability: (t as unknown as Record<string, unknown>).requiredCapability as string || 'KNOWLEDGE_BLOCK',
      fallbackCapabilities: Array.isArray((t as unknown as Record<string, unknown>).fallbackCapabilities)
        ? (t as unknown as Record<string, unknown>).fallbackCapabilities as string[]
        : undefined,
      priority: t.priority || 'medium' as const,
      dependency: Array.isArray(t.dependency) ? t.dependency : [],
      reason: t.reason || '',
      request: t.request || { description: '' },
      timeout: typeof t.timeout === 'number' ? t.timeout : 2000,
      estimatedLatency: typeof t.estimatedLatency === 'number' ? t.estimatedLatency : 500,
      estimatedCost: {
        latency: t.estimatedCost?.latency ?? 500,
        tokens: t.estimatedCost?.tokens ?? 200,
        apiCalls: t.estimatedCost?.apiCalls ?? 1,
      },
      cachePolicy: t.cachePolicy || 'allow' as const,
      failurePolicy: t.failurePolicy || 'ignore' as const,
      required: t.required ?? false,
      limits: t.limits,
    })) : [];

    return {
      tasks: tasks as RetrievalTask[],
      toolNeeds: Array.isArray(data.toolNeeds) ? data.toolNeeds : [],
      executionGraph: data.executionGraph ?? {
        steps: [],
        parallel: [],
        estimatedCost: 'low',
        estimatedDuration: '',
        riskNotes: ['Fallback: LLM planning failed'],
      },
    };
  }

  async replan(
    previousPlan: RetrievalPlan,
    verification: VerificationResult,
    grounding: GroundingResult,
    understanding: UnderstandingResult,
  ): Promise<RetrievalPlan> {
    const failedChecks = verification.checks.filter(c => c.state !== 'verified');
    const hasGroundingErrors = grounding.errors.length > 0;
    const hasContradictions = verification.contradictions.length > 0;

    if (failedChecks.length === 0 && !hasGroundingErrors && !hasContradictions) {
      return previousPlan;
    }

    const context = [
      `Previous plan had ${previousPlan.tasks.length} tasks.`,
      `Failed checks (${failedChecks.length}):`,
      ...failedChecks.map(c => `  - ${c.check}: ${c.state} (expected: ${c.expected}, actual: ${c.actual})`),
      hasContradictions ? `Contradictions (${verification.contradictions.length}):` : '',
      ...verification.contradictions.map(c => `  - ${c.reasoningOutput} vs ${c.evidence} (${c.severity})`),
      hasGroundingErrors ? `Grounding errors (${grounding.errors.length}):` : '',
      ...grounding.errors.map(e => `  - [${e.provider}] ${e.message}`),
      `Original intent: ${understanding.intent} (${understanding.subIntent})`,
      `Domain: ${understanding.domain.primary}`,
    ].filter(Boolean).join('\n');

    const fullPrompt = `${REPLANNING_SYSTEM_PROMPT}\n\n## Replanning Context\n${context}\n\n## Previous Plan\n${JSON.stringify(previousPlan, null, 2)}\n\n## Successful Data\nOperational: ${grounding.operationalData.length} items\nMemory: ${grounding.memoryEntries.length} items\nKnowledge: ${grounding.knowledgeBlocks.length} items\nRepository: ${grounding.fileContents.length} files\nMetadata: ${grounding.metadataNodes.length} nodes`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.provider.reason<RetrievalPlan>(
          fullPrompt,
          {},
          { temperature: 0.2, thinkingMode: understanding.thinkingMode },
        );
        if (!result || !result.data) throw new Error('Empty response from provider');
        return this.validate(result.data);
      } catch (err) {
        if (attempt < MAX_RETRIES) continue;
      }
    }

    return this.degradedReplan(failedChecks, grounding);
  }

  private degradedReplan(
    failedChecks: Array<{ check: string; state: string }>,
    grounding: GroundingResult,
  ): RetrievalPlan {
    const capabilityFallback: Record<string, CapabilityName> = {
      file_availability: 'REPOSITORY_DOCS',
      memory_availability: 'CONVERSATION_MEMORY',
      operational_data: 'BUSINESS_METRICS',
      tool_availability: 'TOOL_AVAILABILITY',
      entity_verification: 'KNOWLEDGE_BLOCK',
      domain_availability: 'SYSTEM_STATE',
    };

    const tasks: RetrievalTask[] = [];
    for (const check of failedChecks) {
      const fallbackCap = capabilityFallback[check.check];
      if (fallbackCap) {
        tasks.push({
          id: `replan-${check.check}-${Date.now()}`,
          requiredCapability: fallbackCap,
          priority: 'high',
          dependency: [],
          reason: `RETRY: ${check.check} was ${check.state}`,
          request: { description: `Retry for ${check.check}` },
          timeout: 3000,
          estimatedLatency: 500,
          estimatedCost: { latency: 500, tokens: 200, apiCalls: 1 },
          cachePolicy: 'bypass',
          failurePolicy: 'ignore',
          required: false,
        });
      }
    }

    for (const err of grounding.errors) {
      const alreadyAdded = tasks.some(t => t.reason.includes(err.provider));
      if (!alreadyAdded) {
        tasks.push({
          id: `replan-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          requiredCapability: 'KNOWLEDGE_BLOCK',
          priority: 'medium',
          dependency: [],
          reason: `RETRY: grounding error from ${err.provider}: ${err.message}`,
          request: { description: `Retry after grounding error: ${err.message}` },
          timeout: 3000,
          estimatedLatency: 500,
          estimatedCost: { latency: 500, tokens: 200, apiCalls: 1 },
          cachePolicy: 'bypass',
          failurePolicy: 'ignore',
          required: false,
        });
      }
    }

    return {
      tasks,
      toolNeeds: [],
      executionGraph: {
        steps: tasks.map(t => ({
          id: t.id,
          type: 'retrieve' as const,
          description: t.reason,
          dependsOn: [],
        })),
        parallel: [tasks.map(t => t.id)],
        estimatedCost: 'low',
        estimatedDuration: 'retry',
        riskNotes: ['Degraded replan: LLM unavailable'],
      },
    };
  }

  private degradedPlan(error: Error | null): RetrievalPlan {
    return {
      tasks: [{
        id: 'fallback-task',
        requiredCapability: 'KNOWLEDGE_BLOCK',
        priority: 'low',
        dependency: [],
        reason: 'Fallback: LLM planning unavailable',
        request: { description: 'No task generated' },
        timeout: 1000,
        estimatedLatency: 100,
        estimatedCost: { latency: 100, tokens: 0, apiCalls: 0 },
        cachePolicy: 'bypass',
        failurePolicy: 'ignore',
        required: false,
      }],
      toolNeeds: [],
      executionGraph: {
        steps: [{
          id: 'fallback-step',
          type: 'execute',
          description: 'Fallback: LLM planning unavailable',
          dependsOn: [],
        }],
        parallel: [],
        estimatedCost: 'low',
        estimatedDuration: 'unknown',
        riskNotes: error ? [`Planner error: ${error.message}`] : ['Fallback mode'],
      },
    };
  }
}
