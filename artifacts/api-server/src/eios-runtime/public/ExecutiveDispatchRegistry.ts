import type { ExecutiveBrief, ExecutiveDecision, ExecutiveHandler } from "../contracts/PipelineContracts";

const handlers = new Map<string, ExecutiveHandler>();

export const ExecutiveDispatchRegistry = {
  register(handler: ExecutiveHandler): void {
    const key = handler.role.toUpperCase();
    if (handlers.has(key)) return;
    handlers.set(key, handler);
  },

  get(role: string): ExecutiveHandler | undefined {
    return handlers.get(role.toUpperCase());
  },

  getAll(): ExecutiveHandler[] {
    return [...handlers.values()];
  },

  async dispatch(role: string, brief: ExecutiveBrief, context?: Record<string, unknown>): Promise<ExecutiveDecision | null> {
    const handler = this.get(role);
    if (!handler) return null;
    return handler.decide(brief, context);
  },
};
