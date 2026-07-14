export interface ForgettingPolicyConfig {
  workingMemoryMaxAgeMs: number;
  consolidatedMaxAgeMs: number;
  longTermMaxAgeMs: number;
  archiveMaxAgeMs: number;
  minAccessCountBeforeArchive: number;
  forgetAfterArchiveAgeMs: number;
  minImportanceToKeep: number;
}

const HOUR = 3_600_000;
const DAY = 86_400_000;

export const DEFAULT_FORGETTING_POLICY: ForgettingPolicyConfig = {
  workingMemoryMaxAgeMs: 7 * DAY,
  consolidatedMaxAgeMs: 30 * DAY,
  longTermMaxAgeMs: 365 * DAY,
  archiveMaxAgeMs: 90 * DAY,
  minAccessCountBeforeArchive: 1,
  forgetAfterArchiveAgeMs: 365 * DAY,
  minImportanceToKeep: 10,
};

export const EXECUTIVE_FORGETTING_MULTIPLIER: Record<string, number> = {
  CEO: 1.5,
  CKO: 2.0,
  CTO: 1.2,
  CAIO: 1.2,
  COO: 1.0,
  CFO: 1.0,
  CMO: 1.0,
  CHRO: 1.0,
};

export class ForgettingPolicy {
  constructor(private config: ForgettingPolicyConfig = DEFAULT_FORGETTING_POLICY) {}

  getConfig(): ForgettingPolicyConfig {
    return { ...this.config };
  }

  getMaxAgeForState(state: string, executive?: string): number {
    const base = this.getBaseMaxAge(state);
    const multiplier = executive ? (EXECUTIVE_FORGETTING_MULTIPLIER[executive] ?? 1.0) : 1.0;
    return Math.round(base * multiplier);
  }

  private getBaseMaxAge(state: string): number {
    switch (state) {
      case "WORKING": return this.config.workingMemoryMaxAgeMs;
      case "CONSOLIDATED": return this.config.consolidatedMaxAgeMs;
      case "LONG_TERM": return this.config.longTermMaxAgeMs;
      case "ARCHIVED": return this.config.archiveMaxAgeMs;
      default: return this.config.longTermMaxAgeMs;
    }
  }
}
