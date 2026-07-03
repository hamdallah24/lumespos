// ECP-025: Verification Domain — reads VERIFICATION_POLICY.md
// Frozen. Domain confidence minimums, approval rules, evidence requirements.

import type { IVerificationDomain } from "../types/provider-interfaces";
import type { VerificationPolicyData, DomainConfidence, ApprovalRule, EvidenceRequirement } from "../types/foundation-types";
import { getAssetContent } from "../foundation-cache";

function parseVerificationPolicy(content: string): VerificationPolicyData {
  const domains: DomainConfidence[] = [
    { domain: "architecture", minimum: 70, reason: "Structural changes need high confidence" },
    { domain: "devops", minimum: 75, reason: "Server operations need high confidence" },
    { domain: "security", minimum: 85, reason: "Security changes need very high confidence" },
    { domain: "governance", minimum: 90, reason: "Governance changes need maximum confidence" },
    { domain: "inventory", minimum: 60, reason: "Operational changes" },
    { domain: "products", minimum: 60, reason: "Operational changes" },
    { domain: "business", minimum: 60, reason: "Operational changes" },
    { domain: "knowledge", minimum: 50, reason: "Knowledge queries" },
    { domain: "general", minimum: 40, reason: "General queries" },
    { domain: "runtime", minimum: 65, reason: "Runtime changes" },
  ];

  const approvalRules: ApprovalRule[] = [
    { intent: "implement_change", approvalRequired: true, description: "Touching Foundation or Security requires approval" },
    { intent: "devops_operation", approvalRequired: true, description: "Deploy/restart requires approval" },
    { intent: "business_action", approvalRequired: true, description: "Data migration requires confirmation" },
    { intent: "analyze_code", approvalRequired: false, description: "Read-only analysis" },
    { intent: "knowledge_query", approvalRequired: false, description: "Knowledge queries" },
    { intent: "greeting", approvalRequired: false, description: "Greetings" },
  ];

  const evidenceRequirements: EvidenceRequirement[] = [
    { action: "editCode", evidence: "File path + code diff" },
    { action: "deploy", evidence: "Deployment log + success confirmation" },
    { action: "ssh", evidence: "SSH command + output log" },
    { action: "pricing", evidence: "Price change reason + audit trail" },
    { action: "migrate", evidence: "Source + target branch IDs + item counts" },
  ];

  // Read actual data from Foundation document for overrides
  try {
    const doc = getAssetContent("verification-policy-v1");
    if (doc) {
      // Foundation doc provides canonical data — use it as source of truth
      // For now, typed models are the canonical source
      // ECP-026 will parse markdown directly
    }
  } catch { /* Use typed defaults */ }

  return { domains, approvalRules, evidenceRequirements };
}

let _policy: VerificationPolicyData | null = null;

function getPolicy(): VerificationPolicyData {
  if (!_policy) _policy = parseVerificationPolicy("");
  return _policy;
}

class VerificationDomain implements IVerificationDomain {
  minimumConfidence(domain: string): number {
    const entry = getPolicy().domains.find(d => d.domain === domain);
    return entry?.minimum || 40;
  }

  domainPolicy(domain: string): DomainConfidence | null {
    return getPolicy().domains.find(d => d.domain === domain) || null;
  }

  approvalRequirement(intent: string): { required: boolean; description: string } {
    const rule = getPolicy().approvalRules.find(r => r.intent === intent);
    return rule ? { required: rule.approvalRequired, description: rule.description }
      : { required: false, description: "No specific rule — default allowed" };
  }

  evidenceRules(action: string): string | null {
    const rule = getPolicy().evidenceRequirements.find(r => r.action === action);
    return rule?.evidence || null;
  }

  allDomains(): string[] {
    return getPolicy().domains.map(d => d.domain);
  }
}

export const verificationDomain = new VerificationDomain();
