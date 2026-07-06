// RFC-012 Phase 10D: Capability Registry
// Wraps execution-capabilities.ts + tool-registry.ts.
// Answers: what tools does executive X have? Can executive Y do Z?

import { getDefaultCapabilities, CAPABILITY_TOOLS } from "../ai/runtime/execution/execution-capabilities";
import { resolveTools } from "../ai/runtime/execution/tool-registry";

export interface ExecutiveCapability {
  role: string;
  capabilities: string[];
  tools: string[];
  mode: "REASONING" | "EXECUTION";
}

export class CapabilityRegistry {

  /** Get full capability profile for an executive */
  getProfile(role: string): ExecutiveCapability {
    const capabilities = getDefaultCapabilities(role);
    const tools = resolveTools(capabilities, CAPABILITY_TOOLS).map(t => t.name);

    return {
      role,
      capabilities,
      tools,
      mode: tools.length === 0 ? "REASONING" : "EXECUTION",
    };
  }

  /** Can this executive execute this tool? */
  canExecute(role: string, toolName: string): boolean {
    const profile = this.getProfile(role);
    return profile.tools.includes(toolName);
  }

  /** Get available tools for an executive */
  getTools(role: string): string[] {
    return this.getProfile(role).tools;
  }

  /** Get all registered executives with capabilities */
  all(): ExecutiveCapability[] {
    const roles = ["CEO", "CTO", "COO", "CFO", "CMO", "CHRO", "CIO"];
    return roles.map(r => this.getProfile(r));
  }
}

export const capabilityRegistry = new CapabilityRegistry();
