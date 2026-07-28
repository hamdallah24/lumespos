import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export interface StrategyEntry {
  id: string;
  executive: string;
  title: string;
  description: string;
  objective: string;
  actions: string[];
  outcome: "success" | "failure" | "in_progress";
  confidence: number;
  metrics: Record<string, number>;
  lessonsLearned: string[];
  createdAt: string;
  completedAt?: string;
  tags: string[];
}

export class StrategyMemory {
  private strategies: StrategyEntry[] = [];
  private maxEntries = 500;

  record(strategy: Omit<StrategyEntry, "id" | "createdAt">): StrategyEntry {
    const entry: StrategyEntry = {
      id: `strat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...strategy,
      createdAt: new Date().toISOString(),
    };
    this.strategies.push(entry);
    if (this.strategies.length > this.maxEntries) this.strategies.shift();
    return entry;
  }

  findSimilarStrategies(objective: string, executive: string, minConfidence: number = 0.5): StrategyEntry[] {
    const words = objective.toLowerCase().split(/\s+/);
    return this.strategies.filter(s =>
      s.executive === executive &&
      s.outcome === "success" &&
      s.confidence >= minConfidence &&
      words.some(w => s.description.toLowerCase().includes(w) || s.objective.toLowerCase().includes(w))
    ).sort((a, b) => b.confidence - a.confidence);
  }

  getTopStrategies(executive: string, limit: number = 5): StrategyEntry[] {
    return this.strategies.filter(s => s.executive === executive && s.outcome === "success")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  recordFromWorkspace(executive: string): void {
    const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
    for (const obj of ws.objectives) {
      if (obj.status === "completed" && !this.strategies.some(s => s.objective === obj.title && s.executive === executive)) {
        const relatedDecisions = ws.decisions.filter(d => d.timestamp >= obj.createdAt);
        const relatedExecs = ws.executions.filter(e => relatedDecisions.some(d => d.decisionId === e.decisionId));
        const successRate = relatedExecs.length > 0
          ? relatedExecs.filter(e => e.success).length / relatedExecs.length
          : 0.5;

        this.record({
          executive,
          title: `Strategy: ${obj.title}`,
          description: `Completed objective: ${obj.description}`,
          objective: obj.title,
          actions: relatedDecisions.map(d => d.action),
          outcome: successRate >= 0.7 ? "success" : "failure",
          confidence: successRate,
          metrics: { completionRate: successRate },
          lessonsLearned: [],
          completedAt: obj.completedAt,
          tags: [executive, "completed_objective"],
        });
      }
    }
  }

  search(query: string): StrategyEntry[] {
    const q = query.toLowerCase();
    return this.strategies.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.objective.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    ).sort((a, b) => b.confidence - a.confidence);
  }

  getByExecutive(executive: string): StrategyEntry[] {
    return this.strategies.filter(s => s.executive === executive)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  count(): number { return this.strategies.length; }
  getAll(): StrategyEntry[] { return [...this.strategies]; }
}
