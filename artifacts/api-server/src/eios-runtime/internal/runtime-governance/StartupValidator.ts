export interface ValidationResult {
  passed: boolean;
  message: string;
}

import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";
import { ObserverRegistry } from "../runtime-metadata/ObserverRegistry";
import { PipelineProfileRegistry } from "../runtime-metadata/PipelineProfileRegistry";
import { TriggerRegistry } from "../runtime-metadata/TriggerRegistry";
import { ExecutiveRegistry } from "../runtime-metadata/ExecutiveRegistry";
import { CapabilityRegistry } from "../runtime-metadata/CapabilityRegistry";
import { PolicyRegistry } from "../runtime-policy/PolicyRegistry";
import { EventRegistry } from "../runtime-metadata/EventRegistry";

export const StartupValidator = {
  validate(): ValidationResult {
    const issues: string[] = [];

    const stages = PipelineStageRegistry.getAll();
    if (stages.length < 3) issues.push(`Expected >=3 stages, got ${stages.length}`);

    const observers = ObserverRegistry.getAll();
    if (observers.length < 1) issues.push(`Expected >=1 observers, got ${observers.length}`);

    const profiles = PipelineProfileRegistry.getAll();
    if (profiles.length < 1) issues.push(`Expected >=1 profiles, got ${profiles.length}`);

    const triggers = TriggerRegistry.getAll();
    if (triggers.length < 1) issues.push(`Expected >=1 triggers, got ${triggers.length}`);

    const executives = ExecutiveRegistry.getAll();
    if (executives.length < 1) issues.push(`Expected >=1 executives, got ${executives.length}`);

    const caps = CapabilityRegistry.getAll();
    const policies = PolicyRegistry.getAll();
    const events = EventRegistry.getAll();

    for (const s of stages) {
      if (!s.execute) issues.push(`Stage ${s.id.name} has no execute function`);
      if (s.timeout <= 0) issues.push(`Stage ${s.id.name} has invalid timeout`);
      if (s.retries < 0) issues.push(`Stage ${s.id.name} has invalid retries`);
    }

    for (const o of observers) {
      if (!o.handle) issues.push(`Observer ${o.id.name} has no handle function`);
      if (!o.subscribe) issues.push(`Observer ${o.id.name} has no subscribe event`);
    }

    for (const c of caps) {
      if (c.cost < 0) issues.push(`Capability ${c.id.name} has negative cost`);
    }

    for (const p of policies) {
      if (!p.condition) issues.push(`Policy ${p.id.name} has no condition`);
      if (!p.action) issues.push(`Policy ${p.id.name} has no action`);
    }

    return {
      passed: issues.length === 0,
      message: issues.length > 0 ? issues.join("; ") : `Startup validation passed: ${stages.length} stages, ${observers.length} observers, ${profiles.length} profiles, ${triggers.length} triggers, ${executives.length} executives`,
    };
  },
};
