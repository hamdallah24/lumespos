import type { ReasoningProvider, ReasoningOptions, ReasoningResult, HealthStatus } from '../types';

export class RegexFallbackProvider implements ReasoningProvider {
  async reason<T>(
    prompt: string,
    _schema: unknown,
    _options?: ReasoningOptions,
  ): Promise<ReasoningResult<T>> {
    const startTime = Date.now();

    const degradedResult = this.extractFallback(prompt) as unknown as T;

    return {
      data: degradedResult,
      provider: 'RegexFallback',
      model: 'regex-fallback',
      latencyMs: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      confidence: 0.2,
    };
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, latency: 0 };
  }

  private extractFallback(prompt: string): Record<string, unknown> {
    const intentMatch = prompt.match(/intent[:\s]+(\w+)/i);
    const domainMatch = prompt.match(/domain[:\s]+(\w+)/i);

    return {
      goal: 'Fallback: LLM unavailable',
      intent: intentMatch?.[1]?.toLowerCase() || 'inquiry',
      subIntent: 'fallback',
      domain: { primary: domainMatch?.[1]?.toLowerCase() || 'general', secondary: [] },
      entities: [],
      reasoning: {
        intentRationale: 'Fallback mode',
        domainRationale: 'Fallback mode',
        entityRationale: 'Fallback mode',
        alternativesConsidered: [],
      },
      thinkingMode: 'fast',
      urgency: 'low',
      risk: { level: 'low', factors: ['Fallback mode'], requiresApproval: false },
      confidence: 0.2,
      needClarification: false,
    };
  }
}
