import type { DecisionOutcome, OutcomeStatus } from "./DecisionOutcome";

export class OutcomeEvaluator {
  evaluate(outcome: DecisionOutcome): { status: OutcomeStatus; score: number; reason: string } {
    const deviation = outcome.deviation;
    const executionSuccess = outcome.reason.toLowerCase().includes("success") || !outcome.reason.toLowerCase().includes("fail");
    const kpiImproved = outcome.kpiImpact.some(k => k.change > 0);

    if (deviation < 0.1 && executionSuccess) {
      return { status: "SUCCESS", score: 95, reason: "Execution berhasil dengan deviasi minimal" };
    }
    if (deviation < 0.1 && !executionSuccess) {
      return { status: "PARTIAL", score: 60, reason: "Hasil sesuai target namun eksekusi bermasalah" };
    }
    if (deviation < 0.3 && executionSuccess) {
      return { status: "PARTIAL", score: 65, reason: `Deviasi ${Math.round(deviation * 100)}% dari target` };
    }
    if (deviation < 0.3 && !executionSuccess) {
      return { status: "PARTIAL", score: 40, reason: `Deviasi ${Math.round(deviation * 100)}% dan eksekusi tidak optimal` };
    }
    if (deviation >= 0.3 && kpiImproved) {
      return { status: "PARTIAL", score: 50, reason: "Deviasi besar namun ada dampak KPI positif" };
    }
    if (deviation >= 0.5) {
      return { status: "FAILED", score: 15, reason: `Deviasi ${Math.round(deviation * 100)}% — hasil jauh dari target` };
    }
    if (!executionSuccess && deviation >= 0.3) {
      return { status: "FAILED", score: 10, reason: "Eksekusi gagal dan hasil di luar toleransi" };
    }

    return { status: "PARTIAL", score: 50, reason: "Hasil perlu review manual" };
  }

  evaluateBatch(outcomes: DecisionOutcome[]): { status: OutcomeStatus; score: number; reason: string }[] {
    return outcomes.map(o => this.evaluate(o));
  }

  getStatusSummary(outcomes: DecisionOutcome[]): { success: number; partial: number; failed: number; pending: number; total: number } {
    const total = outcomes.length;
    const success = outcomes.filter(o => o.status === "SUCCESS").length;
    const partial = outcomes.filter(o => o.status === "PARTIAL").length;
    const failed = outcomes.filter(o => o.status === "FAILED").length;
    const pending = outcomes.filter(o => o.status === "PENDING").length;
    return { total, success, partial, failed, pending };
  }
}
