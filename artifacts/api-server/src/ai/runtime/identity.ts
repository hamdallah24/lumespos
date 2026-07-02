// SPRINT 13: Identity Runtime — role-based identity + capability contract
// Every role has formal identity. No agent may act beyond its capability.

export interface AgentIdentity {
  id: string;
  role: "CTO" | "COO" | "CEO" | "CFO" | "Researcher" | "Founder" | "Chat";
  authority: "full" | "limited" | "readonly" | "none";
  capabilities: string[];        // What this agent CAN do
  scope: string[];               // Domains this agent operates in
  knowledgeDomains: string[];    // What knowledge this agent can access
  trustScore: number;            // 0-100
  memoryScope: "session" | "project" | "organization";
  approvalRequired: boolean;     // Does this agent need approval for actions?
}

// Default identities
export const IDENTITIES: Record<string, AgentIdentity> = {
  CTO: {
    id: "cto-v1",
    role: "CTO",
    authority: "limited",
    capabilities: ["readFiles", "searchCode", "analyzeArchitecture", "generateProposals", "reviewCode", "ssh", "deploy"],
    scope: ["architecture", "codebase", "devops", "knowledge"],
    knowledgeDomains: ["foundation", "architecture", "adr", "specs", "runtime"],
    trustScore: 85,
    memoryScope: "project",
    approvalRequired: true,
  },
  COO: {
    id: "coo-v1",
    role: "COO",
    authority: "limited",
    capabilities: ["manageInventory", "processOrders", "viewReports", "adjustPricing"],
    scope: ["business", "operations", "inventory", "sales"],
    knowledgeDomains: ["foundation", "business"],
    trustScore: 80,
    memoryScope: "project",
    approvalRequired: false,
  },
  CEO: {
    id: "ceo-v1",
    role: "CEO",
    authority: "limited",
    capabilities: ["approveProposals", "rejectProposals", "viewDashboard", "setStrategy"],
    scope: ["strategy", "governance", "organization"],
    knowledgeDomains: ["foundation", "governance", "adr"],
    trustScore: 90,
    memoryScope: "organization",
    approvalRequired: false,
  },
  Founder: {
    id: "founder-v1",
    role: "Founder",
    authority: "full",
    capabilities: ["all"],
    scope: ["all"],
    knowledgeDomains: ["all"],
    trustScore: 100,
    memoryScope: "organization",
    approvalRequired: false,
  },
  Chat: {
    id: "chat-v1",
    role: "Chat",
    authority: "readonly",
    capabilities: ["conversation"],
    scope: ["general"],
    knowledgeDomains: [],
    trustScore: 100,
    memoryScope: "session",
    approvalRequired: false,
  },
};

/** Get identity by role */
export function getIdentity(role: string): AgentIdentity | null {
  return IDENTITIES[role.toUpperCase()] || null;
}

/** Check if identity can perform a capability */
export function canDo(identity: AgentIdentity, capability: string): boolean {
  if (identity.capabilities.includes("all")) return true;
  return identity.capabilities.includes(capability);
}

/** Check if identity can access a knowledge domain */
export function canAccess(identity: AgentIdentity, domain: string): boolean {
  if (identity.knowledgeDomains.includes("all")) return true;
  return identity.knowledgeDomains.includes(domain);
}

export const identityRuntime = {
  name: "IdentityRuntime",
  version: "1.0.0",
  capabilities: ["identity-management", "capability-gating", "access-control"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
