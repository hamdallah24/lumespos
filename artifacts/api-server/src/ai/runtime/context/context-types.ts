// ECP-027: Context Types — unified interfaces for all context sources
// Frozen. Every context source implements one of these interfaces.

import type { ExecutionSpecificationV1 } from "../execution-spec";

export interface ContextSource {
  name: string;
  priority: number;        // 0-100, higher = more important
  maxTokens: number;       // Token budget for this source
  always: boolean;         // Always include regardless of token budget?
  content: () => string;
}

export interface ContextPackage {
  sources: ContextSource[];
  totalTokens: number;
  budgetUsed: number;
  compression: string;     // "none" | "summarized" | "truncated"
}

export interface MemoryEntry {
  id: string;
  role: string;
  type: "decision" | "action" | "result" | "reflection";
  content: string;
  timestamp: string;
  missionId?: string;
  priority: "high" | "normal" | "low";
}

export interface MissionContext {
  id: string;
  title: string;
  status: string;
  objective: string;
  progress: number;
  owner: string;
  priority: string;
  activeGoals: string[];
  completedGoals: string[];
}

export interface WorkspaceContext {
  branch: string;
  changedFiles: string[];
  recentDeployments: string[];
  recentErrors: string[];
}

export interface ConversationSummary {
  decisions: string[];
  constraints: string[];
  openQuestions: string[];
  keyFindings: string[];
}
