import type { ValidationResult } from "./StartupValidator";
import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";

export const MigrationValidator = {
  validate(): ValidationResult {
    const issues: string[] = [];

    for (const s of PipelineStageRegistry.getAll()) {
      if (s.manifest.deprecated && !s.manifest.replacement) {
        issues.push(`Stage ${s.id.name} is deprecated but has no replacement`);
      }
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : "Migration validation passed",
    };
  },
};
