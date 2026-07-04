// ECP-046 Sprint 5: Improvement Engine
// Generates improvement plans based on quality metrics and executive audits.
// AI self-improvement: detect → recommend → track.

import type {
  QualityMetrics, ExecutiveAudit, ImprovementPlan,
  ImprovementPriority,
} from "./governance-types";
import { createImprovementId } from "./governance-types";

export class ImprovementEngine {
  private plans: ImprovementPlan[] = [];

  /** Generate improvement plans from quality + audit data */
  generate(quality: QualityMetrics, audits: ExecutiveAudit[]): ImprovementPlan[] {
    const newPlans: ImprovementPlan[] = [];

    // Quality-based improvements
    if (quality.organizationScore < 50) {
      newPlans.push(this.createPlan(
        "HIGH", "Organization",
        "Organisasi berada di bawah threshold. Review seluruh pipeline execution.",
        30, "organizationScore"
      ));
    }

    if (quality.successRate < 40) {
      newPlans.push(this.createPlan(
        "HIGH", "Execution",
        "Success rate rendah. Tambahkan verification gate sebelum setiap execution.",
        25, "successRate"
      ));
    }

    if (quality.failureRate > 40) {
      newPlans.push(this.createPlan(
        "HIGH", "Learning",
        "Failure rate tinggi. Perkuat retrieval engine dengan knowledge yang lebih relevan.",
        20, "failureRate"
      ));
    }

    if (quality.avgConfidence < 50) {
      newPlans.push(this.createPlan(
        "MEDIUM", "Confidence",
        "Rata-rata confidence rendah. Review MissionAnalyzer threshold.",
        15, "avgConfidence"
      ));
    }

    // Executive-based improvements
    for (const audit of audits) {
      if (audit.score < 40) {
        newPlans.push(this.createPlan(
          "HIGH", `Executive:${audit.executive}`,
          `${audit.executive} skor kritis (${audit.score}). Cross-train dari executive terbaik.`,
          20, `${audit.executive}_score`
        ));
      }

      if (audit.trend === "DECLINING") {
        newPlans.push(this.createPlan(
          "MEDIUM", `Executive:${audit.executive}`,
          `${audit.executive} dalam tren menurun. Review 5 misi terakhir.`,
          15, `${audit.executive}_trend`
        ));
      }

      // Action items from audit
      for (const action of audit.actions.slice(0, 3)) {
        if (!newPlans.find(p => p.recommendation === action)) {
          newPlans.push(this.createPlan(
            "MEDIUM", `Executive:${audit.executive}`,
            action, 10, `${audit.executive}_action`
          ));
        }
      }
    }

    // Add to plans
    this.plans.push(...newPlans);

    return newPlans;
  }

  /** Get pending improvements */
  getPending(): ImprovementPlan[] {
    return this.plans.filter(p => !p.implemented)
      .sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /** Mark improvement as implemented */
  implement(id: string): boolean {
    const plan = this.plans.find(p => p.id === id);
    if (!plan) return false;
    plan.implemented = true;
    return true;
  }

  /** Get implementation stats */
  stats() {
    const all = this.plans;
    return {
      total: all.length,
      implemented: all.filter(p => p.implemented).length,
      pending: all.filter(p => !p.implemented).length,
      byPriority: {
        HIGH: all.filter(p => p.priority === "HIGH").length,
        MEDIUM: all.filter(p => p.priority === "MEDIUM").length,
        LOW: all.filter(p => p.priority === "LOW").length,
      },
    };
  }

  private createPlan(
    priority: ImprovementPriority, component: string,
    recommendation: string, impact: number, targetMetric: string,
  ): ImprovementPlan {
    return {
      id: createImprovementId(),
      priority,
      component,
      recommendation,
      expectedImpact: impact,
      targetMetric,
      createdAt: new Date().toISOString(),
      implemented: false,
    };
  }
}

export const improvementEngine = new ImprovementEngine();
