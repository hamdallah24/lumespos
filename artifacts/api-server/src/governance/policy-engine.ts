// ECP-046 Sprint 6: Policy Engine
// Centralized organization policy. No magic numbers anywhere.
// All thresholds, limits, and rules in one place.

import type { OrganizationPolicy } from "./governance-types";
import { DEFAULT_POLICY } from "./governance-types";

export class PolicyEngine {
  private policy: OrganizationPolicy = { ...DEFAULT_POLICY };

  /** Get current policy */
  get(): OrganizationPolicy {
    return { ...this.policy };
  }

  /** Update policy */
  update(updates: Partial<OrganizationPolicy>): OrganizationPolicy {
    this.policy = { ...this.policy, ...updates };
    return this.get();
  }

  /** Reset to defaults */
  reset(): OrganizationPolicy {
    this.policy = { ...DEFAULT_POLICY };
    return this.get();
  }

  /** Get specific threshold */
  threshold(key: keyof OrganizationPolicy): number {
    const val = this.policy[key];
    return typeof val === "number" ? val : 60;
  }

  /** Check if value meets policy threshold */
  meets(key: keyof OrganizationPolicy, value: number): boolean {
    const threshold = this.threshold(key);
    return value >= threshold;
  }

  /** Should trigger audit? */
  shouldAudit(lastAuditTime: number): boolean {
    return Date.now() - lastAuditTime >= this.policy.auditIntervalMs;
  }

  /** Can accept new mission? */
  canAcceptMission(currentCount: number): boolean {
    return currentCount < this.policy.maxConcurrentMissions;
  }

  /** Is token budget exceeded? */
  isBudgetExceeded(totalTokens: number): boolean {
    return totalTokens >= this.policy.tokenBudgetLimit;
  }

  /** List all policy rules as human-readable */
  listRules(): Array<{ key: string; value: number | string; description: string }> {
    return [
      { key: "minimalConfidence", value: this.policy.minimalConfidence, description: "Minimum confidence to proceed with execution" },
      { key: "minimalEvidence", value: this.policy.minimalEvidence, description: "Minimum evidence items required" },
      { key: "delegationThreshold", value: this.policy.delegationThreshold, description: "Reputation needed for delegation authority" },
      { key: "consensusThreshold", value: this.policy.consensusThreshold, description: "Weighted percentage for consensus decisions" },
      { key: "learningThreshold", value: this.policy.learningThreshold, description: "Minimum score to trigger knowledge reinforcement" },
      { key: "knowledgeValidationCount", value: this.policy.knowledgeValidationCount, description: "Sources required to validate org knowledge" },
      { key: "maxRetries", value: this.policy.maxRetries, description: "Maximum retries per execution" },
      { key: "maxConcurrentMissions", value: this.policy.maxConcurrentMissions, description: "Max concurrent missions allowed" },
      { key: "tokenBudgetLimit", value: this.policy.tokenBudgetLimit, description: "Total token budget ceiling" },
      { key: "reputationDecayDays", value: this.policy.reputationDecayDays, description: "Days before reputation starts decaying" },
    ];
  }
}

export const policyEngine = new PolicyEngine();
