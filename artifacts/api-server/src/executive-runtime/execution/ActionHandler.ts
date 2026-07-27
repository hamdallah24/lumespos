import type { ExecutiveDecision } from "../../erp-execution/types";
import type { ExecutionContext } from "./ExecutionContext";
import type { ExecutionResult } from "./ExecutionResult";
import type { ValidationResult } from "../../erp-execution/types";

export interface ActionHandler {
  readonly action: string;
  readonly module: string;
  validate(decision: ExecutiveDecision, ctx: ExecutionContext): Promise<ValidationResult>;
  execute(decision: ExecutiveDecision, ctx: ExecutionContext): Promise<ExecutionResult>;
}
