import type { GovernanceReportEntry } from "./GovernanceReport";
import { CapabilityRegistry } from "../runtime-metadata/CapabilityRegistry";
import { ExecutiveRegistry } from "../runtime-metadata/ExecutiveRegistry";

export interface CapabilityIntegrityResult {
  entry: GovernanceReportEntry;
}

export const CapabilityIntegrityAuditor = {
  check(): CapabilityIntegrityResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    const capabilities = CapabilityRegistry.getAll();
    const executives = ExecutiveRegistry.getAll();

    if (capabilities.length === 0) {
      errors.push("No capabilities registered");
      recommendations.push("Register capabilities: strategy, delegation, executive_report, ...");
    }

    const capNames = new Set(capabilities.map(c => c.name));
    const allRequiredCaps = new Set(executives.flatMap(e => e.capabilities));

    for (const capName of allRequiredCaps) {
      if (!capNames.has(capName)) {
        errors.push(`Executive capability "${capName}" is required but no capability with that name is registered`);
        recommendations.push(`Register capability "${capName}"`);
      }
    }

    for (const c of capabilities) {
      if (c.cost < 0) {
        warnings.push(`Capability "${c.name}" has negative cost (${c.cost})`);
      }
      if (c.priority < 0 || c.priority > 100) {
        warnings.push(`Capability "${c.name}" has out-of-range priority (${c.priority})`);
      }
      if (c.latency < 0) {
        warnings.push(`Capability "${c.name}" has negative latency`);
      }
    }

    return {
      entry: {
        passed: errors.length === 0,
        detail: `${capabilities.length} capabilities, ${allRequiredCaps.size} referenced by executives, ${errors.length} errors`,
        warnings,
        errors,
        recommendations,
      },
    };
  },
};
