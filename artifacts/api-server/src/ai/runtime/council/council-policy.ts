// ECP-033: Council Policy — when Council is required
// Frozen. Defines which decisions require Council, which don't.

import type { DecisionTrigger } from "./types";

interface CouncilRule {
  triggers: DecisionTrigger[];
  requiredParticipants: string[];
  minConsensus: number;
  escalationThreshold: number;
  maxDurationMs: number;
}

export const COUNCIL_POLICY: Record<string, CouncilRule> = {
  foundation_change: {
    triggers: ["foundation_change", "adr_proposal"],
    requiredParticipants: ["CEO", "CTO", "Consultant", "KnowledgeGovernor"],
    minConsensus: 90,
    escalationThreshold: 85,
    maxDurationMs: 60000,
  },
  architecture_change: {
    triggers: ["architecture_change"],
    requiredParticipants: ["CEO", "CTO", "Consultant"],
    minConsensus: 80,
    escalationThreshold: 70,
    maxDurationMs: 30000,
  },
  cross_runtime: {
    triggers: ["cross_runtime_decision", "major_strategy"],
    requiredParticipants: ["CEO", "CTO", "COO", "Consultant"],
    minConsensus: 85,
    escalationThreshold: 75,
    maxDurationMs: 45000,
  },
  security_change: {
    triggers: ["security_change"],
    requiredParticipants: ["CEO", "CTO", "Consultant", "KnowledgeGovernor"],
    minConsensus: 95,
    escalationThreshold: 90,
    maxDurationMs: 60000,
  },
  policy_change: {
    triggers: ["policy_change"],
    requiredParticipants: ["CEO", "Consultant", "KnowledgeGovernor"],
    minConsensus: 80,
    escalationThreshold: 70,
    maxDurationMs: 30000,
  },
};

export const COUNCIL_ALWAYS: DecisionTrigger[] = [
  "foundation_change",
  "architecture_change",
  "security_change",
];

export const COUNCIL_NEVER: string[] = [
  "greeting",
  "stock_check",
  "sales_report",
  "knowledge_query",
  "simple_task",
];

export function requiresCouncil(trigger: DecisionTrigger): boolean {
  return COUNCIL_ALWAYS.includes(trigger) || trigger === "cross_runtime_decision" || trigger === "policy_change";
}

export function getCouncilPolicy(trigger: DecisionTrigger): CouncilRule {
  for (const [, rule] of Object.entries(COUNCIL_POLICY)) {
    if (rule.triggers.includes(trigger)) return rule;
  }
  return COUNCIL_POLICY.cross_runtime;
}

export const COUNCIL_RUNTIME_WEIGHTS: Record<string, number> = {
  CEO: 1.00,
  Consultant: 0.95,
  CTO: 0.90,
  KnowledgeGovernor: 0.90,
  COO: 0.80,
};
