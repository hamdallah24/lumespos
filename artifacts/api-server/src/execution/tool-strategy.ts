// ECP-043 Sprint 4: Adaptive Tool Strategy
// Determines tools based on MissionProfile, not hardcoded lists.
// Governor reads the strategy. No tool decisions in Runtime.

import type { MissionProfile, ToolStrategy } from "./mission-profile";

const TOOL_BY_CATEGORY: Record<string, string[]> = {
  QUESTION:       [],
  ANALYSIS:       ["readFile", "searchContent", "listDirectory", "getDependencies", "fetchGitHubFile", "fetchGitHubDir"],
  DEBUG:          ["readFile", "searchContent", "listDirectory", "getDependencies"],
  IMPLEMENTATION: ["readFile", "searchContent", "listDirectory", "writeFile", "editFile", "getDependencies", "fetchGitHubFile"],
  DEPLOYMENT:     ["execCommand", "sshExec", "readFile", "listDirectory", "getDependencies"],
  OPERATIONS:     ["execCommand", "sshExec", "readFile", "listDirectory"],
  BUSINESS:       [],
};

const FORBIDDEN_BY_COMPLEXITY: Record<string, string[]> = {
  LOW:     ["execCommand", "sshExec", "writeFile", "editFile"],
  MEDIUM:  [],
  HIGH:    [],
  EXTREME: [],
};

export class ToolStrategyEngine {

  /** Determine tool strategy from mission profile */
  compute(profile: MissionProfile): ToolStrategy {
    const allowedTools = TOOL_BY_CATEGORY[profile.category] || [];

    // Remove forbidden tools based on complexity
    const forbidden = FORBIDDEN_BY_COMPLEXITY[profile.complexity] || [];
    const filtered = allowedTools.filter(t => !forbidden.includes(t));

    // Determine preferred tools
    let preferred = [...filtered];
    if (profile.category === "DEBUG") {
      preferred = ["readFile", "searchContent", "getDependencies"];
    } else if (profile.category === "DEPLOYMENT") {
      preferred = ["execCommand", "sshExec", "readFile"];
    } else if (profile.category === "IMPLEMENTATION") {
      preferred = ["readFile", "searchContent", "writeFile"];
    }

    // Execution order: read first, then search, then write/exec
    const priorityOrder = ["readFile", "searchContent", "listDirectory", "getDependencies", "fetchGitHubFile", "fetchGitHubDir", "writeFile", "editFile", "execCommand", "sshExec"];
    const executionOrder = priorityOrder.filter(t => filtered.includes(t));

    // No tools for full exploration if none needed
    if (profile.explorationLevel === "NONE" && profile.category === "QUESTION") {
      return { allowedTools: [], preferredTools: [], forbiddenTools: [], executionOrder: [] };
    }

    return {
      allowedTools: filtered,
      preferredTools: preferred,
      forbiddenTools: forbidden,
      executionOrder,
    };
  }
}

export const toolStrategyEngine = new ToolStrategyEngine();
