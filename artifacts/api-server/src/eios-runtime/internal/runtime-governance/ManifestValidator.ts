import type { ValidationResult } from "./StartupValidator";
import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";
import { ObserverRegistry } from "../runtime-metadata/ObserverRegistry";
import { ExecutiveRegistry } from "../runtime-metadata/ExecutiveRegistry";

export const ManifestValidator = {
  validate(): ValidationResult {
    const issues: string[] = [];

    for (const s of PipelineStageRegistry.getAll()) {
      const m = s.manifest;
      if (!m.id) issues.push(`Stage ${s.id.name} has no manifest id`);
      if (!m.checksum) issues.push(`Stage ${s.id.name} has no checksum`);
      if (!m.schemaVersion) issues.push(`Stage ${s.id.name} has no schema version`);
    }

    for (const o of ObserverRegistry.getAll()) {
      if (!o.manifest.id) issues.push(`Observer ${o.id.name} has no manifest id`);
    }

    for (const e of ExecutiveRegistry.getAll()) {
      if (!e.manifest.id) issues.push(`Executive ${e.id.name} has no manifest id`);
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : "Manifest validation passed",
    };
  },
};
