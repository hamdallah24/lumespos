// SPRINT 9: Capability Engine — tool availability check
// Prevents calling tools the system doesn't have or can't execute right now

import type { IntentResult } from "./intent-classifier";

interface CapabilityCheck {
  allowed: boolean;
  reason?: string;
  availableTools: string[];
  blockedTools: string[];
  evidenceRequired: boolean;
}

// System capability registry (which tools exist)
const SYSTEM_CAPABILITIES: Record<string, string[]> = {
  READ_TOOLS: ["listDirectory", "readFile", "searchContent", "getDependencies", "fetchGitHubFile", "fetchGitHubDir"],
  DEVOPS_TOOLS: ["listDirectory", "readFile", "searchContent", "getDependencies", "fetchGitHubFile", "fetchGitHubDir", "execCommand", "sshExec"],
  BUSINESS: [],  // COO handles business via executeOperation
  NONE: [],
};

// Tool evidence requirements (what must the intent contain for this tool to be used)
const EVIDENCE_REQUIREMENTS: Record<string, (intent: IntentResult) => boolean> = {
  execCommand: (i) => i.category === "devops_operation" && i.confidence >= 80,
  sshExec:     (i) => i.category === "devops_operation" && i.confidence >= 85,
  readFile:    (i) => i.extracted.filePaths.length > 0,
  searchContent: (i) => i.extracted.keywords.length > 0 || i.extracted.filePaths.length > 0,
  fetchGitHubFile: (i) => i.extracted.filePaths.length > 0,
};

/** Check if the intent allows tool execution */
export function checkCapability(intent: IntentResult): CapabilityCheck {
  const toolSet = intent.suggestedToolSet;
  const availableTools = SYSTEM_CAPABILITIES[toolSet] || [];
  const blocked: string[] = [];

  // No tools needed → allowed (failsafe — model answers from context)
  if (toolSet === "NONE") {
    return { allowed: true, availableTools, blockedTools: [], evidenceRequired: false };
  }

  // Greetings and approvals never need tools
  if (intent.category === "greeting" || intent.category === "approval") {
    return { allowed: true, availableTools, blockedTools: [], evidenceRequired: false };
  }

  // Business actions route through COO, not CTO tools
  if (toolSet === "BUSINESS") {
    return { allowed: true, availableTools, blockedTools: [], evidenceRequired: false };
  }

  // Check evidence requirements for each tool
  for (const [tool, check] of Object.entries(EVIDENCE_REQUIREMENTS)) {
    if (availableTools.includes(tool) && !check(intent)) {
      blocked.push(tool);
    }
  }

  const activeTools = availableTools.filter(t => !blocked.includes(t));

  // DevOps tools require explicit DevOps intent
  if (toolSet === "DEVOPS_TOOLS" && intent.category !== "devops_operation") {
    blocked.push("execCommand", "sshExec");
  }

  return {
    allowed: true, // Always allow — block individual tools, not the whole request
    reason: blocked.length > 0 ? `${blocked.length} tools blocked: ${blocked.join(", ")}` : undefined,
    availableTools: activeTools.filter(t => !["execCommand", "sshExec"].includes(t) || intent.category === "devops_operation"),
    blockedTools: blocked,
    evidenceRequired: intent.complexity === "complex" && intent.category === "implement_change",
  };
}

// Component metadata
export const capabilityEngine = {
  name: "CapabilityEngine",
  version: "1.0.0",
  capabilities: ["tool-availability-check", "evidence-gating", "capability-registry"],
  dependencies: ["IntentClassifier"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
  check: checkCapability,
};
