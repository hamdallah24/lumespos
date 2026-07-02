// ECP-019: Execution Manifest — type definitions
// Frozen. Shared across all Execution Plane components.

export type ObjectiveState =
  | "INIT" | "UNDERSTANDING" | "PLANNING"
  | "COLLECTING_EVIDENCE" | "ANALYZING" | "VERIFYING"
  | "REFLECTING" | "COMPLETED" | "BLOCKED" | "PAUSED";

export type ExecutionStrategy =
  | "EXPLORE" | "INVESTIGATE" | "ANALYZE"
  | "CONCLUDE" | "ESCALATE";

export type StopReason =
  | "OBJECTIVE_COMPLETED" | "BUDGET_EXCEEDED" | "TIME_EXCEEDED"
  | "TOOL_BUDGET_EXCEEDED" | "CIRCUIT_BREAKER_OPEN"
  | "OBJECTIVE_BLOCKED" | "OBJECTIVE_CANCELLED"
  | "FOUNDER_INTERRUPTED";

export type GoalStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "SKIPPED";

export interface GoalNode {
  id: string;
  label: string;
  status: GoalStatus;
  requiredCapability?: string;
  owner?: string;
  parentId?: string;
  completedAt?: string;
  evidence?: string;
}

export interface BudgetAllocation {
  maxTokens: number;
  maxTools: number;
  maxTimeMs: number;
  maxIdleCycles: number;
}

export interface BudgetUsage {
  tokens: number;
  tools: number;
  timeMs: number;
}

export interface CompletionResult {
  status: "COMPLETE" | "IN_PROGRESS" | "CONTINUE" | "BLOCKED" | "PAUSED";
  progress: number;
  assignmentProgress: number;
  executionProgress: number;
  reason: string;
  nextAction: "REPORT" | "CONTINUE" | "ASK_FOUNDER" | "CONTINUE_LATER" | "STOP";
}

export interface DecisionStability {
  flipCount: number;
  toolPatternStable: boolean;
  fileFocusChanged: boolean;
  direction: "COLLECTING" | "ANALYZING" | "CONCLUDING";
  directionChanges: number;
  stable: boolean;
}

export interface JournalEntry {
  cycle: number;
  timestamp: number;
  objectiveState: ObjectiveState;
  strategy: ExecutionStrategy;
  strategyReason: string;
  strategyChanged: boolean;
  currentGoal?: string;
  goalProgress: string;
  goalsCompleted: string[];
  goalsPending: string[];
  toolCalls: { name: string; durationMs: number }[];
  toolDiversity: number;
  repeatedActionCount: number;
  explorationDepth: number;
  tokensThisCycle: number;
  progress: number;
  decisionStable: boolean;
}

export interface SchedulerCandidate {
  id: string;
  runtime: string;
  role: string;
  health: string;
  load: number;
  currentMission?: string;
  queueDepth: number;
  capabilityScore: number;
}

export interface DelegationResult {
  goalId: string;
  capability: string;
  role: string;
  assignedTo: string;
  assignedById: string;
  fallback: boolean;
  reason?: string;
}

export interface ExecutionManifest {
  executionId: string;
  objective: string;
  complexity: string;
  budget: { allocated: BudgetAllocation; used: BudgetUsage };
  goals: { total: number; assigned: number; completed: number; blocked: number };
  progress: { assignment: number; execution: number; overall: number };
  delegation: { totalDelegated: number; fallbacks: number; byRole: Record<string, number> };
  completion: CompletionResult;
  stopReason: string;
  metrics: {
    evidenceQuality: number;
    confidence: number;
    decisionStability: number;
    cyclesExecuted: number;
    toolDiversity: number;
    explorationDepth: number;
  };
  cycles: JournalEntry[];
}
