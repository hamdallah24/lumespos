import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ExecutionResult } from "../execution/ExecutionResult";
import type { RuntimeContext } from "../../runtime-intelligence-core/types";

export interface WorkspaceEvent {
  type: "thinking" | "reasoning" | "decision" | "execution" | "result" | "error";
  timestamp: string;
  data: any;
}

export interface WorkspaceSnapshot {
  requestId: string;
  message: string;
  userId: number;
  branchId: number;
  runtimeContext: RuntimeContext | null;
  selectedExecutive: string;
  supportingExecutives: string[];
  decisions: ExecutiveDecision[];
  executionResults: ExecutionResult[];
  events: WorkspaceEvent[];
  thinking: string[];
  reasoning: string[];
  summary: string | null;
  startedAt: number;
  completedAt: number | null;
  durationMs: number;
  error: string | null;
}

export class ExecutionWorkspace {
  private requestId: string;
  private message: string;
  private userId: number;
  private branchId: number;
  private runtimeContext: RuntimeContext | null = null;
  private selectedExecutive: string = "";
  private supportingExecutives: string[] = [];
  private decisions: ExecutiveDecision[] = [];
  private executionResults: ExecutionResult[] = [];
  private events: WorkspaceEvent[] = [];
  private thinking: string[] = [];
  private reasoning: string[] = [];
  private summary: string | null = null;
  private startedAt: number;
  private completedAt: number | null = null;
  private error: string | null = null;

  constructor(requestId: string, message: string, userId: number, branchId: number) {
    this.requestId = requestId;
    this.message = message;
    this.userId = userId;
    this.branchId = branchId;
    this.startedAt = Date.now();
    this.emit("thinking", { stage: "init", message: "Workspace initialized" });
  }

  emit(type: WorkspaceEvent["type"], data: any): void {
    this.events.push({ type, timestamp: new Date().toISOString(), data });
  }

  addThinking(text: string): void {
    this.thinking.push(text);
    this.emit("thinking", { text });
  }

  addReasoning(text: string): void {
    this.reasoning.push(text);
    this.emit("reasoning", { text });
  }

  addDecision(decision: ExecutiveDecision): void {
    this.decisions.push(decision);
    this.emit("decision", { decisionId: decision.decisionId, action: decision.action });
  }

  addExecutionResult(result: ExecutionResult): void {
    this.executionResults.push(result);
    this.emit("execution", { executionId: result.executionId, success: result.success });
  }

  setRuntimeContext(ctx: RuntimeContext): void {
    this.runtimeContext = ctx;
  }

  setSelectedExecutive(primary: string, supporting: string[]): void {
    this.selectedExecutive = primary;
    this.supportingExecutives = supporting;
    this.emit("reasoning", { selection: { primary, supporting } });
  }

  setSummary(text: string): void {
    this.summary = text;
  }

  setError(err: string): void {
    this.error = err;
    this.emit("error", { error: err });
  }

  complete(): void {
    this.completedAt = Date.now();
    this.emit("result", { summary: this.summary, durationMs: this.durationMs });
  }

  get durationMs(): number {
    return (this.completedAt || Date.now()) - this.startedAt;
  }

  snapshot(): WorkspaceSnapshot {
    return {
      requestId: this.requestId,
      message: this.message,
      userId: this.userId,
      branchId: this.branchId,
      runtimeContext: this.runtimeContext,
      selectedExecutive: this.selectedExecutive,
      supportingExecutives: this.supportingExecutives,
      decisions: this.decisions,
      executionResults: this.executionResults,
      events: this.events,
      thinking: this.thinking,
      reasoning: this.reasoning,
      summary: this.summary,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      durationMs: this.durationMs,
      error: this.error,
    };
  }

  getRequestId(): string { return this.requestId; }
}
