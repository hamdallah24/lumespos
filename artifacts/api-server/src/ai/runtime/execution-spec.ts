// SPRINT 10: ExecutionSpecificationV1 — formal contract for entire OS
// Law #008: Structured contract that ALL agents read.
// Not a prompt. Not an intent label. A legal contract.

import type { SemanticContract } from "./semantic-engine";
import { PolicyRegistry } from "./policy/registry";
import type { RuntimePolicy } from "./policy/types";

export interface ExecutionSpecificationV1 {
  // ── Identity ──
  id: string;                    // Unique spec ID
  version: "1.0";
  author: string;                // "Founder"
  createdAt: string;             // ISO timestamp

  // ── Understanding ──
  intent: string;
  objective: string;             // What success looks like
  problem: string;               // What needs solving
  expectedOutcome: string;       // What the Founder should get back
  domain: string;
  entities: string[];

  // ── Constraints ──
  constraints: string[];         // Rules: ["no deployment", "read-only"]
  risk: "low" | "medium" | "high";
  priority: "low" | "normal" | "high" | "critical";
  approvalRequired: boolean;

  // ── Execution Plan ──
  requiredKnowledge: string[];   // Knowledge domains needed
  requiredCapabilities: string[]; // Capabilities needed
  requiredTools: string[];        // Specific tools needed
  executionMode: "direct" | "planned" | "approved"; // How to execute
  estimatedComplexity: "simple" | "medium" | "complex";
  estimatedTokens: number;       // Budget

  // ── Meta ──
  confidence: number;            // 0-100
  semanticReasoning: string;    // Why the engine chose this interpretation
  runtimePolicyName: string;    // Which policy applied

  // ── Policy (resolved) ──
  runtimePolicy: RuntimePolicy;
}

let counter = 0;

export function buildSpecV1(contract: SemanticContract): ExecutionSpecificationV1 {
  const policy = PolicyRegistry.get(contract.intent);
  counter++;

  const complexity = contract.risk === "high" ? "complex"
    : contract.intent === "greeting" ? "simple"
    : contract.confidence < 70 ? "medium"
    : "medium";

  const executionMode = contract.intent === "greeting" ? "direct"
    : policy.approval ? "approved"
    : "planned";

  const toolList = policy.tools === "devops" ? ["listDirectory", "readFile", "searchContent", "execCommand", "sshExec"]
    : policy.tools === "read_only" ? ["listDirectory", "readFile", "searchContent"]
    : [];

  return {
    id: `es_${Date.now()}_${counter}`,
    version: "1.0",
    author: "Founder",
    createdAt: new Date().toISOString(),
    intent: contract.intent,
    objective: contract.problem,
    problem: contract.problem,
    expectedOutcome: contract.confidence > 80 ? "Resolved directly" : "Proposal required — high uncertainty",
    domain: contract.domain,
    entities: contract.entities,
    constraints: policy.tools === "none" ? ["no tools", "direct answer only"] : [],
    risk: contract.risk as "low" | "medium" | "high",
    priority: contract.risk === "high" ? "high" : "normal",
    approvalRequired: policy.approval,
    requiredKnowledge: policy.knowledge === "full" ? ["foundation", "architecture", "specs", "adr"]
      : policy.knowledge === "minimal" ? ["foundation"] : [],
    requiredCapabilities: contract.requiredCapabilities,
    requiredTools: toolList,
    executionMode,
    estimatedComplexity: complexity,
    estimatedTokens: policy.maxTokens,
    confidence: contract.confidence,
    semanticReasoning: `Intent: ${contract.intent}. Domain: ${contract.domain}. Entities: ${contract.entities.join(", ")}.`,
    runtimePolicyName: PolicyRegistry.list().find(p => policy.approval !== undefined ? true : false) || "DefaultPolicy",
    runtimePolicy: policy,
  };
}

export const executionSpecV1 = {
  name: "ExecutionSpecificationV1",
  version: "1.0.0",
  capabilities: ["execution-planning", "policy-resolution", "contract-v1", "formal-interface"],
  dependencies: ["PolicyRegistry", "SemanticEngine"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
