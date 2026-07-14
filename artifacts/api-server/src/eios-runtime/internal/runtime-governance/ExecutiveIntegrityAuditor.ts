import type { GovernanceReportEntry } from "./GovernanceReport";
import { ExecutiveRegistry } from "../runtime-metadata/ExecutiveRegistry";
import { PolicyRegistry } from "../runtime-policy/PolicyRegistry";

export interface ExecutiveIntegrityResult {
  entry: GovernanceReportEntry;
}

export const ExecutiveIntegrityAuditor = {
  check(): ExecutiveIntegrityResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    const executives = ExecutiveRegistry.getAll();
    const policies = PolicyRegistry.getAll();

    if (executives.length === 0) {
      errors.push("No executives registered");
      recommendations.push("Register executives: CEO, CTO, CFO, CMO, CAIO, CKO, COO");
    }

    const definedRoles = new Set(executives.map(e => e.role));
    const expectedRoles = ["CEO", "CTO", "CFO", "CMO", "CAIO", "CKO", "COO", "CHRO"];

    for (const role of expectedRoles) {
      if (!definedRoles.has(role)) {
        warnings.push(`Executive role "${role}" is not registered`);
        recommendations.push(`Register executive "${role}" with capabilities and authority`);
      }
    }

    for (const ex of executives) {
      if (!ex.manifest) {
        errors.push(`Executive "${ex.role}" has no manifest`);
      }
      if (!ex.capabilities || ex.capabilities.length === 0) {
        warnings.push(`Executive "${ex.role}" has no capabilities defined`);
        recommendations.push(`Assign at least one capability to "${ex.role}"`);
      }
      if (ex.priority < 0 || ex.priority > 100) {
        warnings.push(`Executive "${ex.role}" has out-of-range priority (${ex.priority})`);
      }
      if (!["full", "limited", "observer"].includes(ex.authority)) {
        errors.push(`Executive "${ex.role}" has invalid authority "${ex.authority}"`);
      }

      const councilCount = executives.filter(e => e.councilMember).length;
      if (councilCount < 2) {
        warnings.push(`Only ${councilCount} council members — expected at least 2 for quorum`);
        recommendations.push("Designate at least 2 executives as council members");
      }
    }

    return {
      entry: {
        passed: errors.length === 0,
        detail: `${executives.length}/${expectedRoles.length} executives registered`,
        warnings,
        errors,
        recommendations,
      },
    };
  },
};
