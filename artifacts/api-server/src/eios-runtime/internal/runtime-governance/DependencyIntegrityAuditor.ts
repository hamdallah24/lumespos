import type { GovernanceReportEntry, DependencyIntegritySection } from "./GovernanceReport";
import { DependencyResolver } from "../DependencyResolver";
import { PipelineStageRegistry } from "../runtime-metadata/PipelineStageRegistry";

export interface DependencyIntegrityResult {
  entry: GovernanceReportEntry;
  deps: DependencyIntegritySection;
}

export const DependencyIntegrityAuditor = {
  check(): DependencyIntegrityResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    const resolveResult = DependencyResolver.resolveAll();
    const cycles = resolveResult.cycles;

    const stages = PipelineStageRegistry.getAll();
    const stageNames = new Set(stages.map(s => s.id.name));
    const orphaned: string[] = [];

    for (const s of stages) {
      for (const dep of s.manifest.dependencies) {
        if (!stageNames.has(dep.name)) {
          orphaned.push(`Stage "${s.id.name}" depends on "${dep.name}" which is not registered`);
        }
      }
    }

    if (cycles.length > 0) {
      errors.push(`Circular dependencies detected: ${cycles.map(c => c.join(" -> ")).join("; ")}`);
    }

    if (orphaned.length > 0) {
      warnings.push(...orphaned);
      recommendations.push("Remove orphaned dependencies or register missing components");
    }

    const totalDeps = stages.reduce((sum, s) => sum + s.manifest.dependencies.length, 0);
    const validDeps = totalDeps - orphaned.length;

    return {
      entry: {
        passed: errors.length === 0,
        detail: `${validDeps} valid, ${orphaned.length} orphaned, ${cycles.length} cycles`,
        warnings,
        errors,
        recommendations,
      },
      deps: {
        total: totalDeps,
        valid: validDeps,
        cycles: cycles.length,
        orphaned: orphaned.length,
        missingProviders: orphaned.length,
        incompatibleVersions: 0,
        warnings,
      },
    };
  },
};
