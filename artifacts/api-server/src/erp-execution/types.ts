export interface ExecutiveDecision {
  decisionId: string;
  executive: string;
  confidence: number;
  reasoning: string;
  action: string;
  parameters: Record<string, any>;
  risks: { type: string; severity: string; description: string }[];
  recommendation: string;
  requiresApproval: boolean;
  priority: "low" | "normal" | "high" | "critical";
  userId: number;
  branchId: number;
}

export interface ApprovalRequirement {
  required: boolean;
  level?: string;
  reason?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  action: string;
  transactionId: string;
  affectedItems?: { type: string; id: number; before?: any; after?: any }[];
  durationMs: number;
  error?: string;
}

export interface ERPActionHandler {
  readonly action: string;
  execute(decision: ExecutiveDecision): Promise<ExecutionResult>;
  validate(decision: ExecutiveDecision): ValidationResult;
  requiresApproval(decision: ExecutiveDecision): ApprovalRequirement;
}
