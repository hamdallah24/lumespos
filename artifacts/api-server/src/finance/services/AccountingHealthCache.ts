import { ValidationEngine } from "./ValidationEngine";
import type { ValidationFilters } from "./ValidationEngine";

interface HealthSnapshot {
  overallScore: number;
  passedChecks: number;
  totalChecks: number;
  criticalIssues: number;
  errorIssues: number;
  warningIssues: number;
  infoIssues: number;
  lastChecked: string;
}

let cached: HealthSnapshot | null = null;
let lastFiltersHash: string = "";

function hashFilters(f?: ValidationFilters): string {
  if (!f) return "";
  return JSON.stringify(f);
}

export const AccountingHealthCache = {
  async get(filters?: ValidationFilters): Promise<HealthSnapshot> {
    const fh = hashFilters(filters);
    if (cached && lastFiltersHash === fh) {
      return cached;
    }
    const result = await ValidationEngine.checkAccountingHealth(filters);
    cached = result;
    lastFiltersHash = fh;
    return result;
  },

  invalidate(): void {
    cached = null;
  },
};
