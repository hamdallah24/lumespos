import type { BenchmarkResult } from "../types";

interface ProductEntry {
  id: number;
  name: string;
  scores: Record<string, number>;
}

export class ProductBenchmark {
  products: Map<number, ProductEntry> = new Map();

  setScore(productId: number, productName: string, metric: string, score: number): void {
    const existing = this.products.get(productId);
    if (existing) {
      existing.scores[metric] = score;
    } else {
      this.products.set(productId, { id: productId, name: productName, scores: { [metric]: score } });
    }
  }

  setScores(productId: number, productName: string, scores: Record<string, number>): void {
    const existing = this.products.get(productId);
    if (existing) {
      Object.assign(existing.scores, scores);
    } else {
      this.products.set(productId, { id: productId, name: productName, scores: { ...scores } });
    }
  }

  private toBenchmark(entry: ProductEntry, rank: number, total: number): BenchmarkResult {
    const raw = entry.scores;
    const names = Object.keys(raw);
    const metrics = names.map((n) => {
      const vals = Array.from(this.products.values()).map((p) => p.scores[n] ?? 0);
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
      entityType: "product",
      score: overall,
      metrics,
      overallRank: rank,
      totalEntities: total,
      percentile: total > 0 ? ((total - rank) / total) * 100 : 0,
    };
  }

  getBenchmark(productId: number): BenchmarkResult | null {
    const entry = this.products.get(productId);
    if (!entry) return null;
    const all = Array.from(this.products.values())
      .map((p) => ({
        entity: p.name,
        score: Object.values(p.scores).reduce((s, v) => s + v, 0) / (Object.keys(p.scores).length || 1),
      }))
      .sort((a, b) => b.score - a.score);
    const pos = all.findIndex((r) => r.entity === entry.name);
    return this.toBenchmark(entry, pos >= 0 ? pos + 1 : all.length, all.length);
  }

  getAllBenchmarks(): BenchmarkResult[] {
    const all = Array.from(this.products.values())
      .map((p) => ({
        entity: p.name,
        score: Object.values(p.scores).reduce((s, v) => s + v, 0) / (Object.keys(p.scores).length || 1),
      }))
      .sort((a, b) => b.score - a.score);
    return all.map((r, i) => {
      const entry = Array.from(this.products.values()).find((p) => p.name === r.entity);
      return entry ? this.toBenchmark(entry, i + 1, all.length) : null;
    }).filter((b): b is BenchmarkResult => b !== null);
  }

  getTopProducts(limit = 5): BenchmarkResult[] {
    return this.getAllBenchmarks().slice(0, limit);
  }

  getUnderperformers(threshold = 30): BenchmarkResult[] {
    return this.getAllBenchmarks().filter((b) => b.score < threshold);
  }
}
