// ECP-019: Goal Tree — 3 or 4 goals berdasarkan tipe tugas
// Analisis: EXPLORE → ANALYZE → CONCLUDE
// Implementasi: EXPLORE → ANALYZE → CONCLUDE → EXECUTE

import type { GoalNode, GoalStatus } from "./execution-manifest";

const GOAL_LABELS: Record<string, string> = {
  goal_0: "EXPLORE — Identifikasi file target",
  goal_1: "ANALYZE — Analisis mendalam + temukan akar masalah",
  goal_2: "CONCLUDE — Sintesis, rekomendasi, lapor ke Founder",
  goal_3: "EXECUTE — Implementasi perubahan (jika disetujui)",
};

const GOAL_STRATEGY_MAP: Record<string, string> = {
  goal_0: "EXPLORE",
  goal_1: "ANALYZE",
  goal_2: "CONCLUDE",
  goal_3: "EXECUTE",
};

class GoalTree {
  private nodes: Map<string, GoalNode> = new Map();
  private rootId: string = "";
  private _totalGoals = 0;

  /** Build tree — 3 goals (analysis) or 4 goals (with implementation) */
  build(domain: string, entities: string[], objective: string, hasExecute = false): void {
    this.nodes.clear();
    this.rootId = "root";
    this._totalGoals = hasExecute ? 4 : 3;

    this.nodes.set("root", {
      id: "root", label: objective || "Objective",
      status: "IN_PROGRESS", parentId: undefined,
    });

    for (let i = 0; i < this._totalGoals; i++) {
      this.nodes.set(`goal_${i}`, {
        id: `goal_${i}`, label: GOAL_LABELS[`goal_${i}`],
        status: i === 0 ? "IN_PROGRESS" : "PENDING", parentId: "root",
        requiredCapability: "ARCHITECTURE",
      });
    }
  }

  /** Advance goal when strategy changes — mark corresponding goal complete */
  advanceTo(strategy: string): void {
    for (let i = 0; i < this._totalGoals; i++) {
      const g = this.nodes.get(`goal_${i}`);
      if (GOAL_STRATEGY_MAP[`goal_${i}`] === strategy && g && g.status !== "COMPLETED") {
        // EXECUTE jangan di-complete — tetap IN_PROGRESS sampai implementasi selesai
        if (strategy === "EXECUTE") {
          g.status = "IN_PROGRESS";
          g.evidence = "Strategy reached: EXECUTE — implementing changes";
        } else {
          g.status = "COMPLETED";
          g.completedAt = new Date().toISOString();
          g.evidence = `Strategy reached: ${strategy}`;
        }
        // Set next goal as IN_PROGRESS
        const next = this.nodes.get(`goal_${i + 1}`);
        if (next && next.status === "PENDING") next.status = "IN_PROGRESS";
      }
    }
    this.checkRootCompletion();
  }

  total(): number { return this._totalGoals; }
  countByStatus(statuses: GoalStatus[]): number {
    let count = 0;
    for (let i = 0; i < this._totalGoals; i++) {
      const n = this.nodes.get(`goal_${i}`);
      if (n && statuses.includes(n.status)) count++;
    }
    return count;
  }

  /** Progress = completed / total × 100 */
  progress(_evidenceQuality?: number): number {
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
    for (let i = 0; i < this._totalGoals; i++) {
      const n = this.nodes.get(`goal_${i}`);
      if (n && (n.status === "PENDING" || n.status === "ASSIGNED" || n.status === "IN_PROGRESS")) result.push(n);
    }
    return result;
  }

  all(): GoalNode[] {
    const result: GoalNode[] = [];
    for (let i = 0; i < this._totalGoals; i++) {
      const n = this.nodes.get(`goal_${i}`);
      if (n) result.push({ ...n });
    }
    return result;
  }

  get(id: string): GoalNode | undefined { return this.nodes.get(id); }

  /** Legacy — mark by ID (now handled by advanceTo) */
  markCompleteById(_goalId: string): GoalNode | null { return null; }
  markComplete(_matchedPath: string): GoalNode | null { return null; }
  assess(): number { return this.progress(); }

  private checkRootCompletion(): void {
    if (this.isComplete()) {
      const root = this.nodes.get("root");
      if (root) { root.status = "COMPLETED"; root.completedAt = new Date().toISOString(); }
    }
  }
}

export { GoalTree };