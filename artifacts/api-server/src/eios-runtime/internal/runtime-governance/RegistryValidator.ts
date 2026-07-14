import type { ValidationResult } from "./StartupValidator";
import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";
import { ObserverRegistry } from "../runtime-metadata/ObserverRegistry";
import { CapabilityRegistry } from "../runtime-metadata/CapabilityRegistry";

export const RegistryValidator = {
  validate(): ValidationResult {
    const issues: string[] = [];

    const stages = PipelineStageRegistry.getAll();
    for (const s of stages) {
      if (!s.execute) issues.push(`Stage ${s.id.name} has no execute function`);
      if (s.timeout <= 0) issues.push(`Stage ${s.id.name} has invalid timeout`);
      if (s.retries < 0) issues.push(`Stage ${s.id.name} has invalid retries`);
    }

    const observers = ObserverRegistry.getAll();
    for (const o of observers) {
      if (!o.handle) issues.push(`Observer ${o.id.name} has no handle function`);
    }

    const caps = CapabilityRegistry.getAll();
    for (const c of caps) {
      if (c.cost < 0) issues.push(`Capability ${c.id.name} has negative cost`);
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : "Registry validation passed",
    };
  },
};
