export interface Objective {
  id: string;
  executive: string;
  title: string;
  description: string;
  status: "active" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "critical";
  kpiId?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  executive: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "critical";
  relatedEventId?: string;
  relatedObjectiveId?: string;
  autoCreated: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface Recommendation {
  id: string;
  executive: string;
  title: string;
  description: string;
  status: "pending" | "accepted" | "rejected" | "implemented";
  confidence: number;
  relatedDecisionId?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ApprovalItem {
  id: string;
  executive: string;
  action: string;
  parameters: Record<string, unknown>;
  reasoning: string;
  confidence: number;
  status: "pending" | "approved" | "rejected";
  level: string;
  requestedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Reminder {
  id: string;
  executive: string;
  title: string;
  description?: string;
  dueAt: string;
  status: "pending" | "triggered" | "dismissed";
  repeat: "none" | "daily" | "weekly" | "monthly";
  relatedObjectiveId?: string;
  relatedTaskId?: string;
  createdAt: string;
  lastTriggeredAt?: string;
}

export interface DecisionEntry {
  decisionId: string;
  executive: string;
  action: string;
  reasoning: string;
  confidence: number;
  parameters: Record<string, unknown>;
  timestamp: string;
  source: "chat" | "event" | "system";
}

export interface ExecutionEntry {
  executionId: string;
  decisionId: string;
  executive: string;
  action: string;
  module: string;
  success: boolean;
  message: string;
  durationMs: number;
  timestamp: string;
}

export interface DiscussionEntry {
  id: string;
  executive: string;
  message: string;
  response: string;
  timestamp: string;
  source: "chat" | "event" | "system";
}

export interface TimelineEntry {
  id: string;
  executive: string;
  type: "event" | "decision" | "execution" | "approval" | "reminder" | "task" | "objective" | "summary";
  title: string;
  description: string;
  timestamp: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

export interface KPIDefinition {
  id: string;
  executive: string;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: "up" | "down" | "stable";
  updatedAt: string;
}

export interface Snapshot {
  id: string;
  executive: string;
  date: string;
  achievements: string[];
  problems: string[];
  risks: string[];
  kpis: { name: string; value: number; target: number; unit: string }[];
  pendingTasks: number;
  pendingApprovals: number;
  tomorrowPriorities: string[];
  createdAt: string;
}

export interface WorkspaceMetricsData {
  tasksCompleted: number;
  recommendationsAccepted: number;
  recommendationsRejected: number;
  averageConfidence: number;
  executionSuccessRate: number;
  approvalDelayMs: number;
  averageDecisionTimeMs: number;
  averageExecutionTimeMs: number;
  eventCount: number;
  objectiveCompletionRate: number;
  updatedAt: string;
}

export interface ExecutiveWorkspaceState {
  executive: string;
  objectives: Objective[];
  tasks: Task[];
  recommendations: Recommendation[];
  approvals: ApprovalItem[];
  reminders: Reminder[];
  decisions: DecisionEntry[];
  executions: ExecutionEntry[];
  discussions: DiscussionEntry[];
  timeline: TimelineEntry[];
  kpis: KPIDefinition[];
  snapshots: Snapshot[];
  metrics: WorkspaceMetricsData;
  lastEventTimestamp: string;
  lastChatTimestamp: string;
  createdAt: string;
  updatedAt: string;
}
