import type { BenchmarkResult } from "../types";

interface BranchEntry {
  id: number;
  name: string;
  scores: Record<string, number>;
}

export class BranchBenchmark {
  branches: Map<number, BranchEntry> = new Map();

  setScore(branchId: number, branchName: string, metric: string, score: number): void {
    const existing = this.branches.get(branchId);
    if (existing) {
      existing.scores[metric] = score;
    } else {
      this.branches.set(branchId, { id: branchId, name: branchName, scores: { [metric]: score } });
    }
  }

  setScores(branchId: number, branchName: string, scores: Record<string, number>): void {
    const existing = this.branches.get(branchId);
    if (existing) {
      Object.assign(existing.scores, scores);
    } else {
      this.branches.set(branchId, { id: branchId, name: branchName, scores: { ...scores } });
    }
  }

  private toBenchmark(entry: BranchEntry, rank: number, total: number): BenchmarkResult {
    const raw = entry.scores;
    const names = Object.keys(raw);
    const metrics = names.map((n) => {
      const vals = Array.from(this.branches.values()).map((b) => b.scores[n] ?? 0);
      const avg = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
      const sorted = [...vals].sort((a, b) => b - a);
      const position = sorted.indexOf(raw[n]) + 1;
      return { name: n, value: raw[n], avg, rank: position > 0 ? position : vals.length };
    });
    const overall = names.length
      ? names.reduce((s, n) => s + (raw[n] ?? 0), 0) / names.length
      : 0;
    return {
      entity: entry.name,
      entityType: "branch",
      score: overall,
      metrics,
      overallRank: rank,
      totalEntities: total,
      percentile: total > 0 ? ((total - rank) / total) * 100 : 0,
    };
  }

  getBenchmark(branchId: number): BenchmarkResult | null {
    const entry = this.branches.get(branchId);
    if (!entry) return null;
    const all = this.getRanking();
    const pos = all.findIndex((r) => r.entity === entry.name);
    return this.toBenchmark(entry, pos >= 0 ? pos + 1 : all.length, all.length);
  }

  getAllBenchmarks(): BenchmarkResult[] {
    const all = this.getRanking();
    return all.map((r, i) => {
      const entry = Array.from(this.branches.values()).find((b) => b.name === r.entity);
      return entry ? this.toBenchmark(entry, i + 1, all.length) : null;
    }).filter((b): b is BenchmarkResult => b !== null);
  }

  getRanking(metric?: string): { entity: string; score: number; rank: number }[] {
    const entries = Array.from(this.branches.values());
    const scored = entries.map((e) => ({
      entity: e.name,
      score: metric
        ? (e.scores[metric] ?? 0)
        : Object.values(e.scores).reduce((s, v) => s + v, 0) / (Object.keys(e.scores).length || 1),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s, i) => ({ ...s, rank: i + 1 }));
  }

  getTopBranches(limit = 5): BenchmarkResult[] {
    return this.getAllBenchmarks().slice(0, limit);
  }
}
