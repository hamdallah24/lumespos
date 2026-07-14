import { StartupValidator } from "./StartupValidator";
import { RegistryValidator } from "./RegistryValidator";
import { ManifestValidator } from "./ManifestValidator";
import { PolicyValidator } from "./PolicyValidator";
import { CompatibilityValidator } from "./CompatibilityValidator";
import { MigrationValidator } from "./MigrationValidator";
import { DependencyValidator } from "./DependencyValidator";
import { RegistryIntegrityChecker } from "./RegistryIntegrityChecker";
import { DependencyIntegrityAuditor } from "./DependencyIntegrityAuditor";
import { PolicyIntegrityAuditor } from "./PolicyIntegrityAuditor";
import { EventIntegrityAuditor } from "./EventIntegrityAuditor";
import { CapabilityIntegrityAuditor } from "./CapabilityIntegrityAuditor";
import { ExecutiveIntegrityAuditor } from "./ExecutiveIntegrityAuditor";
import { RuntimeSelfHealing } from "./RuntimeSelfHealing";
import { GovernanceScoreCalculator, createEmptyReport } from "./GovernanceReport";
import type { GovernanceReport } from "./GovernanceReport";
import { MemoryLeakDetector } from "../runtime-observability/MemoryLeakDetector";

export type { GovernanceReport } from "./GovernanceReport";
export { GovernanceScoreCalculator } from "./GovernanceReport";

export class GovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernanceError";
  }
}

const bootValidators = [
  { name: "StartupValidator", validate: StartupValidator.validate },
  { name: "RegistryValidator", validate: RegistryValidator.validate },
  { name: "ManifestValidator", validate: ManifestValidator.validate },
  { name: "PolicyValidator", validate: PolicyValidator.validate },
  { name: "CompatibilityValidator", validate: CompatibilityValidator.validate },
  { name: "MigrationValidator", validate: MigrationValidator.validate },
  { name: "DependencyValidator", validate: DependencyValidator.validate },
];

let periodicTimer: ReturnType<typeof setInterval> | null = null;
let lastReport: GovernanceReport | null = null;

export const RuntimeGovernance = {
  async validateAll(): Promise<GovernanceReport> {
    const failures: Array<{ name: string; message: string }> = [];

    for (const v of bootValidators) {
      try {
        const result = v.validate();
        if (!result.passed) {
          failures.push({ name: v.name, message: result.message });
        }
      } catch (err) {
        failures.push({ name: v.name, message: String(err) });
      }
    }

    if (failures.length > 0) {
      throw new GovernanceError(
        `Governance validation failed: ${failures.map(f => `${f.name}: ${f.message}`).join("; ")}`
      );
    }

    return createFullGovernanceReport();
  },

  async runPeriodicCheck(): Promise<GovernanceReport> {
    const report = createFullGovernanceReport();
    lastReport = report;

    // EPIC D: Memory leak detection
    const leakResult = MemoryLeakDetector.scan();
    if (leakResult.detected) {
      for (const w of leakResult.warnings) report.warnings.push(`MemoryLeak: ${w}`);
    }

    const actions = RuntimeSelfHealing.heal(report);
    for (const a of actions) {
      if (!a.performed) {
        report.warnings.push(`Self-healing could not ${a.action} on ${a.target}: ${a.reason}`);
      }
    }

    return report;
  },

  startPeriodicCheck(intervalMs = 60000): void {
    if (periodicTimer) return;
    periodicTimer = setInterval(async () => {
      try {
        await this.runPeriodicCheck();
      } catch {
        // Periodic check failure caught silently
      }
    }, intervalMs);
  },

  stopPeriodicCheck(): void {
    if (periodicTimer) {
      clearInterval(periodicTimer);
      periodicTimer = null;
    }
  },

  getLastReport(): GovernanceReport | null {
    return lastReport;
  },
};

function createFullGovernanceReport(): GovernanceReport {
  const report = createEmptyReport();
  report.timestamp = new Date().toISOString();

  const regResult = RegistryIntegrityChecker.check();
  report.registryHealth = regResult.entry;
  report.registries = regResult.sections;

  const depResult = DependencyIntegrityAuditor.check();
  report.dependencyHealth = depResult.entry;
  report.dependencies = depResult.deps;

  const polResult = PolicyIntegrityAuditor.check();
  report.policyHealth = polResult.entry;

  const evtResult = EventIntegrityAuditor.check();
  report.eventHealth = evtResult.entry;

  const capResult = CapabilityIntegrityAuditor.check();
  report.capabilityHealth = capResult.entry;

  const execResult = ExecutiveIntegrityAuditor.check();
  report.executiveHealth = execResult.entry;

  // Collect all warnings, errors, recommendations
  const allEntries = [
    report.registryHealth, report.dependencyHealth, report.policyHealth,
    report.eventHealth, report.capabilityHealth, report.executiveHealth,
  ];
  for (const e of allEntries) {
    report.warnings.push(...e.warnings);
    report.errors.push(...e.errors);
    report.recommendations.push(...e.recommendations);
  }

  // Deduplicate
  report.warnings = [...new Set(report.warnings)];
  report.errors = [...new Set(report.errors)];
  report.recommendations = [...new Set(report.recommendations)];

  report.overallScore = GovernanceScoreCalculator.calculate(report);

  return report;
}
