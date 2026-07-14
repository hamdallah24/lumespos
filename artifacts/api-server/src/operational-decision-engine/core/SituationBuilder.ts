import type { BusinessFact } from "../../business-intelligence/core/types";
import type { OperationalSituation, SituationSeverity, CandidateDecision } from "./types";
import { estimateImpact } from "./ImpactEstimator";
import { calculatePriority } from "./PriorityCalculator";
import { determineApproval } from "./ApprovalDeterminer";

export function buildCandidateDecision(fact: BusinessFact): CandidateDecision[] {
  const decisions: CandidateDecision[] = [];

  switch (fact.domain) {
    case "inventory": {
      decisions.push({
        id: `cd-reorder-${fact.id}`,
        title: "Buat Purchase Order",
        description: `Pesan stok untuk item dengan coverage ${fact.value.toFixed(1)} hari`,
        actionType: "create_purchase_order",
        params: { itemType: fact.name, quantity: Math.ceil(fact.value * 1.5) },
        confidence: 0.85,
        estimatedEffect: {
          metric: "stock_coverage",
          expectedChange: 7,
          unit: "days",
        },
      });
      decisions.push({
        id: `cd-transfer-${fact.id}`,
        title: "Transfer stok dari cabang lain",
        description: "Cari cabang dengan stok berlebih dan transfer",
        actionType: "transfer_stock",
        params: {},
        confidence: 0.6,
      });
      break;
    }

    case "sales": {
      decisions.push({
        id: `cd-promo-${fact.id}`,
        title: "Jalankan promosi",
        description: "Buat promo untuk mendorong penjualan",
        actionType: "create_promotion",
        params: { discount: 0.1, durationDays: 3 },
        confidence: 0.7,
      });
      break;
    }

    case "shift": {
      decisions.push({
        id: `cd-audit-${fact.id}`,
        title: "Tugaskan audit",
        description: "Investigasi selisih kas oleh tim audit",
        actionType: "assign_audit",
        params: { shiftId: fact.id, auditType: "cash" },
        confidence: 0.9,
      });
      break;
    }

    case "finance": {
      decisions.push({
        id: `cd-review-${fact.id}`,
        title: "Review pengeluaran",
        description: "Audit pengeluaran harian untuk cari anomali",
        actionType: "review_expenses",
        params: { period: "daily" },
        confidence: 0.75,
      });
      break;
    }
  }

  return decisions;
}

export function buildSituation(
  fact: BusinessFact,
  overrides?: Partial<OperationalSituation>,
): OperationalSituation {
  const severityMap: Record<string, SituationSeverity> = {
    high: "critical",
    medium: "high",
    low: "medium",
  };
  const severity = overrides?.severity ?? severityMap[fact.severity] ?? "low";

  const impact = estimateImpact(fact);
  const { score: priority, rationale: priorityRationale } = calculatePriority(
    severity,
    fact,
    impact.financialImpact,
  );
  const approval = determineApproval({
    priority,
    financialImpact: impact.financialImpact,
    domain: fact.domain,
  });

  const decisions = overrides?.candidateDecisions ?? buildCandidateDecision(fact);

  return {
    id: `situation-${fact.domain}-${fact.name}-${Date.now()}`,
    domain: fact.domain,
    title: `${fact.description.substring(0, 80)}`,
    description: fact.description,
    severity,
    sourceFacts: [fact.id],
    sourceEvents: overrides?.sourceEvents,
    financialImpact: impact.financialImpact,
    operationalImpact: impact.operationalImpact,
    priority,
    priorityRationale,
    approvalLevel: approval.level,
    approvalDeadline: approval.deadline,
    approvalRationale: approval.rationale,
    candidateDecisions: decisions,
    timestamp: new Date(),
    branchId: fact.branchId,
    source: overrides?.source ?? "rule",
  };
}
