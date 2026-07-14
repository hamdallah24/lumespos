import type { ValidationResult } from "./StartupValidator";
import { PolicyRegistry } from "../runtime-policy/PolicyRegistry";

export const PolicyValidator = {
  validate(): ValidationResult {
    const issues: string[] = [];
    const policies = PolicyRegistry.getAll();

    for (const p of policies) {
      if (!p.condition) issues.push(`Policy ${p.id.name} has no condition`);
      if (!p.action) issues.push(`Policy ${p.id.name} has no action`);
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : "Policy validation passed",
    };
  },
};
