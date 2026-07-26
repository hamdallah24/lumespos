import type { BenchmarkResult } from "../types";

interface CampaignEntry {
  id: string;
  name: string;
  scores: Record<string, number>;
}

export class CampaignBenchmark {
  campaigns: Map<string, CampaignEntry> = new Map();

  setScore(campaignId: string, campaignName: string, metric: string, score: number): void {
    const existing = this.campaigns.get(campaignId);
    if (existing) {
      existing.scores[metric] = score;
    } else {
      this.campaigns.set(campaignId, { id: campaignId, name: campaignName, scores: { [metric]: score } });
    }
  }

  private toBenchmark(entry: CampaignEntry, rank: number, total: number): BenchmarkResult {
    const raw = entry.scores;
    const names = Object.keys(raw);
    const metrics = names.map((n) => {
      const vals = Array.from(this.campaigns.values()).map((c) => c.scores[n] ?? 0);
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
      entityType: "campaign",
      score: overall,
      metrics,
      overallRank: rank,
      totalEntities: total,
      percentile: total > 0 ? ((total - rank) / total) * 100 : 0,
    };
  }

  getBenchmark(campaignId: string): BenchmarkResult | null {
    const entry = this.campaigns.get(campaignId);
    if (!entry) return null;
    const all = this.getAllBenchmarks();
    const pos = all.findIndex((b) => b.entity === entry.name);
    return this.toBenchmark(entry, pos >= 0 ? pos + 1 : all.length, all.length);
  }

  getAllBenchmarks(): BenchmarkResult[] {
    const scored = Array.from(this.campaigns.values())
      .map((c) => ({
        entry: c,
        score: Object.values(c.scores).reduce((s, v) => s + v, 0) / (Object.keys(c.scores).length || 1),
      }))
      .sort((a, b) => b.score - a.score);
    return scored.map((s, i) => this.toBenchmark(s.entry, i + 1, scored.length));
  }

  getBestCampaigns(limit = 5): BenchmarkResult[] {
    return this.getAllBenchmarks().slice(0, limit);
  }

  getROIComparison(): { campaign: string; roi: number; rank: number }[] {
    const withRoi = Array.from(this.campaigns.values())
      .map((c) => ({
        campaign: c.name,
        roi: c.scores.roi ?? c.scores.ROI ?? 0,
      }))
      .sort((a, b) => b.roi - a.roi);
    return withRoi.map((w, i) => ({ ...w, rank: i + 1 }));
  }
}
