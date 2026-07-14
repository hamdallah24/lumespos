import type { ValidationResult } from "./StartupValidator";
import { DependencyResolver } from "../DependencyResolver";

export const DependencyValidator = {
  validate(): ValidationResult {
    const result = DependencyResolver.resolveAll();

    if (!result.success) {
      const cycleDescriptions = result.cycles.map((c, i) =>
        `Cycle ${i + 1}: ${c.join(" -> ")}`
      );
      return {
        passed: false,
        message: `Circular dependencies detected: ${cycleDescriptions.join("; ")}`,
      };
    }

    return { passed: true, message: "Dependency validation passed" };
  },
};
