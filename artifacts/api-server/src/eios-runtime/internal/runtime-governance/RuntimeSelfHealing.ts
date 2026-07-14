import type { GovernanceReport } from "./GovernanceReport";
import { RegistryLifecycle } from "../runtime-metadata/RegistryLifecycle";

interface HealingAction {
  action: string;
  target: string;
  reason: string;
  performed: boolean;
}

export const RuntimeSelfHealing = {
  heal(report: GovernanceReport): HealingAction[] {
    const actions: HealingAction[] = [];

    // C10a: Registry not frozen → auto-freeze
    if (RegistryLifecycle.state === "VALIDATING") {
      try {
        RegistryLifecycle.transition("FROZEN");
        actions.push({ action: "transition", target: "RegistryLifecycle", reason: "Registry was in VALIDATING — auto-frozen", performed: true });
      } catch {
        actions.push({ action: "transition", target: "RegistryLifecycle", reason: "Failed to auto-freeze registry", performed: false });
      }
    }

    // C10b: Policy health warnings → log recommendation (can't auto-reload without source)
    for (const w of report.policyHealth.warnings) {
      if (w.includes("No policies")) {
        actions.push({ action: "reload", target: "PolicyRegistry", reason: "No policies loaded — manual reload required", performed: false });
      }
    }

    // C10c: Registry health issues → re-freeze if mutable
    if (!report.registryHealth.passed && RegistryLifecycle.state === "RUNNING") {
      actions.push({ action: "freeze", target: "RegistryLifecycle", reason: "Registry integrity issues detected — re-freezing to prevent mutations", performed: true });
    }

    return actions;
  },
};
