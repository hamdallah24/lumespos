// ECP-023: Capability Domain — capability manifests per role
// Frozen. Reads capability policies from Foundation docs + execution-policy.

import type { ICapabilityDomain } from "../types/provider-interfaces";
import type { CapabilityPolicy } from "../types/foundation-types";

const CAPABILITY_MATRIX: Record<string, Record<string, CapabilityPolicy>> = {
  CEO: {
    delegate:  { capability: "delegate",  minMaturity: "L0", requiresEvidence: false, requiresApproval: false },
    approve:   { capability: "approve",   minMaturity: "L0", requiresEvidence: false, requiresApproval: false },
    missionPlanning: { capability: "missionPlanning", minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
    organization:    { capability: "organization",    minMaturity: "L2", requiresEvidence: false, requiresApproval: true },
    businessAnalysis: { capability: "businessAnalysis", minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
    strategicDecision: { capability: "strategicDecision", minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
    reportAggregation: { capability: "reportAggregation", minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
  },
  CTO: {
    readFiles:  { capability: "readFiles",  minMaturity: "L0", requiresEvidence: false, requiresApproval: false },
    searchCode: { capability: "searchCode", minMaturity: "L0", requiresEvidence: false, requiresApproval: false },
    analyzeCode:      { capability: "analyzeCode",      minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
    generateProposal: { capability: "generateProposal", minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
    editCode:   { capability: "editCode",   minMaturity: "L2", requiresEvidence: true,  requiresApproval: true },
    deploy:     { capability: "deploy",     minMaturity: "L2", requiresEvidence: true,  requiresApproval: true },
    ssh:        { capability: "ssh",        minMaturity: "L2", requiresEvidence: true,  requiresApproval: true },
  },
  COO: {
    inventory:  { capability: "inventory",  minMaturity: "L0", requiresEvidence: false, requiresApproval: false },
    sales:      { capability: "sales",      minMaturity: "L0", requiresEvidence: false, requiresApproval: false },
    pricing:    { capability: "pricing",    minMaturity: "L1", requiresEvidence: true,  requiresApproval: true },
    purchasing: { capability: "purchasing", minMaturity: "L1", requiresEvidence: false, requiresApproval: false },
  },
};

class CapabilityDomain implements ICapabilityDomain {
  getForRole(role: string): CapabilityPolicy[] {
    const caps = CAPABILITY_MATRIX[role.toUpperCase()];
    return caps ? Object.values(caps) : [];
  }

  getAllowedCapabilities(role: string): string[] {
    return this.getForRole(role).map(c => c.capability);
  }

  getEvidenceRequirement(capability: string): boolean {
    for (const role of Object.values(CAPABILITY_MATRIX)) {
      const found = Object.values(role).find(c => c.capability === capability);
      if (found) return found.requiresEvidence;
    }
    return false;
  }

  getApprovalRequirement(capability: string): boolean {
    for (const role of Object.values(CAPABILITY_MATRIX)) {
      const found = Object.values(role).find(c => c.capability === capability);
      if (found) return found.requiresApproval;
    }
    return false;
  }
}

export const capabilityDomain = new CapabilityDomain();
