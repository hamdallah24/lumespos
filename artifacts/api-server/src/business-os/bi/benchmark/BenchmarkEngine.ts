import type { BenchmarkResult } from "../types";
import { BranchBenchmark } from "./BranchBenchmark";
import { ProductBenchmark } from "./ProductBenchmark";
import { EmployeeBenchmark } from "./EmployeeBenchmark";
import { CampaignBenchmark } from "./CampaignBenchmark";

export class BenchmarkEngine {
  branch: BranchBenchmark = new BranchBenchmark();
  product: ProductBenchmark = new ProductBenchmark();
  employee: EmployeeBenchmark = new EmployeeBenchmark();
  campaign: CampaignBenchmark = new CampaignBenchmark();

  getAllBranchBenchmarks(): BenchmarkResult[] {
    return this.branch.getAllBenchmarks();
  }

  getAllProductBenchmarks(): BenchmarkResult[] {
    return this.product.getAllBenchmarks();
  }

  getAllEmployeeBenchmarks(): BenchmarkResult[] {
    return this.employee.getAllBenchmarks();
  }

  getAllCampaignBenchmarks(): BenchmarkResult[] {
    return this.campaign.getAllBenchmarks();
  }

  getEntityTypeSummary(entityType: string): { avg: number; max: number; min: number; median: number; count: number } {
    let benchmarks: BenchmarkResult[];
    switch (entityType) {
      case "branch":
        benchmarks = this.getAllBranchBenchmarks();
        break;
      case "product":
        benchmarks = this.getAllProductBenchmarks();
        break;
      case "employee":
        benchmarks = this.getAllEmployeeBenchmarks();
        break;
      case "campaign":
        benchmarks = this.getAllCampaignBenchmarks();
        break;
      default:
        benchmarks = [];
    }

    const scores = benchmarks.map((b) => b.score).sort((a, b) => a - b);
    const count = scores.length;
    if (count === 0) return { avg: 0, max: 0, min: 0, median: 0, count: 0 };

    const avg = scores.reduce((s, v) => s + v, 0) / count;
    const max = scores[count - 1];
    const min = scores[0];
    const mid = Math.floor(count / 2);
    const median = count % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];

    return { avg, max, min, median, count };
  }
}
