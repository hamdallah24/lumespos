import type { BaseEvent } from "../../event-bus/types";

export interface ExecutionResult {
  success: boolean;
  decisionId: string;
  executionId: string;
  action: string;
  module: string;
  actor: string;
  branchId: number;
  userId: number;
  timestamp: string;
  durationMs: number;
  message: string;
  eventIds: string[];
  errors: string[];
  warnings: string[];
  affectedItems?: { type: string; id: number; before?: any; after?: any }[];
  events?: BaseEvent[];
}
