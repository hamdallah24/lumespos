import { RuntimeLogger } from "../runtime-observability/RuntimeLogger";

interface DependencyVulnerability {
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  remediated: boolean;
}

export const SupplyChainAuditor = {
  checkDependency(name: string, version: string): DependencyVulnerability[] {
    const findings: DependencyVulnerability[] = [];
    if (!version || version === "0.0.0" || version === "*") {
      findings.push({ name, severity: "high", description: "Pinned version required", remediated: false });
    }
    if (/[<>=~^]/.test(version)) {
      findings.push({ name, severity: "medium", description: "Range version — exact pinning recommended", remediated: false });
    }
    return findings;
  },

  auditDependencies(deps: Record<string, string>): DependencyVulnerability[] {
    const all: DependencyVulnerability[] = [];
    for (const [name, version] of Object.entries(deps)) {
      all.push(...this.checkDependency(name, version));
    }
    if (all.length > 0) {
      RuntimeLogger.warn("SupplyChainAuditor", `Found ${all.length} dependency issues`);
    }
    return all;
  },
};
