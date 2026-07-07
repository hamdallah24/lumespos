// Phase II Wave 1: Organization Runtime
// Reads RUNTIME_REGISTRY.md, builds org graph, routes delegation, aggregates health.
// Single source of truth for all Runtime-to-Runtime relationships.

import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface OrganizationNode {
  id: string;
  runtime: string;
  parent: string;
  unit: string;
  level: "A" | "B" | "C";
  health: string;
  maturity: string;
  version: string;
  capabilities: string[];
  missionTypes: string[];
  delegates: string[];
}

interface DelegationResult {
  runtimeId: string;
  runtime: string;
  reason: string;
  fallback: boolean;
}

class OrganizationRuntime {
  private nodes: Map<string, OrganizationNode> = new Map();
  private loaded = false;

  /** Load the organization from RUNTIME_REGISTRY.md */
  load(): void {
    // Try multiple paths for the registry file
    const candidates = [
      join(process.cwd(), "..", "..", ".ai", "runtime", "registry", "RUNTIME_REGISTRY.md"),
      join(process.cwd(), ".ai", "runtime", "registry", "RUNTIME_REGISTRY.md"),
    ];

    let content = "";
    for (const path of candidates) {
      if (existsSync(path)) {
        content = readFileSync(path, "utf-8");
        break;
      }
    }

    if (!content) {
      console.warn("[OrgRuntime] RUNTIME_REGISTRY.md not found. Using built-in defaults.");
      this.loadDefaults();
      return;
    }

    // Parse the markdown table
    const lines = content.split("\n");
    let inTable = false;

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip non-table lines
      if (!trimmed.startsWith("|")) continue;
      // Skip header separators
      if (trimmed.includes("---") && trimmed.includes("|")) continue;
      // Skip header row with ID column
      if (trimmed.includes("ID") && trimmed.includes("Runtime") && trimmed.includes("Parent")) continue;

      const cols = trimmed.split("|").map(c => c.trim()).filter(c => c);
      if (cols.length < 8) continue;

      const [id, runtime, parent, unit, level, version, health, maturity] = cols;

      // Skip non-data rows
      if (id === "ID" || !id.startsWith("RUNTIME-")) continue;

      // Extract capabilities and mission types from remaining columns
      const capabilityCol = cols[10] || "";
      const missionCol = cols[11] || "";

      const capabilities = capabilityCol
        .split(/[,;]/)
        .map(c => c.trim())
        .filter(c => c && c !== "✅" && c !== "Planned" && c !== "❌");

      const missionTypes = missionCol
        .split(/[,;]/)
        .map(m => m.trim())
        .filter(m => m && m !== "✅" && m !== "Planned" && m !== "❌");

      // Extract delegates from parent column context or a dedicated column
      const delegates: string[] = [];
      if (level === "A") delegates.push("CTO", "COO", "CFO");
      if (level === "B") {
        if (runtime === "CTO") delegates.push("QA", "DevOps", "Research");
        if (runtime === "COO") delegates.push("Inventory", "Sales", "Warehouse");
        if (runtime === "CFO") delegates.push("Accounting", "Budget", "Audit");
      }

      this.nodes.set(id, {
        id, runtime, parent, unit,
        level: (["A", "B", "C"].includes(level) ? level : "C") as "A" | "B" | "C",
        health: health || "Planned",
        maturity: maturity || "L0",
        version: version || "—",
        capabilities,
        missionTypes,
        delegates,
      });
    }

    this.loaded = true;
    console.log(`[OrgRuntime] Loaded ${this.nodes.size} runtimes from registry`);
  }

  /** Built-in defaults when registry file is unavailable */
  private loadDefaults(): void {
    const defaults: OrganizationNode[] = [
      { id: "RUNTIME-014", runtime: "CKO", parent: "Founder", unit: "Advisory", level: "A", health: "Healthy", maturity: "L2", version: "1.0.0", capabilities: ["knowledge_governance", "foundation_review", "architecture_audit", "policy_recommendation", "founder_advisory", "report_generation"], missionTypes: ["advisory", "knowledge", "governance"], delegates: [] },
      { id: "RUNTIME-001", runtime: "CEO", parent: "Founder", unit: "Executive", level: "A", health: "Healthy", maturity: "L2", version: "1.0.0", capabilities: ["mission_planning", "delegation", "proposal_review", "organization", "business_analysis"], missionTypes: ["strategy", "delegation", "review"], delegates: ["CTO", "COO", "CFO"] },
      { id: "RUNTIME-002", runtime: "CTO", parent: "CEO", unit: "Engineering", level: "B", health: "Healthy", maturity: "L2", version: "1.2.0", capabilities: ["architecture", "code", "refactoring", "reflection", "evidence"], missionTypes: ["code", "architecture", "devops"], delegates: ["QA", "DevOps", "Research"] },
      { id: "RUNTIME-003", runtime: "COO", parent: "CEO", unit: "Operations", level: "B", health: "Planned", maturity: "L0", version: "—", capabilities: ["inventory", "sales", "operations"], missionTypes: ["inventory", "sales", "ops"], delegates: ["Inventory", "Sales", "Warehouse"] },
      { id: "RUNTIME-004", runtime: "CFO", parent: "CEO", unit: "Finance", level: "B", health: "Healthy", maturity: "L1", version: "1.0.0", capabilities: ["budget", "accounting", "audit", "viewReports", "manageBudget", "auditTransactions", "generateFinanceReport"], missionTypes: ["budget", "accounting", "audit", "finance"], delegates: ["Accounting", "Budget", "Audit"] },
      { id: "RUNTIME-005", runtime: "QA", parent: "CTO", unit: "Engineering", level: "C", health: "Planned", maturity: "L0", version: "—", capabilities: ["testing", "verification"], missionTypes: ["testing", "verification"], delegates: [] },
      { id: "RUNTIME-006", runtime: "DevOps", parent: "CTO", unit: "Engineering", level: "C", health: "Planned", maturity: "L0", version: "—", capabilities: ["deploy", "ci_cd", "pipeline"], missionTypes: ["deploy", "ci_cd", "pipeline"], delegates: [] },
      { id: "RUNTIME-007", runtime: "Research", parent: "CTO", unit: "Engineering", level: "C", health: "Planned", maturity: "L0", version: "—", capabilities: ["analysis", "investigation"], missionTypes: ["analysis", "investigation"], delegates: [] },
    ];
    for (const node of defaults) this.nodes.set(node.id, node);
    this.loaded = true;
  }

  /** Get the organization tree */
  getTree(): OrganizationNode[] {
    if (!this.loaded) this.load();
    return [...this.nodes.values()].sort((a, b) => a.level.localeCompare(b.level));
  }

  /** Find a runtime by ID or alias */
  find(idOrName: string): OrganizationNode | null {
    if (!this.loaded) this.load();
    return this.nodes.get(idOrName)
      || [...this.nodes.values()].find(n => n.runtime.toLowerCase() === idOrName.toLowerCase())
      || null;
  }

  /** Get subordinates of a runtime */
  subordinates(id: string): OrganizationNode[] {
    return [...this.nodes.values()].filter(n => n.parent === id || (this.find(id)?.runtime && this.find(id)!.runtime === n.parent));
  }

  /** Get the chain of command */
  chain(leafId: string): string[] {
    const chain: string[] = [];
    let current = this.nodes.get(leafId);
    while (current) {
      chain.push(current.runtime);
      current = this.nodes.get(current.parent) || [...this.nodes.values()].find(n => n.runtime === current!.parent) || undefined;
    }
    return chain.reverse();
  }

  /** Aggregate health across all runtimes */
  healthReport(): { total: number; healthy: number; busy: number; planned: number; offline: number } {
    if (!this.loaded) this.load();
    const all = [...this.nodes.values()];
    return {
      total: all.length,
      healthy: all.filter(n => n.health === "Healthy" || n.health === "Busy").length,
      busy: all.filter(n => n.health === "Busy").length,
      planned: all.filter(n => n.health === "Planned").length,
      offline: all.filter(n => n.health === "Offline").length,
    };
  }

  /** Route a delegation to the best runtime */
  delegate(task: string, fromId?: string): DelegationResult | null {
    if (!this.loaded) this.load();

    const lower = task.toLowerCase();

    // Domain → Runtime mapping (from CEO_EXECUTION_DIRECTIVE + CTO_CAPABILITY)
    const domainMap: Record<string, string> = {
      "code|bug|deploy|ssh|architecture|refactor|server|vps": "RUNTIME-002",
      "inventory|sales|ops|warehouse": "RUNTIME-003",
      "budget|accounting|audit|finance": "RUNTIME-004",
      "test|verify|qa|quality": "RUNTIME-005",
      "deploy|ci|pipeline": "RUNTIME-006",
      "research|investigation|analysis|study": "RUNTIME-007",
    };

    for (const [pattern, targetId] of Object.entries(domainMap)) {
      const keywords = pattern.split("|");
      if (keywords.some(kw => lower.includes(kw))) {
        const target = this.nodes.get(targetId);
        if (!target) continue;
        // Health check: skip offline or planned runtimes
        if (target.health === "Offline") continue;
        // Maturity check: L0 runtimes can't be delegated to for execution
        if (target.maturity === "L0" && !lower.includes("plan")) continue;

        return { runtimeId: targetId, runtime: target.runtime, reason: `Domain match: ${keywords.filter(kw => lower.includes(kw)).join(", ")}`, fallback: false };
      }
    }

    // Fallback: CTO
    const cto = this.nodes.get("RUNTIME-002");
    if (cto) {
      return { runtimeId: "RUNTIME-002", runtime: "CTO", reason: "No specific match — default to CTO", fallback: true };
    }

    return null;
  }

  /** ECP-047: Route delegation to ALL matching runtimes (multi-executive dispatch) */
  delegateAll(task: string): DelegationResult[] {
    if (!this.loaded) this.load();

    const lower = task.toLowerCase();
    const results: DelegationResult[] = [];
    const seen = new Set<string>();

    const domainMap: Record<string, string> = {
      "code|bug|deploy|ssh|architecture|refactor|server|vps": "RUNTIME-002",
      "inventory|sales|ops|warehouse": "RUNTIME-003",
      "budget|accounting|audit|finance": "RUNTIME-004",
      "test|verify|qa|quality": "RUNTIME-005",
      "deploy|ci|pipeline": "RUNTIME-006",
      "research|investigation|analysis|study": "RUNTIME-007",
    };

    for (const [pattern, targetId] of Object.entries(domainMap)) {
      const keywords = pattern.split("|");
      if (keywords.some(kw => lower.includes(kw))) {
        if (seen.has(targetId)) continue;
        const target = this.nodes.get(targetId);
        if (!target) continue;
        if (target.health === "Offline") continue;
        if (target.maturity === "L0" && !lower.includes("plan")) continue;
        seen.add(targetId);
        results.push({
          runtimeId: targetId,
          runtime: target.runtime,
          reason: `Domain match: ${keywords.filter(kw => lower.includes(kw)).join(", ")}`,
          fallback: false,
        });
      }
    }

    if (results.length === 0) {
      const cto = this.nodes.get("RUNTIME-002");
      if (cto) {
        results.push({
          runtimeId: "RUNTIME-002", runtime: "CTO",
          reason: "No domain match — default to CTO", fallback: true,
        });
      }
    }

    return results;
  }

  /** AI-Driven capability matching: routes by semantic specification rather than regex string */
  delegateBySpec(spec: any): DelegationResult[] {
    if (!this.loaded) this.load();

    const results: DelegationResult[] = [];
    const seen = new Set<string>();

    for (const [id, node] of this.nodes.entries()) {
      if (node.health === "Offline") continue;
      if (node.maturity === "L0") continue; // L0 cannot execute
      
      // Smart matching
      const hasCapabilityMatch = spec.requiredCapabilities?.some((cap: string) => node.capabilities.includes(cap));
      const lowerDomain = spec.domain?.toLowerCase() || "";
      const isDomainMatch = 
        (node.runtime === "CKO" && ["advisory", "knowledge", "governance", "foundation", "policy", "architecture_review"].includes(lowerDomain)) ||
        (node.runtime === "CTO" && ["architecture", "code", "devops", "codebase", "backend", "frontend", "system"].includes(lowerDomain)) || 
        (node.runtime === "COO" && ["inventory", "sales", "business", "operations", "hr"].includes(lowerDomain)) ||
        (node.runtime === "CFO" && ["budget", "finance", "accounting", "audit", "money"].includes(lowerDomain));

      if (hasCapabilityMatch || isDomainMatch) {
        seen.add(id);
        results.push({
          runtimeId: id,
          runtime: node.runtime,
          reason: `AI Match: capability/domain aligned with ${node.runtime}`,
          fallback: false,
        });
      }
    }

    // Default Fallback to CTO if no smart match found
    if (results.length === 0) {
      const cto = this.nodes.get("RUNTIME-002");
      if (cto) {
        results.push({
          runtimeId: "RUNTIME-002", runtime: "CTO",
          reason: "No smart match — default to CTO for technical execution", fallback: true,
        });
      }
    }

    return results;
  }

  /** Check if runtime can accept tasks */
  canAccept(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    return node.health === "Healthy" || node.health === "Busy";
  }
}

// Singleton
const orgRuntime = new OrganizationRuntime();

export { orgRuntime as organizationRuntime };
export type { OrganizationNode, DelegationResult };

// Component metadata
export const organizationEngine = {
  name: "OrganizationRuntime",
  version: "1.0.0",
  capabilities: ["org-graph", "delegation-routing", "health-aggregation", "capability-resolution"],
  dependencies: [],
  health: () => {
    const h = orgRuntime.healthReport();
    return {
      status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0",
      custom: h,
    };
  },

  getTree: () => orgRuntime.getTree(),
  find: (id: string) => orgRuntime.find(id),
  delegate: (task: string) => orgRuntime.delegate(task),
  delegateAll: (task: string) => orgRuntime.delegateAll(task),
  delegateBySpec: (spec: any) => orgRuntime.delegateBySpec(spec),
  healthReport: () => orgRuntime.healthReport(),
  chain: (id: string) => orgRuntime.chain(id),
  subordinates: (id: string) => orgRuntime.subordinates(id),
  canAccept: (id: string) => orgRuntime.canAccept(id),
  load: () => orgRuntime.load(),
};
