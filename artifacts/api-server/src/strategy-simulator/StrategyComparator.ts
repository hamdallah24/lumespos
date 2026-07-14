import type { SimulationResult, ComparisonEntry, ComparisonReport } from "./types";

export function compareSimulations(results: SimulationResult[]): ComparisonReport {
  const entries: ComparisonEntry[] = results
    .filter((r) => r.status === "completed")
    .map((r) => {
      const dims = r.northStarAlignment.dimensions;
      const sorted = [...dims].sort((a, b) => b.score - a.score);
      return {
        label: r.label,
        direction: r.direction,
        overallScore: r.northStarAlignment.overallScore,
        confidence: r.confidence,
        topDimension: sorted.length > 0 ? { name: sorted[0].name, score: sorted[0].score } : null,
        dimensionCount: dims.length,
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore);

  const top = entries.length > 0 ? entries[0] : null;
  const scores = entries.map((e) => e.overallScore);
  const spread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;

  return {
    simulations: entries,
    topRanked: top,
    spread,
    generatedAt: new Date().toISOString(),
  };
}
