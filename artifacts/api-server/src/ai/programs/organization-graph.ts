// Phase 2: Organization Graph — central orchestration layer
// Formal org structure with metadata. Every node has identity, reports_to, capabilities.

import { getIdentity, AgentIdentity, IDENTITIES } from "../runtime/identity";

export interface OrgNode {
  id: string;
  role: string;
  office: string;           // "Engineering" | "Operations" | "Finance" | "Executive"
  reportsTo: string;        // Parent node id
  canDelegateTo: string[];  // Child nodes this node can assign tasks to
  requiresFounderFor: string[]; // Actions that ALWAYS need Founder approval
  kernelServices: string[]; // Which kernel services this node uses
  isRuntime: boolean;       // Is this an active runtime or a placeholder?
}

const _graph = new Map<string, OrgNode>();

// Register the organization graph
const ORG_STRUCTURE: OrgNode[] = [
  {
    id: "founder", role: "Founder", office: "Executive",
    reportsTo: "",
    canDelegateTo: ["ceo"],
    requiresFounderFor: [],
    kernelServices: ["all"],
    isRuntime: false,
  },
  {
    id: "ceo", role: "CEO", office: "Executive",
    reportsTo: "founder",
    canDelegateTo: ["cto", "coo", "cfo"],
    requiresFounderFor: ["foundation_change", "security_change", "major_strategy"],
    kernelServices: ["organization", "trust", "semantic", "reflection"],
    isRuntime: true,
  },
  {
    id: "cto", role: "CTO", office: "Engineering",
    reportsTo: "ceo",
    canDelegateTo: ["qa", "devops", "research"],
    requiresFounderFor: ["deploy_production", "architecture_change", "foundation_change"],
    kernelServices: ["planner", "knowledge", "semantic", "context", "prompt", "reflection", "evidence"],
    isRuntime: true,
  },
  {
    id: "coo", role: "COO", office: "Operations",
    reportsTo: "ceo",
    canDelegateTo: ["inventory", "sales", "warehouse"],
    requiresFounderFor: ["pricing_change", "major_inventory"],
    kernelServices: ["semantic", "knowledge", "reflection", "evidence"],
    isRuntime: true,
  },
  {
    id: "cfo", role: "CFO", office: "Finance",
    reportsTo: "ceo",
    canDelegateTo: ["accounting", "budget", "audit"],
    requiresFounderFor: ["any_transaction", "financial_report", "budget_change"],
    kernelServices: ["authorization", "policy", "verification", "evidence"],
    isRuntime: false, // Not yet implemented
  },
  {
    id: "qa", role: "QA", office: "Engineering",
    reportsTo: "cto",
    canDelegateTo: [],
    requiresFounderFor: [],
    kernelServices: ["reflection", "evidence", "verification"],
    isRuntime: false,
  },
  {
    id: "devops", role: "DevOps", office: "Engineering",
    reportsTo: "cto",
    canDelegateTo: [],
    requiresFounderFor: ["deploy_production"],
    kernelServices: ["ssh", "deploy", "monitor"],
    isRuntime: false,
  },
  {
    id: "research", role: "Research", office: "Engineering",
    reportsTo: "cto",
    canDelegateTo: [],
    requiresFounderFor: [],
    kernelServices: ["knowledge", "search", "analyze"],
    isRuntime: false,
  },
  {
    id: "inventory", role: "Inventory", office: "Operations",
    reportsTo: "coo",
    canDelegateTo: [],
    requiresFounderFor: [],
    kernelServices: ["knowledge", "data"],
    isRuntime: false,
  },
  {
    id: "sales", role: "Sales", office: "Operations",
    reportsTo: "coo",
    canDelegateTo: [],
    requiresFounderFor: ["pricing_change"],
    kernelServices: ["knowledge", "data", "report"],
    isRuntime: false,
  },
  {
    id: "warehouse", role: "Warehouse", office: "Operations",
    reportsTo: "coo",
    canDelegateTo: [],
    requiresFounderFor: [],
    kernelServices: ["knowledge", "data"],
    isRuntime: false,
  },
  {
    id: "accounting", role: "Accounting", office: "Finance",
    reportsTo: "cfo",
    canDelegateTo: [],
    requiresFounderFor: ["any_transaction"],
    kernelServices: ["authorization", "evidence", "policy"],
    isRuntime: false,
  },
];

// Initialize graph
for (const node of ORG_STRUCTURE) {
  _graph.set(node.id, node);
}

/** Get a node by id */
export function getNode(id: string): OrgNode | undefined {
  return _graph.get(id);
}

/** Get all nodes */
export function allNodes(): OrgNode[] {
  return [..._graph.values()];
}

/** Get all nodes that report to a given node */
export function subordinates(id: string): OrgNode[] {
  return [..._graph.values()].filter(n => n.reportsTo === id);
}

/** Get the chain of command from a node to founder */
export function chainOfCommand(id: string): string[] {
  const chain: string[] = [id];
  let current = _graph.get(id);
  while (current?.reportsTo) {
    chain.push(current.reportsTo);
    current = _graph.get(current.reportsTo);
  }
  return chain;
}

/** Check if a node can delegate to another */
export function canDelegate(fromId: string, toId: string): boolean {
  const node = _graph.get(fromId);
  return node?.canDelegateTo.includes(toId) ?? false;
}

/** Check if an action requires founder approval */
export function requiresFounder(nodeId: string, action: string): boolean {
  const node = _graph.get(nodeId);
  return node?.requiresFounderFor.includes(action) ?? false;
}

/** Get active runtime nodes */
export function activeRuntimes(): OrgNode[] {
  return [..._graph.values()].filter(n => n.isRuntime);
}

/** Get organizational hierarchy as a tree */
export function hierarchy(): string {
  const lines: string[] = [];
  function render(id: string, depth: number) {
    const node = _graph.get(id);
    if (!node) return;
    const indent = "  ".repeat(depth);
    const icon = node.isRuntime ? "🟢" : "⬜";
    lines.push(`${indent}${icon} ${node.role} (${node.office})`);
    for (const child of node.canDelegateTo) {
      render(child, depth + 1);
    }
  }
  render("founder", 0);
  return lines.join("\n");
}

export const organizationGraph = {
  name: "OrganizationGraph",
  version: "1.0.0",
  capabilities: ["org-structure", "hierarchy", "chain-of-command", "delegation-routing"],
  dependencies: ["IdentityRuntime"],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),

  getNode,
  allNodes,
  subordinates,
  chainOfCommand,
  canDelegate,
  requiresFounder,
  activeRuntimes,
  hierarchy,
};
