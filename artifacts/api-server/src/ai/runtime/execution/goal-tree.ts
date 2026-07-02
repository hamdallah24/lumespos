// ECP-019: Goal Tree — decomposition + capability assignment
// Frozen. Builds sub-goal tree from ExecutionSpec entities + domain mapping.

import type { GoalNode, GoalStatus } from "./execution-manifest";

const domainGoalMap: Record<string, string[]> = {
  architecture:  ["Foundation/", "ADR/", "Runtime/", "Governance/"],
  inventory:     ["Products", "Stock", "Ingredients", "SemiFinished"],
  devops:        ["VPS Status", "PM2", "Nginx", "Deploy Pipeline"],
};

const domainCapabilityMap: Record<string, string> = {
  "Foundation/":   "FOUNDATION",
  "ADR/":          "ARCHITECTURE",
  "Runtime/":      "ARCHITECTURE",
  "Governance/":   "GOVERNANCE",
  "Products":      "INVENTORY",
  "Stock":         "INVENTORY",
  "Ingredients":   "INVENTORY",
  "SemiFinished":  "INVENTORY",
  "VPS Status":    "DEVOPS",
  "PM2":           "DEVOPS",
  "Nginx":         "DEVOPS",
  "Deploy Pipeline":"DEVOPS",
};

class GoalTree {
  private nodes: Map<string, GoalNode> = new Map();
  private rootId: string = "";

  /** Build tree from ExecutionSpec domain + entities */
  build(domain: string, entities: string[], objective: string): void {
    this.nodes.clear();
    this.rootId = "root";

    this.nodes.set("root", {
      id: "root", label: objective || "Objective",
      status: "IN_PROGRESS", parentId: undefined,
    });

    const goals = domainGoalMap[domain] || entities.map(e => e);
    if (goals.length === 0) {
      goals.push(objective ? objective.slice(0, 50) : "Task");
    }

    for (let i = 0; i < goals.length; i++) {
      const id = `goal_${i}`;
      this.nodes.set(id, {
        id, label: goals[i],
        status: "PENDING", parentId: "root",
        requiredCapability: domainCapabilityMap[goals[i]] || "ARCHITECTURE",
      });
    }
  }

  /** Mark goal complete based on file path match */
  markComplete(matchedPath: string): GoalNode | null {
    for (const [, node] of this.nodes) {
      if (node.status === "COMPLETED" || node.id === "root") continue;
      if (matchedPath.toLowerCase().includes(node.label.toLowerCase().replace("/", ""))) {
        node.status = "COMPLETED";
        node.completedAt = new Date().toISOString();
        node.evidence = matchedPath;
        this.checkRootCompletion();
        return node;
      }
    }
    return null;
  }

  /** Assign ownership to a goal */
  assign(goalId: string, owner: string): boolean {
    const node = this.nodes.get(goalId);
    if (!node) return false;
    node.owner = owner;
    node.status = "ASSIGNED";
    return true;
  }

  total(): number { return this.nodes.size - 1; } // exclude root
  countByStatus(statuses: GoalStatus[]): number {
    let count = 0;
    for (const [, n] of this.nodes) {
      if (n.id === "root") continue;
      if (statuses.includes(n.status)) count++;
    }
    return count;
  }

  progress(): number {
    const t = this.total();
    if (t === 0) return 100;
    return Math.round(this.countByStatus(["COMPLETED"]) / t * 100);
  }

  assignmentProgress(): number {
    const t = this.total();
    if (t === 0) return 100;
    const assigned = this.countByStatus(["ASSIGNED", "IN_PROGRESS", "COMPLETED"]);
    return Math.round(assigned / t * 100);
  }

  isComplete(): boolean { return this.countByStatus(["COMPLETED"]) === this.total(); }

  pending(): GoalNode[] {
    const result: GoalNode[] = [];
    for (const [, n] of this.nodes) {
      if (n.id === "root") continue;
      if (n.status === "PENDING" || n.status === "ASSIGNED" || n.status === "IN_PROGRESS") result.push(n);
    }
    return result;
  }

  all(): GoalNode[] {
    const result: GoalNode[] = [];
    for (const [, n] of this.nodes) {
      if (n.id === "root") continue;
      result.push({ ...n });
    }
    return result;
  }

  get(id: string): GoalNode | undefined { return this.nodes.get(id); }

  private checkRootCompletion(): void {
    if (this.isComplete()) {
      const root = this.nodes.get("root");
      if (root) { root.status = "COMPLETED"; root.completedAt = new Date().toISOString(); }
    }
  }
}

export { GoalTree };
