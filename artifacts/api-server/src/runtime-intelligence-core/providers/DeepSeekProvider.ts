import type { ReasoningProvider, ReasoningOptions, ReasoningResult, HealthStatus } from '../types';
import { callLLMWithTools } from '../../ai/llm/llm-adapter';

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export class DeepSeekProvider implements ReasoningProvider {
  private model: string;

  constructor(model?: string) {
    this.model = model || DEEPSEEK_MODEL;
  }

  async reason<T>(
    prompt: string,
    _schema: unknown,
    options?: ReasoningOptions,
  ): Promise<ReasoningResult<T>> {
    const startTime = Date.now();

    const messages = [
      { role: 'system', content: prompt },
    ];

    const maxTokens = options?.maxTokens ?? 2000;

    const result = await callLLMWithTools(
      messages,
      [],
      maxTokens,
      false,
      true,
    );

    const latencyMs = Date.now() - startTime;

    if (result.status === 'error') {
      throw new Error(`DeepSeek API error (${result.errorStatus}): ${result.content}`);
    }

    let parsed: T;
    try {
      parsed = JSON.parse(result.content) as T;
    } catch {
      throw new Error(`Failed to parse DeepSeek response as JSON: ${result.content.slice(0, 200)}`);
    }

    return {
      data: parsed,
      provider: 'DeepSeek',
      model: this.model,
      latencyMs,
      inputTokens: result.tokensUsed || 0,
      outputTokens: 0,
      confidence: result.status === 'ok' ? 0.9 : 0.5,
    };
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await callLLMWithTools(
        [{ role: 'user', content: 'ping' }],
        [],
        1,
        false,
        false,
      );
      return { ok: true, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }
}
