// ECP-019: Capability Graph — Capability → Role mapping
// Frozen. Stable mapping. Changes only with org structure.

const capabilityToRole: Record<string, string[]> = {
  "FOUNDATION":     ["CEO"],
  "ARCHITECTURE":   ["CTO", "Senior Architect"],
  "DEVOPS":         ["CTO", "Lead DevOps"],
  "SECURITY":       ["Security Auditor"],
  "DATABASE":       ["Database Engineer"],
  "INVENTORY":      ["COO", "Inventory Manager"],
  "SALES":          ["COO"],
  "GOVERNANCE":     ["CEO", "CFO"],
  "TESTING":        ["QA Lead"],
  "GENERAL":        ["CEO", "CTO"],
};

class CapabilityGraph {
  getRoles(capability: string): string[] {
    for (const [cap, roles] of Object.entries(capabilityToRole)) {
      if (cap.toLowerCase() === capability.toLowerCase()) return [...roles];
    }
    return [];
  }

  hasCapability(capability: string): boolean {
    return capability in capabilityToRole;
  }

  allCapabilities(): string[] { return Object.keys(capabilityToRole); }
}

export const capabilityGraph = new CapabilityGraph();
