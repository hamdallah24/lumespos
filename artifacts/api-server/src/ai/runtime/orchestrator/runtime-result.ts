// ECP-031: Runtime Result — standardized output for ALL Runtimes
// Frozen. Every Runtime returns this format.
// CEO, CTO, COO, Chat, Consultant — identical output shape.

export interface RuntimeMetrics {
  runtime: string;
  missionId?: string;
  tokensUsed: number;
  toolsCalled: number;
  durationMs: number;
  delegated: boolean;
  delegatedTo?: string;
  verificationPassed: boolean;
  knowledgeWritten: boolean;
  confidence?: number;  // ECP-014R: optional confidence from metrics engine
  findings?: any[];     // ECP-014R: optional structured findings
}

export interface RuntimeResult {
  success: boolean;
  text: string;
  runtime: string;
  mission?: {
    id: string;
    status: string;
  };
  metrics: RuntimeMetrics;
  pipeline: string[];
}

export function createResult(runtime: string, text: string, success = true, pipeline: string[] = []): RuntimeResult {
  return {
    success,
    text,
    runtime,
    pipeline,
    metrics: {
      runtime,
      tokensUsed: 0,
      toolsCalled: 0,
      durationMs: 0,
      delegated: false,
      verificationPassed: true,
      knowledgeWritten: false,
    },
  };
}

export function withMetrics(result: RuntimeResult, overrides: Partial<RuntimeMetrics>): RuntimeResult {
  return { ...result, metrics: { ...result.metrics, ...overrides } };
}
