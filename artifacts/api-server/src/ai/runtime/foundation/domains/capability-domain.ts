// ECP-023: Capability Domain — capability manifests per role
// ECP-025: Typed models. Data-driven from Foundation.

import type { ICapabilityDomain } from "../types/provider-interfaces";
import type { CapabilityPolicy } from "../types/foundation-types";
import { getAssetContent } from "../foundation-cache";

const CAPABILITY_MATRIX: Record<string, Record<string, CapabilityPolicy>> = {
  CEO: {
    delegate:           { capability: "delegate",  minMaturity: "L0", requiresEvidence: false, requiresApproval: false, description: "Delegate tasks to other Runtimes" },
    approve:            { capability: "approve",   minMaturity: "L0", requiresEvidence: false, requiresApproval: false, description: "Approve proposals and missions" },
    missionPlanning:    { capability: "missionPlanning", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Create and plan missions" },
    organization:       { capability: "organization", minMaturity: "L2", requiresEvidence: false, requiresApproval: true, description: "Manage organization structure" },
    businessAnalysis:   { capability: "businessAnalysis", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Analyze business data" },
    strategicDecision:  { capability: "strategicDecision", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Make strategic decisions" },
    reportAggregation:  { capability: "reportAggregation", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Aggregate reports from Runtimes" },
  },
  CTO: {
    readFiles:          { capability: "readFiles",  minMaturity: "L0", requiresEvidence: false, requiresApproval: false, description: "Read files from repository" },
    searchCode:         { capability: "searchCode", minMaturity: "L0", requiresEvidence: false, requiresApproval: false, description: "Search codebase for patterns" },
    analyzeCode:        { capability: "analyzeCode", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Analyze code for bugs and patterns" },
    generateProposal:   { capability: "generateProposal", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Create implementation proposals" },
    editCode:           { capability: "editCode",   minMaturity: "L2", requiresEvidence: true,  requiresApproval: true, description: "Modify files in repository" },
    deploy:             { capability: "deploy",     minMaturity: "L2", requiresEvidence: true,  requiresApproval: true, description: "Deploy to production" },
    ssh:                { capability: "ssh",        minMaturity: "L2", requiresEvidence: true,  requiresApproval: true, description: "Execute commands on VPS" },
  },
  COO: {
    inventory:          { capability: "inventory",  minMaturity: "L0", requiresEvidence: false, requiresApproval: false, description: "Manage inventory and stock" },
    sales:              { capability: "sales",      minMaturity: "L0", requiresEvidence: false, requiresApproval: false, description: "Track sales and revenue" },
    pricing:            { capability: "pricing",    minMaturity: "L1", requiresEvidence: true,  requiresApproval: true, description: "Adjust pricing" },
    purchasing:         { capability: "purchasing", minMaturity: "L1", requiresEvidence: false, requiresApproval: false, description: "Manage suppliers and expenses" },
  },
};

function loadFromFoundation(): void {
  try {
    getAssetContent("ceo-capability-v1");
    getAssetContent("cto-capability-v1");
    // ECP-026: Parse capability manifests into typed matrix
    // Currently: typed models are canonical
  } catch { /* typed defaults */ }
}

let _loaded = false;

class CapabilityDomain implements ICapabilityDomain {
  private _ensureLoaded(): void {
    if (!_loaded) { loadFromFoundation(); _loaded = true; }
  }

  getForRole(role: string): CapabilityPolicy[] {
    this._ensureLoaded();
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
