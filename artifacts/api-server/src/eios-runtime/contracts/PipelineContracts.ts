import type { ComponentId } from "./ComponentId";

export type PipelineTrigger = "event_bus" | "scheduler" | "founder" | "manual" | "external_api" | "future_automation";

export type PipelineStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface PipelineContext {
  readonly correlationId: string;
  readonly traceId: string;
  readonly stageId: ComponentId | null;
  readonly executionState: Readonly<Record<string, unknown>>;
  branchId?: number;
  executiveScope?: string[];
  sourceTrigger?: PipelineTrigger;
  startedAt?: string;
  completedAt?: string;
  status?: PipelineStatus;
  read<T>(key: string): T | undefined;
  apply(delta: ContextDelta): void;
  getSnapshot(): Readonly<Record<string, unknown>>;
}

export interface ContextDelta {
  correlationId: string;
  stageId: ComponentId;
  patches: Record<string, unknown>;
  timestamp: string;
}

export interface ExecutionResult {
  correlationId: string;
  success: boolean;
  durationMs: number;
  stages: ComponentId[];
  failures: Array<{ stage: ComponentId; error: string }>;
}

export interface BriefSection {
  title: string;
  priority: number;
  content: string;
  items: string[];
}

export interface ExecutiveBrief {
  id: string;
  role: string;
  title: string;
  date: string;
  summary: string;
  sections: BriefSection[];
  actionItems: string[];
  pendingApprovals: string[];
}

export interface ExecutiveDecision {
  role: string;
  action: string;
  reasoning: string;
  confidence: number;
  delegateTo?: string;
  payload?: Record<string, unknown>;
}

export interface ExecutiveHandler {
  role: string;
  decide(brief: ExecutiveBrief, context?: Record<string, unknown>): Promise<ExecutiveDecision>;
}

// ECP-039: ExecutionContract — immutable execution parameters
export interface ExecutionContract {
  role: string;
  mission: string;
  objective: string;
  mode: "REASONING" | "EXECUTION";
  strategy?: string;
  capabilities: string[];
  allowedTools: { name: string; description: string; parameters: Record<string, any> }[];
  budget: { tokens: number | "adaptive"; tools: number | "adaptive"; timeMs: number | "adaptive" };
  exitPolicy: "IMMEDIATE" | "OBJECTIVE_COMPLETED" | "CONCLUDE" | "BUDGET_EXHAUSTED";
  telemetryPolicy: "SUMMARY_ONLY" | "FULL_TRACE" | "OFF";
  verificationPolicy: "LIGHT" | "STRICT" | "CONSENSUS" | "OFF";
}
