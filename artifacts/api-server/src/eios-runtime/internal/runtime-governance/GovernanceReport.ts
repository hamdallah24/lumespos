export interface GovernanceReportEntry {
  passed: boolean;
  detail: string;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export interface RegistryIntegritySection {
  registry: string;
  total: number;
  active: number;
  deprecated: number;
  duplicated: number;
  lifecycle: string;
}

export interface DependencyIntegritySection {
  total: number;
  valid: number;
  cycles: number;
  orphaned: number;
  missingProviders: number;
  incompatibleVersions: number;
  warnings: string[];
}

export interface GovernanceReport {
  timestamp: string;
  overallScore: number;
  registryHealth: GovernanceReportEntry;
  dependencyHealth: GovernanceReportEntry;
  policyHealth: GovernanceReportEntry;
  eventHealth: GovernanceReportEntry;
  capabilityHealth: GovernanceReportEntry;
  executiveHealth: GovernanceReportEntry;
  registries: RegistryIntegritySection[];
  dependencies: DependencyIntegritySection;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export function createEmptyReport(): GovernanceReport {
  return {
    timestamp: new Date().toISOString(),
    overallScore: 100,
    registryHealth: { passed: true, detail: "", warnings: [], errors: [], recommendations: [] },
    dependencyHealth: { passed: true, detail: "", warnings: [], errors: [], recommendations: [] },
    policyHealth: { passed: true, detail: "", warnings: [], errors: [], recommendations: [] },
    eventHealth: { passed: true, detail: "", warnings: [], errors: [], recommendations: [] },
    capabilityHealth: { passed: true, detail: "", warnings: [], errors: [], recommendations: [] },
    executiveHealth: { passed: true, detail: "", warnings: [], errors: [], recommendations: [] },
    registries: [],
    dependencies: { total: 0, valid: 0, cycles: 0, orphaned: 0, missingProviders: 0, incompatibleVersions: 0, warnings: [] },
    warnings: [],
    errors: [],
    recommendations: [],
  };
}

export const GovernanceScoreCalculator = {
  calculate(report: GovernanceReport): number {
    const dimensions = [
      report.registryHealth,
      report.dependencyHealth,
      report.policyHealth,
      report.eventHealth,
      report.capabilityHealth,
      report.executiveHealth,
    ];
    const total = dimensions.reduce((sum, d) => {
      if (d.passed) return sum + 100;
      const deduction = d.errors.length * 15 + d.warnings.length * 5;
      return sum + Math.max(0, 100 - deduction);
    }, 0);
    return Math.round(total / dimensions.length);
  },
};
