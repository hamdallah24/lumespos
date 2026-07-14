import type { GovernanceReportEntry } from "./GovernanceReport";
import { PolicyRegistry } from "../runtime-policy/PolicyRegistry";

export interface PolicyIntegrityResult {
  entry: GovernanceReportEntry;
}

export const PolicyIntegrityAuditor = {
  check(): PolicyIntegrityResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    const policies = PolicyRegistry.getAll();

    if (policies.length === 0) {
      warnings.push("No policies registered");
      recommendations.push("Register at least one policy for runtime governance");
    }

    const seenConditions = new Set<string>();
    const seenActions = new Map<string, string[]>();

    for (const p of policies) {
      if (!p.condition?.trim()) {
        errors.push(`Policy "${p.id.name}" has empty condition`);
      }
      if (!p.action?.trim()) {
        errors.push(`Policy "${p.id.name}" has empty action`);
      }

      const condKey = p.condition?.trim().toLowerCase() || "";
      if (seenConditions.has(condKey)) {
        warnings.push(`Duplicate condition found: "${p.condition}" in policy "${p.id.name}"`);
      }
      seenConditions.add(condKey);

      const actionKey = p.action?.trim().toLowerCase() || "";
      if (!seenActions.has(actionKey)) {
        seenActions.set(actionKey, []);
      }
      seenActions.get(actionKey)!.push(p.id.name);

      if (p.priority < 0) {
        warnings.push(`Policy "${p.id.name}" has negative priority ${p.priority}`);
      }
    }

    for (const [action, names] of seenActions) {
      if (names.length > 1) {
        warnings.push(`Policy action "${action}" is defined by multiple rules: ${names.join(", ")} — possible conflict`);
      }
    }

    if (errors.length === 0 && warnings.length === 0) {
      const conditionTypes = policies.map(p => p.condition?.split(" ")[0]).filter(Boolean);
      const actionTypes = policies.map(p => p.action?.split(" ")[0]).filter(Boolean);
      recommendations.push("Review policy coverage — consider adding pre/post conditions");
    }

    return {
      entry: {
        passed: errors.length === 0,
        detail: `${policies.length} policies checked`,
        warnings,
        errors,
        recommendations,
      },
    };
  },
};
