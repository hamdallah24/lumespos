import type { GovernanceReportEntry, RegistryIntegritySection } from "./GovernanceReport";
import { RegistryLifecycle } from "../runtime-metadata/RegistryLifecycle";
import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";
import { ObserverRegistry } from "../runtime-metadata/ObserverRegistry";
import { PipelineProfileRegistry } from "../runtime-metadata/PipelineProfileRegistry";
import { ExecutiveRegistry } from "../runtime-metadata/ExecutiveRegistry";
import { CapabilityRegistry } from "../runtime-metadata/CapabilityRegistry";
import { PolicyRegistry } from "../runtime-policy/PolicyRegistry";
import { EventRegistry } from "../runtime-metadata/EventRegistry";

export interface RegistryIntegrityResult {
  entry: GovernanceReportEntry;
  sections: RegistryIntegritySection[];
}

function auditRegistry(
  name: string,
  items: { id: { name: string } }[],
  statuses: Map<string, string> | undefined,
): RegistryIntegritySection {
  const names = items.map(i => i.id.name);
  const unique = new Set(names);
  const duplicated = names.length - unique.size;

  let active = 0;
  let deprecated = 0;

  if (statuses) {
    for (const s of statuses.values()) {
      if (s === "ACTIVE") active++;
      else if (s === "DEPRECATED") deprecated++;
    }
  } else {
    active = unique.size;
  }

  return {
    registry: name,
    total: items.length,
    active,
    deprecated,
    duplicated,
    lifecycle: RegistryLifecycle.state,
  };
}

export const RegistryIntegrityChecker = {
  check(): RegistryIntegrityResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    const stageStatus = new Map<string, string>();
    const stageNames = PipelineStageRegistry.getAll().map(s => {
      stageStatus.set(s.id.name, "ACTIVE");
      return s;
    });

    const sections: RegistryIntegritySection[] = [
      auditRegistry("PipelineStageRegistry", PipelineStageRegistry.getAll(), stageStatus),
      auditRegistry("ObserverRegistry", ObserverRegistry.getAll(), undefined),
      auditRegistry("PipelineProfileRegistry", PipelineProfileRegistry.getAll(), undefined),
      auditRegistry("ExecutiveRegistry", ExecutiveRegistry.getAll(), undefined),
      auditRegistry("CapabilityRegistry", CapabilityRegistry.getAll(), undefined),
      auditRegistry("PolicyRegistry", PolicyRegistry.getAll(), undefined),
      auditRegistry("EventRegistry", EventRegistry.getAll(), undefined),
    ];

    for (const s of sections) {
      if (s.duplicated > 0) {
        errors.push(`${s.registry}: ${s.duplicated} duplicate entries found`);
      }
      if (s.total === 0) {
        warnings.push(`${s.registry}: empty — no entries registered`);
      }
    }

    const allNonEmpty = sections.filter(s => s.total > 0).length;
    if (allNonEmpty < 7) {
      recommendations.push("Register components for all 7 registry types");
    }

    if (RegistryLifecycle.state !== "FROZEN" && RegistryLifecycle.state !== "RUNNING") {
      warnings.push(`Registry lifecycle is in ${RegistryLifecycle.state} — expected FROZEN or RUNNING`);
      recommendations.push("Transition lifecycle to FROZEN before runtime execution");
    }

    return {
      entry: {
        passed: errors.length === 0,
        detail: sections.map(s => `${s.registry}: ${s.active} active, ${s.deprecated} deprecated, ${s.duplicated} duplicate`).join("; "),
        warnings,
        errors,
        recommendations,
      },
      sections,
    };
  },
};
