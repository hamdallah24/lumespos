import type { DecisionEntry, ExecutionEntry, DiscussionEntry } from "./WorkspaceTypes";

let decisionCounter = 0;
let discussionCounter = 0;

export function createDecisionEntry(
  executive: string,
  decisionId: string,
  action: string,
  reasoning: string,
  confidence: number,
  parameters: Record<string, unknown>,
  source: DecisionEntry["source"] = "chat",
): DecisionEntry {
  return {
    decisionId,
    executive,
    action,
    reasoning,
    confidence,
    parameters,
    timestamp: new Date().toISOString(),
    source,
  };
}

export function createExecutionEntry(
  executionId: string,
  decisionId: string,
  executive: string,
  action: string,
  module: string,
  success: boolean,
  message: string,
  durationMs: number,
): ExecutionEntry {
  return {
    executionId,
    decisionId,
    executive,
    action,
    module,
    success,
    message,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}

export function createDiscussionEntry(
  executive: string,
  message: string,
  response: string,
  source: DiscussionEntry["source"] = "chat",
): DiscussionEntry {
  discussionCounter++;
  return {
    id: `disc-${Date.now()}-${discussionCounter}`,
    executive,
    message,
    response,
    timestamp: new Date().toISOString(),
    source,
  };
}
