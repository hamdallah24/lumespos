import { executeToolWithResult, executeToolCall, LOCAL_TOOLS as TOOL_DEFINITIONS } from '../../tools/tool-adapter';

export interface ExecutionRequest {
  toolName: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ExecutionResult {
  success: boolean;
  toolName: string;
  output: unknown;
  error?: string;
  durationMs: number;
  verified: boolean;
}

export class ExecutionEngine {
  private executionLog: ExecutionResult[] = [];
  private readonly maxLog = 100;

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const t0 = Date.now();

    try {
      const result = await executeToolWithResult(request.toolName, request.args);
      const durationMs = Date.now() - t0;

      const entry: ExecutionResult = {
        success: true,
        toolName: request.toolName,
        output: result,
        durationMs,
        verified: true,
      };

      this.executionLog.push(entry);
      if (this.executionLog.length > this.maxLog) {
        this.executionLog.shift();
      }

      return entry;
    } catch (err) {
      const durationMs = Date.now() - t0;
      const errorMessage = err instanceof Error ? err.message : String(err);

      const entry: ExecutionResult = {
        success: false,
        toolName: request.toolName,
        output: null,
        error: errorMessage,
        durationMs,
        verified: false,
      };

      this.executionLog.push(entry);
      if (this.executionLog.length > this.maxLog) {
        this.executionLog.shift();
      }

      return entry;
    }
  }

  async executeWithLLM(
    messages: { role: string; content: string }[],
    tools: { name: string; description: string; parameters: Record<string, any> }[],
  ): Promise<{ text: string; toolResults: ExecutionResult[] }> {
    const { callLLMWithTools } = await import('../../llm/llm-adapter');

    const llmResult = await callLLMWithTools(messages, tools);
    const toolResults: ExecutionResult[] = [];
    if (llmResult.toolCalls) {
      for (const call of llmResult.toolCalls) {
        toolResults.push({
          success: true,
          toolName: call.name || 'unknown',
          output: (call as any).result ?? '',
          durationMs: 0,
          verified: true,
        });
      }
    }

    return { text: llmResult.content || '', toolResults };
  }

  async executeMultiTurn(
    systemPrompt: string,
    userMessage: string,
    userId: number,
    context: string,
    toolSet: unknown[],
    maxTokens: number,
    onProgress?: (msg: string) => void,
    onTool?: (event: { name: string; status: string; durationMs?: number }) => void,
    onExecutionEvent?: (snapshot: unknown) => void,
    executionSpec?: Record<string, unknown>,
  ): Promise<{ text: string; toolsUsed: number; filesRead: string[] }> {
    const { callDeepSeekWithTools } = await import('../../llm/llm-adapter');

    const llmResult = await callDeepSeekWithTools(
      systemPrompt, userMessage, userId, context, toolSet,
      maxTokens, onProgress, onTool,
      false, undefined, onExecutionEvent,
      executionSpec ?? {}, async () => true,
    );

    for (let i = 0; i < (llmResult.toolsUsed || 0); i++) {
      this.executionLog.push({
        success: true,
        toolName: `multi_turn_${context}`,
        output: null,
        durationMs: 0,
        verified: true,
      });
    }

    return {
      text: llmResult.text || '',
      toolsUsed: llmResult.toolsUsed || 0,
      filesRead: llmResult.filesRead || [],
    };
  }

  getToolDefinitions() {
    return TOOL_DEFINITIONS;
  }

  clearLog(): void {
    this.executionLog = [];
  }

  getRecentExecutions(limit: number = 10): ExecutionResult[] {
    return this.executionLog.slice(-limit);
  }
}

let instance: ExecutionEngine | null = null;

export function getExecutionEngine(): ExecutionEngine {
  if (!instance) instance = new ExecutionEngine();
  return instance;
}
