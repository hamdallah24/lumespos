export interface ExecutiveReasonInput {
  persona: string;
  context: string;
  userId: number;
  onProgress?: (msg: string) => void;
}

export interface ExecutiveReasonOutput {
  content: string;
  confidence: number;
}

export async function executiveReason(input: ExecutiveReasonInput): Promise<ExecutiveReasonOutput> {
  const { callDeepSeek } = await import('../../llm/llm-adapter');

  const result = await callDeepSeek(
    input.persona,
    input.context,
    input.userId,
    'bisnis',
  );

  return {
    content: result,
    confidence: result.startsWith('ERROR:') ? 0 : 0.8,
  };
}
