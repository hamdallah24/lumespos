export interface FlagContext {
  tenant?: string;
  branchId?: number;
  environment?: string;
  developer?: string;
  percentage?: number;
}

interface FlagDefinition {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  tenantWhitelist?: string[];
  branchWhitelist?: number[];
  environmentWhitelist?: string[];
  developerWhitelist?: string[];
}

const flags = new Map<string, FlagDefinition>();

export const FeatureFlagEngine = {
  set(name: string, enabled: boolean, rolloutPercentage = 100): void {
    flags.set(name, {
      name,
      enabled,
      rolloutPercentage,
    });
  },

  setFull(name: string, def: Partial<FlagDefinition>): void {
    const existing = flags.get(name) || { name, enabled: false, rolloutPercentage: 0 };
    flags.set(name, { ...existing, ...def });
  },

  isEnabled(name: string, context?: FlagContext): boolean {
    const flag = flags.get(name);
    if (!flag || !flag.enabled) return false;

    if (flag.tenantWhitelist && context?.tenant && !flag.tenantWhitelist.includes(context.tenant)) return false;
    if (flag.branchWhitelist && context?.branchId && !flag.branchWhitelist.includes(context.branchId)) return false;
    if (flag.environmentWhitelist && context?.environment && !flag.environmentWhitelist.includes(context.environment)) return false;
    if (flag.developerWhitelist && context?.developer && !flag.developerWhitelist.includes(context.developer)) return false;

    if (flag.rolloutPercentage < 100 && context?.percentage !== undefined) {
      if (context.percentage > flag.rolloutPercentage) return false;
    }

    return true;
  },

  getAll(): FlagDefinition[] {
    return Array.from(flags.values());
  },

  remove(name: string): void {
    flags.delete(name);
  },

  clear(): void {
    flags.clear();
  },
};
