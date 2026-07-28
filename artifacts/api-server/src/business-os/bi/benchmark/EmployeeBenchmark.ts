import type { BenchmarkResult } from "../types";

interface EmployeeEntry {
  id: number;
  name: string;
  department?: string;
  scores: Record<string, number>;
}

export class EmployeeBenchmark {
  employees: Map<number, EmployeeEntry> = new Map();

  setScore(employeeId: number, employeeName: string, metric: string, score: number, department?: string): void {
    const existing = this.employees.get(employeeId);
    if (existing) {
      existing.scores[metric] = score;
      if (department) existing.department = department;
    } else {
      this.employees.set(employeeId, { id: employeeId, name: employeeName, department, scores: { [metric]: score } });
    }
  }

  private toBenchmark(entry: EmployeeEntry, rank: number, total: number): BenchmarkResult {
    const raw = entry.scores;
    const names = Object.keys(raw);
    const metrics = names.map((n) => {
      const vals = Array.from(this.employees.values()).map((e) => e.scores[n] ?? 0);
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
      entityType: "employee",
      score: overall,
      metrics,
      overallRank: rank,
      totalEntities: total,
      percentile: total > 0 ? ((total - rank) / total) * 100 : 0,
    };
  }

  getBenchmark(employeeId: number): BenchmarkResult | null {
    const entry = this.employees.get(employeeId);
    if (!entry) return null;
    const all = this.getAllBenchmarks();
    const pos = all.findIndex((b) => b.entity === entry.name);
    return this.toBenchmark(entry, pos >= 0 ? pos + 1 : all.length, all.length);
  }

  getAllBenchmarks(): BenchmarkResult[] {
    const entries = Array.from(this.employees.values())
      .map((e) => ({
        entry: e,
        score: Object.values(e.scores).reduce((s, v) => s + v, 0) / (Object.keys(e.scores).length || 1),
      }))
      .sort((a, b) => b.score - a.score);
    return entries.map((e, i) => this.toBenchmark(e.entry, i + 1, entries.length));
  }

  private filterBenchmarks(entries: { entry: EmployeeEntry; score: number }[]): BenchmarkResult[] {
    return entries
      .sort((a, b) => b.score - a.score)
      .map((e, i) => this.toBenchmark(e.entry, i + 1, entries.length));
  }

  getTopPerformers(department?: string, limit = 5): BenchmarkResult[] {
    const pool = department
      ? Array.from(this.employees.values()).filter((e) => e.department === department)
      : Array.from(this.employees.values());
    const scored = pool.map((e) => ({
      entry: e,
      score: Object.values(e.scores).reduce((s, v) => s + v, 0) / (Object.keys(e.scores).length || 1),
    }));
    return this.filterBenchmarks(scored).slice(0, limit);
  }

  getBottomPerformers(limit = 5): BenchmarkResult[] {
    const scored = Array.from(this.employees.values()).map((e) => ({
      entry: e,
      score: Object.values(e.scores).reduce((s, v) => s + v, 0) / (Object.keys(e.scores).length || 1),
    }));
    return this.filterBenchmarks(scored).slice(-limit).reverse();
  }
}
