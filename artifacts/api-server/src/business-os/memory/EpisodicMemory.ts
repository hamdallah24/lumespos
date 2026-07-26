import { ExecutiveWorkspaceManager } from "../workspace/ExecutiveWorkspaceManager";

export interface EpisodicEntry {
  id: string;
  executive: string;
  type: "decision" | "execution" | "event" | "task" | "approval";
  title: string;
  description: string;
  outcome: "success" | "failure" | "pending";
  confidence: number;
  context: Record<string, unknown>;
  timestamp: string;
  tags: string[];
}

export class EpisodicMemory {
  private episodes: EpisodicEntry[] = [];
  private maxEntries = 1000;

  record(entry: Omit<EpisodicEntry, "id" | "timestamp">): EpisodicEntry {
    const episode: EpisodicEntry = {
      id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    this.episodes.push(episode);
    if (this.episodes.length > this.maxEntries) this.episodes.shift();
    return episode;
  }

  recordFromWorkspace(executive: string): void {
    const ws = ExecutiveWorkspaceManager.getWorkspace(executive);
    for (const d of ws.decisions) {
      this.episodes.push({
        id: `ep-decision-${d.decisionId}`,
        executive, type: "decision",
        title: d.action,
        description: d.reasoning,
        outcome: d.confidence >= 0.7 ? "success" : "failure",
        confidence: d.confidence,
        context: { parameters: d.parameters, source: d.source },
        timestamp: d.timestamp,
        tags: [d.action, executive],
      });
    }
    for (const e of ws.executions) {
      this.episodes.push({
        id: `ep-exec-${e.executionId}`,
        executive, type: "execution",
        title: e.action,
        description: e.message,
        outcome: e.success ? "success" : "failure",
        confidence: e.success ? 0.9 : 0.1,
        context: { decisionId: e.decisionId, module: e.module, durationMs: e.durationMs },
        timestamp: e.timestamp,
        tags: [e.action, e.module, executive],
      });
    }
  }

  recall(options: { executive?: string; type?: string; outcome?: string; limit?: number; tags?: string[] }): EpisodicEntry[] {
    let results = [...this.episodes];
    if (options.executive) results = results.filter(e => e.executive === options.executive);
    if (options.type) results = results.filter(e => e.type === options.type);
    if (options.outcome) results = results.filter(e => e.outcome === options.outcome);
    if (options.tags) results = results.filter(e => options.tags!.some(t => e.tags.includes(t)));
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return results.slice(0, options.limit ?? 50);
  }

  getRecent(executive: string, count: number = 10): EpisodicEntry[] {
    return this.recall({ executive, limit: count });
  }

  getFailurePatterns(executive: string): { action: string; count: number; recentTimestamp: string }[] {
    const failures = this.episodes.filter(e => e.executive === executive && e.outcome === "failure");
    const pattern = new Map<string, { count: number; recent: string }>();
    for (const f of failures) {
      const key = f.title;
      const existing = pattern.get(key) ?? { count: 0, recent: "" };
      existing.count++;
      if (f.timestamp > existing.recent) existing.recent = f.timestamp;
      pattern.set(key, existing);
    }
    return Array.from(pattern.entries())
      .map(([action, data]) => ({ action, count: data.count, recentTimestamp: data.recent }))
      .sort((a, b) => b.count - a.count);
  }

  getSuccessPatterns(executive: string): { action: string; count: number; avgConfidence: number }[] {
    const successes = this.episodes.filter(e => e.executive === executive && e.outcome === "success");
    const pattern = new Map<string, { count: number; totalConf: number }>();
    for (const s of successes) {
      const key = s.title;
      const existing = pattern.get(key) ?? { count: 0, totalConf: 0 };
      existing.count++;
      existing.totalConf += s.confidence;
      pattern.set(key, existing);
    }
    return Array.from(pattern.entries())
      .map(([action, data]) => ({ action, count: data.count, avgConfidence: Math.round(data.totalConf / data.count * 100) / 100 }))
      .sort((a, b) => b.avgConfidence - a.avgConfidence);
  }

  count(): number { return this.episodes.length; }
  clear(): void { this.episodes = []; }
}
