// ECP-046 Sprint 7: Risk Engine
// Detects risks before they become problems. Proactive monitoring.
// Categories: executive, resource, architecture, knowledge, consensus.

import type { RiskAssessment, Severity } from "./governance-types";
import { createRiskId } from "./governance-types";
import { qualityEngine } from "./quality-engine";
import { executiveAuditor } from "./executive-auditor";

export class RiskEngine {
  private risks: Map<string, RiskAssessment> = new Map();

  /** Assess current risks */
  assess(): RiskAssessment[] {
    const quality = qualityEngine.evaluate();
    const auditResults = executiveAuditor.auditAll();
    const newRisks: RiskAssessment[] = [];

    // Organization quality risk
    if (quality.organizationScore < 50) {
      newRisks.push(this.createRisk(
        "QUALITY", "Organization score critical", "CRITICAL", 80,
        "Run full governance audit. Review recent failed missions."
      ));
    }

    // Success rate risk
    if (quality.successRate < 40) {
      newRisks.push(this.createRisk(
        "QUALITY", "Mission success rate dangerously low", "HIGH", 70,
        "Increase verification strictness. Cross-train low-performing executives."
      ));
    }

    // Executive decline risk
    for (const audit of auditResults) {
      if (audit.trend === "DECLINING" && audit.score < 50) {
        newRisks.push(this.createRisk(
          "EXECUTIVE", `${audit.executive} declining (score: ${audit.score})`, "HIGH", 60,
          `Review ${audit.executive} recent missions. Consider mentorship.`
        ));
      }
    }

    // Knowledge stagnation risk
    if (quality.knowledgeReinforcement < 2 && quality.avgConfidence < 50) {
      newRisks.push(this.createRisk(
        "KNOWLEDGE", "Knowledge not reinforcing — possible stagnation", "MEDIUM", 50,
        "Increase cross-executive learning frequency."
      ));
    }

    // Confidence risk
    if (quality.avgConfidence < 40) {
      newRisks.push(this.createRisk(
        "QUALITY", "Average confidence critically low", "HIGH", 65,
        "Review MissionAnalyzer thresholds. Increase verification."
      ));
    }

    // Consensus risk
    if (quality.consensusAccuracy < 3) {
      newRisks.push(this.createRisk(
        "CONSENSUS", "Low consensus — many contested decisions", "MEDIUM", 45,
        "Review ConsensusEngine thresholds. Consider reputation weight adjustment."
      ));
    }

    // Store risks
    for (const risk of newRisks) {
      // Update existing or add new
      const existing = [...this.risks.values()]
        .find(r => r.risk === risk.risk && r.status === "ACTIVE");
      if (existing) {
        existing.detectedAt = risk.detectedAt;
      } else {
        this.risks.set(risk.id, risk);
      }
    }

    return this.getActive();
  }

  /** Mitigate a risk */
  mitigate(id: string): boolean {
    const risk = this.risks.get(id);
    if (!risk) return false;
    risk.status = "MITIGATED";
    return true;
  }

  /** Accept a risk (acknowledged, no action) */
  accept(id: string): boolean {
    const risk = this.risks.get(id);
    if (!risk) return false;
    risk.status = "ACCEPTED";
    return true;
  }

  /** Get active risks */
  getActive(): RiskAssessment[] {
    return [...this.risks.values()]
      .filter(r => r.status === "ACTIVE")
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }

  /** Get all risks */
  all(): RiskAssessment[] {
    return [...this.risks.values()];
  }

  private createRisk(
    category: string, risk: string, severity: Severity,
    probability: number, mitigation: string,
  ): RiskAssessment {
    return {
      id: createRiskId(),
      category,
      risk,
      severity,
      probability,
      mitigation,
      detectedAt: new Date().toISOString(),
      status: "ACTIVE",
    };
  }
}

export const riskEngine = new RiskEngine();
