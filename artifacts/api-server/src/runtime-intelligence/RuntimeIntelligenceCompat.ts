// RIE → RIC Migration: Compatibility wrapper.
// Delegates to RIC. Retained for any remaining imports.

export const RuntimeIntelligence = {
  name: "RuntimeIntelligence",
  version: "9.0" as const,

  async assemble(input: { message: string; userId: string | number; branchId?: number }): Promise<unknown> {
    const { getRICAdapter } = await import("../runtime-intelligence-core/RICAdapter");
    const adapter = getRICAdapter();
    if (!adapter.isEnabled()) await adapter.initialize(process.cwd());
    return adapter.assemble(input);
  },
};
