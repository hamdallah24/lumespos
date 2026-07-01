// Phase II Wave 5: Capability Engine
// Registers capabilities per Runtime. Gates actions by evidence + authorization.
// Used by Mission Runtime and Organization Runtime for task routing.

import { organizationEngine } from "./organization-engine";

interface Capability {
  name: string;
  description: string;
  requiresEvidence: boolean;     // Must provide evidence to use this capability?
  requiresApproval: boolean;     // Must get Founder/CEO approval?
  minMaturity: string;           // Minimum Runtime maturity level (L0-L5)
}

interface CapabilityCheck {
  allowed: boolean;
  reason?: string;
  missingCapability?: string;
  missingEvidence?: boolean;
  missingApproval?: boolean;
  maturityTooLow?: boolean;
}

// ── Registered Capabilities ──
const CAPABILITY_CATALOG: Record<string, Capability> = {
  // CTO Capabilities
  readFiles:        { name: "Read Files", description: "Read files from the repository", requiresEvidence: false, requiresApproval: false, minMaturity: "L0" },
  searchCode:       { name: "Search Code", description: "Search codebase for patterns", requiresEvidence: false, requiresApproval: false, minMaturity: "L0" },
  analyzeCode:      { name: "Analyze Code", description: "Analyze code for bugs, patterns, architecture", requiresEvidence: false, requiresApproval: false, minMaturity: "L1" },
  generateProposal: { name: "Generate Proposal", description: "Create implementation proposals", requiresEvidence: false, requiresApproval: false, minMaturity: "L1" },
  editCode:         { name: "Edit Code", description: "Modify files in the repository", requiresEvidence: true, requiresApproval: true, minMaturity: "L2" },
  deploy:           { name: "Deploy", description: "Deploy to production", requiresEvidence: true, requiresApproval: true, minMaturity: "L2" },
  ssh:              { name: "SSH", description: "Execute commands on VPS", requiresEvidence: true, requiresApproval: true, minMaturity: "L2" },

  // CEO Capabilities
  delegate:         { name: "Delegate", description: "Delegate tasks to other Runtimes", requiresEvidence: false, requiresApproval: false, minMaturity: "L0" },
  approve:          { name: "Approve", description: "Approve proposals and missions", requiresEvidence: false, requiresApproval: false, minMaturity: "L0" },
  missionPlanning:  { name: "Mission Planning", description: "Create and plan missions", requiresEvidence: false, requiresApproval: false, minMaturity: "L1" },
  organization:     { name: "Organization", description: "Manage organization structure", requiresEvidence: false, requiresApproval: true, minMaturity: "L2" },

  // COO Capabilities
  inventory:        { name: "Inventory", description: "Manage inventory", requiresEvidence: false, requiresApproval: false, minMaturity: "L0" },
  sales:            { name: "Sales", description: "Track sales and reports", requiresEvidence: false, requiresApproval: false, minMaturity: "L0" },
  pricing:          { name: "Pricing", description: "Adjust pricing", requiresEvidence: true, requiresApproval: true, minMaturity: "L1" },
};

// ── Runtime → Capability Mapping ──
const RUNTIME_CAPABILITIES: Record<string, string[]> = {
  "RUNTIME-001": ["delegate", "approve", "missionPlanning", "organization"],   // CEO
  "RUNTIME-002": ["readFiles", "searchCode", "analyzeCode", "generateProposal", "editCode", "deploy", "ssh"], // CTO
  "RUNTIME-003": ["inventory", "sales", "pricing"],  // COO
  "RUNTIME-004": [],  // CFO — not yet
  "RUNTIME-005": [],  // QA
  "RUNTIME-006": [],  // DevOps
  "RUNTIME-007": [],  // Research
};

class CapabilityEngine {
  /** Check if a Runtime has a specific capability */
  canDo(runtimeId: string, capability: string): CapabilityCheck {
    const runtime = organizationEngine.find(runtimeId);
    if (!runtime) return { allowed: false, reason: `Runtime "${runtimeId}" not found in organization` };

    const cap = CAPABILITY_CATALOG[capability];
    if (!cap) return { allowed: false, reason: `Capability "${capability}" not registered`, missingCapability: capability };

    // Check Runtime has this capability
    const runtimeCaps = RUNTIME_CAPABILITIES[runtimeId] || [];
    if (!runtimeCaps.includes(capability)) {
      return { allowed: false, reason: `${runtime.runtime} does not have "${capability}"`, missingCapability: capability };
    }

    // Check maturity
    const maturityLevel = parseInt(runtime.maturity.replace("L", ""));
    const requiredLevel = parseInt(cap.minMaturity.replace("L", ""));
    if (maturityLevel < requiredLevel) {
      return { allowed: false, reason: `${runtime.runtime} maturity L${maturityLevel} < required L${requiredLevel}`, maturityTooLow: true };
    }

    // Health check
    if (runtime.health !== "Healthy" && runtime.health !== "Busy") {
      return { allowed: false, reason: `${runtime.runtime} is ${runtime.health}` };
    }

    return { allowed: true };
  }

  /** Check if capability requires evidence */
  requiresEvidence(capability: string): boolean {
    return CAPABILITY_CATALOG[capability]?.requiresEvidence ?? false;
  }

  /** Check if capability requires approval */
  requiresApproval(capability: string): boolean {
    return CAPABILITY_CATALOG[capability]?.requiresApproval ?? false;
  }

  /** Get all capabilities for a Runtime */
  getCapabilities(runtimeId: string): CapabilityCheck & { capabilities: Capability[] } {
    const runtime = organizationEngine.find(runtimeId);
    const capNames = RUNTIME_CAPABILITIES[runtimeId] || [];
    const capabilities = capNames.map(c => CAPABILITY_CATALOG[c]).filter(Boolean);

    return {
      allowed: !!runtime && runtime.health === "Healthy",
      reason: runtime ? `${runtime.runtime} (${runtime.maturity})` : "Not found",
      capabilities,
    };
  }

  /** Get best Runtime for a capability */
  bestFor(capability: string): string | null {
    for (const [runtimeId, caps] of Object.entries(RUNTIME_CAPABILITIES)) {
      if (caps.includes(capability)) {
        const runtime = organizationEngine.find(runtimeId);
        if (runtime && (runtime.health === "Healthy" || runtime.health === "Busy")) return runtimeId;
      }
    }
    return null;
  }

  /** Register a new capability for a Runtime */
  registerCapability(runtimeId: string, capability: string): void {
    if (!RUNTIME_CAPABILITIES[runtimeId]) RUNTIME_CAPABILITIES[runtimeId] = [];
    if (!RUNTIME_CAPABILITIES[runtimeId].includes(capability)) {
      RUNTIME_CAPABILITIES[runtimeId].push(capability);
    }
  }
}

const capabilityEngine = new CapabilityEngine();

export { capabilityEngine, CAPABILITY_CATALOG, RUNTIME_CAPABILITIES };
export type { Capability, CapabilityCheck };

export const capabilityEngineComponent = {
  name: "CapabilityEngine",
  version: "1.0.0",
  capabilities: ["capability-registry", "evidence-gating", "approval-gating", "maturity-checking", "runtime-routing"],
  dependencies: ["OrganizationRuntime"],

  health: () => {
    const capCount = Object.keys(CAPABILITY_CATALOG).length;
    const rtCount = Object.keys(RUNTIME_CAPABILITIES).length;
    return {
      status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0",
      custom: { capabilities: capCount, runtimesWithCaps: rtCount },
    };
  },

  canDo: (runtimeId: string, capability: string) => capabilityEngine.canDo(runtimeId, capability),
  getCapabilities: (runtimeId: string) => capabilityEngine.getCapabilities(runtimeId),
  bestFor: (capability: string) => capabilityEngine.bestFor(capability),
  requiresEvidence: (cap: string) => capabilityEngine.requiresEvidence(cap),
  requiresApproval: (cap: string) => capabilityEngine.requiresApproval(cap),
};
