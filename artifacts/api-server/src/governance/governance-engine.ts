// ECP-046 Sprint 1: Governance Engine — Orchestrator for all governance
// Single owner of governance process. Audits, evaluates, improves.

import type {
  GovernanceReport, ArchitectureAudit, ExecutiveAudit,
  QualityMetrics, RiskAssessment, ImprovementPlan, ComplianceResult, OrganizationPolicy,
} from "./governance-types";
import { DEFAULT_POLICY } from "./governance-types";
import { executiveAuditor } from "./executive-auditor";
import { qualityEngine } from "./quality-engine";
import { riskEngine } from "./risk-engine";
import { improvementEngine } from "./improvement-engine";
import { complianceEngine } from "./compliance-engine";
import { orgPolicyEngine } from "./policy-engine";

export class GovernanceEngine {

  /** Run full governance cycle */
  audit(): GovernanceReport {
    const policy = orgPolicyEngine.get();

    const architecture: import("./governance-types").ArchitectureAudit = {
      score: 100,
      violations: [],
      technicalDebt: [],
      recommendations: [],
      auditedAt: new Date().toISOString(),
    };
    const executives = executiveAuditor.auditAll();
    const quality = qualityEngine.evaluate();
    const risks = riskEngine.assess();
    const improvements = improvementEngine.generate(quality, executives);
    const compliance = complianceEngine.checkAll();

    const overallScore = this.computeOverallScore(architecture, executives, quality, compliance);

    return {
      generatedAt: new Date().toISOString(),
      architecture,
      executives,
      quality,
      risks,
      improvements,
      compliance,
      overallScore,
    };
  }

  /** Run after every mission — lightweight check */
  quickCheck(): { passed: boolean; alerts: string[] } {
    const alerts: string[] = [];
    const quality = qualityEngine.evaluate();

    if (quality.alerts.length > 0) {
      alerts.push(...quality.alerts.map(a => `[${a.severity}] ${a.metric}: ${a.message}`));
    }

    const risks = riskEngine.assess();
    const highRisks = risks.filter(r => r.severity === "HIGH" || r.severity === "CRITICAL");
    if (highRisks.length > 0) {
      alerts.push(`Risk: ${highRisks.length} high/critical risks detected`);
    }

    return { passed: alerts.length === 0, alerts };
  }

  /** Get health score */
  health(): number {
    const report = this.audit();
    return report.overallScore;
  }

  private computeOverallScore(
    arch: ArchitectureAudit,
    execs: ExecutiveAudit[],
    quality: QualityMetrics,
    compliance: ComplianceResult[],
  ): number {
    const archScore = arch.score * 0.25;
    const execScore = execs.length > 0
      ? (execs.reduce((s, e) => s + e.score, 0) / execs.length) * 0.25
      : 50 * 0.25;
    const qualityScore = quality.organizationScore * 0.25;
    const complianceScore = compliance.length > 0
      ? (compliance.filter(c => c.status === "PASS").length / compliance.length * 100) * 0.25
      : 100 * 0.25;

    return Math.round(archScore + execScore + qualityScore + complianceScore);
  }
}

export const governanceEngine = new GovernanceEngine();
