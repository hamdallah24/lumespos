import type { EpisodicEntry } from "./EpisodicMemory";

export interface FailureEntry {
  id: string;
  executive: string;
  action: string;
  title: string;
  description: string;
  rootCause: string;
  impact: string;
  prevention: string[];
  severity: "low" | "medium" | "high" | "critical";
  repeated: boolean;
  repeatCount: number;
  timestamp: string;
  tags: string[];
}

export class FailureMemory {
  private failures: FailureEntry[] = [];
  private maxEntries = 500;

  record(failure: Omit<FailureEntry, "id" | "timestamp" | "repeatCount">): FailureEntry {
    const existing = this.failures.filter(f => f.executive === failure.executive && f.action === failure.action);
    const entry: FailureEntry = {
      id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...failure,
      repeatCount: existing.length + 1,
      repeated: existing.length > 0,
      timestamp: new Date().toISOString(),
    };
    this.failures.push(entry);
    if (this.failures.length > this.maxEntries) this.failures.shift();
    return entry;
  }

  recordFromEpisodic(episode: EpisodicEntry): FailureEntry | null {
    if (episode.outcome !== "failure") return null;
    const ctx = episode.context ?? {};
    return this.record({
      executive: episode.executive,
      action: episode.title,
      title: `Failed: ${episode.title}`,
      description: episode.description,
      rootCause: typeof ctx.error === "string" ? ctx.error : "Unknown",
      impact: typeof ctx.impact === "string" ? ctx.impact : "Limited",
      prevention: [],
      severity: "medium",
      repeated: false,
      tags: episode.tags,
    });
  }

  getByExecutive(executive: string): FailureEntry[] {
    return this.failures.filter(f => f.executive === executive)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  getRepeatedFailures(executive: string): FailureEntry[] {
    return this.failures.filter(f => f.executive === executive && f.repeated)
      .sort((a, b) => b.repeatCount - a.repeatCount);
  }

  getMostCommonFailures(executive: string, limit: number = 5): { action: string; count: number; severity: string }[] {
    const grouped = new Map<string, { count: number; severity: string }>();
    for (const f of this.failures.filter(f => f.executive === executive)) {
      const existing = grouped.get(f.action) ?? { count: 0, severity: "low" };
      existing.count++;
      const severityOrder = ["low", "medium", "high", "critical"];
      if (severityOrder.indexOf(f.severity) > severityOrder.indexOf(existing.severity)) {
        existing.severity = f.severity;
      }
      grouped.set(f.action, existing);
    }
    return Array.from(grouped.entries())
      .map(([action, data]) => ({ action, count: data.count, severity: data.severity }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  addPrevention(failureId: string, prevention: string): boolean {
    const failure = this.failures.find(f => f.id === failureId);
    if (!failure) return false;
    failure.prevention.push(prevention);
    return true;
  }

  getCriticalFailures(): FailureEntry[] {
    return this.failures.filter(f => f.severity === "critical" || f.severity === "high")
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  count(): number { return this.failures.length; }
  getAll(): FailureEntry[] { return [...this.failures]; }
  clear(): void { this.failures = []; }
}
