// ECP-019: Goal Tree — decomposition + capability assignment
// Frozen. Builds sub-goal tree from ExecutionSpec entities + domain mapping.

import type { GoalNode, GoalStatus } from "./execution-manifest";

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

    // Single goal: evidence quality drives progress
    this.nodes.set("goal_0", {
      id: "goal_0", label: "GATHER_AND_ANALYZE",
      status: "IN_PROGRESS", parentId: "root",
      requiredCapability: "ARCHITECTURE",
    });
  }

  /** Assess goal progress from evidence quality. Returns 0-100. */
  assess(_filesRead: number, _commandsRun: number, evidenceQuality: number, _confidence: number, _strategy: string): number {
    const g0 = this.nodes.get("goal_0");
    // Goal complete when evidence is solid
    if (g0 && g0.status !== "COMPLETED" && evidenceQuality >= 0.40) {
      g0.status = "COMPLETED"; g0.completedAt = new Date().toISOString(); g0.evidence = `evidence=${evidenceQuality.toFixed(2)}`;
    }
    this.checkRootCompletion();
    return this.progress(evidenceQuality);
  }

  /** Progress = evidence-based (0-100). External code passes evidenceQuality for actual progress. */
  progress(evidenceQuality?: number): number {
    const g0 = this.nodes.get("goal_0");
    if (g0?.status === "COMPLETED") return 100;
    if (evidenceQuality !== undefined) return Math.min(95, Math.round(evidenceQuality * 100));
    return 0;
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

  /** Mark goal complete by ID — evidence-based (no string matching) */
  markCompleteById(goalId: string): GoalNode | null {
    const node = this.nodes.get(goalId);
    if (!node || node.id === "root" || node.status === "COMPLETED") return null;
    node.status = "COMPLETED";
    node.completedAt = new Date().toISOString();
    node.evidence = `Evidence collected over cycles`;
    this.checkRootCompletion();
    return node;
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
