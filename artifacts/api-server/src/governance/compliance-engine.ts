// ECP-046 Sprint 2b: Compliance Engine
// Rule enforcement across all layers. Every rule has a check function.
// Feeds violations into Architecture Auditor.

import type { ComplianceRule, ComplianceResult, AuditStatus } from "./governance-types";
import { policyEngine } from "./policy-engine";
import { organizationalMemory } from "../intelligence/organizational-memory";
import { executiveReputationTracker } from "../intelligence/executive-reputation";

export class ComplianceEngine {
  private rules: ComplianceRule[] = [];

  constructor() {
    this.registerRules();
  }

  /** Register all compliance rules */
  private registerRules(): void {
    this.rules = [
      {
        id: "GOV-001", name: "Policy Engine Active",
        description: "Policy engine must return non-null policy.",
        check: () => {
          const policy = policyEngine.get();
          return policy ? "PASS" : "FAIL";
        },
        layer: "Governance",
      },
      {
        id: "GOV-002", name: "Confidence Above Threshold",
        description: "Organization avg confidence must exceed policy threshold.",
        check: () => {
          const policy = policyEngine.get();
          const memStats = organizationalMemory.stats();
          return memStats.avgConfidence >= policy.minimalConfidence ? "PASS" : "WARNING";
        },
        layer: "Governance",
      },
      {
        id: "GOV-003", name: "No Stale Knowledge",
        description: "Organizational memory must have validated entries.",
        check: () => {
          const memStats = organizationalMemory.stats();
          return memStats.validated > 0 ? "PASS" : "WARNING";
        },
        layer: "Governance",
      },
      {
        id: "GOV-004", name: "Executive Reputation Baseline",
        description: "At least 3 executives must have reputation above 50.",
        check: () => {
          const all = executiveReputationTracker.all();
          const qualified = all.filter(r => r.confidence >= 50);
          return qualified.length >= 3 ? "PASS" : "WARNING";
        },
        layer: "Governance",
      },
      {
        id: "GOV-005", name: "Policy Thresholds Valid",
        description: "All policy thresholds must be positive numbers.",
        check: () => {
          const policy = policyEngine.get();
          const thresholds = [
            policy.minimalConfidence, policy.minimalEvidence,
            policy.delegationThreshold, policy.consensusThreshold,
            policy.learningThreshold, policy.knowledgeValidationCount,
            policy.maxRetries, policy.maxConcurrentMissions,
          ];
          return thresholds.every(t => t > 0) ? "PASS" : "FAIL";
        },
        layer: "Governance",
      },
      {
        id: "GOV-006", name: "Organization Health",
        description: "Success rate + confidence must form a healthy baseline.",
        check: () => {
          const policy = policyEngine.get();
          const all = executiveReputationTracker.all();
          if (all.length === 0) return "WARNING";
          const avgSuccess = all.reduce((s, r) => s + r.successRate, 0) / all.length;
          return avgSuccess >= policy.minimalConfidence ? "PASS" : "WARNING";
        },
        layer: "Governance",
      },
      {
        id: "GOV-007", name: "Cross-Executive Coverage",
        description: "Every registered executive must have at least 1 mission.",
        check: () => {
          const all = executiveReputationTracker.all();
          const inexperienced = all.filter(r => r.experience === 0);
          return inexperienced.length === 0 ? "PASS" : "WARNING";
        },
        layer: "Governance",
      },
      {
        id: "GOV-008", name: "Knowledge Validation Coverage",
        description: "Validated knowledge must exceed pending knowledge.",
        check: () => {
          const memStats = organizationalMemory.stats();
          if (memStats.total === 0) return "PASS";
          return memStats.validated >= memStats.pendingValidation ? "PASS" : "WARNING";
        },
        layer: "Governance",
      },
    ];
  }

  /** Run all compliance checks */
  checkAll(): ComplianceResult[] {
    return this.rules.map(rule => {
      const status = rule.check();
      const message = status === "PASS"
        ? `${rule.name}: OK`
        : status === "WARNING"
          ? `${rule.name}: Below threshold — review recommended`
          : `${rule.name}: FAILED — action required`;

      return {
        ruleId: rule.id,
        name: rule.name,
        status,
        message,
        checkedAt: new Date().toISOString(),
      };
    });
  }

  /** Check specific rule */
  checkRule(ruleId: string): ComplianceResult | null {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) return null;
    const status = rule.check();
    return {
      ruleId: rule.id,
      name: rule.name,
      status,
      message: status === "PASS" ? `${rule.name}: OK` : `${rule.name}: ${status}`,
      checkedAt: new Date().toISOString(),
    };
  }

  /** Get all rules */
  listRules(): Array<{ id: string; name: string; layer: string }> {
    return this.rules.map(r => ({ id: r.id, name: r.name, layer: r.layer }));
  }
}

export const complianceEngine = new ComplianceEngine();
