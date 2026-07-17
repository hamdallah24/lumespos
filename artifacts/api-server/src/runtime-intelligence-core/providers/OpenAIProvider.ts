import type { ReasoningProvider, ReasoningOptions, ReasoningResult, HealthStatus } from '../types';

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export class OpenAIProvider implements ReasoningProvider {
  private model: string;

  constructor(model?: string) {
    this.model = model || OPENAI_MODEL;
  }

  async reason<T>(
    prompt: string,
    _schema: unknown,
    options?: ReasoningOptions,
  ): Promise<ReasoningResult<T>> {
    if (!OPENAI_KEY) {
      throw new Error('OpenAI API key not configured (OPENAI_API_KEY)');
    }

    const startTime = Date.now();

    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: prompt }],
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 2000,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
    }

    const json = await response.json() as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty content');
    }

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new Error(`Failed to parse OpenAI response as JSON: ${content.slice(0, 200)}`);
    }

    return {
      data: parsed,
      provider: 'OpenAI',
      model: this.model,
      latencyMs,
      inputTokens: json.usage?.prompt_tokens || 0,
      outputTokens: json.usage?.completion_tokens || 0,
      confidence: 0.9,
    };
  }

  async health(): Promise<HealthStatus> {
    if (!OPENAI_KEY) return { ok: false, latency: 0 };

    const start = Date.now();
    try {
      const response = await fetch(`${OPENAI_BASE}/models`, {
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      return { ok: response.ok, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }
}
