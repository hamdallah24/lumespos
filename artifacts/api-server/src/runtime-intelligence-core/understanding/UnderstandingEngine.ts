import type { UnderstandingResult, ReasoningProvider, ReasonerInput } from '../types';
import { UNDERSTANDING_SYSTEM_PROMPT } from './prompts/understanding-prompt';
import { UnderstandingFallback } from './UnderstandingFallback';
import type { AwarenessBrief } from '../awareness';

const MAX_RETRIES = 2;
const MIN_CONFIDENCE = 0.60;

export class UnderstandingEngine {
  private provider: ReasoningProvider;
  private fallback: UnderstandingFallback;

  constructor(provider: ReasoningProvider) {
    this.provider = provider;
    this.fallback = new UnderstandingFallback();
  }

  async analyze(input: ReasonerInput, brief?: AwarenessBrief | null): Promise<{ result: UnderstandingResult; brief?: AwarenessBrief }> {
    const userContext = this.buildUserContext(input, brief);
    const userMessage = input.message;
    const fullPrompt = `${UNDERSTANDING_SYSTEM_PROMPT}\n\nUser message: ${userMessage}\nContext: ${userContext}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.provider.reason<UnderstandingResult>(
          fullPrompt,
          {},
          {
            temperature: 0.1,
            thinkingMode: input.thinkingMode ?? 'balanced',
          },
        );

        if (!result || !result.data) {
          throw new Error('Empty response from provider');
        }

        const parsed = this.validate(result.data);

        if (parsed.confidence < MIN_CONFIDENCE) {
          return { result: this.fallback.analyze(input.message), brief: brief ?? undefined };
        }

        return { result: parsed, brief: brief ?? undefined };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          continue;
        }
      }
    }

    return { result: this.fallback.analyze(input.message), brief: brief ?? undefined };
  }

  private buildUserContext(input: ReasonerInput, brief?: AwarenessBrief | null): string {
    const context: string[] = [];

    if (brief) {
      context.push(`=== SITUATION AWARENESS (JSON) ===`);
      context.push(JSON.stringify({
        summary: brief.summary,
        overallHealth: brief.overallHealth,
        overallConfidence: brief.overallConfidence,
        awarenessScore: brief.awarenessScore,
        nextAttention: brief.nextAttention,
        businessSituation: brief.businessSituation,
        systemSituation: brief.systemSituation,
        criticalSignals: brief.criticalSignals.map(s => ({
          source: s.source, origin: s.origin, label: s.label, value: s.value,
          reason: s.reason, priority: s.priority, severity: s.severity,
          sourceConfidence: s.sourceConfidence, signalConfidence: s.signalConfidence,
          freshness: s.freshness, contradiction: s.contradiction,
        })),
        warnings: brief.warnings.map(s => ({
          source: s.source, label: s.label, value: s.value, reason: s.reason,
          severity: s.severity,
        })),
        signalGraph: {
          nodes: brief.graph.nodes,
          edges: brief.graph.edges,
        },
      }, null, 2));
      context.push(`=== END AWARENESS ===`);
    }

    if (input.availableDomains && input.availableDomains.length > 0) {
      context.push(`Available domains: ${input.availableDomains.join(', ')}`);
    }

    if (input.availableTools && input.availableTools.length > 0) {
      const toolNames = input.availableTools.filter(t => t.enabled).map(t => t.name);
      context.push(`Available tools: ${toolNames.join(', ')}`);
    }

    if (input.tenantContext) {
      if (input.tenantContext.branchId) {
        context.push(`Active branch: ${input.tenantContext.branchId}`);
      }
      if (input.tenantContext.userId) {
        context.push(`User: ${input.tenantContext.userId}`);
      }
    }

    if (input.conversationHistory && input.conversationHistory.length > 0) {
      const last = input.conversationHistory[input.conversationHistory.length - 1];
      context.push(`Previous message: ${last.content}`);
    }

    return context.length > 0 ? context.join('\n') : 'No additional context';
  }

  private validate(data: Partial<UnderstandingResult>): UnderstandingResult {
    const defaults: UnderstandingResult = {
      goal: data.goal || '',
      intent: data.intent || 'inquiry',
      subIntent: data.subIntent || '',
      domain: {
        primary: data.domain?.primary || 'general',
        secondary: data.domain?.secondary || [],
      },
      entities: Array.isArray(data.entities) ? data.entities : [],
      reasoning: {
        intentRationale: data.reasoning?.intentRationale || '',
        domainRationale: data.reasoning?.domainRationale || '',
        entityRationale: data.reasoning?.entityRationale || '',
        alternativesConsidered: Array.isArray(data.reasoning?.alternativesConsidered)
          ? data.reasoning.alternativesConsidered
          : [],
      },
      thinkingMode: data.thinkingMode || 'balanced',
      urgency: data.urgency || 'medium',
      risk: {
        level: data.risk?.level || 'low',
        factors: data.risk?.factors || [],
        requiresApproval: data.risk?.requiresApproval ?? false,
      },
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      needClarification: data.needClarification ?? false,
      clarificationQuestion: data.clarificationQuestion,
    };

    return defaults;
  }
}
